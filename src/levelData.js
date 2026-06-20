import defaultLevelSeed from './defaultLevel.json';

export const LEVEL_STORAGE_KEY = 'superfighters.levelEditor.v1';
export const LEVEL_VERSION = 1;
export const TILE_SIZE = 30;
export const DEFAULT_LEVEL_WIDTH = 96;
export const DEFAULT_LEVEL_HEIGHT = 36;

export const TILE_DEFS = [
  { id: 'empty', label: 'Empty', color: '#00000000' },
  { id: 'solid', label: 'Wall', color: '#30283b', collides: true },
  { id: 'slopeUp', label: 'Slope Up', color: '#3f354d', collides: true, slope: 'up' },
  { id: 'slopeDown', label: 'Slope Down', color: '#3f354d', collides: true, slope: 'down' },
  { id: 'ceilingSlopeUp', label: 'Ceiling Slope Up', color: '#493d58', collides: true, slope: 'ceilingUp' },
  { id: 'ceilingSlopeDown', label: 'Ceiling Slope Down', color: '#493d58', collides: true, slope: 'ceilingDown' },
  { id: 'platform', label: 'Drop Platform', color: '#8b929c', oneWay: true },
  { id: 'movingPlatform', label: 'Moving Platform', color: '#8b929c', oneWay: true, moving: true },
  { id: 'crate', label: 'Crate', color: '#a8794a', collides: true, breakable: true },
  { id: 'barrel', label: 'Exploding Barrel', color: '#cc6547', collides: true, explosive: true },
  { id: 'smallExplosive', label: 'Small Explosive', color: '#ff9f43', collides: true, explosive: true },
  { id: 'swingingCrate', label: 'Swinging Crate', color: '#bf8f55', collides: true, hanging: true },
  { id: 'glass', label: 'Window Center', color: '#bfeaff', breakable: true },
  { id: 'glassLeft', label: 'Window Left', color: '#9ff4ff', breakable: true },
  { id: 'glassRight', label: 'Window Right', color: '#9ff4ff', breakable: true },
  { id: 'ladder', label: 'Ladder Center', color: '#b88751', climbable: true },
  { id: 'ladderLeft', label: 'Ladder Left', color: '#d09a61', climbable: true },
  { id: 'ladderRight', label: 'Ladder Right', color: '#d09a61', climbable: true },
  { id: 'door', label: 'Door', color: '#4a78d8', marker: true, door: true },
  { id: 'light', label: 'Light Fixture', color: '#fff0a6', marker: true },
  { id: 'backdrop', label: 'Backdrop', color: '#5b5366' },
  { id: 'void', label: 'Void', color: '#090d14' },
  { id: 'pickup', label: 'Item Pickup', color: '#89e072', marker: true },
  { id: 'p1', label: 'P1', color: '#55a7ff', marker: true },
  { id: 'p2', label: 'P2', color: '#ff6f91', marker: true },
  { id: 'slopePlatformUp', label: 'Platform Up', color: '#8b929c', oneWay: true, slope: 'platformUp' },
  { id: 'slopePlatformDown', label: 'Platform Down', color: '#8b929c', oneWay: true, slope: 'platformDown' },
];

export const TILE_INDEX = Object.fromEntries(TILE_DEFS.map((tile, index) => [tile.id, index]));

export function createEmptyLevel(name = 'Untitled Arena') {
  return {
    version: LEVEL_VERSION,
    name,
    width: DEFAULT_LEVEL_WIDTH,
    height: DEFAULT_LEVEL_HEIGHT,
    tileSize: TILE_SIZE,
    grid: new Uint8Array(DEFAULT_LEVEL_WIDTH * DEFAULT_LEVEL_HEIGHT),
    backdrop: new Uint8Array(DEFAULT_LEVEL_WIDTH * DEFAULT_LEVEL_HEIGHT),
    pickupSpecs: [],
    doorLinks: [],
  };
}

