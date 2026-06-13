import {
  ANIMATION_ORDER,
  DEFAULT_EMPRESS_ANIMATION_CONFIG,
  DEFAULT_ANIMATION_CONFIG,
  getAnimationConfig,
  makeFrameList1Based,
  mergeAnimationConfig,
  resetAnimationConfig,
  saveAnimationConfig,
} from './animationConfig.js';
import {
  DEFAULT_GAMEPLAY_CONFIG,
  getGameplayConfig,
  resetGameplayConfig,
  saveGameplayConfig,
} from './gameplayConfig.js';
import './debug.css';

const BASE_URL = import.meta.env.BASE_URL;
const assetUrl = (path) => `${BASE_URL}${String(path).replace(/^\/+/, '')}`;
const SHEET_CONFIG_STORAGE_PREFIX = 'superfighters.sheetAnimationConfig';
const ATTACHMENT_CONFIG_STORAGE_KEY = 'superfighters.attachmentConfig.v1';
const DEFAULT_SHEET_ID = 'empress';
const DEFAULT_CHARACTER_GUN_HANDS = {
  55: { x: 32, y: 46 },
  56: { x: 38, y: 50 },
  57: { x: 42, y: 64 },
};
const DEFAULT_ATTACHMENT_CONFIG = {
  characterGunHand: { x: 39, y: 50 },
  characterGunHands: DEFAULT_CHARACTER_GUN_HANDS,
  gunGrip: { x: 18, y: 35 },
  gunFrame: 30,
  previewShowGun: true,
  previewCleanView: false,
  playtestHasGun: true,
};
const GUN_ATTACHMENT_ANIMATIONS = new Set([
  'idleAimStraight',
  'idleAimUp',
  'aim',
  'shoot',
  'runGun',
  'crouchDownGun',
  'standUpGun',
  'jumpPrepGun',
  'jumpGunUp',
  'jumpGunPeak',
  'jumpGunDown',
  'jumpGunLand',
  'jumpAimStraight',
  'jumpAimUp',
  'jumpAimDown',
  'ladderGunDraw',
  'ladderGunHold',
  'ladderGun',
]);
const SHEETS = {
  empress: {
    id: 'empress',
    label: 'Empress',
    url: assetUrl('assets/empress.png'),
    frameSize: 64,
    gap: 1,
    leftOffset: 1,
    detectRows: true,
    rowSampleX: 63,
    rowLightThreshold: 20,
    cellLightThreshold: 100,
    cellBackground: [147, 187, 236],
    extensionBackground: [58, 111, 51],
    sheetBackground: [27, 89, 153],
    maxExtension: 96,
    sheetScale: 1,
    previewScale: 2,
    previewCanvasSize: 300,
    playScale: 2,
  },
  handguns: {
    id: 'handguns',
    label: 'Handguns',
    url: assetUrl('assets/handgun.png'),
    frameSize: 64,
    gap: 1,
    leftOffset: 1,
    titleHeight: 23,
    detectRows: true,
    rowSampleX: 63,
    rowLightThreshold: 20,
    cellLightThreshold: 100,
    cellBackground: [147, 187, 236],
    sheetBackground: [27, 89, 153],
    maxExtension: 0,
    sheetScale: 1,
    previewScale: 2,
    previewCanvasSize: 180,
    playScale: 2,
  },
  girl: {
    id: 'girl',
    label: 'Girl',
    url: assetUrl('assets/girl.png'),
    frameSize: 24,
    gap: 0,
    leftOffset: 0,
    sheetScale: 4,
    previewScale: 5,
    previewCanvasSize: 168,
    playScale: 3,
  },
};

const sheetTabs = document.querySelector('#sheetTabs');
const sheetCanvas = document.querySelector('#sheetCanvas');
const previewCanvas = document.querySelector('#previewCanvas');
const previewPanel = document.querySelector('.preview-panel');
const previewManualInput = document.querySelector('#previewManualInput');
const previewLoopInput = document.querySelector('#previewLoopInput');
const previewGunInput = document.querySelector('#previewGunInput');
const previewCleanInput = document.querySelector('#previewCleanInput');
const previewFrameInput = document.querySelector('#previewFrameInput');
const prevPreviewFrameButton = document.querySelector('#prevPreviewFrameButton');
const nextPreviewFrameButton = document.querySelector('#nextPreviewFrameButton');
const previewFrameIndexText = document.querySelector('#previewFrameIndexText');
const attachmentModeInput = document.querySelector('#attachmentModeInput');
const attachmentFrameInput = document.querySelector('#attachmentFrameInput');
const attachmentXInput = document.querySelector('#attachmentXInput');
const attachmentYInput = document.querySelector('#attachmentYInput');
const gunFrameInput = document.querySelector('#gunFrameInput');
const playtestGunInput = document.querySelector('#playtestGunInput');
const playtestCanvas = document.querySelector('#playtestCanvas');
const animationRows = document.querySelector('#animationRows');
const gameplayTuning = document.querySelector('#gameplayTuning');
const sheetMeta = document.querySelector('#sheetMeta');
const previewTitle = document.querySelector('#previewTitle');
const previewMeta = document.querySelector('#previewMeta');
const colliderMeta = document.querySelector('#colliderMeta');
const playtestMeta = document.querySelector('#playtestMeta');
const statusText = document.querySelector('#statusText');
const anchorFrameInput = document.querySelector('#anchorFrameInput');
const anchorXInput = document.querySelector('#anchorXInput');
const anchorYInput = document.querySelector('#anchorYInput');
const clearAnchorButton = document.querySelector('#clearAnchorButton');
const copyFrameValuesButton = document.querySelector('#copyFrameValuesButton');
const copyJsonButton = document.querySelector('#copyJsonButton');
const saveButton = document.querySelector('#saveButton');
const resetButton = document.querySelector('#resetButton');

const sheetCtx = sheetCanvas.getContext('2d');
const previewCtx = previewCanvas.getContext('2d');
const playtestCtx = playtestCanvas.getContext('2d');
const image = new Image();
const handgunImage = new Image();
const DEFAULT_PREVIEW_ANIMATION = 'crouchDown';

let activeSheet = SHEETS[DEFAULT_SHEET_ID];
let config = loadSheetAnimationConfig(activeSheet);
let gameplayConfig = getGameplayConfig();
let attachmentConfig = loadAttachmentConfig();
let selectedAnimation = DEFAULT_PREVIEW_ANIMATION;
let columns = 0;
let rows = 0;
let frameCount = 0;
let rowStarts = [];
let titleGaps = [];
let frameCells = [];
let frameAnchors = {};
let frameCanvasCache = new Map();
let handgunFrameCanvasCache = new Map();
let handgunGeometry = { frameCells: [], frameCount: 0 };
let rangeAnchor = null;
let lastPreviewFrame = null;
let lastPreviewBox = null;
let lastPreviewGunBox = null;
let manualPreviewFrameIndex = 0;
let previewAnimationStartedAt = performance.now();
let previewPlaybackSignature = '';
let previewStarted = false;

const playtest = {
  x: 210,
  y: 176,
  vx: 0,
  vy: 0,
  facing: 1,
  grounded: true,
  crouching: false,
  crouchTransitionUntil: 0,
  crouchTransitionGun: false,
  standTransitionUntil: 0,
  standTransitionGun: false,
  jumpHeldUntil: 0,
  jumpReleased: true,
  jumpPrepUntil: 0,
  jumpPrepGun: false,
  jumpLandUntil: 0,
  jumpLandGun: false,
  action: null,
  actionAnimationName: null,
  actionUntil: 0,
  actionAir: false,
  animationName: null,
  animationStartedAt: performance.now(),
  keys: new Set(),
  lastTime: performance.now(),
};

buildSheetTabs();
loadSheet(DEFAULT_SHEET_ID);
loadHandgunImage();
requestAnimationFrame(tickPlaytest);

image.onload = () => {
  const geometry = detectFrameGeometry();
  columns = geometry.columns;
  rows = geometry.rows;
  rowStarts = geometry.rowStarts;
  titleGaps = geometry.titleGaps;
  frameCells = geometry.frameCells;
  frameCount = frameCells.length;
  frameCanvasCache = new Map();
  clampConfigToAvailableFrames();

  sheetCanvas.width = image.naturalWidth * activeSheet.sheetScale;
  sheetCanvas.height = image.naturalHeight * activeSheet.sheetScale;
  sheetCanvas.style.width = `${sheetCanvas.width}px`;
  sheetCanvas.style.height = `${sheetCanvas.height}px`;
  const previewSize = activeSheet.previewCanvasSize ?? 168;
  previewCanvas.width = previewSize;
  previewCanvas.height = previewSize;
  previewCanvas.style.width = `${previewSize}px`;
  previewCanvas.style.height = `${previewSize}px`;
  previewPanel.style.setProperty('--preview-canvas-size', `${previewSize}px`);
  sheetMeta.textContent =
    `${activeSheet.label}: ${frameCount} detected frames, ${columns} columns x ${rows} rows, ` +
    `${activeSheet.frameSize}px frames, ${activeSheet.gap}px gap, first row y=${rowStarts[0] ?? 0}, ` +
    `${titleGaps.length} title gaps${activeSheet.titleHeight ? `, title height ${activeSheet.titleHeight}px` : ''}`;

  buildRows();
  buildGameplayTuning();
  selectAnimation(config[selectedAnimation] ? selectedAnimation : DEFAULT_PREVIEW_ANIMATION);
  syncAttachmentControls();
  resetPlaytest();

  if (!previewStarted) {
    previewStarted = true;
    requestAnimationFrame(tickPreview);
  }
};

image.onerror = () => {
  sheetMeta.textContent = `Could not load ${activeSheet.url}`;
};

function loadHandgunImage() {
  handgunImage.onload = () => {
    handgunGeometry = detectHandgunFrameGeometry();
    handgunFrameCanvasCache = new Map();
    syncAttachmentControls();
    if (frameCount) {
      drawSheet();
      drawPreview(lastPreviewFrame ?? getPreviewFrame(performance.now()));
    }
  };
  handgunImage.onerror = () => {
    setStatus(`Could not load ${assetUrl('assets/handgun.png')}`);
  };
  handgunImage.src = `${assetUrl('assets/handgun.png')}?v=${Date.now()}`;
}

copyJsonButton.addEventListener('click', async () => {
  const json = JSON.stringify(createExportPayload(), null, 2);
  try {
    await navigator.clipboard.writeText(json);
    setStatus(`Copied ${activeSheet.label} mapping JSON.`);
  } catch {
    window.prompt('Copy mapping JSON', json);
    setStatus(`Prepared ${activeSheet.label} mapping JSON.`);
  }
});

