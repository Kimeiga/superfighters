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
const ctx = canvas.getContext('2d');

let level = getSavedLevel() ?? createCurrentArenaSeed();
let selectedTile = 'solid';
let brushSize = 1;
let camera = { x: 0, y: 0, zoom: 1 };
let canvasSize = { width: 1, height: 1, dpr: 1 };
let hoverTile = null;
let drawing = false;
let panning = false;
let lastPointer = { x: 0, y: 0 };
let spaceDown = false;
let fittedOnce = false;

buildPalette();
resizeCanvas();
fitToLevel();
updateUi();
requestAnimationFrame(draw);

window.addEventListener('resize', () => {
  resizeCanvas();
  if (!fittedOnce) {
    fitToLevel();
  }
  draw();
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    spaceDown = true;
    event.preventDefault();
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

  if (event.button === 1 || spaceDown) {
    panning = true;
    return;
  }

  drawing = true;
  paintAtPointer(event, event.button === 2 ? 'empty' : selectedTile);
});

canvas.addEventListener('pointermove', (event) => {
  const tile = pointerToTile(event);
  hoverTile = tile.inBounds ? tile : null;
  cursorText.textContent = hoverTile ? `${hoverTile.x}, ${hoverTile.y}` : 'outside';

  if (panning) {
    camera.x += event.clientX - lastPointer.x;
    camera.y += event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };
    draw();
    return;
  }

  if (drawing) {
    paintAtPointer(event, event.buttons === 2 ? 'empty' : selectedTile);
  } else {
    draw();
  }
});

canvas.addEventListener('pointerup', () => {
  drawing = false;
  panning = false;
});

canvas.addEventListener('pointerleave', () => {
  hoverTile = null;
  drawing = false;
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
  saveLevel(level);
  setStatus('Saved to this browser.');
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
    const parsed = JSON.parse(await file.text());
    level = normalizeLevel(parsed);
    fitToLevel();
    updateUi();
    setStatus(`Imported ${level.name}.`);
  } catch {
    setStatus('Import failed.');
  }
});

resetSeedButton.addEventListener('click', () => {
  level = createCurrentArenaSeed();
  clearSavedLevel();
  fitToLevel();
  updateUi();
  setStatus('Reset to current arena seed.');
});

clearButton.addEventListener('click', () => {
  level = createEmptyLevel('Blank Arena');
  fitToLevel();
  updateUi();
  setStatus('Cleared editor canvas.');
});

function buildPalette() {
  palette.innerHTML = '';

  for (const tile of TILE_DEFS) {
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
    palette.append(button);
  }
}

function selectTile(tileId) {
  selectedTile = tileId;
  for (const button of palette.querySelectorAll('.tile-button')) {
    button.classList.toggle('selected', button.dataset.tile === selectedTile);
  }
  selectionText.textContent = TILE_DEFS[TILE_INDEX[selectedTile]].label;
}

function paintAtPointer(event, tileId) {
  const tile = pointerToTile(event);
  if (!tile.inBounds) {
    return;
  }

  paintTile(tile.x, tile.y, tileId);
  updateUi();
  draw();
}

function paintTile(tileX, tileY, tileId) {
  if (tileId === 'p1' || tileId === 'p2') {
    clearTileType(tileId);
    setTile(level, tileX, tileY, tileId);
    return;
  }

  const radius = Math.floor((brushSize - 1) / 2);
  const extra = brushSize % 2 === 0 ? 1 : 0;
  for (let y = tileY - radius; y <= tileY + radius + extra; y += 1) {
    for (let x = tileX - radius; x <= tileX + radius + extra; x += 1) {
      setTile(level, x, y, tileId);
    }
  }
}

function clearTileType(tileId) {
  const index = TILE_INDEX[tileId];
  for (let i = 0; i < level.grid.length; i += 1) {
    if (level.grid[i] === index) {
      level.grid[i] = TILE_INDEX.empty;
    }
  }
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
  drawGrid();
  drawMapBorder();
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
      ctx.fillStyle = def.color;
      ctx.globalAlpha = def.id === 'backdrop' ? 0.75 : def.id === 'void' ? 0.92 : 1;
      ctx.fillRect(drawX, drawY, tileSize, tileSize);
      ctx.globalAlpha = 1;

      if (def.marker) {
        ctx.fillStyle = '#101622';
        ctx.fillRect(drawX + 5, drawY + 5, tileSize - 10, tileSize - 10);
        ctx.fillStyle = def.color;
        ctx.font = '10px FusionPixel12, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.label, drawX + tileSize / 2, drawY + tileSize / 2 + 1);
      }
    }
  }
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

function drawHover() {
  if (!hoverTile) {
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

function updateUi() {
  const mergedSolid = mergeTilesToRects(level, ['solid', 'glass']).length;
  const mergedPlatforms = mergeTilesToRects(level, ['platform']).length;
  statsText.textContent =
    `${level.width}x${level.height} tiles, ${countNonEmptyTiles(level)} filled, ` +
    `${mergedSolid + mergedPlatforms} merged colliders`;
  selectionText.textContent = TILE_DEFS[TILE_INDEX[selectedTile]].label;
}

function setStatus(message) {
  statusText.textContent = message;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'level';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