export function createCurrentArenaSeed() {
  return normalizeLevel(defaultLevelSeed);
}

export function getSavedLevel() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LEVEL_STORAGE_KEY);
    return raw ? upgradeLegacySavedLevel(normalizeLevel(JSON.parse(raw))) : null;
  } catch {
    return null;
  }
}

export function saveLevel(level) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LEVEL_STORAGE_KEY, JSON.stringify(serializeLevel(level)));
}

export function clearSavedLevel() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LEVEL_STORAGE_KEY);
}

export function serializeLevel(level) {
  const normalized = normalizeLevel(level);
  return {
    version: LEVEL_VERSION,
    name: normalized.name,
    width: normalized.width,
    height: normalized.height,
    tileSize: normalized.tileSize,
    runs: encodeRuns(normalized.grid),
    backdropRuns: encodeRuns(normalized.backdrop),
    pickupSpecs: normalized.pickupSpecs,
    doorLinks: normalized.doorLinks,
  };
}

export function normalizeLevel(input) {
  const width = clampInteger(input?.width, 1, 512, DEFAULT_LEVEL_WIDTH);
  const height = clampInteger(input?.height, 1, 512, DEFAULT_LEVEL_HEIGHT);
  const tileSize = clampInteger(input?.tileSize, 1, 128, TILE_SIZE);
  const grid = new Uint8Array(width * height);
  const backdrop = new Uint8Array(width * height);

  if (input?.grid?.length === width * height) {
    for (let i = 0; i < grid.length; i += 1) {
      grid[i] = clampInteger(input.grid[i], 0, TILE_DEFS.length - 1, TILE_INDEX.empty);
    }
  } else if (Array.isArray(input?.runs)) {
    decodeRuns(input.runs, grid);
  }

  if (input?.backdrop?.length === width * height) {
    for (let i = 0; i < backdrop.length; i += 1) {
      backdrop[i] = normalizeBackdropTile(input.backdrop[i]);
    }
  } else if (Array.isArray(input?.backdropRuns)) {
    decodeRuns(input.backdropRuns, backdrop, normalizeBackdropTile);
  }

  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] === TILE_INDEX.backdrop || grid[i] === TILE_INDEX.void) {
      if (backdrop[i] === TILE_INDEX.empty) {
        backdrop[i] = normalizeBackdropTile(grid[i]);
      }
      grid[i] = TILE_INDEX.empty;
    }
  }

  return {
    version: LEVEL_VERSION,
    name: typeof input?.name === 'string' ? input.name : 'Untitled Arena',
    width,
    height,
    tileSize,
    grid,
    backdrop,
    pickupSpecs: normalizePickupSpecs(input?.pickupSpecs, width, height),
    doorLinks: normalizeDoorLinks(input?.doorLinks, width, height),
  };
}

export function mergeTilesToRects(level, tileIds) {
  const normalized = normalizeLevel(level);
  const targetIndexes = new Set(tileIds.map((id) => TILE_INDEX[id]));
  const visited = new Uint8Array(normalized.grid.length);
  const rects = [];

  for (let y = 0; y < normalized.height; y += 1) {
    for (let x = 0; x < normalized.width; x += 1) {
      const start = y * normalized.width + x;
      const tile = normalized.grid[start];
      if (visited[start] || !targetIndexes.has(tile)) {
        continue;
      }

      let width = 1;
      while (
        x + width < normalized.width &&
        !visited[start + width] &&
        normalized.grid[start + width] === tile
      ) {
        width += 1;
      }

      let height = 1;
      let canGrow = true;
      while (y + height < normalized.height && canGrow) {
        for (let dx = 0; dx < width; dx += 1) {
          const index = (y + height) * normalized.width + x + dx;
          if (visited[index] || normalized.grid[index] !== tile) {
            canGrow = false;
            break;
          }
        }
        if (canGrow) {
          height += 1;
        }
      }

      for (let dy = 0; dy < height; dy += 1) {
        for (let dx = 0; dx < width; dx += 1) {
          visited[(y + dy) * normalized.width + x + dx] = 1;
        }
      }

      rects.push({
        type: TILE_DEFS[tile].id,
        x: x * normalized.tileSize,
        y: y * normalized.tileSize,
        width: width * normalized.tileSize,
        height: height * normalized.tileSize,
      });
    }
  }

  return rects;
}