saveButton.addEventListener('click', () => {
  saveActiveSheetAnimationConfig();
  saveGameplayConfig(gameplayConfig);
  setStatus(`Saved ${activeSheet.label} mapping locally.`);
});

resetButton.addEventListener('click', () => {
  resetActiveSheetAnimationConfig();
  resetGameplayConfig();
  config = loadSheetAnimationConfig(activeSheet);
  frameAnchors = loadFrameAnchors(activeSheet);
  gameplayConfig = getGameplayConfig();
  selectedAnimation = config[DEFAULT_PREVIEW_ANIMATION] ? DEFAULT_PREVIEW_ANIMATION : 'idle';
  rangeAnchor = null;
  lastPreviewFrame = null;
  lastPreviewBox = null;
  manualPreviewFrameIndex = 0;
  buildRows();
  buildGameplayTuning();
  selectAnimation(selectedAnimation);
  setStatus(`Reset ${activeSheet.label} mapping and gameplay defaults.`);
});

previewManualInput.addEventListener('change', () => {
  if (previewManualInput.checked) {
    syncManualFrameIndexToFrame(lastPreviewFrame ?? getPreviewFrame(performance.now()));
  }
  restartPreviewAnimation();
});

previewGunInput.addEventListener('change', () => {
  attachmentConfig.previewShowGun = previewGunInput.checked;
  saveAttachmentConfig();
  drawPreview(lastPreviewFrame ?? getPreviewFrame(performance.now()));
});

previewCleanInput.addEventListener('change', () => {
  attachmentConfig.previewCleanView = previewCleanInput.checked;
  saveAttachmentConfig();
  drawPreview(lastPreviewFrame ?? getPreviewFrame(performance.now()));
});

previewLoopInput.addEventListener('change', () => {
  restartPreviewAnimation();
});

prevPreviewFrameButton.addEventListener('click', () => {
  stepPreviewFrame(-1);
});

nextPreviewFrameButton.addEventListener('click', () => {
  stepPreviewFrame(1);
});

previewFrameInput.addEventListener('input', () => {
  setPreviewFrameFromInput();
});

attachmentModeInput.addEventListener('change', () => {
  syncAttachmentControls(lastPreviewFrame ?? getPreviewFrame(performance.now()));
  drawPreview(lastPreviewFrame ?? getPreviewFrame(performance.now()));
});

attachmentFrameInput.addEventListener('input', () => {
  const frame = Number.parseInt(attachmentFrameInput.value, 10);
  const clampedFrame = clamp(Number.isFinite(frame) ? frame : lastPreviewFrame ?? 1, 1, Math.max(1, frameCount));
  attachmentFrameInput.value = clampedFrame;
  syncAttachmentControls(clampedFrame);
  drawPreview(clampedFrame);
});

attachmentXInput.addEventListener('input', () => {
  syncAttachmentInputsToState();
});

attachmentYInput.addEventListener('input', () => {
  syncAttachmentInputsToState();
});

gunFrameInput.addEventListener('input', () => {
  const frame = Number.parseInt(gunFrameInput.value, 10);
  attachmentConfig.gunFrame = clamp(Number.isFinite(frame) ? frame : 1, 1, getHandgunFrameCount());
  gunFrameInput.value = attachmentConfig.gunFrame;
  saveAttachmentConfig();
  restartPreviewAnimation();
  resetPlaytestAnimationPlayback();
});

playtestGunInput.addEventListener('change', () => {
  attachmentConfig.playtestHasGun = playtestGunInput.checked;
  saveAttachmentConfig();
  restartPreviewAnimation();
  resetPlaytestAnimationPlayback();
});

sheetCanvas.addEventListener('click', (event) => {
  if (!frameCount) {
    return;
  }

  const frame = getFrameAtPointer(event);
  if (!frame) {
    return;
  }

  if (activeSheet.id === 'handguns') {
    attachmentConfig.gunFrame = frame;
    gunFrameInput.value = frame;
    saveAttachmentConfig();
    drawSheet();
    drawPreview(frame);
    setStatus(`${activeSheet.label} frame ${frame} selected as gun.`);
    return;
  }

  const setting = config[selectedAnimation];
  if (event.shiftKey && rangeAnchor !== null) {
    setting.start = Math.min(rangeAnchor, frame);
    setting.end = Math.max(rangeAnchor, frame);
  } else {
    setting.start = frame;
    setting.end = frame;
    setting.frames = '';
    rangeAnchor = frame;
  }

  syncRowsFromConfig();
  drawSheet();
  restartPreviewAnimation();
  resetPlaytestAnimationPlayback();
  setStatus(`${activeSheet.label} ${setting.label}: ${setting.start}-${setting.end}`);
});

previewCanvas.addEventListener('click', (event) => {
  if (!lastPreviewBox) {
    return;
  }

  const rect = previewCanvas.getBoundingClientRect();
  const localX = ((event.clientX - rect.left) / rect.width) * previewCanvas.width;
  const localY = ((event.clientY - rect.top) / rect.height) * previewCanvas.height;
  const x = Math.round((localX - lastPreviewBox.x) / lastPreviewBox.scale);
  const y = Math.round((localY - lastPreviewBox.y) / lastPreviewBox.scale);
  const mode = attachmentModeInput.value;
  if (mode === 'characterHand') {
    setCharacterHandPoint(lastPreviewBox.frame, { x, y });
    saveAttachmentConfig();
    syncAttachmentControls(lastPreviewBox.frame);
    drawPreview(lastPreviewBox.frame);
    setStatus(`${activeSheet.label} frame ${lastPreviewBox.frame} hand: ${x},${y}`);
    return;
  }

  if (mode === 'gunGrip') {
    const gunX = lastPreviewGunBox
      ? Math.round((localX - lastPreviewGunBox.x) / lastPreviewGunBox.scale)
      : x;
    const gunY = lastPreviewGunBox
      ? Math.round((localY - lastPreviewGunBox.y) / lastPreviewGunBox.scale)
      : y;
    attachmentConfig.gunGrip = {
      x: gunX,
      y: gunY,
    };
    saveAttachmentConfig();
    syncAttachmentControls(lastPreviewBox.frame);
    drawPreview(lastPreviewBox.frame);
    setStatus(`${activeSheet.label} gun grip: ${attachmentConfig.gunGrip.x},${attachmentConfig.gunGrip.y}`);
    return;
  }

  setFrameAnchor(lastPreviewBox.frame, x, y);
  drawPreview(lastPreviewBox.frame);
  setStatus(`${activeSheet.label} frame ${lastPreviewBox.frame} anchor: ${x},${y}`);
});

anchorFrameInput.addEventListener('input', () => {
  const frame = getAnchorInputFrame();
  updateAnchorInputs(frame);
  drawPreview(frame);
});

anchorXInput.addEventListener('input', () => {
  syncAnchorInputsToState();
});

anchorYInput.addEventListener('input', () => {
  syncAnchorInputsToState();
});

clearAnchorButton.addEventListener('click', () => {
  const frame = getAnchorInputFrame();
  delete frameAnchors[String(frame)];
  updateAnchorInputs(frame);
  drawPreview(lastPreviewFrame ?? frame);
  setStatus(`${activeSheet.label} frame ${frame} anchor cleared.`);
});

copyFrameValuesButton.addEventListener('click', async () => {
  const payload = createCurrentAnimationFrameValuesPayload();
  const json = JSON.stringify(payload, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    setStatus(`Copied ${payload.animation} frame values.`);
  } catch {
    window.prompt('Copy frame values', json);
    setStatus(`Prepared ${payload.animation} frame values.`);
  }
});

window.addEventListener('keydown', (event) => {
  if (isTypingIntoField(event.target) || !isPlaytestKey(event.code)) {
    return;
  }
  event.preventDefault();
  if (!playtest.keys.has(event.code)) {
    handlePlaytestKeyDown(event.code);
  }
  playtest.keys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  if (!isPlaytestKey(event.code)) {
    return;
  }
  event.preventDefault();
  playtest.keys.delete(event.code);
  if ((event.code === 'KeyW' || event.code === 'ArrowUp') && playtest.vy < gameplayConfig.movement.jumpReleaseVelocity) {
    playtest.vy = gameplayConfig.movement.jumpReleaseVelocity;
    playtest.jumpReleased = true;
  }
  if (event.code === 'Digit3') {
    const now = performance.now();
    if (!isPlaytestActionActive(now)) {
      const animationName = !playtest.grounded ? 'grenadeThrowAir' : 'grenadeThrow';
      startPlaytestAction('grenadeThrow', animationName, now);
    }
  }
});

