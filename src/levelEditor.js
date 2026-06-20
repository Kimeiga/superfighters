import { DEFAULT_GAMEPLAY_CONFIG } from './gameplayConfig.js';
import {
  TILE_DEFS,
  TILE_INDEX,
  clearSavedLevel,
  countNonEmptyTiles,
  createCurrentArenaSeed,
  createEmptyLevel,
  getSavedLevel,
  mergeTilesToRects,
  normalizeLevel,
  saveLevel,
  serializeLevel,
  setTile,
} from './levelData.js';
import './levelEditor.css';

const canvas = document.querySelector('#levelCanvas');
const palette = document.querySelector('#tilePalette');
const statsText = document.querySelector('#levelStats');
const statusText = document.querySelector('#editorStatus');
const selectionText = document.querySelector('#selectionText');
const cursorText = document.querySelector('#cursorText');
const brushSizeInput = document.querySelector('#brushSizeInput');
const zoomInput = document.querySelector('#zoomInput');
const saveButton = document.querySelector('#saveLevelButton');
const exportButton = document.querySelector('#exportLevelButton');
const importInput = document.querySelector('#importLevelInput');
const resetSeedButton = document.querySelector('#resetSeedButton');
const clearButton = document.querySelector('#clearLevelButton');
const playtestButton = document.querySelector('#playtestLevelButton');
const modeButtons = [...document.querySelectorAll('[data-tool-mode]')];
const prefabSelect = document.querySelector('#prefabSelect');
const pickupKindInput = document.querySelector('#pickupKindInput');
const pickupIdInput = document.querySelector('#pickupIdInput');
const colliderPreviewInput = document.querySelector('#colliderPreviewInput');
const copySelectionButton = document.querySelector('#copySelectionButton');
const cutSelectionButton = document.querySelector('#cutSelectionButton');
const pasteSelectionButton = document.querySelector('#pasteSelectionButton');
const deleteSelectionButton = document.querySelector('#deleteSelectionButton');
const undoButton = document.querySelector('#undoButton');
const redoButton = document.querySelector('#redoButton');
const levelWidthInput = document.querySelector('#levelWidthInput');
const levelHeightInput = document.querySelector('#levelHeightInput');
const levelTileSizeInput = document.querySelector('#levelTileSizeInput');
const resizeLevelButton = document.querySelector('#resizeLevelButton');
const cropLevelButton = document.querySelector('#cropLevelButton');
const validationList = document.querySelector('#validationList');
const ctx = canvas.getContext('2d');

const HISTORY_LIMIT = 80;
const AUTOSAVE_DELAY_MS = 450;
const PLATFORM_STROKE_WIDTH = 4;
const DEFAULT_LEVEL_SAVE_ENDPOINT = `${import.meta.env.BASE_URL}__superfighters/save-default-level`;
const TILE_CATEGORIES = [
  { label: 'Terrain', tiles: ['empty', 'solid', 'slopeUp', 'slopeDown', 'ceilingSlopeUp', 'ceilingSlopeDown', 'backdrop', 'void'] },
  { label: 'Platforms', tiles: ['platform', 'slopePlatformUp', 'slopePlatformDown', 'movingPlatform'] },
  { label: 'Breakables', tiles: ['crate', 'barrel', 'smallExplosive', 'swingingCrate'] },
  { label: 'Glass', tiles: ['glassLeft', 'glassRight', 'glass'] },
  { label: 'Ladders', tiles: ['ladderLeft', 'ladderRight', 'ladder'] },
  { label: 'Gameplay', tiles: ['pickup', 'door', 'light'] },
  { label: 'Players', tiles: ['p1', 'p2'] },
];
const PREFABS = {
  platform: {
    label: 'Small Platform',
    rows: [
      'PPPPPPPPPP',
    ],
    legend: { P: 'platform' },
    anchorX: 5,
    anchorY: 0,
  },
  movingPlatform: {
    label: 'Moving Platform',
    rows: [
      'MMMMMM',
    ],
    legend: { M: 'movingPlatform' },
    anchorX: 3,
    anchorY: 0,
  },
  rampPlatformUp: {
    label: 'Platform Ramp Up',
    rows: [
      '   U',
      '  U ',
      ' U  ',
      'U   ',
    ],
    legend: { U: 'slopePlatformUp' },
    anchorX: 0,
    anchorY: 3,
  },
  rampPlatformDown: {
    label: 'Platform Ramp Down',
    rows: [
      'D   ',
      ' D  ',
      '  D ',
      '   D',
    ],
    legend: { D: 'slopePlatformDown' },
    anchorX: 0,
    anchorY: 3,
  },
  ladder: {
    label: 'Ladder Shaft',
    rows: [
      'L R',
      'L R',
      'L R',
      'L R',
      'L R',
      'L R',
    ],
    legend: { L: 'ladderLeft', R: 'ladderRight' },
    anchorX: 1,
    anchorY: 5,
  },
  stairsUp: {
    label: 'Stairs Up',
    rows: [
      '   U',
      '  U ',
      ' U  ',
      'U   ',
    ],
    legend: { U: 'slopeUp' },
    anchorX: 0,
    anchorY: 3,
  },
  stairsDown: {
    label: 'Stairs Down',
    rows: [
      'D   ',
      ' D  ',
      '  D ',
      '   D',
    ],
    legend: { D: 'slopeDown' },
    anchorX: 0,
    anchorY: 3,
  },
  ceilingStairsUp: {
    label: 'Ceiling Stairs Up',
    rows: [
      'U   ',
      ' U  ',
      '  U ',
      '   U',
    ],
    legend: { U: 'ceilingSlopeUp' },
    anchorX: 0,
    anchorY: 0,
  },
  ceilingStairsDown: {
    label: 'Ceiling Stairs Down',
    rows: [
      '   D',
      '  D ',
      ' D  ',
      'D   ',
    ],
    legend: { D: 'ceilingSlopeDown' },
    anchorX: 0,
    anchorY: 0,
  },
  doorPair: {
    label: 'Door Pair',
    rows: [
      'D      D',
      'D      D',
    ],
    legend: { D: 'door' },
    anchorX: 0,
    anchorY: 1,
  },
  hazards: {
    label: 'Hazards',
    rows: [
      'CBXSL',
    ],
    legend: { C: 'crate', B: 'barrel', X: 'smallExplosive', S: 'swingingCrate', L: 'light' },
    anchorX: 0,
    anchorY: 0,
  },
  windowWall: {
    label: 'Window Wall',
    rows: [
      'BBBBBBBB',
      'BGBBBBBB',
      'BGBBBBBB',
      'BBBBBBGB',
      'BBBBBBGB',
      'BBBBBBBB',
    ],
    legend: { B: 'backdrop', G: 'glassLeft' },
    anchorX: 4,
    anchorY: 5,
  },
  building: {
    label: 'Building Chunk',
    rows: [
      'BBBBBBBBBBBB',
      'BGBBBBBBBGGB',
      'BGBBBBBBBGGB',
      'BBBBBBBBBBBB',
      'PBBBBBBBBBBP',
      'BBBBBBBBBBBB',
      'BGBBBLRBBGGB',
      'BGBBBLRBBGGB',
      'SSSSSSSSSSSS',
      'SSSSSSSSSSSS',
    ],
    legend: { S: 'solid', P: 'platform', B: 'backdrop', G: 'glassLeft', L: 'ladderLeft', R: 'ladderRight' },
    anchorX: 6,
    anchorY: 9,
  },
  pickupCluster: {
    label: 'Pickup Cluster',
    rows: [
      'U U',
      ' U ',
    ],
    legend: { U: 'pickup' },
    anchorX: 1,
    anchorY: 1,
  },
  spawnPair: {
    label: 'Spawn Pair',
    rows: [
      '1    2',
    ],
    legend: { 1: 'p1', 2: 'p2' },
    anchorX: 2,
    anchorY: 0,
  },
};

