import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const base = process.env.VITE_BASE_PATH || '/';
const saveDefaultLevelPath = '/__superfighters/save-default-level';
const defaultLevelFile = resolve(__dirname, 'src/defaultLevel.json');

export default defineConfig({
  base,
  plugins: [
    {
      name: 'superfighters-default-level-writer',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const path = request.url?.split('?')[0] ?? '';
          if (request.method !== 'POST' || !path.endsWith(saveDefaultLevelPath)) {
            next();
            return;
          }

          try {
            const payload = validateDefaultLevelPayload(JSON.parse(await readRequestBody(request)));
            await writeFile(defaultLevelFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ ok: true }));
          } catch (error) {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ ok: false, error: error?.message ?? 'Save failed.' }));
          }
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        game: resolve(__dirname, 'index.html'),
        debug: resolve(__dirname, 'debug.html'),
        editor: resolve(__dirname, 'level-editor.html'),
      },
    },
  },
});

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function validateDefaultLevelPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Expected a level object.');
  }

  const width = clampInteger(payload.width, 1, 512, null);
  const height = clampInteger(payload.height, 1, 512, null);
  const tileSize = clampInteger(payload.tileSize, 8, 128, null);
  if (!width || !height || !tileSize) {
    throw new Error('Level width, height, and tileSize are required.');
  }
  if (!Array.isArray(payload.runs)) {
    throw new Error('Level runs are required.');
  }

  return {
    version: 1,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : 'Blank Arena',
    width,
    height,
    tileSize,
    runs: payload.runs.map(validateRun).filter(Boolean),
    pickupSpecs: Array.isArray(payload.pickupSpecs) ? payload.pickupSpecs.map(validatePickupSpec).filter(Boolean) : [],
  };
}

function validateRun(run) {
  if (!run || typeof run !== 'object') {
    return null;
  }
  const start = clampInteger(run.start, 0, 512 * 512, null);
  const length = clampInteger(run.length, 1, 512 * 512, null);
  if (start === null || length === null || typeof run.type !== 'string') {
    return null;
  }
  return { start, length, type: run.type };
}

function validatePickupSpec(spec) {
  if (!spec || typeof spec !== 'object') {
    return null;
  }
  const x = clampInteger(spec.x, 0, 511, null);
  const y = clampInteger(spec.y, 0, 511, null);
  if (x === null || y === null) {
    return null;
  }
  return {
    x,
    y,
    kind: ['random', 'weapon', 'grenade', 'powerup'].includes(spec.kind) ? spec.kind : 'random',
    id: typeof spec.id === 'string' && spec.id ? spec.id : 'random',
  };
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}