function buildSheetTabs() {
  sheetTabs.innerHTML = '';
  for (const sheet of Object.values(SHEETS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `sheet-tab${sheet.id === activeSheet.id ? ' active' : ''}`;
    button.textContent = sheet.label;
    button.addEventListener('click', () => loadSheet(sheet.id));
    sheetTabs.append(button);
  }
}

function loadSheet(sheetId) {
  activeSheet = SHEETS[sheetId] ?? SHEETS[DEFAULT_SHEET_ID];
  config = loadSheetAnimationConfig(activeSheet);
  frameAnchors = loadFrameAnchors(activeSheet);
  selectedAnimation = config[selectedAnimation] ? selectedAnimation : DEFAULT_PREVIEW_ANIMATION;
  rangeAnchor = null;
  lastPreviewFrame = null;
  lastPreviewBox = null;
  manualPreviewFrameIndex = 0;
  previewAnimationStartedAt = performance.now();
  previewPlaybackSignature = '';
  frameCount = 0;
  buildSheetTabs();
  sheetMeta.textContent = `Loading ${activeSheet.label}`;
  image.src = `${activeSheet.url}?v=${Date.now()}`;
}

function detectFrameGeometry() {
  const stride = getFrameStride();
  const leftOffset = activeSheet.leftOffset ?? 0;
  const baseColumns = Math.max(1, Math.floor((image.naturalWidth - leftOffset + activeSheet.gap) / stride));

  if (!activeSheet.detectRows) {
    const regularRows = Math.max(1, Math.floor((image.naturalHeight + activeSheet.gap) / stride));
    const regularRowStarts = Array.from({ length: regularRows }, (_, row) => row * stride);
    const regularCells = regularRowStarts.flatMap((y, row) => (
      Array.from({ length: baseColumns }, (_, column) => {
        const x = leftOffset + column * stride;
        return {
          row,
          column,
          x,
          y,
          render: {
            x,
            y,
            width: activeSheet.frameSize,
            height: activeSheet.frameSize,
            originX: 0,
            originY: 0,
          },
        };
      })
    ));
    return {
      columns: baseColumns,
      rows: regularRows,
      rowStarts: regularRowStarts,
      titleGaps: [],
      frameCells: regularCells,
    };
  }

  const pixels = getSheetPixels();
  const lightRows = [];
  for (let y = 0; y < image.naturalHeight; y += 1) {
    let lightCount = 0;
    for (let x = 0; x < image.naturalWidth; x += 1) {
      if (isCellBackgroundPixel(pixels, x, y)) {
        lightCount += 1;
      }
    }
    if (lightCount >= activeSheet.rowLightThreshold) {
      lightRows.push(y);
    }
  }

  const detectedRowStarts = collapseContiguousRuns(lightRows)
    .filter((run) => run.length >= Math.max(8, activeSheet.frameSize * 0.75))
    .map((run) => run.start);

  const gaps = [];
  for (let index = 0; index < detectedRowStarts.length - 1; index += 1) {
    const gapStart = detectedRowStarts[index] + activeSheet.frameSize;
    const gapEnd = detectedRowStarts[index + 1];
    const gapHeight = gapEnd - gapStart;
    const minimumTitleGap = activeSheet.titleHeight ? Math.max(8, activeSheet.titleHeight - 2) : 8;
    if (gapHeight >= minimumTitleGap) {
      gaps.push({ y: gapStart, height: gapHeight });
    }
  }

  const cells = [];
  let detectedColumns = 0;
  for (let row = 0; row < detectedRowStarts.length; row += 1) {
    const y = detectedRowStarts[row];
    const rowCells = detectFrameCellsForRow(pixels, row, y);
    detectedColumns = Math.max(detectedColumns, rowCells.length);
    cells.push(...rowCells);
  }

  const extendedCells = cells.map((cell) => ({
    ...cell,
    render: detectFrameRenderRect(pixels, cell),
  }));

  return {
    columns: detectedColumns || baseColumns,
    rows: detectedRowStarts.length,
    rowStarts: detectedRowStarts,
    titleGaps: gaps,
    frameCells: extendedCells,
  };
}

function detectFrameCellsForRow(pixels, row, y) {
  const cells = [];
  const size = activeSheet.frameSize;
  let x = activeSheet.leftOffset ?? 0;

  while (x + size <= image.naturalWidth) {
    while (x + size <= image.naturalWidth && !isFrameStartCandidate(pixels, x, y)) {
      x += 1;
    }

    if (x + size > image.naturalWidth) {
      break;
    }

    cells.push({ row, column: cells.length, x, y });
    x += size;

    while (x < image.naturalWidth && stripHasExtensionBackground(pixels, x, y, 1, size)) {
      x += 1;
    }
    while (x < image.naturalWidth && isSheetBackgroundPixel(pixels, x, y)) {
      x += 1;
    }
  }

  return cells;
}

function isFrameStartCandidate(pixels, x, y) {
  if (x > 0 && !isSheetBackgroundPixel(pixels, x - 1, y)) {
    return false;
  }
  if (!isCellBackgroundPixel(pixels, x, y)) {
    return false;
  }
  if (
    countCellBackgroundPixelsInRect(pixels, x, y, activeSheet.frameSize, 1) <
    Math.floor(activeSheet.frameSize * 0.35)
  ) {
    return false;
  }

  const rightEdge = x + activeSheet.frameSize;
  if (
    rightEdge < image.naturalWidth &&
    !isSheetBackgroundPixel(pixels, rightEdge, y) &&
    !isExtensionBackgroundPixel(pixels, rightEdge, y)
  ) {
    return false;
  }

  return countCellBackgroundPixels(pixels, x, y) >= activeSheet.cellLightThreshold;
}

function detectFrameRenderRect(pixels, cell) {
  const size = activeSheet.frameSize;
  const maxExtension = activeSheet.maxExtension ?? size;
  const base = {
    left: cell.x,
    top: cell.y,
    right: cell.x + size,
    bottom: cell.y + size,
  };
  const bounds = { ...base };

  expandHorizontal(bounds, pixels, 1, maxExtension);
  expandHorizontal(bounds, pixels, -1, maxExtension);
  expandVertical(bounds, pixels, 1, maxExtension);
  expandVertical(bounds, pixels, -1, maxExtension);

  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
    originX: base.left - bounds.left,
    originY: base.top - bounds.top,
  };
}

function expandHorizontal(bounds, pixels, direction, maxExtension) {
  let hasExtension = false;
  for (let step = 0; step < maxExtension; step += 1) {
    const x = direction > 0 ? bounds.right : bounds.left - 1;
    if (x < 0 || x >= image.naturalWidth) {
      return;
    }

    if (stripHasExtensionBackground(pixels, x, bounds.top, 1, bounds.bottom - bounds.top)) {
      if (direction > 0) {
        bounds.right += 1;
      } else {
        bounds.left -= 1;
      }
      hasExtension = true;
      continue;
    }

    if (hasExtension && stripHasSpritePixels(pixels, x, bounds.top, 1, bounds.bottom - bounds.top)) {
      if (direction > 0) {
        bounds.right += 1;
      } else {
        bounds.left -= 1;
      }
      continue;
    }

    return;
  }
}

function expandVertical(bounds, pixels, direction, maxExtension) {
  let hasExtension = false;
  for (let step = 0; step < maxExtension; step += 1) {
    const y = direction > 0 ? bounds.bottom : bounds.top - 1;
    if (y < 0 || y >= image.naturalHeight) {
      return;
    }

    if (stripHasExtensionBackground(pixels, bounds.left, y, bounds.right - bounds.left, 1)) {
      if (direction > 0) {
        bounds.bottom += 1;
      } else {
        bounds.top -= 1;
      }
      hasExtension = true;
      continue;
    }

    if (hasExtension && stripHasSpritePixels(pixels, bounds.left, y, bounds.right - bounds.left, 1)) {
      if (direction > 0) {
        bounds.bottom += 1;
      } else {
        bounds.top -= 1;
      }
      continue;
    }

    return;
  }
}

function stripHasExtensionBackground(pixels, startX, startY, width, height) {
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      if (isExtensionBackgroundPixel(pixels, x, y)) {
        return true;
      }
    }
  }
  return false;
}

function stripHasSpritePixels(pixels, startX, startY, width, height) {
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      if (isSpritePixel(pixels, x, y)) {
        return true;
      }
    }
  }
  return false;
}

function isExtensionBackgroundPixel(pixels, x, y) {
  if (!activeSheet.extensionBackground || x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }

  const index = (y * pixels.width + x) * 4;
  return isNearColor(pixels.data, index, activeSheet.extensionBackground);
}

function isSheetBackgroundPixel(pixels, x, y) {
  if (!activeSheet.sheetBackground || x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }

  const index = (y * pixels.width + x) * 4;
  return isNearColor(pixels.data, index, activeSheet.sheetBackground);
}

function isSpritePixel(pixels, x, y) {
  if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }

  const index = (y * pixels.width + x) * 4;
  return (
    pixels.data[index + 3] > 0 &&
    !isCellBackgroundPixel(pixels, x, y) &&
    !isExtensionBackgroundPixel(pixels, x, y) &&
    !isSheetBackgroundPixel(pixels, x, y)
  );
}

function getSheetPixels() {
  return getImagePixels(image);
}

function getImagePixels(sourceImage) {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.naturalWidth;
  canvas.height = sourceImage.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(sourceImage, 0, 0);
  return {
    width: canvas.width,
    height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height).data,
  };
}

function getFrameBitmap(frame) {
  const cacheKey = `${activeSheet.id}:${frame}`;
  const cached = frameCanvasCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const source = getFrameSource(frame);
  const render = source.render ?? {
    x: source.x,
    y: source.y,
    width: activeSheet.frameSize,
    height: activeSheet.frameSize,
    originX: 0,
    originY: 0,
  };
  const canvas = document.createElement('canvas');
  canvas.width = render.width;
  canvas.height = render.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  context.drawImage(image, render.x, render.y, render.width, render.height, 0, 0, render.width, render.height);

  const imageData = context.getImageData(0, 0, render.width, render.height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (isTransparentSheetPixel(imageData.data, index)) {
      imageData.data[index + 3] = 0;
    }
  }
  context.putImageData(imageData, 0, 0);

  const bitmap = { canvas, source, render };
  frameCanvasCache.set(cacheKey, bitmap);
  return bitmap;
}

function detectHandgunFrameGeometry() {
  const sheet = SHEETS.handguns;
  const pixels = getImagePixels(handgunImage);
  const rowStarts = detectAssetRowStarts(sheet, pixels);
  const cells = [];
  const stride = sheet.frameSize + sheet.gap;
  const leftOffset = sheet.leftOffset ?? 0;
  let detectedColumns = 0;

  for (let row = 0; row < rowStarts.length; row += 1) {
    const y = rowStarts[row];
    let column = 0;
    for (let x = leftOffset; x + sheet.frameSize <= handgunImage.naturalWidth; x += stride) {
      const lightPixels = countAssetBackgroundPixelsInRect(sheet, pixels, x, y, sheet.frameSize, sheet.frameSize);
      if (lightPixels < sheet.cellLightThreshold) {
        column += 1;
        continue;
      }

      cells.push({
        row,
        column,
        x,
        y,
        render: {
          x,
          y,
          width: sheet.frameSize,
          height: sheet.frameSize,
          originX: 0,
          originY: 0,
        },
      });
      column += 1;
    }
    detectedColumns = Math.max(detectedColumns, column);
  }

  return {
    frameCells: cells,
    frameCount: cells.length,
    rowStarts,
    columns: detectedColumns,
  };
}

function detectAssetRowStarts(sheet, pixels) {
  const lightRows = [];
  for (let y = 0; y < pixels.height; y += 1) {
    let lightCount = 0;
    for (let x = 0; x < pixels.width; x += 1) {
      if (isAssetCellBackgroundPixel(sheet, pixels, x, y)) {
        lightCount += 1;
      }
    }
    if (lightCount >= sheet.rowLightThreshold) {
      lightRows.push(y);
    }
  }

  return collapseContiguousRuns(lightRows)
    .filter((run) => run.length >= Math.max(8, sheet.frameSize * 0.75))
    .map((run) => run.start);
}