let level = normalizeEditorLevel(getSavedLevel() ?? createCurrentArenaSeed());
let selectedTile = 'solid';
let toolMode = 'brush';
let brushSize = 1;
let camera = { x: 0, y: 0, zoom: 1 };
let canvasSize = { width: 1, height: 1, dpr: 1 };
let hoverTile = null;
let drawing = false;
let panning = false;
let selecting = false;
let shapeStart = null;
let shapePreview = null;
let selectionStart = null;
let selectionRect = null;
let movingSelection = null;
let clipboard = null;
let activeStroke = false;
let lastPointer = { x: 0, y: 0 };
let spaceDown = false;
let fittedOnce = false;
let showColliderPreview = false;
let history = [];
let redoStack = [];
let autosaveEnabled = false;
let autosaveTimer = null;

buildPalette();
buildPickupOptions();
resizeCanvas();
fitToLevel();
updateUi();
autosaveEnabled = true;
requestAnimationFrame(draw);

window.addEventListener('resize', () => {
  resizeCanvas();
  if (!fittedOnce) {
    fitToLevel();
  }
  draw();
});

window.addEventListener('keydown', (event) => {
  if (isTypingIntoFormField()) {
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redo();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveEverywhere();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    copySelection();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'x') {
    event.preventDefault();
    cutSelection();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
    event.preventDefault();
    setToolMode('paste');
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    deleteSelection();
    return;
  }
  if (event.code === 'Space') {
    spaceDown = true;
    event.preventDefault();
    return;
  }

  const keyTools = {
    b: 'brush',
    e: 'erase',
    r: 'rect',
    l: 'line',
    f: 'fill',
    s: 'select',
    t: 'stamp',
    v: 'paste',
  };
  const nextMode = keyTools[event.key.toLowerCase()];
  if (nextMode) {
    setToolMode(nextMode);
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    spaceDown = false;
  }
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  lastPointer = { x: event.clientX, y: event.clientY };
  const tile = pointerToTile(event);
  hoverTile = tile.inBounds ? tile : null;

  if (event.button === 1 || spaceDown) {
    panning = true;
    return;
  }

  if (!tile.inBounds) {
    return;
  }

  if (toolMode === 'select') {
    startSelectionPointer(tile);
  } else if (toolMode === 'rect' || toolMode === 'line') {
    shapeStart = tile;
    shapePreview = { mode: toolMode, from: tile, to: tile };
  } else if (toolMode === 'fill') {
    pushHistory('Fill');
    floodFill(tile.x, tile.y, selectedTile);
    updateUi('Filled area.');
  } else if (toolMode === 'stamp') {
    pushHistory('Stamp');
    placePrefab(tile.x, tile.y, prefabSelect.value);
    updateUi(`Placed ${PREFABS[prefabSelect.value]?.label ?? 'prefab'}.`);
  } else if (toolMode === 'paste') {
    pasteClipboardAt(tile.x, tile.y);
  } else {
    drawing = true;
    beginStroke();
    paintAtTile(tile, event.button === 2 || toolMode === 'erase' ? 'empty' : selectedTile);
  }
  draw();
});

canvas.addEventListener('pointermove', (event) => {
  const tile = pointerToTile(event);
  hoverTile = tile.inBounds ? tile : null;
  updateCursorText();

  if (panning) {
    camera.x += event.clientX - lastPointer.x;
    camera.y += event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };
    draw();
    return;
  }

  if (movingSelection && tile.inBounds) {
    movingSelection.targetX = clamp(tile.x - movingSelection.offsetX, 0, level.width - movingSelection.buffer.width);
    movingSelection.targetY = clamp(tile.y - movingSelection.offsetY, 0, level.height - movingSelection.buffer.height);
    draw();
    return;
  }

  if (selecting && tile.inBounds) {
    selectionRect = makeRect(selectionStart.x, selectionStart.y, tile.x, tile.y);
    updateUi();
    draw();
    return;
  }

  if (shapePreview && tile.inBounds) {
    shapePreview.to = tile;
    draw();
    return;
  }

  if (drawing && tile.inBounds) {
    paintAtTile(tile, event.buttons === 2 || toolMode === 'erase' ? 'empty' : selectedTile);
    updateUi();
    draw();
    return;
  }

  draw();
});

canvas.addEventListener('pointerup', () => {
  if (movingSelection) {
    pasteBufferAt(movingSelection.buffer, movingSelection.targetX, movingSelection.targetY);
    selectionRect = {
      x: movingSelection.targetX,
      y: movingSelection.targetY,
      width: movingSelection.buffer.width,
      height: movingSelection.buffer.height,
    };
    movingSelection = null;
    updateUi('Moved selection.');
  }

  if (shapePreview) {
    pushHistory(shapePreview.mode === 'rect' ? 'Rectangle' : 'Line');
    if (shapePreview.mode === 'rect') {
      const rect = makeRect(shapePreview.from.x, shapePreview.from.y, shapePreview.to.x, shapePreview.to.y);
      fillTileRect(rect, selectedTile);
    } else {
      paintLine(shapePreview.from.x, shapePreview.from.y, shapePreview.to.x, shapePreview.to.y, selectedTile);
    }
    shapeStart = null;
    shapePreview = null;
    updateUi('Applied shape.');
  }

  drawing = false;
  activeStroke = false;
  selecting = false;
  panning = false;
  draw();
});