export function countNonEmptyTiles(level) {
  const normalized = normalizeLevel(level);
  let count = 0;
  for (const tile of normalized.grid) {
    if (tile !== TILE_INDEX.empty) {
      count += 1;
    }
  }
  for (const tile of normalized.backdrop) {
    if (tile !== TILE_INDEX.empty) {
      count += 1;
    }
  }
  return count;
}

export function setTile(level, x, y, tileId) {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
    return;
  }

  level.grid[y * level.width + x] = TILE_INDEX[tileId] ?? TILE_INDEX.empty;
}

export function setBackdropTile(level, x, y, tileId) {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
    return;
  }

  level.backdrop ??= new Uint8Array(level.width * level.height);
  level.backdrop[y * level.width + x] = normalizeBackdropTile(TILE_INDEX[tileId] ?? TILE_INDEX.empty);
}

export function getDoorKey(x, y) {
  return `${x},${y}`;
}

export function getDoorTopAt(level, x, y) {
  const normalized = normalizeLevel(level);
  if (x < 0 || y < 0 || x >= normalized.width || y >= normalized.height) {
    return null;
  }
  if (normalized.grid[y * normalized.width + x] !== TILE_INDEX.door) {
    return null;
  }

  let top = y;
  while (top > 0 && normalized.grid[(top - 1) * normalized.width + x] === TILE_INDEX.door) {
    top -= 1;
  }
  return { x, y: top };
}

export function getDoorInstances(level) {
  const normalized = normalizeLevel(level);
  const doors = [];
  for (let y = 0; y < normalized.height; y += 1) {
    for (let x = 0; x < normalized.width; x += 1) {
      if (normalized.grid[y * normalized.width + x] !== TILE_INDEX.door) {
        continue;
      }
      if (y > 0 && normalized.grid[(y - 1) * normalized.width + x] === TILE_INDEX.door) {
        continue;
      }

      let height = 1;
      while (y + height < normalized.height && normalized.grid[(y + height) * normalized.width + x] === TILE_INDEX.door) {
        height += 1;
      }
      doors.push({
        x,
        y,
        height,
        key: getDoorKey(x, y),
        valid: height === 2,
      });
    }
  }
  return doors;
}