function getHandgunFrameBitmap(frame) {
  if (!handgunImage.complete || !handgunImage.naturalWidth) {
    return null;
  }

  const clampedFrame = clamp(Math.round(frame), 1, getHandgunFrameCount());
  const cached = handgunFrameCanvasCache.get(clampedFrame);
  if (cached) {
    return cached;
  }

  const sheet = SHEETS.handguns;
  const source = handgunGeometry.frameCells[clampedFrame - 1];
  if (!source) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = sheet.frameSize;
  canvas.height = sheet.frameSize;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  context.drawImage(handgunImage, source.x, source.y, sheet.frameSize, sheet.frameSize, 0, 0, sheet.frameSize, sheet.frameSize);

  const imageData = context.getImageData(0, 0, sheet.frameSize, sheet.frameSize);
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (isTransparentAssetPixel(sheet, imageData.data, index)) {
      imageData.data[index + 3] = 0;
    }
  }
  context.putImageData(imageData, 0, 0);

  const bitmap = { canvas, source };
  handgunFrameCanvasCache.set(clampedFrame, bitmap);
  return bitmap;
}

function getHandgunFrameCount() {
  return Math.max(1, handgunGeometry.frameCount || 1);
}

function countCellBackgroundPixels(pixels, startX, startY) {
  return countCellBackgroundPixelsInRect(
    pixels,
    startX,
    startY,
    activeSheet.frameSize,
    activeSheet.frameSize,
  );
}

function countCellBackgroundPixelsInRect(pixels, startX, startY, width, height) {
  let count = 0;
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      if (isCellBackgroundPixel(pixels, x, y)) {
        count += 1;
      }
    }
  }
  return count;
}

function countAssetBackgroundPixelsInRect(sheet, pixels, startX, startY, width, height) {
  let count = 0;
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      if (isAssetCellBackgroundPixel(sheet, pixels, x, y)) {
        count += 1;
      }
    }
  }
  return count;
}

function isCellBackgroundPixel(pixels, x, y) {
  const index = (y * pixels.width + x) * 4;
  return isNearColor(pixels.data, index, activeSheet.cellBackground ?? [147, 187, 236]);
}

function isAssetCellBackgroundPixel(sheet, pixels, x, y) {
  if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }

  const index = (y * pixels.width + x) * 4;
  return isNearColor(pixels.data, index, sheet.cellBackground ?? [147, 187, 236]);
}

function isTransparentSheetPixel(data, index) {
  return [
    activeSheet.cellBackground,
    activeSheet.extensionBackground,
    activeSheet.sheetBackground,
  ].some((color) => color && isNearColor(data, index, color));
}

function isTransparentAssetPixel(sheet, data, index) {
  return [
    sheet.cellBackground,
    sheet.extensionBackground,
    sheet.sheetBackground,
  ].some((color) => color && isNearColor(data, index, color));
}

function isNearColor(data, index, color, tolerance = 3) {
  const [red, green, blue] = color;
  return (
    Math.abs(data[index] - red) <= tolerance &&
    Math.abs(data[index + 1] - green) <= tolerance &&
    Math.abs(data[index + 2] - blue) <= tolerance
  );
}

function collapseContiguousRuns(values) {
  if (!values.length) {
    return [];
  }

  const runs = [];
  let start = values[0];
  let previous = values[0];
  for (const value of values.slice(1)) {
    if (value === previous + 1) {
      previous = value;
      continue;
    }
    runs.push({ start, length: previous - start + 1 });
    start = value;
    previous = value;
  }
  runs.push({ start, length: previous - start + 1 });
  return runs;
}

function loadSheetAnimationConfig(sheet) {
  const saved = readJson(sheetStorageKey(sheet));
  if (saved) {
    return mergeAnimationConfig(migrateSavedSheetAnimationConfig(sheet, saved), getSheetDefaultAnimationConfig(sheet));
  }
  if (sheet.id === 'girl') {
    return getAnimationConfig();
  }
  return mergeAnimationConfig({}, getSheetDefaultAnimationConfig(sheet));
}

function migrateSavedSheetAnimationConfig(sheet, saved) {
  if (sheet.id !== 'empress') {
    return saved;
  }

  const migrated = structuredClone(saved);
  migrateExactAnimationRange(migrated, 'jumpPrep', { start: 120, end: 120, fps: 1 }, { start: 122, end: 122, fps: 12 });
  migrateExactAnimationRange(migrated, 'jumpUp', { start: 121, end: 125 }, { start: 123, end: 125 });
  migrateExactAnimationRange(migrated, 'jumpMelee', { start: 120 }, { start: 122 });

  if (migrated.jumpMelee?.frames === '120,195-203') {
    migrated.jumpMelee.frames = '122,195-203';
  }

  return migrated;
}

function migrateExactAnimationRange(configToMigrate, animationName, oldValues, newValues) {
  const setting = configToMigrate[animationName];
  if (!setting) {
    return;
  }

  const matches = Object.entries(oldValues).every(([key, value]) => setting[key] === value);
  if (!matches) {
    return;
  }

  Object.assign(setting, newValues);
}

function saveActiveSheetAnimationConfig() {
  writeJson(sheetStorageKey(activeSheet), config);
  writeJson(anchorStorageKey(activeSheet), frameAnchors);
  if (activeSheet.id === 'girl') {
    saveAnimationConfig(config);
  }
}

function resetActiveSheetAnimationConfig() {
  window.localStorage.removeItem(sheetStorageKey(activeSheet));
  window.localStorage.removeItem(anchorStorageKey(activeSheet));
  if (activeSheet.id === 'girl') {
    resetAnimationConfig();
  }
}

function sheetStorageKey(sheet) {
  const version = sheet.id === 'empress' ? 'v2' : 'v1';
  return `${SHEET_CONFIG_STORAGE_PREFIX}.${sheet.id}.${version}`;
}

function anchorStorageKey(sheet) {
  const version = sheet.id === 'empress' ? 'v2' : 'v1';
  return `${SHEET_CONFIG_STORAGE_PREFIX}.${sheet.id}.anchors.${version}`;
}

function loadFrameAnchors(sheet) {
  return readJson(anchorStorageKey(sheet)) ?? {};
}

function loadAttachmentConfig() {
  const saved = readJson(ATTACHMENT_CONFIG_STORAGE_KEY) ?? {};
  const configToLoad = {
    ...DEFAULT_ATTACHMENT_CONFIG,
    ...saved,
    characterGunHand: {
      ...DEFAULT_ATTACHMENT_CONFIG.characterGunHand,
      ...(saved.characterGunHand ?? {}),
    },
    characterGunHands: {
      ...DEFAULT_ATTACHMENT_CONFIG.characterGunHands,
      ...(saved.characterGunHands ?? {}),
    },
    gunGrip: {
      ...DEFAULT_ATTACHMENT_CONFIG.gunGrip,
      ...(saved.gunGrip ?? {}),
    },
  };

  if (
    configToLoad.characterGunHand.x === 42 &&
    configToLoad.characterGunHand.y === 35 &&
    !Object.keys(configToLoad.characterGunHands).length
  ) {
    configToLoad.characterGunHand = { ...DEFAULT_ATTACHMENT_CONFIG.characterGunHand };
  }

  if (configToLoad.gunFrame === 1) {
    configToLoad.gunFrame = DEFAULT_ATTACHMENT_CONFIG.gunFrame;
  }

  return configToLoad;
}

function saveAttachmentConfig() {
  writeJson(ATTACHMENT_CONFIG_STORAGE_KEY, attachmentConfig);
}

function getSheetDefaultAnimationConfig(sheet) {
  return sheet.id === 'empress' ? DEFAULT_EMPRESS_ANIMATION_CONFIG : DEFAULT_ANIMATION_CONFIG;
}

function createExportPayload() {
  return {
    sheet: {
      id: activeSheet.id,
      label: activeSheet.label,
      url: activeSheet.url,
      frameSize: activeSheet.frameSize,
      gap: activeSheet.gap,
      leftOffset: activeSheet.leftOffset ?? 0,
      titleHeight: activeSheet.titleHeight ?? 0,
      columns,
      rows,
      frameCount,
      rowStarts,
      titleGaps,
      keyColors: {
        cellBackground: activeSheet.cellBackground,
        extensionBackground: activeSheet.extensionBackground,
        sheetBackground: activeSheet.sheetBackground,
      },
      frameCells: frameCells.map(({ x, y, column, row, render }) => ({ x, y, column, row, render })),
    },
    animations: config,
    frameAnchors,
    attachments: attachmentConfig,
    gameplay: gameplayConfig,
  };
}

function createCurrentAnimationFrameValuesPayload() {
  const frames = getCurrentPreviewFrames();
  const explicitFrameAnchors = Object.fromEntries(frames
    .filter((frame) => frameAnchors[String(frame)])
    .map((frame) => [String(frame), frameAnchors[String(frame)]]));
  const payload = {
    sheet: activeSheet.id,
    animation: selectedAnimation,
    label: config[selectedAnimation]?.label ?? selectedAnimation,
    frames,
    characterGunHands: Object.fromEntries(frames.map((frame) => {
      const point = getCharacterHandPoint(frame);
      return [String(frame), { x: Math.round(point.x), y: Math.round(point.y) }];
    })),
    explicitCharacterGunHands: Object.fromEntries(frames
      .filter((frame) => attachmentConfig.characterGunHands?.[String(frame)])
      .map((frame) => [String(frame), attachmentConfig.characterGunHands[String(frame)]])),
    gun: {
      sheet: 'handguns',
      frame: attachmentConfig.gunFrame,
      grip: {
        x: Math.round(attachmentConfig.gunGrip.x),
        y: Math.round(attachmentConfig.gunGrip.y),
      },
    },
  };
  if (Object.keys(explicitFrameAnchors).length) {
    payload.frameAnchors = explicitFrameAnchors;
  }
  return payload;
}

function buildRows() {
  animationRows.innerHTML = '';

  for (const name of ANIMATION_ORDER) {
    const setting = config[name];
    const row = document.createElement('div');
    row.className = `animation-row${name === selectedAnimation ? ' selected' : ''}`;
    row.dataset.animation = name;

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'animation-name';
    label.textContent = setting.label;
    label.addEventListener('click', () => selectAnimation(name));
    row.append(label);

    row.append(createFramePatternField(name, setting.frames ?? ''));
    row.append(createNumberField(name, 'start', 'Start', setting.start));
    row.append(createNumberField(name, 'end', 'End', setting.end));
    row.append(createNumberField(name, 'fps', 'FPS', setting.fps));

    const repeatLabel = document.createElement('label');
    repeatLabel.className = 'repeat-field';
    const repeat = document.createElement('input');
    repeat.type = 'checkbox';
    repeat.checked = setting.repeat;
    repeat.addEventListener('change', () => {
      config[name].repeat = repeat.checked;
      selectAnimation(name);
      setStatus('');
    });
    repeatLabel.append(repeat, 'Loop');
    row.append(repeatLabel);

    const pingPongLabel = document.createElement('label');
    pingPongLabel.className = 'repeat-field';
    const pingPong = document.createElement('input');
    pingPong.type = 'checkbox';
    pingPong.checked = setting.pingPong;
    pingPong.addEventListener('change', () => {
      config[name].pingPong = pingPong.checked;
      selectAnimation(name);
      setStatus('');
    });
    pingPongLabel.append(pingPong, 'Ping');
    row.append(pingPongLabel);

    row.addEventListener('click', (event) => {
      if (event.target !== label) {
        selectAnimation(name);
      }
    });

    animationRows.append(row);
  }
}