canvas.addEventListener('pointerleave', () => {
  hoverTile = null;
  drawing = false;
  activeStroke = false;
  selecting = false;
  panning = false;
  draw();
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const zoomBefore = camera.zoom;
  const nextZoom = clamp(camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.25, 3);
  const rect = canvas.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  const worldX = (pointerX - camera.x) / zoomBefore;
  const worldY = (pointerY - camera.y) / zoomBefore;

  camera.zoom = nextZoom;
  camera.x = pointerX - worldX * nextZoom;
  camera.y = pointerY - worldY * nextZoom;
  zoomInput.value = String(nextZoom);
  draw();
});

brushSizeInput.addEventListener('input', () => {
  brushSize = clamp(Number.parseInt(brushSizeInput.value, 10) || 1, 1, 12);
  brushSizeInput.value = String(brushSize);
});

zoomInput.addEventListener('input', () => {
  const centerX = canvasSize.width / 2;
  const centerY = canvasSize.height / 2;
  const worldX = (centerX - camera.x) / camera.zoom;
  const worldY = (centerY - camera.y) / camera.zoom;
  camera.zoom = Number.parseFloat(zoomInput.value);
  camera.x = centerX - worldX * camera.zoom;
  camera.y = centerY - worldY * camera.zoom;
  draw();
});

saveButton.addEventListener('click', () => {
  saveEverywhere();
});

playtestButton.addEventListener('click', () => {
  saveEditorLevelNow();
  window.location.href = './?playtestLevel=1';
});

exportButton.addEventListener('click', () => {
  const json = JSON.stringify(serializeLevel(level), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(level.name)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('Exported JSON.');
});

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  importInput.value = '';
  if (!file) {
    return;
  }

  try {
    pushHistory('Import');
    level = normalizeEditorLevel(JSON.parse(await file.text()));
    selectionRect = null;
    fitToLevel();
    updateUi(`Imported ${level.name}.`);
  } catch {
    setStatus('Import failed.');
  }
});

resetSeedButton.addEventListener('click', () => {
  pushHistory('Reset Seed');
  level = normalizeEditorLevel(createCurrentArenaSeed());
  clearSavedLevel();
  selectionRect = null;
  fitToLevel();
  updateUi('Reset to current arena seed.');
});

clearButton.addEventListener('click', () => {
  pushHistory('New Blank');
  level = normalizeEditorLevel(createEmptyLevel('Blank Arena'));
  saveEditorLevelNow();
  selectionRect = null;
  fitToLevel();
  updateUi('Started a blank level and saved it locally.');
});

for (const button of modeButtons) {
  button.addEventListener('click', () => setToolMode(button.dataset.toolMode));
}

pickupKindInput.addEventListener('change', () => {
  buildPickupOptions();
  setStatus('Pickup paint settings updated.');
});

pickupIdInput.addEventListener('change', () => {
  setStatus('Pickup paint settings updated.');
});

colliderPreviewInput.addEventListener('change', () => {
  showColliderPreview = colliderPreviewInput.checked;
  draw();
});

copySelectionButton.addEventListener('click', copySelection);
cutSelectionButton.addEventListener('click', cutSelection);
pasteSelectionButton.addEventListener('click', () => setToolMode('paste'));
deleteSelectionButton.addEventListener('click', deleteSelection);
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);

resizeLevelButton.addEventListener('click', () => {
  const width = clamp(Number.parseInt(levelWidthInput.value, 10) || level.width, 8, 512);
  const height = clamp(Number.parseInt(levelHeightInput.value, 10) || level.height, 8, 512);
  const tileSize = clamp(Number.parseInt(levelTileSizeInput.value, 10) || level.tileSize, 16, 96);
  pushHistory('Resize');
  resizeLevel(width, height, tileSize);
  fitToLevel();
  updateUi(`Resized to ${width}x${height} at ${tileSize}px tiles.`);
});

cropLevelButton.addEventListener('click', () => {
  pushHistory('Crop');
  cropEmptySpace();
  fitToLevel();
  updateUi('Cropped empty space.');
});

function buildPalette() {
  palette.innerHTML = '';
  const rendered = new Set();

  for (const category of TILE_CATEGORIES) {
    const section = document.createElement('section');
    section.className = 'tile-category';

    const heading = document.createElement('h3');
    heading.textContent = category.label;

    const grid = document.createElement('div');
    grid.className = 'tile-category-grid';

    for (const tileId of category.tiles) {
      const tile = TILE_DEFS[TILE_INDEX[tileId]];
      if (!tile) {
        continue;
      }
      grid.append(createTileButton(tile));
      rendered.add(tile.id);
    }

    section.append(heading, grid);
    palette.append(section);
  }

  const uncategorized = TILE_DEFS.filter((tile) => !rendered.has(tile.id));
  if (uncategorized.length) {
    const section = document.createElement('section');
    section.className = 'tile-category';
    const heading = document.createElement('h3');
    heading.textContent = 'Other';
    const grid = document.createElement('div');
    grid.className = 'tile-category-grid';
    for (const tile of uncategorized) {
      grid.append(createTileButton(tile));
    }
    section.append(heading, grid);
    palette.append(section);
  }
}