function normalizePickupSpecs(specs, width, height) {
  if (!Array.isArray(specs)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();
  for (const spec of specs) {
    const x = clampInteger(spec?.x, 0, width - 1, -1);
    const y = clampInteger(spec?.y, 0, height - 1, -1);
    if (x < 0 || y < 0) {
      continue;
    }
    const key = `${x},${y}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push({
      x,
      y,
      kind: normalizePickupKind(spec?.kind),
      id: typeof spec?.id === 'string' && spec.id ? spec.id : 'random',
    });
  }
  return normalized;
}

function normalizePickupKind(kind) {
  return ['random', 'weapon', 'grenade', 'powerup'].includes(kind) ? kind : 'random';
}

function normalizeDoorLinks(links, width, height) {
  if (!Array.isArray(links)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();
  for (const link of links) {
    const a = normalizeDoorEndpoint(link?.a, width, height);
    const b = normalizeDoorEndpoint(link?.b, width, height);
    if (!a || !b) {
      continue;
    }
    const aKey = getDoorKey(a.x, a.y);
    const bKey = getDoorKey(b.x, b.y);
    if (aKey === bKey) {
      continue;
    }
    const pairKey = [aKey, bKey].sort().join('|');
    if (seen.has(pairKey)) {
      continue;
    }
    seen.add(pairKey);
    normalized.push({ a, b });
  }
  return normalized;
}

function normalizeDoorEndpoint(endpoint, width, height) {
  const x = clampInteger(endpoint?.x, 0, width - 1, -1);
  const y = clampInteger(endpoint?.y, 0, height - 1, -1);
  if (x < 0 || y < 0) {
    return null;
  }
  return { x, y };
}

function upgradeLegacySavedLevel(level) {
  if ([24, 40, 45, 48, 60, 64].includes(level.tileSize)) {
    return {
      ...level,
      tileSize: TILE_SIZE,
    };
  }
  return level;
}

function addBuilding(level, spec) {
  fillRectWorld(level, 'backdrop', spec.x - spec.width / 2, spec.floorY - 300 + 24, spec.width, 300);

  for (const floor of spec.floors) {
    fillRectWorld(
      level,
      floor.solid ? 'solid' : 'platform',
      spec.x - floor.width / 2,
      floor.solid ? floor.y - 23 : floor.y - 7,
      floor.width,
      floor.solid ? 46 : 14,
    );
  }

  for (const ladder of spec.ladders) {
    fillRectWorld(level, 'ladder', ladder.x - 12, ladder.y - ladder.height / 2, 24, ladder.height);
  }

  for (const windowSpec of spec.windows) {
    fillRectWorld(
      level,
      'glass',
      windowSpec.x - windowSpec.width / 2,
      windowSpec.y - windowSpec.height / 2,
      windowSpec.width,
      windowSpec.height,
    );
  }
}

function fillRectWorld(level, tileId, left, top, width, height) {
  const x0 = Math.floor(left / level.tileSize);
  const y0 = Math.floor(top / level.tileSize);
  const x1 = Math.ceil((left + width) / level.tileSize) - 1;
  const y1 = Math.ceil((top + height) / level.tileSize) - 1;
  fillRectTiles(level, tileId, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}

function fillRectTiles(level, tileId, x, y, width, height) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      if (tileId === 'backdrop' || tileId === 'void') {
        setBackdropTile(level, column, row, tileId);
      } else {
        setTile(level, column, row, tileId);
      }
    }
  }
}

function setWorldTile(level, tileId, worldX, worldY) {
  if (tileId === 'backdrop' || tileId === 'void') {
    setBackdropTile(level, Math.floor(worldX / level.tileSize), Math.floor(worldY / level.tileSize), tileId);
  } else {
    setTile(level, Math.floor(worldX / level.tileSize), Math.floor(worldY / level.tileSize), tileId);
  }
}

function encodeRuns(grid) {
  const runs = [];
  let start = 0;
  let type = grid[0] ?? TILE_INDEX.empty;
  let length = 0;

  for (let i = 0; i <= grid.length; i += 1) {
    const current = grid[i];
    if (i < grid.length && current === type) {
      length += 1;
      continue;
    }

    if (type !== TILE_INDEX.empty && length > 0) {
      runs.push({ start, length, type: TILE_DEFS[type].id });
    }

    start = i;
    type = current;
    length = 1;
  }

  return runs;
}

function decodeRuns(runs, grid, normalizeTile = (tile) => tile) {
  for (const run of runs) {
    const type = normalizeTile(TILE_INDEX[run.type] ?? TILE_INDEX.empty);
    const start = clampInteger(run.start, 0, grid.length, 0);
    const length = clampInteger(run.length, 0, grid.length - start, 0);
    for (let i = start; i < start + length; i += 1) {
      grid[i] = type;
    }
  }
}

function normalizeBackdropTile(tile) {
  const normalized = clampInteger(tile, 0, TILE_DEFS.length - 1, TILE_INDEX.empty);
  return normalized === TILE_INDEX.empty || normalized === TILE_INDEX.void
    ? normalized
    : TILE_INDEX.backdrop;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}