function clampConfigToAvailableFrames() {
  for (const name of ANIMATION_ORDER) {
    const setting = config[name];
    setting.start = clamp(setting.start, 1, frameCount);
    setting.end = clamp(setting.end, 1, frameCount);

    if (setting.start > setting.end) {
      [setting.start, setting.end] = [setting.end, setting.start];
    }
  }
}

function createFramePatternField(animationName, value) {
  const label = document.createElement('label');
  label.className = 'number-field';
  label.textContent = 'Frames';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.placeholder = '1,4-8';
  input.dataset.animation = animationName;
  input.dataset.field = 'frames';
  input.addEventListener('input', () => {
    config[animationName].frames = input.value.trim();
    selectAnimation(animationName);
    drawSheet();
    setStatus('');
  });

  label.append(input);
  return label;
}

function createNumberField(animationName, fieldName, labelText, value) {
  const label = document.createElement('label');
  label.className = 'number-field';
  label.textContent = labelText;

  const input = document.createElement('input');
  input.type = 'number';
  input.value = value;
  input.min = fieldName === 'fps' ? 1 : 1;
  input.max = fieldName === 'fps' ? 30 : Math.max(frameCount, 1);
  input.step = 1;
  input.dataset.animation = animationName;
  input.dataset.field = fieldName;
  input.addEventListener('input', () => {
    const max = fieldName === 'fps' ? 30 : Math.max(frameCount, 1);
    const parsed = Number.parseInt(input.value, 10);
    config[animationName][fieldName] = Number.isFinite(parsed) ? clamp(parsed, 1, max) : 1;
    input.value = config[animationName][fieldName];
    selectAnimation(animationName);
    drawSheet();
    setStatus('');
  });

  label.append(input);
  return label;
}

function buildGameplayTuning() {
  gameplayTuning.innerHTML = '';
  const frameMax = activeSheet.frameSize;

  const sections = [
    {
      title: 'Round',
      fields: [
        ['round.lives', 'Lives', 1, 10, 1],
        ['round.seconds', 'Seconds', 15, 600, 1],
        ['round.respawnInvulnerabilityMs', 'Respawn I-Frames', 0, 5000, 50],
      ],
    },
    {
      title: 'Movement / Aim',
      fields: [
        ['movement.walkSpeed', 'Walk', 50, 500, 5],
        ['movement.aimSpeed', 'Aim Walk', 0, 300, 5],
        ['movement.jumpSpeed', 'Jump', 100, 900, 5],
        ['movement.jumpHoldMs', 'Jump Hold Ms', 0, 400, 5],
        ['movement.jumpHoldGravityMultiplier', 'Hold Gravity', 0.1, 1, 0.01],
        ['movement.jumpReleaseVelocity', 'Release Y', -600, 300, 5],
        ['movement.fallGravityMultiplier', 'Fall Gravity', 0.5, 3, 0.01],
        ['movement.climbSpeed', 'Climb', 20, 350, 5],
        ['movement.shootStanceMs', 'Shoot Chain Ms', 0, 2000, 25],
        ['movement.aimRotateDegPerSecond', 'Aim Deg/S', 20, 720, 5],
      ],
    },
    {
      title: 'Player Collider',
      fields: [
        ['playerBody.standing.width', 'Stand W', 1, frameMax, 0.5],
        ['playerBody.standing.height', 'Stand H', 1, frameMax, 0.5],
        ['playerBody.standing.offsetX', 'Stand X', 0, frameMax, 0.5],
        ['playerBody.standing.offsetY', 'Stand Y', 0, frameMax, 0.5],
        ['playerBody.crouch.width', 'Crouch W', 1, frameMax, 0.5],
        ['playerBody.crouch.height', 'Crouch H', 1, frameMax, 0.5],
        ['playerBody.crouch.offsetX', 'Crouch X', 0, frameMax, 0.5],
        ['playerBody.crouch.offsetY', 'Crouch Y', 0, frameMax, 0.5],
      ],
    },
    {
      title: 'Melee',
      fields: [
        ['melee.cooldownMs', 'Cooldown', 50, 1000, 10],
        ['melee.comboResetMs', 'Combo Reset', 150, 2000, 25],
        ['melee.hits.0.damage', 'Hit 1 Dmg', 1, 60, 1],
        ['melee.hits.1.damage', 'Hit 2 Dmg', 1, 70, 1],
        ['melee.hits.2.damage', 'Hit 3 Dmg', 1, 90, 1],
        ['melee.dashDamage', 'Dash Dmg', 1, 100, 1],
        ['melee.dashKnockdownMs', 'Dash KD Ms', 100, 3000, 25],
      ],
    },
    {
      title: 'Grenades / Pickups',
      fields: [
        ['grenades.startCount', 'Start Grenades', 0, 9, 1],
        ['grenades.maxCount', 'Max Grenades', 1, 12, 1],
        ['grenades.throwSpeed', 'Throw Speed', 100, 1000, 5],
        ['grenades.fuseMs', 'Fuse Ms', 250, 5000, 25],
        ['grenades.radius', 'Blast Radius', 20, 260, 2],
        ['grenades.damage', 'Blast Damage', 1, 120, 1],
        ['pickups.spawnEveryMs', 'Spawn Ms', 500, 20000, 100],
        ['pickups.maxOnMap', 'Max Pickups', 1, 20, 1],
      ],
    },
  ];

  for (const section of sections) {
    gameplayTuning.append(createGameplaySection(section.title, section.fields));
  }
}

function createGameplaySection(title, fields) {
  const section = document.createElement('section');
  section.className = 'gameplay-section';

  const heading = document.createElement('h3');
  heading.textContent = title;
  section.append(heading);

  const grid = document.createElement('div');
  grid.className = 'gameplay-grid';
  for (const field of fields) {
    grid.append(createGameplayNumberField(...field));
  }
  section.append(grid);
  return section;
}

function createGameplayNumberField(path, labelText, min, max, step) {
  const label = document.createElement('label');
  label.className = 'number-field gameplay-number-field';
  label.textContent = labelText;

  const input = document.createElement('input');
  input.type = 'number';
  input.min = min;
  input.max = max;
  input.step = 'any';
  input.value = getPath(gameplayConfig, path);
  input.addEventListener('input', () => {
    const parsed = Number.parseFloat(input.value);
    const clamped = Number.isFinite(parsed) ? clamp(parsed, min, max) : getPath(DEFAULT_GAMEPLAY_CONFIG, path);
    setPath(gameplayConfig, path, clamped);
    input.value = clamped;
    drawPreview(lastPreviewFrame ?? config[selectedAnimation].start);
    setStatus('');
  });

  label.append(input);
  return label;
}

function selectAnimation(name) {
  selectedAnimation = name;
  rangeAnchor = null;
  manualPreviewFrameIndex = 0;
  restartPreviewAnimation();
  resetPlaytestAnimationPlayback();

  for (const row of animationRows.querySelectorAll('.animation-row')) {
    row.classList.toggle('selected', row.dataset.animation === name);
  }

  previewTitle.textContent = config[name].label;
  drawSheet();
}

function syncRowsFromConfig() {
  for (const input of animationRows.querySelectorAll('input')) {
    const { animation, field } = input.dataset;
    if (!animation || !field) {
      continue;
    }
    input.value = config[animation][field];
  }
}

function drawSheet() {
  if (!frameCount) {
    return;
  }

  const scale = activeSheet.sheetScale;
  sheetCtx.clearRect(0, 0, sheetCanvas.width, sheetCanvas.height);
  sheetCtx.imageSmoothingEnabled = false;
  sheetCtx.drawImage(image, 0, 0, sheetCanvas.width, sheetCanvas.height);

  const selectedFrames = activeSheet.id === 'handguns'
    ? new Set([clamp(attachmentConfig.gunFrame, 1, frameCount)])
    : new Set(makeFrameList1Based(config[selectedAnimation], frameCount));
  const defaultSetting = getSheetDefaultAnimationConfig(activeSheet)[selectedAnimation];
  const defaultFrames = activeSheet.id === 'handguns'
    ? new Set()
    : new Set(defaultSetting ? makeFrameList1Based(defaultSetting, frameCount) : []);

  for (let frame = 1; frame <= frameCount; frame += 1) {
    const source = getFrameSource(frame);
    const x = source.x * scale;
    const y = source.y * scale;
    const size = activeSheet.frameSize * scale;

    if (defaultFrames.has(frame)) {
      sheetCtx.fillStyle = 'rgba(255, 234, 138, 0.18)';
      sheetCtx.fillRect(x, y, size, size);
    }

    if (selectedFrames.has(frame) && hasRenderExtension(source.render)) {
      sheetCtx.save();
      sheetCtx.strokeStyle = 'rgba(255, 108, 218, 0.9)';
      sheetCtx.lineWidth = Math.max(1, 2 * scale);
      sheetCtx.setLineDash([5 * scale, 3 * scale]);
      sheetCtx.strokeRect(
        source.render.x * scale + 0.5,
        source.render.y * scale + 0.5,
        source.render.width * scale - 1,
        source.render.height * scale - 1,
      );
      sheetCtx.restore();
    }

    sheetCtx.strokeStyle = selectedFrames.has(frame) ? '#35f2ff' : 'rgba(255, 255, 255, 0.45)';
    sheetCtx.lineWidth = selectedFrames.has(frame) ? Math.max(2, 3 * scale) : 1;
    sheetCtx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    if (size >= 34) {
      sheetCtx.fillStyle = 'rgba(12, 18, 29, 0.82)';
      sheetCtx.fillRect(x + 3, y + 3, 28, 15);
      sheetCtx.fillStyle = '#ffffff';
      sheetCtx.font = '10px FusionPixel12, monospace';
      sheetCtx.textBaseline = 'top';
      sheetCtx.fillText(String(frame), x + 6, y + 5);
    }
  }
}

function tickPreview(now) {
  if (frameCount) {
    const previewState = getPreviewPlaybackState(now);
    const signature = previewState.signature;
    if (signature !== previewPlaybackSignature) {
      previewPlaybackSignature = signature;
      previewAnimationStartedAt = now;
      lastPreviewFrame = null;
    }
    const frame = previewState.staticFrame ?? getPlaybackFrame(
      previewState.setting,
      previewState.frames,
      now - previewAnimationStartedAt,
      previewState.repeats,
    );

    if (lastPreviewFrame !== frame) {
      drawPreview(frame);
      lastPreviewFrame = frame;
    }

    syncPreviewMeta(previewState, frame);
    syncPreviewFrameControls(previewState, frame);
  }

  requestAnimationFrame(tickPreview);
}

