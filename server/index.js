import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import geckos from '@geckos.io/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT || process.env.GECKOS_PORT || 9208);
const udpMin = Number(process.env.GECKOS_UDP_MIN || 20000);
const udpMax = Number(process.env.GECKOS_UDP_MAX || udpMin);
const basePath = normalizeBasePath(process.env.BASE_PATH || process.env.VITE_BASE_PATH || '/');
const lobbies = new Map();

const app = express();
app.disable('x-powered-by');

const staticOptions = {
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  setHeaders(response, filePath) {
    if (
      filePath.endsWith('.html') ||
      filePath.endsWith(`${path.sep}sw.js`) ||
      filePath.endsWith(`${path.sep}manifest.webmanifest`)
    ) {
      response.setHeader('Cache-Control', 'no-cache');
    }
  },
};

app.use(basePath, express.static(distDir, staticOptions));
app.use(basePath, serveCurrentHashedAsset);
if (basePath !== '/') {
  app.use(express.static(distDir, staticOptions));
  app.use(serveCurrentHashedAsset);
}

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    lobbies: lobbies.size,
    udpRange: [udpMin, udpMax],
  });
});

app.get('/api/lobbies/:code', (request, response) => {
  const code = normalizeCode(request.params.code);
  const lobby = lobbies.get(code);
  if (!lobby) {
    response.status(404).json({ ok: false, message: 'Lobby not found' });
    return;
  }

  response.json({
    ok: true,
    code,
    players: [...lobby.players.values()].map(publicPlayer),
    ready: lobby.players.size === 2,
    started: lobby.started,
  });
});

app.use((request, response) => {
  if (basePath !== '/' && request.path === basePath.slice(0, -1)) {
    response.redirect(308, basePath);
    return;
  }
  if (!shouldServeIndexFallback(request)) {
    response.status(404).type('text/plain').send('Not found');
    return;
  }
  response.sendFile(path.join(distDir, 'index.html'));
});

const httpServer = http.createServer(app);
const io = geckos({
  cors: {
    origin: process.env.PUBLIC_ORIGIN || '*',
  },
  ordered: false,
  maxRetransmits: 0,
  portRange: {
    min: udpMin,
    max: udpMax,
  },
  multiplex: true,
});

io.addServer(httpServer);

