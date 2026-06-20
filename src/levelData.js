export const LEVEL_STORAGE_KEY = 'superfighters.levelEditor.v1';
export const LEVEL_VERSION = 1;
export const TILE_SIZE = 24;
export const DEFAULT_LEVEL_WIDTH = 96;
export const DEFAULT_LEVEL_HEIGHT = 36;

export const TILE_DEFS = [
  { id: 'empty', label: 'Empty', color: '#00000000' },
  { id: 'solid', label: 'Wall', color: '#30283b', collides: true },
  { id: 'slopeUp', label: 'Slope Up', color: '#3f354d', collides: true, slope: 'up' },
  { id: 'slopeDown', label: 'Slope Down', color: '#3f354d', collides: true, slope: 'down' },
  { id: 'platform', label: 'Drop Platform', color: '#d8bd72', oneWay: true },
  { id: 'movingPlatform', label: 'Moving Platform', color: '#b9dc7a', oneWay: true, moving: true },
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
    pickupSpecs: [],
  };
}

export function createCurrentArenaSeed() {
  const level = createEmptyLevel('Current Arena Seed');

  fillRectWorld(level, 'void', 530, 450, 190, 430);
  fillRectWorld(level, 'void', 1150, 450, 150, 430);

  addBuilding(level, {
    x: 270,
    width: 500,
    floorY: 440,
    floors: [
      { y: 440, width: 500, solid: true },
      { y: 350, width: 430, platform: true },
      { y: 255, width: 360, platform: true },
    ],
    ladders: [
      { x: 150, y: 395, height: 90 },
      { x: 390, y: 302, height: 96 },
    ],
    windows: [
      { x: 215, y: 395, width: 42, height: 54 },
      { x: 315, y: 395, width: 42, height: 54 },
      { x: 260, y: 306, width: 52, height: 48 },
      { x: 435, y: 306, width: 44, height: 48 },
      { x: 330, y: 218, width: 48, height: 42 },
    ],
  });

  addBuilding(level, {
    x: 935,
    width: 400,
    floorY: 420,
    floors: [
      { y: 420, width: 400, solid: true },
      { y: 320, width: 330, platform: true },
      { y: 230, width: 270, platform: true },
    ],
    ladders: [
      { x: 845, y: 372, height: 98 },
      { x: 1010, y: 276, height: 92 },
    ],
    windows: [
      { x: 910, y: 374, width: 48, height: 54 },
      { x: 1000, y: 374, width: 48, height: 54 },
      { x: 935, y: 278, width: 50, height: 48 },
      { x: 1038, y: 202, width: 44, height: 38 },
    ],
  });

  addBuilding(level, {
    x: 1580,
    width: 520,
    floorY: 440,
    floors: [
      { y: 440, width: 520, solid: true },
      { y: 340, width: 440, platform: true },
      { y: 245, width: 370, platform: true },
    ],
    ladders: [
      { x: 1460, y: 390, height: 100 },
      { x: 1690, y: 292, height: 100 },
    ],
    windows: [
      { x: 1510, y: 392, width: 42, height: 56 },
      { x: 1610, y: 392, width: 42, height: 56 },
      { x: 1720, y: 392, width: 42, height: 56 },
      { x: 1545, y: 294, width: 52, height: 48 },
      { x: 1640, y: 294, width: 52, height: 48 },
      { x: 1745, y: 208, width: 48, height: 42 },
    ],
  });

  fillRectWorld(level, 'platform', 574, 358, 92, 14);
  fillRectWorld(level, 'platform', 1194, 358, 92, 14);
  fillRectWorld(level, 'platform', 590, 248, 120, 14);
  fillRectWorld(level, 'platform', 1150, 243, 120, 14);

  [
    { x: 170, y: 398 },
    { x: 330, y: 398 },
    { x: 260, y: 300 },
    { x: 440, y: 222 },
    { x: 780, y: 372 },
    { x: 920, y: 288 },
    { x: 1030, y: 198 },
    { x: 1260, y: 372 },
    { x: 1460, y: 398 },
    { x: 1635, y: 398 },
    { x: 1545, y: 292 },
    { x: 1745, y: 212 },
  ].forEach((point) => setWorldTile(level, 'pickup', point.x, point.y));

  setWorldTile(level, 'p1', 430, 392);
  setWorldTile(level, 'p2', 1580, 392);

  return level;
}

export function getSavedLevel() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LEVEL_STORAGE_KEY);
    return raw ? normalizeLevel(JSON.parse(raw)) : null;
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
    pickupSpecs: normalized.pickupSpecs,
  };
}

export function normalizeLevel(input) {
  const width = clampInteger(input?.width, 1, 512, DEFAULT_LEVEL_WIDTH);
  const height = clampInteger(input?.height, 1, 512, DEFAULT_LEVEL_HEIGHT);
  const tileSize = clampInteger(input?.tileSize, 1, 128, TILE_SIZE);
  const grid = new Uint8Array(width * height);

  if (input?.grid?.length === width * height) {
    for (let i = 0; i < grid.length; i += 1) {
      grid[i] = clampInteger(input.grid[i], 0, TILE_DEFS.length - 1, TILE_INDEX.empty);
    }
  } else if (Array.isArray(input?.runs)) {
    decodeRuns(input.runs, grid);
  }

  return {
    version: LEVEL_VERSION,
    name: typeof input?.name === 'string' ? input.name : 'Untitled Arena',
    width,
    height,
    tileSize,
    grid,
    pickupSpecs: normalizePickupSpecs(input?.pickupSpecs, width, height),
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
  return count;
}

export function setTile(level, x, y, tileId) {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
    return;
  }

  level.grid[y * level.width + x] = TILE_INDEX[tileId] ?? TILE_INDEX.empty;
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
      setTile(level, column, row, tileId);
    }
  }
}

function setWorldTile(level, tileId, worldX, worldY) {
  setTile(level, Math.floor(worldX / level.tileSize), Math.floor(worldY / level.tileSize), tileId);
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

function decodeRuns(runs, grid) {
  for (const run of runs) {
    const type = TILE_INDEX[run.type] ?? TILE_INDEX.empty;
    const start = clampInteger(run.start, 0, grid.length, 0);
    const length = clampInteger(run.length, 0, grid.length - start, 0);
    for (let i = start; i < start + length; i += 1) {
      grid[i] = type;
    }
  }
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}