function getPreviewFrame(now) {
  const state = getPreviewPlaybackState(now);
  return state.staticFrame ?? getPlaybackFrame(
    state.setting,
    state.frames,
    Math.max(0, now - previewAnimationStartedAt),
    state.repeats,
  );
}

function getPreviewPlaybackState(now) {
  if (activeSheet.id === 'handguns') {
    const frame = clamp(attachmentConfig.gunFrame, 1, Math.max(1, frameCount));
    const frames = [frame];
    manualPreviewFrameIndex = 0;
    return {
      setting: { fps: 1, repeat: false },
      frames,
      repeats: false,
      staticFrame: frame,
      frameIndex: 0,
      signature: `handguns|${frame}|${now > 0}`,
      meta: `Gun Frame ${frame} (1/1)`,
    };
  }

  const setting = config[selectedAnimation];
  const frames = makeFrameList1Based(setting, frameCount);
  clampManualPreviewFrameIndex(frames);
  const repeats = setting.repeat || previewLoopInput.checked;
  const manual = previewManualInput.checked;
  const staticFrame = manual ? frames[manualPreviewFrameIndex] ?? frames[0] ?? 1 : null;
  return {
    setting,
    frames,
    repeats,
    staticFrame,
    frameIndex: manual ? manualPreviewFrameIndex : null,
    signature: `${getPlaybackSignature(selectedAnimation, setting, frames, repeats)}|manual:${manual ? manualPreviewFrameIndex : 'play'}`,
    meta: getPreviewMeta(setting, frames, staticFrame, manual ? manualPreviewFrameIndex : null),
  };
}

function restartPreviewAnimation() {
  previewAnimationStartedAt = performance.now();
  previewPlaybackSignature = '';
  lastPreviewFrame = null;
}

function getPreviewMeta(setting, frames, staticFrame, frameIndex) {
  const label = config[selectedAnimation]?.label ?? selectedAnimation;
  if (staticFrame !== null && staticFrame !== undefined) {
    return `${label}: frame ${staticFrame} (${(frameIndex ?? 0) + 1}/${Math.max(1, frames.length)})`;
  }
  if (frames.length === 1) {
    return `${label}: frame ${frames[0]}`;
  }
  return `${label}: frames ${frames[0]}-${frames[frames.length - 1]}`;
}

function getCurrentPreviewFrames() {
  if (!frameCount) {
    return [1];
  }
  if (activeSheet.id === 'handguns') {
    return [clamp(attachmentConfig.gunFrame, 1, Math.max(1, frameCount))];
  }
  return makeFrameList1Based(config[selectedAnimation], frameCount);
}

function clampManualPreviewFrameIndex(frames = getCurrentPreviewFrames()) {
  manualPreviewFrameIndex = clamp(
    Number.isFinite(manualPreviewFrameIndex) ? manualPreviewFrameIndex : 0,
    0,
    Math.max(0, frames.length - 1),
  );
}

function syncManualFrameIndexToFrame(frame) {
  const frames = getCurrentPreviewFrames();
  const index = frames.indexOf(frame);
  if (index >= 0) {
    manualPreviewFrameIndex = index;
    return;
  }

  let closestIndex = 0;
  let closestDistance = Infinity;
  for (let i = 0; i < frames.length; i += 1) {
    const distance = Math.abs(frames[i] - frame);
    if (distance < closestDistance) {
      closestIndex = i;
      closestDistance = distance;
    }
  }
  manualPreviewFrameIndex = closestIndex;
}

function stepPreviewFrame(delta) {
  const frames = getCurrentPreviewFrames();
  if (!frames.length) {
    return;
  }

  previewManualInput.checked = true;
  manualPreviewFrameIndex = clamp(manualPreviewFrameIndex + delta, 0, frames.length - 1);
  const frame = frames[manualPreviewFrameIndex];
  drawPreview(frame);
  lastPreviewFrame = frame;
  previewPlaybackSignature = '';
  const state = getPreviewPlaybackState(performance.now());
  syncPreviewMeta(state, frame);
  syncPreviewFrameControls(state, frame);
}

function setPreviewFrameFromInput() {
  const frames = getCurrentPreviewFrames();
  if (!frames.length) {
    return;
  }

  const parsed = Number.parseInt(previewFrameInput.value, 10);
  if (!Number.isFinite(parsed)) {
    return;
  }

  previewManualInput.checked = true;
  syncManualFrameIndexToFrame(clamp(parsed, 1, Math.max(1, frameCount)));
  const frame = frames[manualPreviewFrameIndex];
  drawPreview(frame);
  lastPreviewFrame = frame;
  previewPlaybackSignature = '';
  const state = getPreviewPlaybackState(performance.now());
  syncPreviewMeta(state, frame);
  syncPreviewFrameControls(state, frame);
}

function syncPreviewMeta(previewState, frame) {
  const renderMeta = formatRenderMeta(getFrameSource(frame).render);
  previewMeta.textContent = `${previewState.meta}${renderMeta}`;
}

function syncPreviewFrameControls(previewState, frame) {
  const frames = previewState.frames?.length ? previewState.frames : [frame];
  const index = previewState.frameIndex ?? Math.max(0, frames.indexOf(frame));
  if (document.activeElement !== previewFrameInput) {
    previewFrameInput.value = frame;
  }
  previewFrameInput.min = Math.min(...frames);
  previewFrameInput.max = Math.max(...frames);
  previewFrameIndexText.textContent = `${index + 1} / ${frames.length}`;
  prevPreviewFrameButton.disabled = index <= 0;
  nextPreviewFrameButton.disabled = index >= frames.length - 1;
}

function getPlaybackSignature(animationName, setting, frames, repeats) {
  return [
    animationName,
    setting.start,
    setting.end,
    setting.frames ?? '',
    setting.fps,
    repeats,
    setting.pingPong,
    frames.join(','),
  ].join('|');
}

function getPlaybackFrame(setting, frames, elapsedMs, repeatOverride = setting.repeat) {
  const safeFrames = frames.length ? frames : [1];
  const frameIndex = Math.floor(Math.max(0, elapsedMs) / 1000 * Math.max(1, setting.fps));
  const clampedIndex = repeatOverride
    ? frameIndex % safeFrames.length
    : clamp(frameIndex, 0, safeFrames.length - 1);
  return safeFrames[clampedIndex] ?? safeFrames[safeFrames.length - 1] ?? 1;
}

function drawPreview(frame) {
  const bitmap = getFrameBitmap(frame);
  const frameSize = activeSheet.frameSize;
  const scale = activeSheet.previewScale;
  const size = frameSize * scale;
  const x = Math.floor((previewCanvas.width - size) / 2);
  const y = Math.floor((previewCanvas.height - size) / 2);
  const drawX = Math.round(x - bitmap.render.originX * scale);
  const drawY = Math.round(y - bitmap.render.originY * scale);

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.fillStyle = '#0d1420';
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.drawImage(
    bitmap.canvas,
    drawX,
    drawY,
    bitmap.canvas.width * scale,
    bitmap.canvas.height * scale,
  );
  lastPreviewBox = { frame, x, y, scale };
  lastPreviewGunBox = null;
  const cleanView = Boolean(attachmentConfig.previewCleanView);
  if (activeSheet.id === 'handguns') {
    if (!cleanView) {
      drawGunGripGizmo(x, y, scale);
    }
  } else {
    if (attachmentConfig.previewShowGun) {
      drawAttachedGun(previewCtx, x, y, scale, 1, frame, selectedAnimation, true, { force: true });
    }
    if (!cleanView) {
      drawCharacterHandGizmo(frame, x, y, scale);
    }
  }
  if (!cleanView) {
    drawPreviewFrameBox(x, y, size);
    drawColliderOverlay(x, y);
    drawFrameAnchor(frame, x, y, scale);
  }
  updateAnchorInputs(frame);
  if (!isEditingAttachmentField()) {
    syncAttachmentControls(frame);
  }
  updateColliderMeta();
}

function drawAttachedGun(context, frameX, frameY, scale, facing, frame, animationName, recordPreviewBox = false, options = {}) {
  if (!(options.force || shouldRenderGunForAnimation(animationName)) || !handgunImage.complete || !handgunImage.naturalWidth) {
    return;
  }

  const gun = getHandgunFrameBitmap(attachmentConfig.gunFrame);
  if (!gun) {
    return;
  }

  const hand = getCharacterHandPoint(frame, facing);
  const grip = attachmentConfig.gunGrip;
  const handX = frameX + hand.x * scale;
  const handY = frameY + hand.y * scale;
  const width = gun.canvas.width * scale;
  const height = gun.canvas.height * scale;
  const drawX = handX - grip.x * scale;
  const drawY = handY - grip.y * scale;

  context.save();
  context.imageSmoothingEnabled = false;
  if (facing < 0) {
    context.translate(handX, 0);
    context.scale(-1, 1);
    context.drawImage(gun.canvas, -grip.x * scale, drawY, width, height);
  } else {
    context.drawImage(gun.canvas, drawX, drawY, width, height);
  }
  context.restore();
  if (recordPreviewBox) {
    lastPreviewGunBox = { x: drawX, y: drawY, scale };
  }
}

function drawCharacterHandGizmo(frame, frameX, frameY, scale) {
  const hand = getCharacterHandPoint(frame);
  drawPointGizmo(
    previewCtx,
    frameX + hand.x * scale,
    frameY + hand.y * scale,
    '#ffef6e',
    `H${frame}`,
  );
}

function drawGunGripGizmo(frameX, frameY, scale) {
  drawPointGizmo(
    previewCtx,
    frameX + attachmentConfig.gunGrip.x * scale,
    frameY + attachmentConfig.gunGrip.y * scale,
    '#ff6cda',
    'G',
  );
}

function drawPointGizmo(context, x, y, color, label) {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(Math.round(x) - 8, Math.round(y));
  context.lineTo(Math.round(x) + 8, Math.round(y));
  context.moveTo(Math.round(x), Math.round(y) - 8);
  context.lineTo(Math.round(x), Math.round(y) + 8);
  context.stroke();
  context.font = '10px FusionPixel12, monospace';
  context.fillText(label, Math.round(x) + 6, Math.round(y) - 10);
  context.restore();
}

function drawPreviewFrameBox(x, y, size) {
  previewCtx.save();
  previewCtx.strokeStyle = '#5ea8ff';
  previewCtx.lineWidth = 1;
  previewCtx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  previewCtx.restore();
}