io.onConnection((channel) => {
  channel.on('create-lobby', () => {
    const lobby = createLobby(channel);
    channel.emit('lobby-created', {
      code: lobby.code,
      playerId: 'p1',
      hostPlayerId: 'p1',
      started: lobby.started,
      roundId: lobby.roundId,
      players: [...lobby.players.values()].map(publicPlayer),
    }, { reliable: true });
    emitLobbyState(lobby);
  });

  channel.on('join-lobby', (data) => {
    const code = normalizeCode(data?.code);
    const lobby = lobbies.get(code);
    if (!lobby) {
      channel.emit('lobby-error', { message: 'Lobby not found' }, { reliable: true });
      return;
    }
    if (lobby.players.size >= 2 && !lobby.players.has(channel.id)) {
      channel.emit('lobby-error', { message: 'Lobby is full' }, { reliable: true });
      return;
    }

    const playerId = lobby.players.has(channel.id)
      ? lobby.players.get(channel.id).playerId
      : nextPlayerId(lobby);
    addPlayerToLobby(lobby, channel, playerId);
    channel.emit('lobby-joined', {
      code,
      playerId,
      hostPlayerId: 'p1',
      started: lobby.started,
      roundId: lobby.roundId,
      players: [...lobby.players.values()].map(publicPlayer),
    }, { reliable: true });
    emitLobbyState(lobby);
  });

  channel.on('start-match', () => {
    const lobby = getLobbyForChannel(channel);
    if (!lobby) {
      channel.emit('lobby-error', { message: 'Lobby not found' }, { reliable: true });
      return;
    }
    const player = lobby.players.get(channel.id);
    if (player?.playerId !== 'p1') {
      channel.emit('lobby-error', { message: 'Only the host can start the game' }, { reliable: true });
      return;
    }
    if (lobby.players.size < 2) {
      channel.emit('lobby-error', { message: 'Waiting for opponent' }, { reliable: true });
      return;
    }

    lobby.started = true;
    lobby.inputs.clear();
    lobby.snapshots.clear();
    lobby.hostSnapshot = null;
    emitLobbyState(lobby);
    io.room(lobby.code).emit('match-start', {
      code: lobby.code,
      roundId: lobby.roundId,
      players: [...lobby.players.values()].map(publicPlayer),
      serverTime: Date.now(),
    }, { reliable: true });
  });

  channel.on('player-input', (data) => {
    const lobby = getLobbyForChannel(channel);
    if (!lobby) {
      return;
    }
    if (!lobby.started) {
      return;
    }
    const player = lobby.players.get(channel.id);
    if (!player) {
      return;
    }
    const packet = {
      playerId: player.playerId,
      roundId: lobby.roundId,
      seq: safeInteger(data?.seq),
      t: safeInteger(data?.t),
      input: sanitizeInput(data?.input),
      serverTime: Date.now(),
    };
    lobby.inputs.set(player.playerId, packet);
    io.room(lobby.code).emit('player-input', packet, { reliable: true });
  });

  channel.on('player-snapshot', (data) => {
    const lobby = getLobbyForChannel(channel);
    if (!lobby) {
      return;
    }
    if (!lobby.started) {
      return;
    }
    const player = lobby.players.get(channel.id);
    if (!player) {
      return;
    }
    const packet = {
      playerId: player.playerId,
      roundId: lobby.roundId,
      t: safeInteger(data?.t),
      snapshot: sanitizeSnapshot(data?.snapshot),
      serverTime: Date.now(),
    };
    lobby.snapshots.set(player.playerId, packet);
    io.room(lobby.code).emit('player-snapshot', packet);
  });

  channel.on('host-snapshot', (data) => {
    const lobby = getLobbyForChannel(channel);
    if (!lobby || !lobby.started) {
      return;
    }
    const player = lobby.players.get(channel.id);
    if (player?.playerId !== 'p1') {
      return;
    }
    const packet = {
      hostPlayerId: 'p1',
      roundId: lobby.roundId,
      t: safeInteger(data?.t),
      snapshots: sanitizeSnapshotMap(data?.snapshots),
      serverTime: Date.now(),
    };
    lobby.hostSnapshot = packet;
    io.room(lobby.code).emit('host-snapshot', packet);
  });

  channel.on('restart-match', () => {
    const lobby = getLobbyForChannel(channel);
    if (!lobby) {
      return;
    }
    lobby.started = true;
    lobby.inputs.clear();
    lobby.snapshots.clear();
    lobby.hostSnapshot = null;
    lobby.roundId = (lobby.roundId ?? 0) + 1;
    io.room(lobby.code).emit('restart-match', {
      code: lobby.code,
      roundId: lobby.roundId,
      serverTime: Date.now(),
    }, { reliable: true });
  });

  channel.onDisconnect(() => {
    const lobby = getLobbyForChannel(channel);
    if (!lobby) {
      return;
    }
    lobby.players.delete(channel.id);
    channel.leave();
    if (lobby.players.size === 0) {
      lobbies.delete(lobby.code);
      return;
    }
    emitLobbyState(lobby);
  });
});

httpServer.listen(port, () => {
  console.log(`Superfighters server listening on http://0.0.0.0:${port}`);
  console.log(`Serving game at ${basePath}`);
  console.log(`Geckos UDP port range ${udpMin}-${udpMax}`);
});

function normalizeBasePath(value) {
  const cleaned = String(value || '/').trim().replace(/^\/+|\/+$/g, '');
  return cleaned ? `/${cleaned}/` : '/';
}

function shouldServeIndexFallback(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false;
  }
  if (path.extname(request.path)) {
    return false;
  }
  return (request.get('accept') || '').includes('text/html');
}

function serveCurrentHashedAsset(request, response, next) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    next();
    return;
  }

  const fallbackPath = getCurrentHashedAssetPath(request.path);
  if (!fallbackPath) {
    next();
    return;
  }

  response.setHeader('Cache-Control', 'no-cache');
  response.sendFile(fallbackPath);
}