function createTileButton(tile) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tile-button${tile.id === selectedTile ? ' selected' : ''}`;
  button.dataset.tile = tile.id;

  const swatch = document.createElement('span');
  swatch.className = 'tile-swatch';
  if (tile.id !== 'empty') {
    swatch.style.background = tile.color;
  }

  const label = document.createElement('span');
  label.textContent = tile.label;
  button.append(swatch, label);
  button.addEventListener('click', () => selectTile(tile.id));
  return button;
}

function buildPickupOptions() {
  const kind = pickupKindInput.value;
  pickupIdInput.innerHTML = '';
  addOption(pickupIdInput, 'random', 'Random');
  pickupIdInput.disabled = kind === 'random' || kind === 'grenade';

  if (kind === 'weapon') {
    for (const [id, weapon] of Object.entries(DEFAULT_GAMEPLAY_CONFIG.weapons)) {
      addOption(pickupIdInput, id, weapon.label);
    }
  } else if (kind === 'powerup') {
    for (const [id, powerup] of Object.entries(DEFAULT_GAMEPLAY_CONFIG.powerups)) {
      addOption(pickupIdInput, id, powerup.label);
    }
  }
}

function addOption(select, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function selectTile(tileId) {
  selectedTile = tileId;
  for (const button of palette.querySelectorAll('.tile-button')) {
    button.classList.toggle('selected', button.dataset.tile === selectedTile);
  }
  updateUi();
}

function setToolMode(mode) {
  toolMode = mode;
  for (const button of modeButtons) {
    button.classList.toggle('selected', button.dataset.toolMode === toolMode);
  }
  setStatus(`Tool: ${mode}.`);
  draw();
}

function startSelectionPointer(tile) {
  if (selectionRect && isTileInRect(tile.x, tile.y, selectionRect)) {
    pushHistory('Move Selection');
    const buffer = copyRectBuffer(selectionRect);
    clearTileRect(selectionRect);
    movingSelection = {
      buffer,
      offsetX: tile.x - selectionRect.x,
      offsetY: tile.y - selectionRect.y,
      targetX: selectionRect.x,
      targetY: selectionRect.y,
    };
    return;
  }

  selecting = true;
  selectionStart = tile;
  selectionRect = { x: tile.x, y: tile.y, width: 1, height: 1 };
}

function beginStroke() {
  if (activeStroke) {
    return;
  }
  activeStroke = true;
  pushHistory('Brush');
}

function paintAtTile(tile, tileId) {
  const radius = Math.floor((brushSize - 1) / 2);
  const extra = brushSize % 2 === 0 ? 1 : 0;
  for (let y = tile.y - radius; y <= tile.y + radius + extra; y += 1) {
    for (let x = tile.x - radius; x <= tile.x + radius + extra; x += 1) {
      setEditorTile(x, y, tileId);
    }
  }
}

function setEditorTile(x, y, tileId, options = {}) {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
    return;
  }

  if (tileId === 'p1' || tileId === 'p2') {
    clearTileType(tileId);
  }

  setTile(level, x, y, tileId);
  if (tileId === 'pickup') {
    setPickupSpec(x, y, options.pickupSpec ?? getCurrentPickupSpec());
  } else {
    removePickupSpec(x, y);
  }
}

function getCurrentPickupSpec() {
  const kind = pickupKindInput.value;
  return {
    kind,
    id: kind === 'grenade' || kind === 'random' ? 'random' : pickupIdInput.value,
  };
}

function setPickupSpec(x, y, spec) {
  removePickupSpec(x, y);
  level.pickupSpecs.push({
    x,
    y,
    kind: ['random', 'weapon', 'grenade', 'powerup'].includes(spec.kind) ? spec.kind : 'random',
    id: spec.id || 'random',
  });
}

function removePickupSpec(x, y) {
  level.pickupSpecs = level.pickupSpecs.filter((spec) => spec.x !== x || spec.y !== y);
}

function getPickupSpec(x, y) {
  return level.pickupSpecs.find((spec) => spec.x === x && spec.y === y) ?? { x, y, kind: 'random', id: 'random' };
}

function clearTileType(tileId) {
  const index = TILE_INDEX[tileId];
  for (let i = 0; i < level.grid.length; i += 1) {
    if (level.grid[i] === index) {
      level.grid[i] = TILE_INDEX.empty;
    }
  }
}

function fillTileRect(rect, tileId) {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      setEditorTile(x, y, tileId);
    }
  }
}

function clearTileRect(rect) {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      setEditorTile(x, y, 'empty');
    }
  }
}

function paintLine(x0, y0, x1, y1, tileId) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    setEditorTile(x0, y0, tileId);
    if (x0 === x1 && y0 === y1) {
      break;
    }
    const twiceError = 2 * error;
    if (twiceError >= dy) {
      error += dy;
      x0 += sx;
    }
    if (twiceError <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function floodFill(startX, startY, tileId) {
  const target = level.grid[startY * level.width + startX];
  const replacement = TILE_INDEX[tileId] ?? TILE_INDEX.empty;
  if (target === replacement) {
    return;
  }

  const stack = [[startX, startY]];
  const seen = new Set();
  while (stack.length) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;
    if (seen.has(key) || x < 0 || y < 0 || x >= level.width || y >= level.height) {
      continue;
    }
    const index = y * level.width + x;
    if (level.grid[index] !== target) {
      continue;
    }
    seen.add(key);
    setEditorTile(x, y, tileId);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

function placePrefab(tileX, tileY, prefabId) {
  const prefab = PREFABS[prefabId] ?? PREFABS.platform;
  for (let row = 0; row < prefab.rows.length; row += 1) {
    const line = prefab.rows[row];
    for (let column = 0; column < line.length; column += 1) {
      const tileId = prefab.legend[line[column]];
      if (!tileId) {
        continue;
      }
      setEditorTile(tileX + column - prefab.anchorX, tileY + row - prefab.anchorY, tileId);
    }
  }
}

function copySelection() {
  if (!selectionRect) {
    setStatus('No selection to copy.');
    return;
  }
  clipboard = copyRectBuffer(selectionRect);
  updateUi('Copied selection.');
}

function cutSelection() {
  if (!selectionRect) {
    setStatus('No selection to cut.');
    return;
  }
  pushHistory('Cut');
  clipboard = copyRectBuffer(selectionRect);
  clearTileRect(selectionRect);
  selectionRect = null;
  updateUi('Cut selection.');
}

function deleteSelection() {
  if (!selectionRect) {
    setStatus('No selection to delete.');
    return;
  }
  pushHistory('Delete');
  clearTileRect(selectionRect);
  selectionRect = null;
  updateUi('Deleted selection.');
}

function pasteClipboardAt(tileX, tileY) {
  if (!clipboard) {
    setStatus('Clipboard is empty.');
    return;
  }
  pushHistory('Paste');
  pasteBufferAt(clipboard, tileX, tileY);
  selectionRect = { x: tileX, y: tileY, width: clipboard.width, height: clipboard.height };
  updateUi('Pasted selection.');
}

function copyRectBuffer(rect) {
  const tiles = new Uint8Array(rect.width * rect.height);
  const pickupSpecs = [];
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const sourceX = rect.x + x;
      const sourceY = rect.y + y;
      tiles[y * rect.width + x] = level.grid[sourceY * level.width + sourceX];
      const spec = getPickupSpec(sourceX, sourceY);
      if (level.grid[sourceY * level.width + sourceX] === TILE_INDEX.pickup) {
        pickupSpecs.push({ ...spec, x, y });
      }
    }
  }
  return { width: rect.width, height: rect.height, tiles, pickupSpecs };
}

function pasteBufferAt(buffer, tileX, tileY) {
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      const index = buffer.tiles[y * buffer.width + x];
      const tileId = TILE_DEFS[index]?.id ?? 'empty';
      const spec = buffer.pickupSpecs.find((item) => item.x === x && item.y === y);
      setEditorTile(tileX + x, tileY + y, tileId, { pickupSpec: spec });
    }
  }
}

function resizeLevel(width, height, tileSize = level.tileSize) {
  const next = createEmptyLevel(level.name);
  next.width = width;
  next.height = height;
  next.tileSize = tileSize;
  next.grid = new Uint8Array(width * height);
  next.pickupSpecs = [];

  const copyWidth = Math.min(level.width, width);
  const copyHeight = Math.min(level.height, height);
  for (let y = 0; y < copyHeight; y += 1) {
    for (let x = 0; x < copyWidth; x += 1) {
      next.grid[y * width + x] = level.grid[y * level.width + x];
    }
  }
  next.pickupSpecs = level.pickupSpecs
    .filter((spec) => spec.x < width && spec.y < height)
    .map((spec) => ({ ...spec }));
  level = normalizeEditorLevel(next);
  selectionRect = null;
}

function cropEmptySpace() {
  const bounds = getNonEmptyBounds();
  if (!bounds) {
    level = normalizeEditorLevel(createEmptyLevel(level.name));
    selectionRect = null;
    return;
  }

  const padding = 2;
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(level.width - 1, bounds.right + padding);
  const bottom = Math.min(level.height - 1, bounds.bottom + padding);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const next = createEmptyLevel(level.name);
  next.width = width;
  next.height = height;
  next.tileSize = level.tileSize;
  next.grid = new Uint8Array(width * height);
  next.pickupSpecs = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      next.grid[y * width + x] = level.grid[(top + y) * level.width + left + x];
    }
  }
  next.pickupSpecs = level.pickupSpecs
    .filter((spec) => spec.x >= left && spec.x <= right && spec.y >= top && spec.y <= bottom)
    .map((spec) => ({ ...spec, x: spec.x - left, y: spec.y - top }));
  level = normalizeEditorLevel(next);
  selectionRect = null;
}

function getNonEmptyBounds() {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (level.grid[y * level.width + x] !== TILE_INDEX.empty) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return Number.isFinite(left) ? { left, top, right, bottom } : null;
}

function pushHistory() {
  history.push(serializeLevel(level));
  if (history.length > HISTORY_LIMIT) {
    history.shift();
  }
  redoStack = [];
  updateHistoryButtons();
}

function undo() {
  if (!history.length) {
    return;
  }
  redoStack.push(serializeLevel(level));
  level = normalizeEditorLevel(history.pop());
  selectionRect = null;
  updateUi('Undo.');
}

function redo() {
  if (!redoStack.length) {
    return;
  }
  history.push(serializeLevel(level));
  level = normalizeEditorLevel(redoStack.pop());
  selectionRect = null;
  updateUi('Redo.');
}

function updateHistoryButtons() {
  undoButton.disabled = history.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function pointerToTile(event) {
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const worldX = (screenX - camera.x) / camera.zoom;
  const worldY = (screenY - camera.y) / camera.zoom;
  const x = Math.floor(worldX / level.tileSize);
  const y = Math.floor(worldY / level.tileSize);
  return {
    x,
    y,
    inBounds: x >= 0 && y >= 0 && x < level.width && y < level.height,
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvasSize = { width: rect.width, height: rect.height, dpr };
}

function fitToLevel() {
  const mapWidth = level.width * level.tileSize;
  const mapHeight = level.height * level.tileSize;
  const zoom = clamp(
    Math.min(canvasSize.width / (mapWidth + level.tileSize * 2), canvasSize.height / (mapHeight + level.tileSize * 2)),
    0.25,
    3,
  );
  camera.zoom = zoom;
  camera.x = Math.floor((canvasSize.width - mapWidth * zoom) / 2);
  camera.y = Math.floor((canvasSize.height - mapHeight * zoom) / 2);
  zoomInput.value = String(zoom);
  fittedOnce = true;
  draw();
}

function draw() {
  ctx.setTransform(canvasSize.dpr, 0, 0, canvasSize.dpr, 0, 0);
  ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  ctx.fillStyle = '#0b111c';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  drawSky();

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  drawTiles();
  if (showColliderPreview) {
    drawColliderPreview();
  }
  drawGrid();
  drawMapBorder();
  drawSelection();
  drawShapePreview();
  drawMovingSelection();
  drawStampPreview();
  drawHover();
  ctx.restore();
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.height);
  gradient.addColorStop(0, '#74c8f5');
  gradient.addColorStop(1, '#9db1aa');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
}

function drawTiles() {
  const tileSize = level.tileSize;
  const startX = clamp(Math.floor((-camera.x / camera.zoom) / tileSize) - 1, 0, level.width - 1);
  const startY = clamp(Math.floor((-camera.y / camera.zoom) / tileSize) - 1, 0, level.height - 1);
  const endX = clamp(Math.ceil(((canvasSize.width - camera.x) / camera.zoom) / tileSize) + 1, 0, level.width);
  const endY = clamp(Math.ceil(((canvasSize.height - camera.y) / camera.zoom) / tileSize) + 1, 0, level.height);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const tile = level.grid[y * level.width + x];
      if (tile === TILE_INDEX.empty) {
        continue;
      }

      const def = TILE_DEFS[tile];
      const drawX = x * tileSize;
      const drawY = y * tileSize;
      drawEditorTile(ctx, def, drawX, drawY, tileSize, x, y);

      if (def.marker) {
        if (def.id !== 'door' && def.id !== 'light') {
          ctx.fillStyle = '#101622';
          ctx.fillRect(drawX + 5, drawY + 5, tileSize - 10, tileSize - 10);
        }
        ctx.fillStyle = def.color;
        ctx.font = '10px FusionPixel12, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getMarkerLabel(def, x, y), drawX + tileSize / 2, drawY + tileSize / 2 + 1);
      }
    }
  }
}

function drawEditorTile(context, def, x, y, size) {
  context.save();
  context.globalAlpha = def.id === 'backdrop' ? 0.75 : def.id === 'void' ? 0.92 : 1;

  switch (def.id) {
    case 'solid':
      context.fillStyle = def.color;
      context.fillRect(x, y, size, size);
      context.fillStyle = '#78c073';
      context.fillRect(x, y, size, Math.max(2, size * 0.16));
      context.fillStyle = 'rgba(0, 0, 0, 0.24)';
      context.fillRect(x, y + size - 3, size, 3);
      break;
    case 'slopeUp':
      context.fillStyle = def.color;
      context.beginPath();
      context.moveTo(x, y + size);
      context.lineTo(x + size, y);
      context.lineTo(x + size, y + size);
      context.closePath();
      context.fill();
      context.strokeStyle = '#78c073';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, y + size - 1);
      context.lineTo(x + size, y + 1);
      context.stroke();
      break;
    case 'slopeDown':
      context.fillStyle = def.color;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + size);
      context.lineTo(x + size, y + size);
      context.closePath();
      context.fill();
      context.strokeStyle = '#78c073';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, y + 1);
      context.lineTo(x + size, y + size - 1);
      context.stroke();
      break;
    case 'ceilingSlopeUp':
      context.fillStyle = def.color;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + size, y);
      context.lineTo(x, y + size);
      context.closePath();
      context.fill();
      context.strokeStyle = '#78c073';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, y + size - 1);
      context.lineTo(x + size, y + 1);
      context.stroke();
      break;
    case 'ceilingSlopeDown':
      context.fillStyle = def.color;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + size, y);
      context.lineTo(x + size, y + size);
      context.closePath();
      context.fill();
      context.strokeStyle = '#78c073';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, y + 1);
      context.lineTo(x + size, y + size - 1);
      context.stroke();
      break;
    case 'platform':
      context.fillStyle = def.color;
      context.fillRect(x, y, size, Math.min(PLATFORM_STROKE_WIDTH, size));
      break;
    case 'slopePlatformUp':
      context.strokeStyle = def.color;
      context.lineWidth = PLATFORM_STROKE_WIDTH;
      context.beginPath();
      context.moveTo(x, y + size - 2);
      context.lineTo(x + size, y + 2);
      context.stroke();
      break;
    case 'slopePlatformDown':
      context.strokeStyle = def.color;
      context.lineWidth = PLATFORM_STROKE_WIDTH;
      context.beginPath();
      context.moveTo(x, y + 2);
      context.lineTo(x + size, y + size - 2);
      context.stroke();
      break;
    case 'movingPlatform':
      context.fillStyle = def.color;
      context.fillRect(x, y, size, Math.min(PLATFORM_STROKE_WIDTH, size));
      break;
    case 'crate':
    case 'swingingCrate':
      if (def.id === 'swingingCrate') {
        context.strokeStyle = '#d7c1a1';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x + size / 2, y);
        context.lineTo(x + size / 2, y + size * 0.25);
        context.stroke();
      }
      context.fillStyle = def.color;
      context.fillRect(x + 2, y + size * 0.22, size - 4, size * 0.72);
      context.strokeStyle = '#5e3f29';
      context.lineWidth = 2;
      context.strokeRect(x + 3, y + size * 0.25, size - 6, size * 0.66);
      context.beginPath();
      context.moveTo(x + 4, y + size * 0.27);
      context.lineTo(x + size - 4, y + size * 0.9);
      context.moveTo(x + size - 4, y + size * 0.27);
      context.lineTo(x + 4, y + size * 0.9);
      context.stroke();
      break;
    case 'barrel':
      context.fillStyle = def.color;
      context.fillRect(x + 4, y + 2, size - 8, size - 4);
      context.fillStyle = '#ffe078';
      context.fillRect(x + 4, y + size * 0.28, size - 8, 3);
      context.fillRect(x + 4, y + size * 0.68, size - 8, 3);
      context.fillStyle = '#5b1f22';
      context.fillRect(x + size * 0.43, y + size * 0.42, size * 0.14, size * 0.18);
      break;
    case 'smallExplosive':
      context.fillStyle = '#332134';
      context.fillRect(x + 3, y + 3, size - 6, size - 6);
      context.fillStyle = def.color;
      context.beginPath();
      context.moveTo(x + size / 2, y + 4);
      context.lineTo(x + size - 4, y + size / 2);
      context.lineTo(x + size / 2, y + size - 4);
      context.lineTo(x + 4, y + size / 2);
      context.closePath();
      context.fill();
      break;
    case 'glass':
    case 'glassLeft':
    case 'glassRight': {
      const lineX = def.id === 'glassLeft' ? x + 3 : def.id === 'glassRight' ? x + size - 3 : x + size / 2;
      context.strokeStyle = def.color;
      context.lineWidth = Math.max(2, size * 0.16);
      context.beginPath();
      context.moveTo(lineX, y + 2);
      context.lineTo(lineX, y + size - 2);
      context.stroke();
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(lineX + 2, y + 5);
      context.lineTo(lineX + 2, y + size * 0.45);
      context.stroke();
      break;
    }
    case 'ladder':
    case 'ladderLeft':
    case 'ladderRight': {
      const centerX = def.id === 'ladderLeft' ? x + 5 : def.id === 'ladderRight' ? x + size - 5 : x + size / 2;
      context.strokeStyle = def.color;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(centerX - 4, y + 1);
      context.lineTo(centerX - 4, y + size - 1);
      context.moveTo(centerX + 4, y + 1);
      context.lineTo(centerX + 4, y + size - 1);
      context.stroke();
      context.lineWidth = 2;
      for (let rungY = y + 5; rungY < y + size; rungY += 8) {
        context.beginPath();
        context.moveTo(centerX - 5, rungY);
        context.lineTo(centerX + 5, rungY);
        context.stroke();
      }
      break;
    }
    case 'door':
      context.fillStyle = '#111827';
      context.fillRect(x + 4, y + 3, size - 8, size - 3);
      context.strokeStyle = def.color;
      context.lineWidth = 2;
      context.strokeRect(x + 4, y + 3, size - 8, size - 3);
      context.fillStyle = '#8cffab';
      context.fillRect(x + 5, y + 1, size - 10, 4);
      break;
    case 'light':
      context.strokeStyle = '#65758a';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x + size / 2, y);
      context.lineTo(x + size / 2, y + size * 0.28);
      context.stroke();
      context.fillStyle = def.color;
      context.fillRect(x + size * 0.3, y + size * 0.28, size * 0.4, size * 0.18);
      context.fillStyle = 'rgba(255, 240, 166, 0.28)';
      context.beginPath();
      context.moveTo(x + size * 0.3, y + size * 0.46);
      context.lineTo(x + size * 0.7, y + size * 0.46);
      context.lineTo(x + size * 0.9, y + size);
      context.lineTo(x + size * 0.1, y + size);
      context.closePath();
      context.fill();
      break;
    case 'pickup':
      context.fillStyle = def.color;
      context.fillRect(x + 2, y + 2, size - 4, size - 4);
      break;
    default:
      context.fillStyle = def.color;
      context.fillRect(x, y, size, size);
      break;
  }

  context.restore();
}

function getMarkerLabel(def, x, y) {
  if (def.id === 'door') {
    return 'EXIT';
  }
  if (def.id === 'light') {
    return '';
  }
  if (def.id !== 'pickup') {
    return def.label;
  }
  const spec = getPickupSpec(x, y);
  if (spec.kind === 'weapon') {
    return spec.id === 'random' ? 'W?' : 'W';
  }
  if (spec.kind === 'grenade') {
    return 'G';
  }
  if (spec.kind === 'powerup') {
    return spec.id === 'random' ? 'P?' : 'P';
  }
  return '?';
}

function drawColliderPreview() {
  const rectSets = [
    { rects: mergeTilesToRects(level, ['solid']), color: '#35f2ff' },
    { rects: mergeTilesToRects(level, ['glass', 'glassLeft', 'glassRight']), color: '#ffffff' },
    { rects: mergeTilesToRects(level, ['crate', 'barrel', 'smallExplosive', 'swingingCrate']), color: '#ff9f43' },
  ];
  ctx.save();
  ctx.globalAlpha = 0.86;
  for (const set of rectSets) {
    ctx.strokeStyle = set.color;
    ctx.lineWidth = 2 / camera.zoom;
    for (const rect of set.rects) {
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }
  const platformRects = mergeTilesToRects(level, ['platform', 'movingPlatform']);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = PLATFORM_STROKE_WIDTH / camera.zoom;
  for (const rect of platformRects) {
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y);
    ctx.lineTo(rect.x + rect.width, rect.y);
    ctx.stroke();
  }
  for (const slope of findTiles('slopeUp')
    .concat(
      findTiles('slopeDown'),
      findTiles('ceilingSlopeUp'),
      findTiles('ceilingSlopeDown'),
      findTiles('slopePlatformUp'),
      findTiles('slopePlatformDown'),
    )) {
    const tile = level.grid[slope.y * level.width + slope.x];
    const def = TILE_DEFS[tile];
    const x = slope.x * level.tileSize;
    const y = slope.y * level.tileSize;
    ctx.strokeStyle = '#78c073';
    ctx.beginPath();
    if (def.id === 'slopeUp' || def.id === 'ceilingSlopeUp' || def.id === 'slopePlatformUp') {
      ctx.moveTo(x, y + level.tileSize);
      ctx.lineTo(x + level.tileSize, y);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + level.tileSize, y + level.tileSize);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrid() {
  const tileSize = level.tileSize;
  const mapWidth = level.width * tileSize;
  const mapHeight = level.height * tileSize;
  const visibleGrid = tileSize * camera.zoom >= 5;
  if (!visibleGrid) {
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1 / camera.zoom;
  for (let x = 0; x <= mapWidth; x += tileSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, mapHeight);
  }
  for (let y = 0; y <= mapHeight; y += tileSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(mapWidth, y);
  }
  ctx.stroke();
}

function drawMapBorder() {
  ctx.strokeStyle = '#35f2ff';
  ctx.lineWidth = 2 / camera.zoom;
  ctx.strokeRect(0, 0, level.width * level.tileSize, level.height * level.tileSize);
}

function drawSelection() {
  if (!selectionRect) {
    return;
  }
  strokeTileRect(selectionRect, '#fffbdf', 2);
}

function drawShapePreview() {
  if (!shapePreview) {
    return;
  }
  if (shapePreview.mode === 'rect') {
    strokeTileRect(makeRect(shapePreview.from.x, shapePreview.from.y, shapePreview.to.x, shapePreview.to.y), '#ffffff', 2);
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.beginPath();
    ctx.moveTo((shapePreview.from.x + 0.5) * level.tileSize, (shapePreview.from.y + 0.5) * level.tileSize);
    ctx.lineTo((shapePreview.to.x + 0.5) * level.tileSize, (shapePreview.to.y + 0.5) * level.tileSize);
    ctx.stroke();
  }
}

function drawMovingSelection() {
  if (!movingSelection) {
    return;
  }
  strokeTileRect({
    x: movingSelection.targetX,
    y: movingSelection.targetY,
    width: movingSelection.buffer.width,
    height: movingSelection.buffer.height,
  }, '#8de7ff', 2);
}

function drawStampPreview() {
  if (toolMode !== 'stamp' || !hoverTile) {
    return;
  }
  const prefab = PREFABS[prefabSelect.value] ?? PREFABS.platform;
  const rect = {
    x: hoverTile.x - prefab.anchorX,
    y: hoverTile.y - prefab.anchorY,
    width: Math.max(...prefab.rows.map((row) => row.length)),
    height: prefab.rows.length,
  };
  strokeTileRect(rect, '#9cffd0', 2);
}

function drawHover() {
  if (!hoverTile || ['rect', 'line', 'select', 'stamp', 'paste'].includes(toolMode)) {
    return;
  }

  const brushPixels = brushSize * level.tileSize;
  const radius = Math.floor((brushSize - 1) / 2);
  const x = (hoverTile.x - radius) * level.tileSize;
  const y = (hoverTile.y - radius) * level.tileSize;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 / camera.zoom;
  ctx.strokeRect(x, y, brushPixels, brushPixels);
}

function strokeTileRect(rect, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width / camera.zoom;
  ctx.strokeRect(rect.x * level.tileSize, rect.y * level.tileSize, rect.width * level.tileSize, rect.height * level.tileSize);
}

function updateUi(message = null) {
  const mergedSolid = mergeTilesToRects(level, ['solid', 'glass', 'glassLeft', 'glassRight', 'crate', 'barrel', 'smallExplosive', 'swingingCrate']).length;
  const mergedPlatforms = mergeTilesToRects(level, ['platform', 'movingPlatform']).length;
  const slopeCount =
    findTiles('slopeUp').length +
    findTiles('slopeDown').length +
    findTiles('ceilingSlopeUp').length +
    findTiles('ceilingSlopeDown').length +
    findTiles('slopePlatformUp').length +
    findTiles('slopePlatformDown').length;
  statsText.textContent =
    `${level.width}x${level.height} tiles at ${level.tileSize}px, ${countNonEmptyTiles(level)} filled, ` +
    `${mergedSolid + mergedPlatforms + slopeCount} collider pieces`;
  selectionText.textContent = selectionRect
    ? `Selection ${selectionRect.width}x${selectionRect.height}`
    : `${TILE_DEFS[TILE_INDEX[selectedTile]].label} / ${toolMode}`;
  levelWidthInput.value = String(level.width);
  levelHeightInput.value = String(level.height);
  levelTileSizeInput.value = String(level.tileSize);
  updateCursorText();
  updateHistoryButtons();
  updateValidation();
  if (message) {
    setStatus(message);
  }
  scheduleAutosave();
  draw();
}

function scheduleAutosave() {
  if (!autosaveEnabled) {
    return;
  }
  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer);
  }
  autosaveTimer = window.setTimeout(() => {
    autosaveTimer = null;
    saveEditorLevelNow();
    setStatus(`Autosaved to this browser at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`);
  }, AUTOSAVE_DELAY_MS);
}

function saveEditorLevelNow() {
  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  saveLevel(level);
}

async function saveEverywhere() {
  saveEditorLevelNow();
  if (!import.meta.env.DEV) {
    setStatus('Saved to this browser.');
    return;
  }

  try {
    const response = await fetch(DEFAULT_LEVEL_SAVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeLevel(level)),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Default level save failed.');
    }
    setStatus('Saved to this browser and src/defaultLevel.json.');
  } catch (error) {
    setStatus(`Saved to this browser. Default file save failed: ${error.message}`);
  }
}

function updateCursorText() {
  const pickupText = hoverTile && level.grid[hoverTile.y * level.width + hoverTile.x] === TILE_INDEX.pickup
    ? ` ${describePickupSpec(getPickupSpec(hoverTile.x, hoverTile.y))}`
    : '';
  cursorText.textContent = hoverTile ? `${hoverTile.x}, ${hoverTile.y}${pickupText}` : 'outside';
}

function updateValidation() {
  const messages = validateLevel();
  validationList.innerHTML = '';
  if (!messages.length) {
    const item = document.createElement('li');
    item.className = 'ok';
    item.textContent = 'No obvious issues.';
    validationList.append(item);
    return;
  }
  for (const message of messages) {
    const item = document.createElement('li');
    item.className = 'warning';
    item.textContent = message;
    validationList.append(item);
  }
}

function validateLevel() {
  const warnings = [];
  const p1 = findTiles('p1');
  const p2 = findTiles('p2');
  if (p1.length !== 1) {
    warnings.push(p1.length === 0 ? 'Missing P1 spawn.' : 'Multiple P1 spawns; only one should exist.');
  }
  if (p2.length !== 1) {
    warnings.push(p2.length === 0 ? 'Missing P2 spawn.' : 'Multiple P2 spawns; only one should exist.');
  }
  for (const [label, points] of [['P1', p1], ['P2', p2]]) {
    if (points[0] && !hasFloorBelow(points[0].x, points[0].y, 8)) {
      warnings.push(`${label} spawn has no wall/platform/slope within 8 tiles below.`);
    }
  }

  const pickups = findTiles('pickup');
  for (const pickup of pickups) {
    if (!hasFloorBelow(pickup.x, pickup.y, 8)) {
      warnings.push(`Pickup at ${pickup.x},${pickup.y} may be unreachable: no floor below.`);
      break;
    }
  }

  const ladders = findTiles('ladder');
  const sideLadders = ladders.concat(findTiles('ladderLeft'), findTiles('ladderRight'));
  if (sideLadders.length && !sideLadders.some((tile) => touchesFloorTile(tile.x, tile.y))) {
    warnings.push('Ladders do not touch any solid/platform tile.');
  }

  for (let y = Math.max(0, level.height - 2); y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (
        level.grid[y * level.width + x] === TILE_INDEX.platform ||
        level.grid[y * level.width + x] === TILE_INDEX.slopePlatformUp ||
        level.grid[y * level.width + x] === TILE_INDEX.slopePlatformDown
      ) {
        warnings.push('One-way platform exists on the bottom rows; use Solid for bottom floors.');
        y = level.height;
        break;
      }
    }
  }

  const colliderCount =
    mergeTilesToRects(level, ['solid']).length +
    mergeTilesToRects(level, ['platform', 'movingPlatform']).length +
    mergeTilesToRects(level, ['crate', 'barrel', 'smallExplosive', 'swingingCrate']).length +
    findTiles('slopeUp').length +
    findTiles('slopeDown').length +
    findTiles('ceilingSlopeUp').length +
    findTiles('ceilingSlopeDown').length +
    findTiles('slopePlatformUp').length +
    findTiles('slopePlatformDown').length;
  if (colliderCount > 250) {
    warnings.push(`High collider count (${colliderCount}); use larger rectangles where possible.`);
  }

  return warnings;
}

function findTiles(tileId) {
  const points = [];
  const tileIndex = TILE_INDEX[tileId];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (level.grid[y * level.width + x] === tileIndex) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

function hasFloorBelow(x, y, maxDistance) {
  for (let yy = y + 1; yy <= Math.min(level.height - 1, y + maxDistance); yy += 1) {
    const tile = level.grid[yy * level.width + x];
    if (isFloorTile(tile)) {
      return true;
    }
  }
  return false;
}

function touchesFloorTile(x, y) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const xx = x + dx;
    const yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= level.width || yy >= level.height) {
      return false;
    }
    const tile = level.grid[yy * level.width + xx];
    return isFloorTile(tile);
  });
}

function isFloorTile(tile) {
  return [
    TILE_INDEX.solid,
    TILE_INDEX.platform,
    TILE_INDEX.movingPlatform,
    TILE_INDEX.slopeUp,
    TILE_INDEX.slopeDown,
    TILE_INDEX.slopePlatformUp,
    TILE_INDEX.slopePlatformDown,
    TILE_INDEX.crate,
    TILE_INDEX.barrel,
    TILE_INDEX.smallExplosive,
    TILE_INDEX.swingingCrate,
  ].includes(tile);
}

function describePickupSpec(spec) {
  if (spec.kind === 'weapon') {
    return `weapon:${spec.id}`;
  }
  if (spec.kind === 'grenade') {
    return 'grenade';
  }
  if (spec.kind === 'powerup') {
    return `powerup:${spec.id}`;
  }
  return 'random';
}

function setStatus(message) {
  statusText.textContent = message;
}

function makeRect(x0, y0, x1, y1) {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  return {
    x,
    y,
    width: Math.abs(x1 - x0) + 1,
    height: Math.abs(y1 - y0) + 1,
  };
}

function isTileInRect(x, y, rect) {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

function normalizeEditorLevel(input) {
  const normalized = normalizeLevel(input);
  normalized.pickupSpecs = normalized.pickupSpecs.filter((spec) => (
    normalized.grid[spec.y * normalized.width + spec.x] === TILE_INDEX.pickup
  ));
  return normalized;
}

function isTypingIntoFormField() {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'level';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