function drawFrameAnchor(frame, frameX, frameY, scale) {
  const anchor = frameAnchors[String(frame)];
  if (!anchor) {
    return;
  }

  const x = Math.round(frameX + anchor.x * scale);
  const y = Math.round(frameY + anchor.y * scale);
  previewCtx.save();
  previewCtx.strokeStyle = '#ff6cda';
  previewCtx.fillStyle = '#ff6cda';
  previewCtx.lineWidth = 2;
  previewCtx.beginPath();
  previewCtx.moveTo(x - 7, y);
  previewCtx.lineTo(x + 7, y);
  previewCtx.moveTo(x, y - 7);
  previewCtx.lineTo(x, y + 7);
  previewCtx.stroke();
  previewCtx.beginPath();
  previewCtx.arc(x, y, 3, 0, Math.PI * 2);
  previewCtx.fill();
  previewCtx.restore();
}

function setFrameAnchor(frame, x, y) {
  const clampedFrame = clamp(Math.round(frame), 1, Math.max(1, frameCount));
  frameAnchors[String(clampedFrame)] = {
    x: Math.round(x),
    y: Math.round(y),
  };
  updateAnchorInputs(clampedFrame);
}

function getAnchorInputFrame() {
  const parsed = Number.parseInt(anchorFrameInput.value, 10);
  return clamp(Number.isFinite(parsed) ? parsed : lastPreviewFrame ?? 1, 1, Math.max(1, frameCount));
}

function updateAnchorInputs(frame) {
  const clampedFrame = clamp(Math.round(frame), 1, Math.max(1, frameCount));
  const anchor = frameAnchors[String(clampedFrame)] ?? {
    x: Math.round(activeSheet.frameSize / 2),
    y: activeSheet.frameSize,
  };
  anchorFrameInput.value = clampedFrame;
  anchorXInput.value = anchor.x;
  anchorYInput.value = anchor.y;
}

function syncAnchorInputsToState() {
  const frame = getAnchorInputFrame();
  const x = Number.parseFloat(anchorXInput.value);
  const y = Number.parseFloat(anchorYInput.value);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  setFrameAnchor(frame, x, y);
  drawPreview(lastPreviewFrame ?? frame);
  setStatus(`${activeSheet.label} frame ${frame} anchor: ${Math.round(x)},${Math.round(y)}`);
}

function syncAttachmentControls(frame = lastPreviewFrame ?? getPreviewFrame(performance.now())) {
  const mode = attachmentModeInput.value;
  const clampedFrame = clamp(Math.round(frame), 1, Math.max(1, frameCount));
  const point = mode === 'gunGrip' ? attachmentConfig.gunGrip : getCharacterHandPoint(clampedFrame);
  attachmentFrameInput.value = clampedFrame;
  attachmentXInput.value = Math.round(point.x);
  attachmentYInput.value = Math.round(point.y);
  const handgunFrameCount = getHandgunFrameCount();
  gunFrameInput.max = handgunFrameCount;
  if (handgunGeometry.frameCount) {
    attachmentConfig.gunFrame = clamp(attachmentConfig.gunFrame, 1, handgunFrameCount);
  }
  gunFrameInput.value = attachmentConfig.gunFrame;
  previewGunInput.checked = Boolean(attachmentConfig.previewShowGun);
  previewCleanInput.checked = Boolean(attachmentConfig.previewCleanView);
  playtestGunInput.checked = attachmentConfig.playtestHasGun;
}

function isEditingAttachmentField() {
  return [
    attachmentFrameInput,
    attachmentXInput,
    attachmentYInput,
    gunFrameInput,
  ].includes(document.activeElement);
}

function syncAttachmentInputsToState() {
  const frame = clamp(Number.parseInt(attachmentFrameInput.value, 10) || lastPreviewFrame || 1, 1, Math.max(1, frameCount));
  const x = Number.parseFloat(attachmentXInput.value);
  const y = Number.parseFloat(attachmentYInput.value);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  const point = { x: Math.round(x), y: Math.round(y) };
  if (attachmentModeInput.value === 'gunGrip') {
    attachmentConfig.gunGrip = point;
    setStatus(`Gun grip: ${point.x},${point.y}`);
  } else {
    setCharacterHandPoint(frame, point);
    setStatus(`Frame ${frame} hand: ${point.x},${point.y}`);
  }

  saveAttachmentConfig();
  drawPreview(frame);
}

function getCharacterHandPoint(frame, facing = 1) {
  const framePoint = attachmentConfig.characterGunHands?.[String(frame)] ?? attachmentConfig.characterGunHand;
  if (facing < 0) {
    return {
      x: activeSheet.frameSize - framePoint.x,
      y: framePoint.y,
    };
  }
  return framePoint;
}

function setCharacterHandPoint(frame, point) {
  const clampedFrame = clamp(Math.round(frame), 1, Math.max(1, frameCount));
  attachmentConfig.characterGunHands[String(clampedFrame)] = {
    x: Math.round(point.x),
    y: Math.round(point.y),
  };
}

function shouldRenderGunForAnimation(animationName) {
  return attachmentConfig.playtestHasGun && GUN_ATTACHMENT_ANIMATIONS.has(animationName);
}

function hasRenderExtension(render) {
  return Boolean(
    render &&
    (
      render.originX > 0 ||
      render.originY > 0 ||
      render.width > activeSheet.frameSize ||
      render.height > activeSheet.frameSize
    ),
  );
}

function formatRenderMeta(render) {
  if (!hasRenderExtension(render)) {
    return '';
  }
  return ` | render ${render.width}x${render.height} @ ${render.originX},${render.originY}`;
}

function drawColliderOverlay(spriteX, spriteY) {
  if (activeSheet.id === 'handguns') {
    return;
  }

  const activePose = selectedAnimation === 'crouch' || selectedAnimation === 'crouchWalk' ? 'crouch' : 'standing';
  drawBodyBox(spriteX, spriteY, 'standing', '#35f2ff', activePose === 'standing');
  drawBodyBox(spriteX, spriteY, 'crouch', '#ffd166', activePose === 'crouch');
}

function drawBodyBox(spriteX, spriteY, pose, color, active) {
  const body = getBodyConfig(pose);
  const scale = activeSheet.previewScale;
  const x = spriteX + body.offsetX * scale;
  const y = spriteY + body.offsetY * scale;
  const width = body.width * scale;
  const height = body.height * scale;

  previewCtx.save();
  previewCtx.strokeStyle = color;
  previewCtx.fillStyle = hexToRgba(color, active ? 0.14 : 0.06);
  previewCtx.lineWidth = active ? 3 : 1;
  if (!active) {
    previewCtx.setLineDash([5, 4]);
  }
  previewCtx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  previewCtx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(width) - 1, Math.round(height) - 1);
  previewCtx.restore();
}

function tickPlaytest(now) {
  const dt = Math.min(0.033, Math.max(0.001, (now - playtest.lastTime) / 1000));
  playtest.lastTime = now;
  updatePlaytest(now, dt);
  drawPlaytest(now);
  requestAnimationFrame(tickPlaytest);
}

function updatePlaytest(now, dt) {
  const movement = gameplayConfig.movement;
  const left = playtest.keys.has('KeyA') || playtest.keys.has('ArrowLeft');
  const right = playtest.keys.has('KeyD') || playtest.keys.has('ArrowRight');
  const down = playtest.keys.has('KeyS') || playtest.keys.has('ArrowDown');
  const jumpHeld = playtest.keys.has('KeyW') || playtest.keys.has('ArrowUp');
  const aiming = playtest.keys.has('Digit2');
  const hasGun = attachmentConfig.playtestHasGun;
  const horizontal = (right ? 1 : 0) - (left ? 1 : 0);
  const wasGrounded = playtest.grounded;
  const wasCrouching = playtest.crouching;
  playtest.crouching = down && playtest.grounded;

  if (playtest.crouching && !wasCrouching) {
    playtest.crouchTransitionGun = hasGun;
    playtest.standTransitionUntil = 0;
    playtest.crouchTransitionUntil = now + getPlaytestAnimationDuration(playtest.crouchTransitionGun ? 'crouchDownGun' : 'crouchDown');
  } else if (!playtest.crouching && wasCrouching) {
    playtest.standTransitionGun = hasGun;
    playtest.crouchTransitionUntil = 0;
    playtest.standTransitionUntil = now + getPlaytestAnimationDuration(playtest.standTransitionGun ? 'standUpGun' : 'standUp');
  } else if (!playtest.crouching) {
    playtest.crouchTransitionUntil = 0;
  }

  if (playtest.crouching) {
    playtest.vx = 0;
  } else if (horizontal !== 0) {
    playtest.facing = horizontal;
    playtest.vx = horizontal * movement.walkSpeed;
  } else {
    playtest.vx = 0;
  }

  if (!playtest.grounded) {
    const holdingJump = jumpHeld && !playtest.jumpReleased && now < playtest.jumpHeldUntil;
    const gravityMultiplier = playtest.vy < 0 && holdingJump
      ? movement.jumpHoldGravityMultiplier
      : movement.fallGravityMultiplier;
    playtest.vy += 1450 * gravityMultiplier * dt;
  }

  playtest.x = clamp(playtest.x + playtest.vx * dt, 40, playtestCanvas.width - 40);
  playtest.y += playtest.vy * dt;

  const floorY = getPlaytestFloorY();
  if (playtest.y >= floorY) {
    playtest.y = floorY;
    playtest.vy = 0;
    playtest.grounded = true;
    playtest.jumpReleased = true;
    if (!wasGrounded) {
      playtest.jumpPrepUntil = 0;
      playtest.jumpLandGun = hasGun;
      playtest.jumpLandUntil = now + getPlaytestAnimationDuration(playtest.jumpLandGun ? 'jumpGunLand' : 'jumpLand');
      resetPlaytestAnimationPlayback();
    }
  } else {
    playtest.grounded = false;
  }

  if (playtest.actionUntil && now >= playtest.actionUntil) {
    playtest.action = null;
    playtest.actionAnimationName = null;
    playtest.actionUntil = 0;
    playtest.actionAir = false;
  }
}