function getCurrentHashedAssetPath(requestPath) {
  const normalizedPath = requestPath.replace(/^\/+/, '');
  if (!normalizedPath.startsWith('assets/')) {
    return null;
  }

  const assetName = path.basename(normalizedPath);
  const match = /^(debug|editor|game|gameplayConfig|levelData|modulepreload-polyfill)-[A-Za-z0-9_-]+\.(css|js)$/.exec(assetName);
  if (!match) {
    return null;
  }

  const [, prefix, extension] = match;
  const assetsDir = path.join(distDir, 'assets');
  let currentAsset = null;
  try {
    currentAsset = fs.readdirSync(assetsDir).find((fileName) => (
      fileName.startsWith(`${prefix}-`) && fileName.endsWith(`.${extension}`)
    ));
  } catch (_error) {
    return null;
  }

  return currentAsset ? path.join(assetsDir, currentAsset) : null;
}

function createLobby(channel) {
  const code = generateLobbyCode();
  const lobby = {
    code,
    createdAt: Date.now(),
    players: new Map(),
    inputs: new Map(),
    snapshots: new Map(),
    hostSnapshot: null,
    roundId: 0,
    started: false,
  };
  lobbies.set(code, lobby);
  addPlayerToLobby(lobby, channel, 'p1');
  return lobby;
}

function addPlayerToLobby(lobby, channel, playerId) {
  channel.join(lobby.code);
  lobby.players.set(channel.id, {
    channelId: channel.id,
    playerId,
    joinedAt: Date.now(),
  });
}

function getLobbyForChannel(channel) {
  for (const lobby of lobbies.values()) {
    if (lobby.players.has(channel.id)) {
      return lobby;
    }
  }
  return null;
}

function emitLobbyState(lobby) {
  io.room(lobby.code).emit('lobby-state', {
    code: lobby.code,
    players: [...lobby.players.values()].map(publicPlayer),
    ready: lobby.players.size === 2,
    started: lobby.started,
    hostPlayerId: 'p1',
    roundId: lobby.roundId,
    serverTime: Date.now(),
  }, { reliable: true });
}

function nextPlayerId(lobby) {
  const used = new Set([...lobby.players.values()].map((player) => player.playerId));
  return used.has('p1') ? 'p2' : 'p1';
}

function publicPlayer(player) {
  return {
    playerId: player.playerId,
    channelId: player.channelId,
  };
}

function generateLobbyCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempts = 0; attempts < 1000; attempts += 1) {
    let code = '';
    for (let i = 0; i < 4; i += 1) {
      code += letters[Math.floor(Math.random() * letters.length)];
    }
    if (!lobbies.has(code)) {
      return code;
    }
  }
  throw new Error('Could not allocate a lobby code');
}

function normalizeCode(code) {
  return String(code ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 4)
    .toUpperCase();
}

function sanitizeInput(input) {
  const actions = ['left', 'right', 'jump', 'crouch', 'melee', 'shoot', 'grenade', 'powerup', 'aimUp', 'aimDown'];
  return actions.reduce((state, action) => {
    state[action] = Boolean(input?.[action]);
    return state;
  }, {});
}

function sanitizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {};
  }
  return {
    x: safeNumber(snapshot.x),
    y: safeNumber(snapshot.y),
    vx: safeNumber(snapshot.vx),
    vy: safeNumber(snapshot.vy),
    health: safeNumber(snapshot.health),
    lives: safeNumber(snapshot.lives),
    kills: safeNumber(snapshot.kills),
    facing: snapshot.facing === -1 ? -1 : 1,
    aimFacing: snapshot.aimFacing === -1 ? -1 : 1,
    aimOffset: safeNumber(snapshot.aimOffset),
    aimAngle: safeNumber(snapshot.aimAngle),
    aiming: Boolean(snapshot.aiming),
    aimMode: snapshot.aimMode === 'gun' || snapshot.aimMode === 'grenade' ? snapshot.aimMode : null,
    crouching: Boolean(snapshot.crouching),
    climbing: Boolean(snapshot.climbing),
    weapon: snapshot.weapon?.id ? {
      id: String(snapshot.weapon.id),
      ammo: safeNumber(snapshot.weapon.ammo),
    } : null,
    grenadeAmmo: safeNumber(snapshot.grenadeAmmo),
    powerup: snapshot.powerup ? String(snapshot.powerup) : null,
  };
}

function sanitizeSnapshotMap(snapshots) {
  const sanitized = {};
  if (!snapshots || typeof snapshots !== 'object') {
    return sanitized;
  }
  for (const playerId of ['p1', 'p2']) {
    if (snapshots[playerId]) {
      sanitized[playerId] = sanitizeSnapshot(snapshots[playerId]);
    }
  }
  return sanitized;
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}