function drawPlaytest(now) {
  const animationName = pickPlaytestAnimation(now);
  if (playtest.animationName !== animationName) {
    playtest.animationName = animationName;
    playtest.animationStartedAt = now;
  }
  const setting = config[animationName] ?? config.idle;
  const frames = makeFrameList1Based(setting, frameCount || 1);
  const frame = getPlaybackFrame(setting, frames, now - playtest.animationStartedAt);
  const bitmap = getFrameBitmap(frame);
  const scale = activeSheet.playScale;
  const frameSize = activeSheet.frameSize;
  const baseDrawSize = frameSize * scale;
  const baseX = Math.round(playtest.x - baseDrawSize / 2);
  const baseY = Math.round(playtest.y - baseDrawSize);
  const drawY = Math.round(baseY - bitmap.render.originY * scale);
  const drawWidth = bitmap.canvas.width * scale;
  const drawHeight = bitmap.canvas.height * scale;

  playtestCtx.imageSmoothingEnabled = false;
  playtestCtx.clearRect(0, 0, playtestCanvas.width, playtestCanvas.height);
  playtestCtx.fillStyle = '#7dc8f1';
  playtestCtx.fillRect(0, 0, playtestCanvas.width, playtestCanvas.height);
  playtestCtx.fillStyle = '#1d2735';
  playtestCtx.fillRect(0, getPlaytestFloorY(), playtestCanvas.width, playtestCanvas.height - getPlaytestFloorY());
  playtestCtx.fillStyle = '#6cc36b';
  playtestCtx.fillRect(0, getPlaytestFloorY() - 4, playtestCanvas.width, 4);

  playtestCtx.save();
  if (playtest.facing < 0) {
    const rightExtension = bitmap.render.width - bitmap.render.originX - frameSize;
    const drawX = Math.round(baseX - rightExtension * scale);
    playtestCtx.translate(drawX + drawWidth, drawY);
    playtestCtx.scale(-1, 1);
    playtestCtx.drawImage(bitmap.canvas, 0, 0, drawWidth, drawHeight);
  } else {
    const drawX = Math.round(baseX - bitmap.render.originX * scale);
    playtestCtx.drawImage(bitmap.canvas, drawX, drawY, drawWidth, drawHeight);
  }
  playtestCtx.restore();
  if (activeSheet.id !== 'handguns') {
    drawAttachedGun(playtestCtx, baseX, baseY, scale, playtest.facing, frame, animationName);
  }

  playtestCtx.fillStyle = 'rgba(13, 20, 32, 0.78)';
  playtestCtx.fillRect(8, 8, 190, 36);
  playtestCtx.fillStyle = '#ffffff';
  playtestCtx.font = '12px FusionPixel12, monospace';
  playtestCtx.fillText(`${activeSheet.label}: ${setting.label}`, 15, 17);
  playtestCtx.fillText(`Frame ${frame}`, 15, 32);
  playtestMeta.textContent = `${animationName} | ${Math.round(playtest.vx)}, ${Math.round(playtest.vy)}`;
}

function pickPlaytestAnimation(now) {
  const left = playtest.keys.has('KeyA') || playtest.keys.has('ArrowLeft');
  const right = playtest.keys.has('KeyD') || playtest.keys.has('ArrowRight');
  const down = playtest.keys.has('KeyS') || playtest.keys.has('ArrowDown');
  const aiming = playtest.keys.has('Digit2');
  const hasGun = attachmentConfig.playtestHasGun;
  const horizontal = (right ? 1 : 0) - (left ? 1 : 0);

  if (isPlaytestActionActive(now) && playtest.actionAnimationName) {
    return playtest.actionAnimationName;
  }

  if (playtest.keys.has('Digit3')) {
    return !playtest.grounded ? 'grenadePrepAir' : 'grenadePrep';
  }

  if (playtest.grounded && now < playtest.jumpLandUntil) {
    return playtest.jumpLandGun ? 'jumpGunLand' : 'jumpLand';
  }

  if (playtest.grounded && !playtest.crouching && now < playtest.standTransitionUntil) {
    return playtest.standTransitionGun ? 'standUpGun' : 'standUp';
  }

  if (playtest.grounded && playtest.crouching && now < playtest.crouchTransitionUntil) {
    return playtest.crouchTransitionGun ? 'crouchDownGun' : 'crouchDown';
  }

  if (now < playtest.jumpPrepUntil) {
    return playtest.jumpPrepGun ? 'jumpPrepGun' : 'jumpPrep';
  }

  if (aiming) {
    if (!playtest.grounded) {
      if (playtest.keys.has('KeyW') || playtest.keys.has('ArrowUp')) {
        return 'jumpAimUp';
      }
      if (down) {
        return 'jumpAimDown';
      }
      return 'jumpAimStraight';
    }
    if (down) {
      return 'crouch';
    }
    return horizontal !== 0 ? 'runGun' : 'aim';
  }

  if (!playtest.grounded) {
    if (playtest.vy < -90) {
      return hasGun ? 'jumpGunUp' : 'jumpUp';
    }
    if (playtest.vy > 90) {
      return hasGun ? 'jumpGunDown' : 'jumpDown';
    }
    return hasGun ? 'jumpGunPeak' : 'jumpPeak';
  }

  if (playtest.crouching || down) {
    return 'crouch';
  }

  if (hasGun) {
    return horizontal !== 0 ? 'runGun' : 'aim';
  }

  return horizontal !== 0 ? 'run' : 'idle';
}

function handlePlaytestKeyDown(code) {
  const now = performance.now();
  if ((code === 'KeyW' || code === 'ArrowUp') && playtest.grounded) {
    playtest.vy = -gameplayConfig.movement.jumpSpeed;
    playtest.grounded = false;
    playtest.jumpReleased = false;
    playtest.jumpHeldUntil = now + gameplayConfig.movement.jumpHoldMs;
    playtest.jumpPrepGun = attachmentConfig.playtestHasGun;
    playtest.jumpPrepUntil = now + getPlaytestAnimationDuration(playtest.jumpPrepGun ? 'jumpPrepGun' : 'jumpPrep');
    playtest.jumpLandUntil = 0;
    resetPlaytestAnimationPlayback();
  } else if (code === 'Digit1') {
    if (isPlaytestActionActive(now)) {
      return;
    }
    const animationName = !playtest.grounded ? 'jumpMelee' : playtest.crouching ? 'crouchMelee' : 'melee';
    startPlaytestAction('melee', animationName, now);
  } else if (code === 'Digit3') {
    playtest.action = 'grenadePrep';
    playtest.actionAnimationName = null;
    playtest.actionUntil = 0;
    playtest.actionAir = !playtest.grounded;
  }
}

function isPlaytestActionActive(now) {
  return Boolean(playtest.actionUntil && now < playtest.actionUntil);
}

function startPlaytestAction(action, animationName, now) {
  playtest.action = action;
  playtest.actionAnimationName = animationName;
  playtest.actionUntil = now + getPlaytestAnimationDuration(animationName);
  playtest.actionAir = !playtest.grounded;
  resetPlaytestAnimationPlayback();
}

function resetPlaytestAnimationPlayback() {
  playtest.animationName = null;
  playtest.animationStartedAt = performance.now();
}

function resetPlaytest() {
  playtest.x = 210;
  playtest.y = getPlaytestFloorY();
  playtest.vx = 0;
  playtest.vy = 0;
  playtest.facing = 1;
  playtest.grounded = true;
  playtest.crouching = false;
  playtest.crouchTransitionUntil = 0;
  playtest.standTransitionUntil = 0;
  playtest.jumpReleased = true;
  playtest.jumpPrepUntil = 0;
  playtest.jumpPrepGun = false;
  playtest.jumpLandUntil = 0;
  playtest.jumpLandGun = false;
  playtest.action = null;
  playtest.actionAnimationName = null;
  playtest.actionUntil = 0;
  playtest.actionAir = false;
  resetPlaytestAnimationPlayback();
}

function getPlaytestAnimationDuration(animationName) {
  const setting = config[animationName];
  if (!setting) {
    return 220;
  }

  const frames = makeFrameList1Based(setting, frameCount || 1);
  return Math.max(80, (frames.length / Math.max(1, setting.fps)) * 1000);
}

function getPlaytestFloorY() {
  return playtestCanvas.height - 42;
}

function updateColliderMeta() {
  if (activeSheet.id === 'handguns') {
    colliderMeta.textContent =
      `Magenta: gun grip ${Math.round(attachmentConfig.gunGrip.x)},${Math.round(attachmentConfig.gunGrip.y)}\n` +
      `Selected gun frame: ${attachmentConfig.gunFrame}`;
    return;
  }

  const standing = getBodyConfig('standing');
  const crouch = getBodyConfig('crouch');
  colliderMeta.textContent =
    `Blue: ${activeSheet.frameSize}x${activeSheet.frameSize} frame\n` +
    `Cyan: stand ${formatBody(standing)}\nGold: crouch ${formatBody(crouch)}`;
}

function getBodyConfig(pose) {
  return gameplayConfig.playerBody?.[pose] ?? DEFAULT_GAMEPLAY_CONFIG.playerBody[pose];
}

function formatBody(body) {
  return `${body.width}x${body.height} @ ${body.offsetX},${body.offsetY}`;
}

function getFrameAtPointer(event) {
  const rect = sheetCanvas.getBoundingClientRect();
  const scale = activeSheet.sheetScale;
  const localX = ((event.clientX - rect.left) / rect.width) * sheetCanvas.width / scale;
  const localY = ((event.clientY - rect.top) / rect.height) * sheetCanvas.height / scale;

  const frameIndex = frameCells.findIndex((cell) => (
    localX >= cell.x &&
    localX < cell.x + activeSheet.frameSize &&
    localY >= cell.y &&
    localY < cell.y + activeSheet.frameSize
  ));

  return frameIndex >= 0 ? frameIndex + 1 : null;
}

function getFrameSource(frame) {
  const index = clamp(Math.round(frame), 1, Math.max(1, frameCount)) - 1;
  return frameCells[index] ?? { x: 0, y: 0, row: 0, column: 0 };
}

function getFrameStride() {
  return activeSheet.frameSize + activeSheet.gap;
}

function isPlaytestKey(code) {
  return [
    'KeyA',
    'KeyD',
    'KeyS',
    'KeyW',
    'ArrowLeft',
    'ArrowRight',
    'ArrowDown',
    'ArrowUp',
    'Digit1',
    'Digit2',
    'Digit3',
  ].includes(code);
}

function isTypingIntoField(target) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function setStatus(message) {
  statusText.textContent = message;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getPath(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split('.');
  let current = object;
  for (let i = 0; i < keys.length - 1; i += 1) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

window.__superfightersDebug = {
  exportMapping: () => createExportPayload(),
  exportCurrentFrameValues: () => createCurrentAnimationFrameValuesPayload(),
  getFrameSource: (frame) => getFrameSource(frame),
  getFrameBitmapInfo: (frame) => {
    const bitmap = getFrameBitmap(frame);
    return {
      source: bitmap.source,
      render: bitmap.render,
      width: bitmap.canvas.width,
      height: bitmap.canvas.height,
    };
  },
};
