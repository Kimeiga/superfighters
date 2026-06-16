import Phaser from 'phaser';
import geckos from '@geckos.io/client';
import { ANIMATION_ORDER, DEFAULT_EMPRESS_ANIMATION_CONFIG, makeFrameList1Based } from './animationConfig.js';
import { getGameplayConfig } from './gameplayConfig.js';
import { TILE_DEFS, TILE_INDEX, mergeTilesToRects } from './levelData.js';
import './styles.css';

const BASE_URL = import.meta.env.BASE_URL;
const FUSION_FONT_URL = new URL('./assets/fonts/fusion-pixel-12px-monospaced-latin.woff', import.meta.url).href;
const assetUrl = (path) => `${BASE_URL}${String(path).replace(/^\/+/, '')}`;
const GAME_WIDTH = Math.floor(window.innerWidth);
const GAME_HEIGHT = Math.floor(window.innerHeight);
const RENDER_RESOLUTION = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
const WORLD_WIDTH = Math.max(1900, GAME_WIDTH);
const WORLD_HEIGHT = Math.max(720, GAME_HEIGHT);
const FRAME_SIZE = 64;
const PLAYER_SCALE = 1;
const UI_FONT = 'FusionPixel12';
const PLAYER_MAX_HEALTH = 100;
const DROP_DURATION = 310;
const AIM_HALF_ARC = Math.PI / 2;
const INPUT_ACTIONS = ['left', 'right', 'jump', 'crouch', 'melee', 'shoot', 'grenade', 'powerup', 'aimUp', 'aimDown'];
const GAME_DEFAULT_CAPTURE_CODES = new Set(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'Slash']);
const ONLINE_INPUT_SEND_MS = 50;
const ONLINE_SNAPSHOT_SEND_MS = 90;
const CHARACTER_SOURCE_KEY = 'empress-source';
const CHARACTER_TEXTURE_PREFIX = 'empress-frame';
const HANDGUN_SOURCE_KEY = 'handgun-source';
const PROJECTILE_TEXTURE_KEY = 'projectile-glow';
let pendingBootOptions = null;
const CHARACTER_SHEET = {
  frameSize: 64,
  gap: 1,
  leftOffset: 1,
  rowLightThreshold: 20,
  cellLightThreshold: 100,
  cellBackground: [147, 187, 236],
  extensionBackground: [58, 111, 51],
  sheetBackground: [27, 89, 153],
  maxExtension: 96,
};
const HANDGUN_SHEET = {
  frameSize: 64,
  gap: 1,
  leftOffset: 1,
  rowLightThreshold: 20,
  cellLightThreshold: 100,
  cellBackground: [147, 187, 236],
  sheetBackground: [27, 89, 153],
};
const DEFAULT_CHARACTER_HAND_POINT = { x: 39, y: 50 };
const CHARACTER_HAND_POINTS = {
  55: { x: 32, y: 46 },
  56: { x: 38, y: 50 },
  57: { x: 42, y: 64 },
  59: { x: 42, y: 52 },
  60: { x: 42, y: 67 },
  61: { x: 42, y: 66 },
  133: { x: 41, y: 57 },
  143: { x: 41, y: 57 },
};
const DEFAULT_GUN_GRIP_POINT = { x: 18, y: 35 };
const WEAPON_SHEET_FRAMES = {
  pistol: 30,
  smg: 16,
  shotgun: 42,
  rifle: 56,
  sniper: 8,
  launcher: 3,
  bolt45: 1,
  lightGun: 2,
  raygun: 3,
  peashooter: 4,
  jager: 8,
  boltSixShooter: 9,
  derringer: 11,
  kleinP8: 12,
  k9Pistol: 13,
  frazetta: 15,
  frazetta93s: 16,
  regulator: 18,
  spark: 26,
  socom: 30,
  frostbite: 32,
  tracker: 33,
  maelstrom: 34,
  violencePistol: 37,
  splinter: 39,
  fuliga: 41,
  beehive: 42,
  goldenGun: 44,
  dread: 56,
  detroitEnforcer: 62,
  whirlybird: 64,
  finalJustice: 66,
  antibody: 78,
};

const COLORS = {
  p1: 0x55a7ff,
  p2: 0xff6f91,
  p1Dark: 0x1d5f99,
  p2Dark: 0xa43154,
  platformTop: 0x78c073,
  platformFace: 0x57495f,
  platformTrim: 0x30283b,
  thinPlatform: 0xd8bd72,
  glass: 0xbfeaff,
  ladder: 0xb88751,
  grenade: 0x89e072,
  explosion: 0xffb84d,
  panel: 0x101622,
};

class FightScene extends Phaser.Scene {
  constructor() {
    super('fight');
    this.players = [];
    this.playerBySprite = new Map();
    this.platforms = [];
    this.ladders = [];
    this.clouds = [];
  }

  preload() {
    this.load.image(CHARACTER_SOURCE_KEY, assetUrl('assets/empress.png'));
    this.load.image(HANDGUN_SOURCE_KEY, assetUrl('assets/handgun.png'));
  }

  create() {
    this.players = [];
    this.playerBySprite.clear();
    this.platforms = [];
    this.ladders = [];
    this.clouds = [];
    this.levelSpawns = null;
    this.editorLevel = null;
    this.worldWidth = WORLD_WIDTH;
    this.worldHeight = WORLD_HEIGHT;
    this.configData = getGameplayConfig();
    this.modeSelected = false;
    this.matchPaused = true;
    this.matchOver = false;
    this.onlineMode = false;
    this.onlineReady = false;
    this.onlineIsHost = false;
    this.onlineLobbyPlayerCount = 0;
    this.onlineLobbyStarted = false;
    this.localOnlinePlayerId = null;
    this.onlineLobbyCode = null;
    this.onlineChannel = null;
    this.onlineInputSeq = 0;
    this.onlineLastInputPayload = '';
    this.onlineLastInputSentAt = 0;
    this.onlineLastSnapshotSentAt = 0;
    this.touchInputDown = createInputDown();
    this.uiButtons = [];
    this.endOverlayState = null;
    this.setViewportSize();
    this.pickupSpawnTimer = 0;
    this.roundEndsAt = this.time.now + this.configData.round.seconds * 1000;

    this.configureWorldAndCameraBounds();
    this.cameras.main.setBackgroundColor('#8dd8ff');
    this.registerResizeHandler();

    this.createCharacterTextures();
    this.createGeneratedTextures();
    this.drawBackground();
    this.createAnimations();
    this.createLevel();
    this.createInputs();
    this.createGroups();
    this.createMobileControls();

    this.p1 = this.createPlayer({
      id: 'p1',
      label: 'P1',
      spawnX: this.levelSpawns?.p1?.x ?? 430,
      spawnY: this.levelSpawns?.p1?.y ?? 392,
      color: COLORS.p1,
      darkColor: COLORS.p1Dark,
      facing: 1,
      controls: {
        left: this.keys.a,
        right: this.keys.d,
        jump: this.keys.w,
        crouch: this.keys.s,
        melee: this.keys.one,
        shoot: this.keys.two,
        grenade: this.keys.three,
        powerup: this.keys.four,
      },
    });

    this.p2 = this.createPlayer({
      id: 'p2',
      label: 'P2',
      spawnX: this.levelSpawns?.p2?.x ?? 1580,
      spawnY: this.levelSpawns?.p2?.y ?? 392,
      color: COLORS.p2,
      darkColor: COLORS.p2Dark,
      facing: -1,
      controls: {
        left: this.keys.left,
        right: this.keys.right,
        jump: this.keys.up,
        crouch: this.keys.down,
        melee: this.keys.m,
        shoot: this.keys.comma,
        grenade: this.keys.period,
        powerup: this.keys.slash,
      },
    });

    this.players = [this.p1, this.p2];
    this.playerBySprite.set(this.p1.sprite, this.p1);
    this.playerBySprite.set(this.p2.sprite, this.p2);

    this.createColliders();
    this.createUiLayer();
    this.createHud();
    this.createMenuOverlay();
    this.createGlobalMenuInput();
    this.createOnlineOverlay();
    this.spawnInitialPickups();
    this.applyBootOptions(consumeBootOptions());
    this.updateCamera(1000);
    this.updateUiLayer();
    this.drawHud(this.time.now);
  }

  setViewportSize(width = this.scale?.width ?? window.innerWidth, height = this.scale?.height ?? window.innerHeight) {
    this.viewportWidth = Math.max(1, Math.floor(width || GAME_WIDTH));
    this.viewportHeight = Math.max(1, Math.floor(height || GAME_HEIGHT));
    this.worldWidth = Math.max(WORLD_WIDTH, this.viewportWidth);
    this.worldHeight = Math.max(WORLD_HEIGHT, this.viewportHeight);
  }

  getViewportWidth() {
    return this.viewportWidth ?? GAME_WIDTH;
  }

  getViewportHeight() {
    return this.viewportHeight ?? GAME_HEIGHT;
  }

  configureWorldAndCameraBounds() {
    const width = this.getViewportWidth();
    const height = this.getViewportHeight();
    this.physics.world.setBounds(0, -160, this.worldWidth, this.worldHeight + 240);
    this.cameras.main.setBounds(
      -width,
      -height,
      this.worldWidth + width * 2,
      this.worldHeight + height * 2,
    );
  }

  registerResizeHandler() {
    this.scale.on('resize', this.handleGameResize, this);
    this.windowResizeHandler = () => this.queueViewportResize();
    window.addEventListener('resize', this.windowResizeHandler);
    window.visualViewport?.addEventListener('resize', this.windowResizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleGameResize, this);
      window.removeEventListener('resize', this.windowResizeHandler);
      window.visualViewport?.removeEventListener('resize', this.windowResizeHandler);
      if (this.viewportResizeFrame) {
        window.cancelAnimationFrame(this.viewportResizeFrame);
      }
    });
  }

  handleGameResize(gameSize) {
    this.applyViewportResize(gameSize.width, gameSize.height);
  }

  queueViewportResize() {
    if (this.viewportResizeFrame) {
      window.cancelAnimationFrame(this.viewportResizeFrame);
    }

    this.viewportResizeFrame = window.requestAnimationFrame(() => {
      this.viewportResizeFrame = null;
      const { width, height } = this.getBrowserViewportSize();
      if (this.scale.width !== width || this.scale.height !== height) {
        this.scale.resize(width, height);
      }
      this.applyViewportResize(width, height);
    });
  }

  getBrowserViewportSize() {
    const visualViewport = window.visualViewport;
    return {
      width: Math.max(1, Math.floor(visualViewport?.width ?? window.innerWidth)),
      height: Math.max(1, Math.floor(visualViewport?.height ?? window.innerHeight)),
    };
  }

  applyViewportResize(width, height) {
    this.setViewportSize(width, height);
    this.configureWorldAndCameraBounds();
    this.uiCamera?.setSize(this.getViewportWidth(), this.getViewportHeight());
    this.positionHudObjects();
    this.rebuildVisibleScreenSpaceOverlays();
    this.updateCamera(1000);
    this.updateUiLayer();
    if (this.ui) {
      this.drawHud(this.time.now);
    }
  }

  rebuildVisibleScreenSpaceOverlays() {
    if (!this.uiLayer) {
      return;
    }

    const menuWasVisible = Boolean(this.menuContainer?.visible);
    if (this.menuContainer) {
      this.menuContainer.destroy();
      this.createMenuOverlay();
      this.menuContainer.setVisible(menuWasVisible);
    }

    if (this.matchOver && this.endOverlayState) {
      this.showEndOverlay(this.endOverlayState.winnerText, this.endOverlayState.reason);
    }
  }

  update(time, delta) {
    this.updateBackground(delta);

    if (this.matchOver) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
        this.restartMatch();
      }
      this.updateUiLayer();
      return;
    }

    if (this.matchPaused) {
      this.updateUiLayer();
      return;
    }

    this.refreshInputStates(time);

    if (this.onlineMode && !this.onlineReady) {
      this.updateCamera(delta);
      this.updateUiLayer();
      this.drawHud(time);
      return;
    }

    for (const player of this.players) {
      this.updatePlayer(player, time, delta);
    }

    this.updateDashAttacks(time);
    this.updatePickups(time);
    this.checkKillZones();
    this.checkRoundTimer(time);
    this.syncOnlineState(time);
    this.updateCamera(delta);
    this.updateUiLayer();
    this.drawHud(time);
  }

  createGeneratedTextures() {
    this.generateArmTexture();
    this.generateCrosshairTexture();
    this.generateProjectileTexture();
    this.generateGrenadeTexture();
    this.generatePowerupTextures();
    this.generateWeaponTextures();
  }

  createCharacterTextures() {
    const sourceImage = this.textures.get(CHARACTER_SOURCE_KEY).getSourceImage();
    const geometry = detectSheetFrameGeometry(sourceImage, CHARACTER_SHEET, {
      includeExtensions: true,
    });

    this.characterFrames = geometry.frameCells;
    this.characterFrameCount = geometry.frameCells.length;
    for (let index = 0; index < geometry.frameCells.length; index += 1) {
      const key = this.getCharacterTextureKey(index + 1);
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
      this.textures.addCanvas(
        key,
        makeFrameCanvas(sourceImage, CHARACTER_SHEET, geometry.frameCells[index], {
          fixedCanvas: true,
        }),
      );
    }
  }

  getCharacterTextureKey(frame) {
    return `${CHARACTER_TEXTURE_PREFIX}-${frame}`;
  }

  generateArmTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xf5c39b, 1);
    graphics.fillRect(0, 1, 25, 6);
    graphics.fillStyle(0x7a4d3f, 1);
    graphics.fillRect(0, 0, 25, 1);
    graphics.fillRect(0, 7, 25, 1);
    graphics.fillStyle(0xffe0bd, 1);
    graphics.fillRect(3, 2, 11, 2);
    graphics.generateTexture('arm-pixel', 26, 8);
    graphics.destroy();
  }

  generateCrosshairTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(10, 10, 7);
    graphics.lineBetween(10, 0, 10, 5);
    graphics.lineBetween(10, 15, 10, 20);
    graphics.lineBetween(0, 10, 5, 10);
    graphics.lineBetween(15, 10, 20, 10);
    graphics.generateTexture('crosshair-pixel', 20, 20);
    graphics.destroy();
  }

  generateProjectileTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xfff3a3, 0.2);
    graphics.fillCircle(9, 9, 9);
    graphics.fillStyle(0xffe45c, 0.55);
    graphics.fillCircle(9, 9, 6);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(7, 7, 3);
    graphics.generateTexture(PROJECTILE_TEXTURE_KEY, 18, 18);
    graphics.destroy();
  }

  generateGrenadeTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x264e35, 1);
    graphics.fillRect(4, 2, 7, 2);
    graphics.fillStyle(COLORS.grenade, 1);
    graphics.fillRect(3, 4, 10, 9);
    graphics.fillStyle(0x183322, 1);
    graphics.fillRect(4, 5, 2, 7);
    graphics.fillRect(8, 5, 2, 7);
    graphics.fillRect(12, 6, 1, 5);
    graphics.generateTexture('grenade-pixel', 16, 16);
    graphics.destroy();
  }

  generatePowerupTextures() {
    const powerups = {
      slowmo: 0x9ee7ff,
      heal: 0xff6f91,
      shield: 0x8cffab,
      haste: 0xffd166,
    };

    for (const [id, color] of Object.entries(powerups)) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0x101622, 1);
      graphics.fillRect(2, 2, 20, 20);
      graphics.fillStyle(color, 1);
      graphics.fillRect(5, 5, 14, 14);
      graphics.fillStyle(0xffffff, 0.8);
      graphics.fillRect(10, 4, 4, 16);
      graphics.fillRect(4, 10, 16, 4);
      graphics.generateTexture(`powerup-${id}`, 24, 24);
      graphics.destroy();
    }
  }

  generateWeaponTextures() {
    const sourceImage = this.textures.get(HANDGUN_SOURCE_KEY).getSourceImage();
    const geometry = detectSheetFrameGeometry(sourceImage, HANDGUN_SHEET, {
      includeExtensions: false,
    });
    const fallbackCell = geometry.frameCells[WEAPON_SHEET_FRAMES.pistol - 1] ?? geometry.frameCells[0];
    if (!fallbackCell) {
      return;
    }

    for (const id of Object.keys(this.configData.weapons)) {
      const frame = WEAPON_SHEET_FRAMES[id] ?? WEAPON_SHEET_FRAMES.pistol;
      const cell = geometry.frameCells[frame - 1] ?? fallbackCell;
      const textureKey = `weapon-${id}`;
      if (this.textures.exists(textureKey)) {
        this.textures.remove(textureKey);
      }
      this.textures.addCanvas(
        textureKey,
        makeFrameCanvas(sourceImage, HANDGUN_SHEET, cell, {
          fixedCanvas: false,
        }),
      );
    }
  }

  drawBackground() {
    const sky = this.add.graphics().setDepth(-30);
    const worldWidth = this.worldWidth ?? WORLD_WIDTH;
    const worldHeight = this.worldHeight ?? WORLD_HEIGHT;

    for (let y = 0; y < worldHeight; y += 8) {
      const t = y / worldHeight;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x72c7ff),
        Phaser.Display.Color.ValueToColor(0xf6dda4),
        1,
        t,
      );
      sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      sky.fillRect(0, y, worldWidth, 8);
    }

    sky.fillStyle(0x60748d, 0.42);
    sky.fillRect(0, 440, worldWidth, worldHeight - 440);
    sky.fillStyle(0x3d4a5f, 0.28);
    for (let x = 0; x < worldWidth; x += 56) {
      const h = 42 + ((x * 17) % 46);
      sky.fillRect(x, 438 - h, 38, h);
    }

    this.clouds.push(this.createCloud(88, 82, 1.2, 7));
    this.clouds.push(this.createCloud(418, 58, 0.86, 10));
    this.clouds.push(this.createCloud(742, 112, 1.05, 8));
    this.clouds.push(this.createCloud(1160, 72, 1.1, 6));
    this.clouds.push(this.createCloud(1570, 118, 0.94, 9));
  }

  createCloud(x, y, scale, speed) {
    const container = this.add.container(x, y).setDepth(-20);
    const parts = [
      this.add.rectangle(0, 10 * scale, 72 * scale, 16 * scale, 0xffffff, 0.9),
      this.add.rectangle(12 * scale, 0, 22 * scale, 26 * scale, 0xffffff, 0.9),
      this.add.rectangle(38 * scale, 4 * scale, 28 * scale, 22 * scale, 0xffffff, 0.9),
    ];
    container.add(parts);
    container.setData('speed', speed);
    return container;
  }

  updateBackground(delta) {
    const worldWidth = this.worldWidth ?? WORLD_WIDTH;
    for (const cloud of this.clouds) {
      cloud.x += cloud.getData('speed') * (delta / 1000);
      if (cloud.x > worldWidth + 80) {
        cloud.x = -110;
      }
    }
  }

  createAnimations() {
    const frameCount = this.characterFrameCount;
    const config = DEFAULT_EMPRESS_ANIMATION_CONFIG;
    this.animationConfig = config;
    this.animationFrameCount = frameCount;
    const animationKeys = {
      idle: 'girl-idle',
      idleAimStraight: 'girl-idle-gun',
      run: 'girl-run',
      runGun: 'girl-run-gun',
      aim: 'girl-aim',
      melee: 'girl-melee',
      crouchDown: 'girl-crouch-down',
      crouchDownGun: 'girl-crouch-down-gun',
      crouch: 'girl-crouch',
      crouchMelee: 'girl-crouch-melee',
      standUp: 'girl-stand-up',
      standUpGun: 'girl-stand-up-gun',
      jumpPrep: 'girl-jump-prep',
      crouchWalk: 'girl-crouch-walk',
      jumpUp: 'girl-jump-up',
      jumpPeak: 'girl-jump-peak',
      jumpDown: 'girl-jump-down',
      jumpLand: 'girl-jump-land',
      jumpPrepGun: 'girl-jump-prep-gun',
      jumpGunUp: 'girl-jump-up-gun',
      jumpGunPeak: 'girl-jump-peak-gun',
      jumpGunDown: 'girl-jump-down-gun',
      jumpGunLand: 'girl-jump-land-gun',
      jumpMelee: 'girl-jump-melee',
      pickup: 'girl-pickup',
    };

    for (const name of ANIMATION_ORDER) {
      if (!animationKeys[name]) {
        continue;
      }
      const setting = config[name];
      this.anims.create({
        key: animationKeys[name],
        frames: makeFrameList1Based(setting, frameCount).map((frame) => ({
          key: this.getCharacterTextureKey(frame),
        })),
        frameRate: setting.fps,
        repeat: setting.repeat ? -1 : 0,
      });
    }
  }

  createLevel() {
    this.glassWindows = this.physics.add.staticGroup();
    this.levelSpawns = null;

    if (this.editorLevel) {
      this.createTileLevel(this.editorLevel);
      return;
    }

    const centerX = this.worldWidth / 2;
    const mainY = Math.min(this.worldHeight - 95, 610);
    const mainHeight = 52;
    const mainTop = mainY - mainHeight / 2;
    const mainWidth = Math.min(1120, this.worldWidth - 360);
    const centerPlatform = { x: centerX, y: mainY - 110, width: 260 };
    const leftPlatform = { x: centerX - 300, y: mainY - 160, width: 240 };
    const rightPlatform = { x: centerX + 300, y: mainY - 160, width: 240 };

    this.levelSpawns = {
      p1: {
        x: centerX - mainWidth * 0.28,
        y: mainTop - this.getStandingBodyBottomOffset(),
      },
      p2: {
        x: centerX + mainWidth * 0.28,
        y: mainTop - this.getStandingBodyBottomOffset(),
      },
    };

    this.pickupSpawnPoints = [
      { x: centerX - 420, y: mainTop - 28 },
      { x: centerX - 170, y: mainTop - 28 },
      { x: centerX + 170, y: mainTop - 28 },
      { x: centerX + 420, y: mainTop - 28 },
      { x: centerPlatform.x - 76, y: centerPlatform.y - 42 },
      { x: centerPlatform.x + 76, y: centerPlatform.y - 42 },
      { x: leftPlatform.x - 76, y: leftPlatform.y - 42 },
      { x: leftPlatform.x, y: leftPlatform.y - 42 },
      { x: leftPlatform.x + 76, y: leftPlatform.y - 42 },
      { x: rightPlatform.x - 76, y: rightPlatform.y - 42 },
      { x: rightPlatform.x, y: rightPlatform.y - 42 },
      { x: rightPlatform.x + 76, y: rightPlatform.y - 42 },
    ];

    this.createPlatform(centerX, mainY, mainWidth, mainHeight, false, COLORS.platformTrim);
    this.createPlatform(centerPlatform.x, centerPlatform.y, centerPlatform.width, 14, true);
    this.createPlatform(leftPlatform.x, leftPlatform.y, leftPlatform.width, 14, true);
    this.createPlatform(rightPlatform.x, rightPlatform.y, rightPlatform.width, 14, true);

    this.add.rectangle(centerX, mainY - 34, mainWidth - 28, 12, COLORS.platformTop, 0.92).setOrigin(0.5);
    this.add.rectangle(centerX, mainY + 34, mainWidth + 42, 18, 0x30283b, 0.88).setOrigin(0.5);
  }

  createTileLevel(level) {
    this.pickupSpawnPoints = [];
    this.levelSpawns = {};
    this.drawTileLevel(level);

    for (const rect of mergeTilesToRects(level, ['solid'])) {
      this.createTileCollider(rect, false);
    }

    for (const rect of mergeTilesToRects(level, ['platform'])) {
      this.createTileCollider(rect, true);
    }

    for (const rect of mergeTilesToRects(level, ['glass'])) {
      this.createWindow(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
    }

    for (const rect of mergeTilesToRects(level, ['ladder'])) {
      this.createLadder(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.height);
    }

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const tile = level.grid[y * level.width + x];
        const worldX = x * level.tileSize + level.tileSize / 2;
        const worldY = y * level.tileSize + level.tileSize / 2;

        if (tile === TILE_INDEX.pickup) {
          this.pickupSpawnPoints.push({ x: worldX, y: worldY });
        } else if (tile === TILE_INDEX.p1) {
          this.levelSpawns.p1 = this.resolveEditorSpawn(level, worldX, worldY);
        } else if (tile === TILE_INDEX.p2) {
          this.levelSpawns.p2 = this.resolveEditorSpawn(level, worldX, worldY);
        }
      }
    }
  }

  resolveEditorSpawn(level, worldX, worldY) {
    const tileSize = level.tileSize;
    const centerColumn = Math.floor(worldX / tileSize);
    const startRow = Math.floor(worldY / tileSize);
    const solidTiles = new Set([TILE_INDEX.solid, TILE_INDEX.platform]);

    for (let y = startRow; y < level.height; y += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const x = centerColumn + dx;
        if (x < 0 || x >= level.width) {
          continue;
        }
        if (solidTiles.has(level.grid[y * level.width + x])) {
          return {
            x: worldX,
            y: y * tileSize - this.getStandingBodyBottomOffset(),
          };
        }
      }
    }

    return { x: worldX, y: worldY };
  }

  getStandingBodyBottomOffset() {
    const body = this.configData.playerBody.standing;
    return (-FRAME_SIZE / 2 + body.offsetY + body.height) * PLAYER_SCALE;
  }

  drawTileLevel(level) {
    const graphics = this.add.graphics().setDepth(-8);
    const tileSize = level.tileSize;

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const tile = level.grid[y * level.width + x];
        if (
          tile === TILE_INDEX.empty ||
          tile === TILE_INDEX.pickup ||
          tile === TILE_INDEX.p1 ||
          tile === TILE_INDEX.p2 ||
          tile === TILE_INDEX.glass ||
          tile === TILE_INDEX.ladder
        ) {
          continue;
        }

        const def = TILE_DEFS[tile];
        const drawX = x * tileSize;
        const drawY = y * tileSize;
        const color = parseHexColor(def.color, 0x30283b);
        const alpha = def.id === 'backdrop' ? 0.78 : def.id === 'void' ? 0.96 : 1;
        graphics.fillStyle(color, alpha);
        graphics.fillRect(drawX, drawY, tileSize, tileSize);

        if (def.id === 'solid') {
          const tileAbove = y > 0 ? level.grid[(y - 1) * level.width + x] : TILE_INDEX.empty;
          if (tileAbove !== TILE_INDEX.solid) {
            graphics.fillStyle(COLORS.platformTop, 0.88);
            graphics.fillRect(drawX, drawY, tileSize, 4);
          }
          graphics.fillStyle(0x000000, 0.18);
          graphics.fillRect(drawX, drawY + tileSize - 3, tileSize, 3);
        } else if (def.id === 'platform') {
          graphics.fillStyle(0xf6e39a, 1);
          graphics.fillRect(drawX, drawY, tileSize, 4);
          graphics.fillStyle(0x7a6641, 1);
          graphics.fillRect(drawX, drawY + tileSize - 4, tileSize, 4);
        }
      }
    }
  }

  createTileCollider(rect, thin) {
    const collider = this.add
      .rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0xffffff, 0)
      .setOrigin(0.5);
    collider.setData('thin', thin);
    collider.setData('levelGeometry', true);
    collider.setData('indestructible', true);
    this.physics.add.existing(collider, true);
    collider.body.setSize(rect.width, rect.height);
    collider.body.updateFromGameObject();
    this.platforms.push(collider);
    return collider;
  }

  createBuilding({ x, width, floorY, floors, ladders, windows }) {
    const bodyHeight = 300;
    this.add.rectangle(x, floorY - bodyHeight / 2 + 24, width, bodyHeight, 0x5b5366, 0.88).setOrigin(0.5);
    this.add.rectangle(x, floorY - bodyHeight + 70, width - 26, 18, 0x463d52, 0.86).setOrigin(0.5);

    for (const floor of floors) {
      this.createPlatform(
        x,
        floor.y,
        floor.width,
        floor.solid ? 46 : 14,
        Boolean(floor.thin),
        floor.solid ? undefined : COLORS.thinPlatform,
      );
      if (floor.solid) {
        this.createPlatform(x, floor.y + 24, floor.width + 42, 22, false, COLORS.platformTrim);
      }
    }

    for (const ladder of ladders) {
      this.createLadder(ladder.x, ladder.y, ladder.height);
    }

    for (const windowSpec of windows) {
      const bottomFloorWindow = windowSpec.y > floorY - 80;
      this.createWindow(windowSpec.x, windowSpec.y, windowSpec.width, windowSpec.height, {
        breakable: windowSpec.breakable ?? !bottomFloorWindow,
      });
    }
  }

  drawChasm(leftEdge, rightEdge) {
    const graphics = this.add.graphics().setDepth(-10);
    const worldHeight = this.worldHeight ?? WORLD_HEIGHT;
    graphics.fillStyle(0x171923, 0.95);
    graphics.fillRect(leftEdge, 450, rightEdge - leftEdge, worldHeight - 450);
    graphics.fillStyle(0x090d14, 1);
    graphics.fillRect(leftEdge + 20, 465, rightEdge - leftEdge - 40, worldHeight - 465);
    graphics.lineStyle(5, 0x2d2438, 1);
    graphics.lineBetween(leftEdge, 450, leftEdge + 40, worldHeight);
    graphics.lineBetween(rightEdge, 450, rightEdge - 40, worldHeight);
  }

  createPlatform(x, y, width, height, thin, overrideColor = null) {
    const color = overrideColor ?? (thin ? COLORS.thinPlatform : COLORS.platformFace);
    const platform = this.add.rectangle(x, y, width, height, color).setOrigin(0.5);
    platform.setData('thin', thin);
    platform.setData('levelGeometry', true);
    platform.setData('indestructible', true);
    this.physics.add.existing(platform, true);
    platform.body.setSize(width, height);
    platform.body.updateFromGameObject();

    if (!thin && overrideColor === null) {
      this.add.rectangle(x, y - height / 2 - 3, width + 14, 8, COLORS.platformTop).setOrigin(0.5);
    }

    if (thin) {
      this.add.rectangle(x, y - height / 2 - 2, width + 10, 5, 0xf6e39a).setOrigin(0.5);
      this.add.rectangle(x, y + height / 2 + 2, width + 6, 4, 0x7a6641).setOrigin(0.5);
    }

    this.platforms.push(platform);
    return platform;
  }

  updateCamera(delta) {
    if (!this.players.length) {
      return;
    }

    const trackedPlayers = this.players.filter((player) => player.sprite?.active);
    if (!trackedPlayers.length) {
      return;
    }

    const bounds = trackedPlayers.map((player) => {
      const body = player.sprite.body;
      const halfWidth = (body?.width ?? 34) / 2;
      const halfHeight = (body?.height ?? 46) / 2;
      return {
        left: player.sprite.x - halfWidth,
        right: player.sprite.x + halfWidth,
        top: player.sprite.y - halfHeight,
        bottom: player.sprite.y + halfHeight,
      };
    });
    const minX = Math.min(...bounds.map((box) => box.left));
    const maxX = Math.max(...bounds.map((box) => box.right));
    const minY = Math.min(...bounds.map((box) => box.top));
    const maxY = Math.max(...bounds.map((box) => box.bottom));
    const viewportWidth = this.getViewportWidth();
    const viewportHeight = this.getViewportHeight();
    const marginX = Phaser.Math.Clamp(viewportWidth * 0.075, 70, 125);
    const marginY = Phaser.Math.Clamp(viewportHeight * 0.11, 70, 135);
    const fitWidth = Math.max(1, maxX - minX);
    const fitHeight = Math.max(1, maxY - minY);
    const usableWidth = Math.max(260, viewportWidth - marginX * 2);
    const usableHeight = Math.max(220, viewportHeight - marginY * 2);
    const targetZoom = Phaser.Math.Clamp(
      Math.min(usableWidth / fitWidth, usableHeight / fitHeight),
      0.4,
      1.45,
    );
    const viewWidth = viewportWidth / targetZoom;
    const viewHeight = viewportHeight / targetZoom;
    const centerX = trackedPlayers.reduce((sum, player) => sum + player.sprite.x, 0) / trackedPlayers.length;
    const centerY = trackedPlayers.reduce((sum, player) => sum + player.sprite.y, 0) / trackedPlayers.length;
    const originOffsetX = viewportWidth * this.cameras.main.originX * (1 - 1 / targetZoom);
    const originOffsetY = viewportHeight * this.cameras.main.originY * (1 - 1 / targetZoom);
    const targetScrollX = Math.round(centerX - viewWidth / 2 - originOffsetX);
    const targetScrollY = Math.round(centerY - viewHeight / 2 - originOffsetY);
    const lerp = Math.min(1, delta / 140);

    this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, lerp));
    this.cameras.main.scrollX = Math.round(Phaser.Math.Linear(this.cameras.main.scrollX, targetScrollX, lerp));
    this.cameras.main.scrollY = Math.round(Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, lerp));
  }

  screenX(x) {
    return x / this.cameras.main.zoom + this.cameras.main.scrollX;
  }

  screenY(y) {
    return y / this.cameras.main.zoom + this.cameras.main.scrollY;
  }

  createUiLayer() {
    this.uiLayer = this.add.container(0, 0).setDepth(10000);
    this.uiCamera = this.cameras.add(0, 0, this.getViewportWidth(), this.getViewportHeight()).setScroll(0, 0).setZoom(1);
    this.cameras.main.ignore(this.uiLayer);
    this.syncUiCameraIgnore();
  }

  updateUiLayer() {
    if (!this.uiLayer) {
      return;
    }

    this.syncMobileControlsVisibility();
    this.uiLayer.setScale(1);
    this.uiLayer.setPosition(0, 0);
    this.uiCamera?.setSize(this.getViewportWidth(), this.getViewportHeight()).setScroll(0, 0).setZoom(1);
    this.syncUiCameraIgnore();
  }

  syncUiCameraIgnore() {
    if (!this.uiCamera || !this.uiLayer) {
      return;
    }

    this.cameras.main.ignore(this.uiLayer);
    this.uiCamera.ignore(this.children.list.filter((child) => child !== this.uiLayer));
  }

  addToUiLayer(objects) {
    const list = Array.isArray(objects) ? objects : [objects];
    for (const object of list) {
      this.lockToScreen(object);
    }
    this.uiLayer.add(list);
  }

  lockToScreen(gameObject) {
    gameObject?.setScrollFactor?.(0);
    if (gameObject?.list) {
      for (const child of gameObject.list) {
        this.lockToScreen(child);
      }
    }
    return gameObject;
  }

  createLadder(x, y, height) {
    const ladder = this.add.rectangle(x, y, 28, height, COLORS.ladder, 0.36).setOrigin(0.5);
    const railLeft = this.add.rectangle(x - 10, y, 4, height, COLORS.ladder, 0.9).setOrigin(0.5);
    const railRight = this.add.rectangle(x + 10, y, 4, height, COLORS.ladder, 0.9).setOrigin(0.5);
    for (let rungY = y - height / 2 + 10; rungY < y + height / 2; rungY += 16) {
      this.add.rectangle(x, rungY, 24, 4, COLORS.ladder, 0.9).setOrigin(0.5);
    }
    ladder.setData('bounds', new Phaser.Geom.Rectangle(x - 16, y - height / 2, 32, height));
    ladder.setData('visuals', [railLeft, railRight]);
    this.ladders.push(ladder);
  }

  createWindow(x, y, width, height, options = {}) {
    const breakable = options.breakable ?? true;
    const pane = this.add.rectangle(x, y, width, height, COLORS.glass, breakable ? 0.48 : 0.34).setOrigin(0.5);
    const shine = this.add.rectangle(x - width * 0.2, y - height * 0.15, 3, height * 0.55, 0xffffff, 0.4);
    pane.setData('health', 8);
    pane.setData('breakable', breakable);
    pane.setData('shine', shine);
    this.physics.add.existing(pane, true);
    pane.body.setSize(width, height);
    pane.body.updateFromGameObject();
    this.glassWindows.add(pane);
    return pane;
  }

  createGroups() {
    this.bullets = this.physics.add.group({ runChildUpdate: false, allowGravity: false });
    this.grenades = this.physics.add.group({ bounceX: this.configData.grenades.bounce, bounceY: this.configData.grenades.bounce });
    this.pickups = this.physics.add.staticGroup();
  }

  createInputs() {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
      one: K.ONE,
      two: K.TWO,
      three: K.THREE,
      four: K.FOUR,
      up: K.UP,
      left: K.LEFT,
      down: K.DOWN,
      right: K.RIGHT,
      m: K.M,
      comma: K.COMMA,
      period: K.PERIOD,
      slash: 191,
      esc: K.ESC,
      enter: K.ENTER,
      space: K.SPACE,
    });

    this.gameKeyPreventDefaultHandler = (event) => {
      if (!isTypingIntoDomField() && GAME_DEFAULT_CAPTURE_CODES.has(event.code)) {
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', this.gameKeyPreventDefaultHandler, { capture: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.gameKeyPreventDefaultHandler, { capture: true });
    });

    this.input.on('pointerdown', (pointer) => this.handleUiPointerDown(pointer));
  }

  refreshInputStates(time) {
    for (const player of this.players) {
      const down = this.getInputDownForPlayer(player);
      updateInputState(player.inputState, down);
    }

    this.sendOnlineInput(time);
  }

  setGameKeyboardEnabled(enabled) {
    const keyboard = this.input?.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.enabled = enabled;
    if (!enabled) {
      for (const key of Object.values(this.keys ?? {})) {
        key?.reset?.();
      }
    }
  }

  getInputDownForPlayer(player) {
    if (this.onlineMode) {
      if (player.id === this.localOnlinePlayerId) {
        return mergeInputDown(this.readOnlineKeyboardInput(), this.touchInputDown);
      }
      return player.remoteInputDown;
    }

    if (player.id === 'p1') {
      return mergeInputDown(this.readKeyboardInput(player), this.touchInputDown);
    }
    return this.readKeyboardInput(player);
  }

  readOnlineKeyboardInput() {
    return this.p1 ? this.readKeyboardInput(this.p1) : createInputDown();
  }

  readKeyboardInput(player) {
    const down = createInputDown();
    if (!player.controls || isTypingIntoDomField()) {
      return down;
    }

    for (const action of INPUT_ACTIONS) {
      down[action] = Boolean(player.controls[action]?.isDown);
    }
    return down;
  }

  createMobileControls() {
    if (this.mobileControlsEl) {
      this.mobileControlsEl.remove();
    }

    const root = document.createElement('div');
    root.className = 'mobile-controls';
    root.innerHTML = `
      <div class="mobile-dpad" aria-label="Movement controls">
        <button class="mobile-control mobile-aim-up mobile-aim-control" data-action="aimUp" aria-label="Aim up">^</button>
        <button class="mobile-control mobile-left" data-action="left" aria-label="Move left">Left</button>
        <button class="mobile-control mobile-down" data-action="crouch" aria-label="Crouch">Down</button>
        <button class="mobile-control mobile-right" data-action="right" aria-label="Move right">Right</button>
        <button class="mobile-control mobile-aim-down mobile-aim-control" data-action="aimDown" aria-label="Aim down">v</button>
      </div>
      <div class="mobile-actions" aria-label="Action controls">
        <button class="mobile-control mobile-jump" data-action="jump" aria-label="Jump">Jump</button>
        <button class="mobile-control" data-action="melee" aria-label="Melee">M</button>
        <button class="mobile-control" data-action="shoot" aria-label="Shoot">Fire</button>
        <button class="mobile-control" data-action="grenade" aria-label="Grenade">Grenade</button>
        <button class="mobile-control" data-action="powerup" aria-label="Powerup">Power</button>
      </div>
    `;
    document.body.appendChild(root);
    this.mobileControlsEl = root;

    const bindButton = (button) => {
      const action = button.dataset.action;
      if (!action) {
        return;
      }

      const setDown = (event, down) => {
        event.preventDefault();
        this.touchInputDown[action] = down;
        button.classList.toggle('is-active', down);
        this.syncMobileControlsVisibility();
      };

      button.addEventListener('pointerdown', (event) => {
        button.setPointerCapture?.(event.pointerId);
        setDown(event, true);
      });
      button.addEventListener('pointerup', (event) => setDown(event, false));
      button.addEventListener('pointercancel', (event) => setDown(event, false));
      button.addEventListener('lostpointercapture', () => {
        this.touchInputDown[action] = false;
        button.classList.remove('is-active');
        this.syncMobileControlsVisibility();
      });
    };

    for (const button of root.querySelectorAll('[data-action]')) {
      bindButton(button);
    }

    root.addEventListener('contextmenu', (event) => event.preventDefault());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => root.remove());
    this.syncMobileControlsVisibility();
  }

  syncMobileControlsVisibility() {
    if (!this.mobileControlsEl) {
      return;
    }

    const shouldShow = isMobileLike() && this.modeSelected && !this.matchPaused && !this.matchOver;
    const aimingControlsVisible = Boolean(this.touchInputDown.shoot || this.touchInputDown.grenade);
    if (!aimingControlsVisible) {
      this.touchInputDown.aimUp = false;
      this.touchInputDown.aimDown = false;
      for (const button of this.mobileControlsEl.querySelectorAll('.mobile-aim-control')) {
        button.classList.remove('is-active');
      }
    }
    this.mobileControlsEl.classList.toggle('is-visible', shouldShow);
    this.mobileControlsEl.classList.toggle('is-aiming', aimingControlsVisible);
  }

  createPlayer(config) {
    const sprite = this.physics.add
      .sprite(config.spawnX, config.spawnY, this.getCharacterTextureKey(23))
      .setScale(PLAYER_SCALE)
      .setDepth(10)
      .setOrigin(0.5)
      .setCollideWorldBounds(false)
      .setDragX(1850)
      .setMaxVelocity(620, 920);

    this.applyBodyConfig(sprite, this.configData.playerBody.standing);
    sprite.play('girl-idle');
    sprite.setFlipX(config.facing < 0);

    const arm = this.add.image(sprite.x, sprite.y, 'arm-pixel').setOrigin(0, 0.5).setDepth(12).setVisible(false);
    const weaponSprite = this.add
      .image(sprite.x, sprite.y, 'weapon-pistol')
      .setOrigin(DEFAULT_GUN_GRIP_POINT.x / HANDGUN_SHEET.frameSize, DEFAULT_GUN_GRIP_POINT.y / HANDGUN_SHEET.frameSize)
      .setScale(0.74)
      .setDepth(13)
      .setVisible(false);
    const crosshair = this.add.image(sprite.x, sprite.y, 'crosshair-pixel').setDepth(14).setVisible(false);
    const aimGraphics = this.add.graphics().setDepth(11).setVisible(false);

    return {
      ...config,
      sprite,
      arm,
      weaponSprite,
      crosshair,
      aimGraphics,
      health: PLAYER_MAX_HEALTH,
      lives: this.configData.round.lives,
      kills: 0,
      facing: config.facing,
      inputState: createInputState(),
      keyboardInputDown: createInputDown(),
      remoteInputDown: createInputDown(),
      aimAngle: config.facing > 0 ? 0 : Math.PI,
      aimFacing: config.facing > 0 ? 1 : -1,
      aimOffset: 0,
      aimMode: null,
      aiming: false,
      crouching: false,
      climbing: false,
      onThinPlatform: false,
      dropUntil: 0,
      currentPickup: null,
      weapon: null,
      grenadeAmmo: this.configData.grenades.startCount,
      powerup: null,
      comboIndex: 0,
      comboResetAt: 0,
      nextMeleeAt: 0,
      nextShotAt: 0,
      nextGrenadeAt: 0,
      nextPowerupAt: 0,
      runningUntil: 0,
      runDirection: config.facing,
      lastTapLeftAt: -Infinity,
      lastTapRightAt: -Infinity,
      crouchTransitionUntil: 0,
      crouchTransitionGun: false,
      standTransitionUntil: 0,
      standTransitionGun: false,
      dashAttackUntil: 0,
      dashDirection: 0,
      dashHitTargets: new Set(),
      meleeAnimationUntil: 0,
      meleeAnimationKey: null,
      pickupAnimationUntil: 0,
      shootStanceUntil: 0,
      jumpHeldUntil: 0,
      jumpReleased: true,
      jumpPrepUntil: 0,
      jumpLandUntil: 0,
      wasGrounded: true,
      knockedUntil: 0,
      invulnerableUntil: 0,
      slowedUntil: 0,
      shieldUntil: 0,
      hasteUntil: 0,
    };
  }

  createColliders() {
    for (const player of this.players) {
      this.physics.add.collider(
        player.sprite,
        this.platforms,
        this.handlePlatformContact,
        this.platformProcess,
        this,
      );
      this.physics.add.collider(player.sprite, this.glassWindows);
      this.physics.add.collider(player.sprite, this.grenades, undefined, this.grenadePlayerProcess, this);
    }

    this.physics.add.collider(this.p1.sprite, this.p2.sprite);
    this.physics.add.collider(this.bullets, this.platforms, this.handleBulletWall, undefined, this);
    this.physics.add.collider(this.bullets, this.glassWindows, this.handleBulletWindow, undefined, this);
    this.physics.add.collider(this.grenades, this.platforms);
    this.physics.add.collider(this.grenades, this.glassWindows, this.handleGrenadeWindow, undefined, this);
    this.physics.add.overlap(this.bullets, [this.p1.sprite, this.p2.sprite], this.handleBulletHit, this.bulletPlayerProcess, this);
  }

  createHud() {
    this.ui = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.hintText = this.add
      .text(14, 8, 'Esc: Menu / Online  |  Debug  |  Editor', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#eaf5ff',
        stroke: '#172033',
        strokeThickness: 1,
      })
      .setScrollFactor(0)
      .setDepth(51);
    this.hintText.setInteractive({ useHandCursor: true });
    this.hintText.on('pointerdown', () => this.toggleMenu());

    this.timerText = this.add
      .text(0, 0, '', {
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#172033',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(51);

    this.p1StatusText = this.add
      .text(24, 47, '', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#d8ecff',
        stroke: '#172033',
        strokeThickness: 1,
      })
      .setScrollFactor(0)
      .setDepth(51);

    this.p2StatusText = this.add
      .text(0, 47, '', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#ffd7e0',
        stroke: '#172033',
        strokeThickness: 1,
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(51);

    this.messageText = this.add
      .text(0, 92, '', {
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#172033',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(51);

    this.addToUiLayer([
      this.ui,
      this.hintText,
      this.timerText,
      this.p1StatusText,
      this.p2StatusText,
      this.messageText,
    ]);
    this.positionHudObjects();
  }

  positionHudObjects() {
    if (!this.timerText || !this.messageText || !this.p2StatusText || !this.hintText) {
      return;
    }

    const width = this.getViewportWidth();
    const compact = width < 620 || isMobileLike();
    this.hintText.setVisible(!compact);
    this.timerText.setPosition(width / 2, compact ? 86 : 17);
    this.timerText.setFontSize(compact ? 20 : 24);
    this.p2StatusText.setPosition(width - (compact ? 18 : 24), compact ? 50 : 47);
    this.p1StatusText?.setPosition(compact ? 18 : 24, compact ? 50 : 47);
    this.messageText.setPosition(width / 2, compact ? 120 : 92);
    this.messageText.setFontSize(compact ? 20 : 24);
  }

  createMenuOverlay() {
    this.menuContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    const viewportWidth = this.getViewportWidth();
    const viewportHeight = this.getViewportHeight();
    const centerX = viewportWidth / 2;
    const panelY = viewportHeight / 2;
    const panelWidth = Math.min(500, Math.max(300, viewportWidth - 32));
    const panelHeight = Math.min(455, Math.max(360, viewportHeight - 32));
    const shade = this.add.rectangle(0, 0, viewportWidth, viewportHeight, 0x090d14, 0.78).setOrigin(0);
    const panel = this.add.rectangle(centerX, panelY, panelWidth, panelHeight, 0x151e2b, 0.96).setStrokeStyle(2, 0x344257);
    const title = this.add
      .text(centerX, panelY - 155, 'SUPERFIGHTERS', {
        fontFamily: UI_FONT,
        fontSize: viewportWidth < 420 ? '27px' : '34px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(centerX, panelY - 117, 'Local multiplayer arena fight', {
        fontFamily: UI_FONT,
        fontSize: '14px',
        color: '#b7c2d2',
      })
      .setOrigin(0.5);

    this.menuContainer.add([shade, panel, title, subtitle]);
    this.menuContainer.add(this.createMenuButton(centerX, panelY - 70, 'Resume', () => this.closeMenu()));
    this.menuContainer.add(this.createMenuButton(centerX, panelY - 22, 'Restart Match', () => this.restartMatch()));
    this.menuContainer.add(this.createMenuButton(centerX, panelY + 26, 'Main Menu', () => {
      window.location.href = assetUrl('');
    }));
    this.menuContainer.add(this.createMenuButton(centerX, panelY + 74, 'Debug / Tuning', () => {
      window.location.href = assetUrl('debug.html');
    }));
    this.menuContainer.add(this.createMenuButton(centerX, panelY + 122, 'Level Editor', () => {
      window.location.href = assetUrl('level-editor.html');
    }));

    const controls = this.add
      .text(
        centerX,
        panelY + 172,
        'P1: WASD + 1 melee, 2 shoot, 3 grenade, 4 power\nP2: Arrows + M melee, , shoot, . grenade, / power\nHold shoot/grenade to aim. Release to fire/throw.',
        {
          fontFamily: UI_FONT,
          fontSize: '13px',
          color: '#dbe7ff',
          align: 'center',
          lineSpacing: 5,
          wordWrap: { width: panelWidth - 34 },
        },
      )
      .setOrigin(0.5);
    this.menuContainer.add(controls);
    this.addToUiLayer(this.menuContainer);
  }

  createStartOverlay() {
    this.startOverlayEl?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'start-overlay';
    overlay.innerHTML = `
      <div class="start-panel">
        <h1>Superfighters</h1>
        <p>Choose how to play.</p>
        <button class="start-local" type="button">Local Multiplayer</button>
        <button class="start-online" type="button">Online Multiplayer</button>
        <div class="start-links">
          <a href="./debug.html">Debug</a>
          <a href="./level-editor.html">Level Editor</a>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.startOverlayEl = overlay;
    overlay.querySelector('.start-local')?.addEventListener('click', () => this.beginLocalGame());
    overlay.querySelector('.start-online')?.addEventListener('click', () => this.beginOnlineFlow());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => overlay.remove());
  }

  applyBootOptions(options = {}) {
    if (options.mode === 'online') {
      this.applyOnlineBootOptions(options);
      return;
    }

    this.beginLocalGame();
  }

  applyOnlineBootOptions(options) {
    this.onlineMode = true;
    this.onlineReady = false;
    this.modeSelected = true;
    this.matchPaused = true;
    this.onlineChannel = options.channel ?? null;
    this.onlineConnected = Boolean(options.channel);
    this.localOnlinePlayerId = options.playerId;
    this.onlineIsHost = options.playerId === 'p1';
    this.onlineLobbyCode = options.code;
    this.onlineLobbyPlayerCount = options.playerCount ?? 2;
    this.onlineLobbyStarted = true;
    this.onlineInputSeq = 0;
    this.onlineLastInputPayload = '';
    this.onlineLastInputSentAt = 0;
    this.onlineLastSnapshotSentAt = 0;
    if (this.onlineChannel) {
      this.bindOnlineChannel(this.onlineChannel);
    }
    this.handleOnlineMatchStart({ code: options.code });
  }

  showStartOverlay() {
    if (this.startOverlayEl) {
      this.startOverlayEl.hidden = false;
    }
    this.modeSelected = false;
    this.matchPaused = true;
    this.setGameKeyboardEnabled(false);
    this.physics.world.pause();
  }

  closeStartOverlay() {
    if (this.startOverlayEl) {
      this.startOverlayEl.hidden = true;
    }
  }

  beginLocalGame() {
    this.disconnectOnlineChannel();
    this.onlineMode = false;
    this.onlineReady = false;
    this.localOnlinePlayerId = null;
    this.modeSelected = true;
    this.matchPaused = false;
    this.closeStartOverlay();
    this.closeOnlineOverlay();
    this.setGameKeyboardEnabled(true);
    this.roundEndsAt = this.time.now + this.configData.round.seconds * 1000;
    this.physics.world.resume();
    this.showMessage('Fight', 900);
  }

  beginOnlineFlow(prefillCode = '') {
    this.modeSelected = true;
    this.onlineMode = true;
    this.onlineReady = false;
    this.matchPaused = true;
    this.closeStartOverlay();
    this.setGameKeyboardEnabled(false);
    this.physics.world.pause();
    this.openOnlineOverlay(prefillCode);
  }

  createGlobalMenuInput() {
    this.menuKeyHandler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.toggleMenu();
      }
    };
    window.addEventListener('keydown', this.menuKeyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.menuKeyHandler);
    });
  }

  createMenuButton(x, y, label, callback) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 230, 34, 0x223149, 1).setStrokeStyle(1, 0x5ea8ff);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: UI_FONT,
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(230, 34);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-115, -17, 230, 34),
      Phaser.Geom.Rectangle.Contains,
    );
    container.input.cursor = 'pointer';
    container.on('pointerover', () => bg.setFillStyle(0x2e4263));
    container.on('pointerout', () => bg.setFillStyle(0x223149));
    container.setData('uiCallback', callback);
    this.uiButtons.push(container);
    return this.lockToScreen(container);
  }

  handleUiPointerDown(pointer) {
    if (!this.uiButtons?.length) {
      return;
    }

    for (let index = this.uiButtons.length - 1; index >= 0; index -= 1) {
      const button = this.uiButtons[index];
      if (!this.isVisibleUiButton(button)) {
        continue;
      }

      const bounds = button.getBounds();
      if (!Phaser.Geom.Rectangle.Contains(bounds, pointer.x, pointer.y)) {
        continue;
      }

      pointer.event?.preventDefault?.();
      button.getData('uiCallback')?.();
      return;
    }
  }

  isVisibleUiButton(button) {
    if (!button?.scene || button.active === false) {
      return false;
    }

    let current = button;
    while (current) {
      if (!current.visible || current.active === false) {
        return false;
      }
      current = current.parentContainer;
    }

    return true;
  }

  toggleMenu() {
    if (this.matchOver) {
      return;
    }
    if (!this.modeSelected || (this.onlineMode && !this.onlineReady)) {
      return;
    }

    if (this.matchPaused) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.matchPaused = true;
    this.setGameKeyboardEnabled(false);
    this.physics.world.pause();
    this.menuContainer.setVisible(true);
  }

  closeMenu() {
    this.menuContainer.setVisible(false);
    if (!this.modeSelected || (this.onlineMode && !this.onlineReady)) {
      this.matchPaused = true;
      this.setGameKeyboardEnabled(false);
      this.physics.world.pause();
      return;
    }
    this.matchPaused = false;
    this.setGameKeyboardEnabled(true);
    this.physics.world.resume();
  }

  restartMatch() {
    if (this.onlineMode && this.onlineChannel) {
      this.onlineChannel.emit('restart-match', { lobbyCode: this.onlineLobbyCode }, { reliable: true });
    }
    window.location.reload();
  }

  createOnlineOverlay() {
    this.onlineOverlayEl?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'online-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="online-panel">
        <button class="online-close" type="button" aria-label="Close online lobby">Close</button>
        <h2>Online Lobby</h2>
        <p class="online-copy">Create a lobby and share the four-letter code, or join a lobby from a code.</p>
        <p class="online-server-fixed">Server: ${escapeHtml(getOnlineServerLabel())}</p>
        <div class="online-actions-row">
          <button class="online-create" type="button">Create Lobby</button>
          <label class="online-code-field">
            <span>Code</span>
            <input class="online-code-input" type="text" maxlength="4" autocomplete="off" spellcheck="false">
          </label>
          <button class="online-join" type="button">Join</button>
        </div>
        <div class="online-lobby-result" hidden>
          <div class="online-code-display">----</div>
          <button class="online-copy-link" type="button">Copy Invite Link</button>
          <button class="online-start" type="button" hidden disabled>Start Game</button>
        </div>
        <p class="online-status">Offline</p>
        <p class="online-mobile-note">On iPhone, open the invite link in Safari. For less browser chrome, Share, Add to Home Screen, then launch from the icon. Portrait play is supported.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    this.onlineOverlayEl = overlay;
    this.onlineStatusEl = overlay.querySelector('.online-status');
    this.onlineCodeInputEl = overlay.querySelector('.online-code-input');
    this.onlineLobbyResultEl = overlay.querySelector('.online-lobby-result');
    this.onlineCodeDisplayEl = overlay.querySelector('.online-code-display');
    this.onlineCopyLinkButtonEl = overlay.querySelector('.online-copy-link');
    this.onlineStartButtonEl = overlay.querySelector('.online-start');

    overlay.querySelector('.online-close')?.addEventListener('click', () => this.handleOnlineClose());
    overlay.querySelector('.online-create')?.addEventListener('click', () => this.createOnlineLobby());
    overlay.querySelector('.online-join')?.addEventListener('click', () => this.joinOnlineLobby(this.onlineCodeInputEl.value));
    this.onlineCodeInputEl.addEventListener('input', () => {
      this.onlineCodeInputEl.value = normalizeLobbyCode(this.onlineCodeInputEl.value);
    });
    this.onlineCodeInputEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.joinOnlineLobby(this.onlineCodeInputEl.value);
      }
    });
    this.onlineCopyLinkButtonEl?.addEventListener('click', () => this.copyOnlineInviteLink());
    this.onlineStartButtonEl?.addEventListener('click', () => this.startOnlineMatch());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => overlay.remove());
  }

  openOnlineOverlay(prefillCode = '') {
    if (!this.onlineOverlayEl) {
      return;
    }
    this.setGameKeyboardEnabled(false);
    this.onlineOverlayEl.hidden = false;
    if (prefillCode) {
      this.onlineCodeInputEl.value = normalizeLobbyCode(prefillCode);
      this.onlineCodeInputEl.focus();
    }
  }

  closeOnlineOverlay() {
    if (this.onlineOverlayEl) {
      this.onlineOverlayEl.hidden = true;
    }
  }

  handleOnlineClose() {
    this.closeOnlineOverlay();
    if (this.onlineReady) {
      return;
    }
    this.disconnectOnlineChannel();
    this.onlineMode = false;
    this.onlineIsHost = false;
    this.onlineLobbyPlayerCount = 0;
    this.onlineLobbyStarted = false;
    this.localOnlinePlayerId = null;
    this.onlineLobbyCode = null;
    this.updateOnlineStartButton();
    this.showStartOverlay();
  }

  setOnlineStatus(message) {
    if (this.onlineStatusEl) {
      this.onlineStatusEl.textContent = message;
    }
  }

  initializeOnlineFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join') || params.get('code');
    if (code) {
      this.beginOnlineFlow(code);
      this.time.delayedCall(250, () => this.joinOnlineLobby(code));
      return true;
    }
    return false;
  }

  async createOnlineLobby() {
    try {
      const channel = await this.ensureOnlineConnection();
      this.setOnlineStatus('Creating lobby...');
      channel.emit('create-lobby', {}, { reliable: true });
    } catch (error) {
      this.setOnlineStatus(error.message || 'Could not connect');
    }
  }

  async joinOnlineLobby(code) {
    const lobbyCode = normalizeLobbyCode(code);
    if (lobbyCode.length !== 4) {
      this.setOnlineStatus('Enter a four-letter code.');
      return;
    }

    try {
      const channel = await this.ensureOnlineConnection();
      this.setOnlineStatus(`Joining ${lobbyCode}...`);
      channel.emit('join-lobby', { code: lobbyCode }, { reliable: true });
    } catch (error) {
      this.setOnlineStatus(error.message || 'Could not connect');
    }
  }

  startOnlineMatch() {
    if (!this.onlineChannel || !this.onlineIsHost) {
      this.setOnlineStatus('Only the host can start the game.');
      return;
    }
    if (this.onlineLobbyPlayerCount < 2) {
      this.setOnlineStatus('Waiting for opponent.');
      return;
    }

    this.setOnlineStatus('Starting game...');
    this.onlineChannel.emit('start-match', { lobbyCode: this.onlineLobbyCode }, { reliable: true });
  }

  ensureOnlineConnection() {
    if (this.onlineChannel && this.onlineConnected) {
      return Promise.resolve(this.onlineChannel);
    }

    this.disconnectOnlineChannel();
    const config = parseOnlineServerConfig();
    this.setOnlineStatus(`Connecting to ${config.label}...`);
    const channel = geckos(config.options);
    this.onlineChannel = channel;

    return new Promise((resolve, reject) => {
      channel.onConnect((error) => {
        if (error) {
          this.onlineConnected = false;
          reject(error);
          return;
        }

        this.onlineConnected = true;
        this.bindOnlineChannel(channel);
        this.setOnlineStatus('Connected. Create or join a lobby.');
        resolve(channel);
      });
    });
  }

  bindOnlineChannel(channel) {
    if (this.onlineHandlersBound) {
      return;
    }
    this.onlineHandlersBound = true;

    channel.on('lobby-created', (data) => this.handleOnlineLobbyAssigned(data, 'created'));
    channel.on('lobby-joined', (data) => this.handleOnlineLobbyAssigned(data, 'joined'));
    channel.on('lobby-state', (data) => this.handleOnlineLobbyState(data));
    channel.on('match-start', (data) => this.handleOnlineMatchStart(data));
    channel.on('player-input', (data) => this.handleOnlinePlayerInput(data));
    channel.on('player-snapshot', (data) => this.handleOnlinePlayerSnapshot(data));
    channel.on('restart-match', () => window.location.reload());
    channel.on('lobby-error', (data) => {
      this.setOnlineStatus(data?.message || 'Lobby error');
      this.showMessage(data?.message || 'Lobby error', 900);
    });
    channel.onDisconnect(() => {
      this.onlineConnected = false;
      this.onlineReady = false;
      this.onlineMode = false;
      this.setOnlineStatus('Disconnected from online server.');
      this.showMessage('Online disconnected', 1200);
    });
  }

  disconnectOnlineChannel() {
    this.onlineChannel?.close();
    this.onlineChannel = null;
    this.onlineConnected = false;
    this.onlineHandlersBound = false;
  }

  handleOnlineLobbyAssigned(data, action) {
    this.onlineMode = true;
    this.onlineReady = false;
    this.modeSelected = true;
    this.matchPaused = true;
    this.physics.world.pause();
    this.localOnlinePlayerId = data.playerId;
    this.onlineIsHost = data.playerId === 'p1';
    this.onlineLobbyCode = data.code;
    this.onlineLobbyStarted = Boolean(data.started);
    this.onlineLobbyPlayerCount = data.players?.length ?? 1;
    this.onlineInputSeq = 0;
    this.onlineLastInputPayload = '';
    this.onlineLastInputSentAt = 0;
    this.onlineLastSnapshotSentAt = 0;
    this.resetOnlineInputs();
    this.updateOnlineInviteDisplay();
    this.updateOnlineStartButton();
    this.setOnlineStatus(
      action === 'created'
        ? `Lobby ${data.code} created. Waiting for opponent...`
        : `Joined lobby ${data.code}. Waiting for match start...`,
    );
    this.showMessage(`Online ${data.playerId.toUpperCase()} - ${data.code}`, 1200);
  }

  handleOnlineLobbyState(data) {
    if (data?.code) {
      this.onlineLobbyCode = data.code;
      this.updateOnlineInviteDisplay();
    }
    const count = data?.players?.length ?? 0;
    this.onlineLobbyPlayerCount = count;
    this.onlineLobbyStarted = Boolean(data?.started);
    this.updateOnlineStartButton();
    if (count < 2) {
      this.onlineReady = false;
      this.setOnlineStatus(`Lobby ${this.onlineLobbyCode ?? '----'}: waiting for opponent (${count}/2).`);
    } else if (this.onlineLobbyStarted) {
      this.setOnlineStatus(`Lobby ${this.onlineLobbyCode}: starting...`);
    } else if (this.onlineIsHost) {
      this.setOnlineStatus(`Lobby ${this.onlineLobbyCode}: both players connected. Start when ready.`);
    } else {
      this.setOnlineStatus(`Lobby ${this.onlineLobbyCode}: waiting for host to start.`);
    }
  }

  handleOnlineMatchStart(data) {
    this.onlineMode = true;
    this.onlineReady = true;
    this.modeSelected = true;
    this.matchPaused = false;
    this.onlineLobbyCode = data?.code ?? this.onlineLobbyCode;
    this.resetMatchForOnline();
    this.setOnlineStatus(`Playing online lobby ${this.onlineLobbyCode} as ${this.localOnlinePlayerId?.toUpperCase()}.`);
    this.closeStartOverlay();
    this.closeOnlineOverlay();
    this.closeMenu();
    this.physics.world.resume();
    this.showMessage('Online fight', 1000);
  }

  handleOnlinePlayerInput(data) {
    if (!data || data.playerId === this.localOnlinePlayerId) {
      return;
    }
    const player = this.getPlayerById(data.playerId);
    if (!player) {
      return;
    }
    player.remoteInputDown = sanitizeInputDown(data.input);
  }

  handleOnlinePlayerSnapshot(data) {
    if (!data || data.playerId === this.localOnlinePlayerId) {
      return;
    }
    const player = this.getPlayerById(data.playerId);
    if (!player || !data.snapshot) {
      return;
    }
    this.applyRemoteSnapshot(player, data.snapshot);
  }

  updateOnlineInviteDisplay() {
    if (!this.onlineLobbyResultEl || !this.onlineCodeDisplayEl) {
      return;
    }
    const canShowInvite = Boolean(this.onlineLobbyCode && this.onlineIsHost);
    this.onlineLobbyResultEl.hidden = !canShowInvite;
    this.onlineCodeDisplayEl.textContent = this.onlineLobbyCode;
    this.updateOnlineStartButton();
  }

  updateOnlineStartButton() {
    if (!this.onlineStartButtonEl) {
      return;
    }
    const canShow = Boolean(this.onlineLobbyCode && this.onlineIsHost);
    const canStart = canShow && this.onlineLobbyPlayerCount >= 2 && !this.onlineLobbyStarted;
    this.onlineStartButtonEl.hidden = !canShow;
    this.onlineStartButtonEl.disabled = !canStart;
  }

  async copyOnlineInviteLink() {
    if (!this.onlineLobbyCode) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('join', this.onlineLobbyCode);
    await navigator.clipboard?.writeText(url.toString());
    this.setOnlineStatus(`Copied invite link for ${this.onlineLobbyCode}.`);
  }

  resetOnlineInputs() {
    for (const player of this.players) {
      player.inputState = createInputState();
      player.remoteInputDown = createInputDown();
    }
    this.touchInputDown = createInputDown();
  }

  resetMatchForOnline() {
    this.matchOver = false;
    this.physics.world.resume();
    this.roundEndsAt = this.time.now + this.configData.round.seconds * 1000;
    this.pickupSpawnTimer = 0;
    for (const player of this.players) {
      player.health = PLAYER_MAX_HEALTH;
      player.lives = this.configData.round.lives;
      player.kills = 0;
      player.weapon = null;
      player.grenadeAmmo = this.configData.grenades.startCount;
      player.powerup = null;
      player.knockedUntil = 0;
      player.invulnerableUntil = 0;
      player.facing = player.id === 'p1' ? 1 : -1;
      this.respawn(player);
    }
  }

  sendOnlineInput(time) {
    if (!this.onlineMode || !this.onlineReady || !this.onlineChannel || !this.localOnlinePlayerId) {
      return;
    }
    const player = this.getPlayerById(this.localOnlinePlayerId);
    if (!player) {
      return;
    }

    const payload = JSON.stringify(player.inputState.down);
    const shouldSend =
      payload !== this.onlineLastInputPayload ||
      time - this.onlineLastInputSentAt >= ONLINE_INPUT_SEND_MS;

    if (!shouldSend) {
      return;
    }

    this.onlineLastInputPayload = payload;
    this.onlineLastInputSentAt = time;
    this.onlineInputSeq += 1;
    this.onlineChannel.emit('player-input', {
      seq: this.onlineInputSeq,
      input: player.inputState.down,
      t: Math.round(time),
    });
  }

  syncOnlineState(time) {
    if (!this.onlineMode || !this.onlineReady || !this.onlineChannel || !this.localOnlinePlayerId) {
      return;
    }
    if (time - this.onlineLastSnapshotSentAt < ONLINE_SNAPSHOT_SEND_MS) {
      return;
    }
    const player = this.getPlayerById(this.localOnlinePlayerId);
    if (!player) {
      return;
    }
    this.onlineLastSnapshotSentAt = time;
    this.onlineChannel.emit('player-snapshot', {
      t: Math.round(time),
      snapshot: this.serializePlayerSnapshot(player),
    });
  }

  serializePlayerSnapshot(player) {
    return {
      x: roundForNetwork(player.sprite.x),
      y: roundForNetwork(player.sprite.y),
      vx: roundForNetwork(player.sprite.body.velocity.x),
      vy: roundForNetwork(player.sprite.body.velocity.y),
      health: player.health,
      lives: player.lives,
      kills: player.kills,
      facing: player.facing,
      aimFacing: player.aimFacing,
      aimOffset: roundForNetwork(player.aimOffset),
      aimAngle: roundForNetwork(player.aimAngle),
      aiming: player.aiming,
      aimMode: player.aimMode,
      crouching: player.crouching,
      climbing: player.climbing,
      weapon: player.weapon,
      grenadeAmmo: player.grenadeAmmo,
      powerup: player.powerup,
    };
  }

  applyRemoteSnapshot(player, snapshot) {
    const x = Number(snapshot.x);
    const y = Number(snapshot.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      player.sprite.x = Phaser.Math.Linear(player.sprite.x, x, 0.55);
      player.sprite.y = Phaser.Math.Linear(player.sprite.y, y, 0.55);
    }

    if (Number.isFinite(snapshot.vx) && Number.isFinite(snapshot.vy)) {
      player.sprite.body.setVelocity(snapshot.vx, snapshot.vy);
    }

    player.health = clampNetworkNumber(snapshot.health, 0, PLAYER_MAX_HEALTH, player.health);
    player.lives = clampNetworkNumber(snapshot.lives, 0, this.configData.round.lives, player.lives);
    player.kills = clampNetworkNumber(snapshot.kills, 0, 99, player.kills);
    player.facing = snapshot.facing === -1 ? -1 : 1;
    player.aimFacing = snapshot.aimFacing === -1 ? -1 : 1;
    player.aimOffset = clampNetworkNumber(snapshot.aimOffset, -AIM_HALF_ARC, AIM_HALF_ARC, player.aimOffset);
    player.aimAngle = Number.isFinite(snapshot.aimAngle) ? snapshot.aimAngle : player.aimAngle;
    player.aiming = Boolean(snapshot.aiming);
    if (Object.hasOwn(snapshot, 'aimMode')) {
      player.aimMode = snapshot.aimMode === 'gun' || snapshot.aimMode === 'grenade' ? snapshot.aimMode : null;
    }
    player.crouching = Boolean(snapshot.crouching);
    player.climbing = Boolean(snapshot.climbing);
    if (Object.hasOwn(snapshot, 'weapon')) {
      player.weapon = snapshot.weapon?.id ? snapshot.weapon : null;
    }
    player.grenadeAmmo = clampNetworkNumber(snapshot.grenadeAmmo, 0, this.configData.grenades.maxCount, player.grenadeAmmo);
    if (Object.hasOwn(snapshot, 'powerup')) {
      player.powerup = snapshot.powerup ?? null;
    }
    player.sprite.setFlipX(player.facing < 0);
    this.applyBodyPose(player);
    this.updateAimVisuals(player);
  }

  getPlayerById(playerId) {
    if (playerId === 'p1') {
      return this.p1;
    }
    if (playerId === 'p2') {
      return this.p2;
    }
    return null;
  }

  updatePlayer(player, time, delta) {
    const body = player.sprite.body;
    const grounded = body.blocked.down || body.touching.down;
    const justLanded = grounded && !player.wasGrounded;
    player.wasGrounded = grounded;
    const input = player.inputState;
    const leftHeld = input.down.left;
    const rightHeld = input.down.right;
    const upHeld = input.down.jump;
    const downHeld = input.down.crouch;
    const horizontal = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
    const touchAimHeld = input.down.aimUp || input.down.aimDown;
    const vertical = touchAimHeld
      ? (input.down.aimDown ? 1 : 0) - (input.down.aimUp ? 1 : 0)
      : (downHeld ? 1 : 0) - (upHeld ? 1 : 0);

    player.currentPickup = this.findNearbyPickup(player);
    this.tryAutoPickup(player);
    if (!grounded) {
      player.onThinPlatform = false;
    }
    if (justLanded) {
      this.startJumpLand(player, time);
    }

    if (time < player.knockedUntil) {
      this.resetJumpState(player);
      this.endShootStance(player);
      this.updateKnockedPlayer(player);
      return;
    }

    player.sprite.setAngle(0);
    player.sprite.setAlpha(time < player.invulnerableUntil && Math.floor(time / 80) % 2 === 0 ? 0.42 : 1);

    if (input.pressed.powerup) {
      this.activatePowerup(player, time);
    }

    if (!player.aiming && player.shootStanceUntil > 0 && time >= player.shootStanceUntil) {
      this.endShootStance(player);
    }

    if (!player.aiming) {
      if (input.pressed.shoot) {
        this.beginAim(player, 'gun', time);
      } else if (!this.isInShootStance(player, time) && input.pressed.grenade) {
        this.beginAim(player, 'grenade', time);
      }
    }

    if (player.aiming) {
      this.updateCrouchState(player, grounded, downHeld, time);
      this.applyBodyPose(player, grounded);
      this.updateAim(player, horizontal, vertical, delta);
      this.updateJumpPhysics(player, grounded, input, time);
      if (
        (player.aimMode === 'gun' && input.released.shoot) ||
        (player.aimMode === 'grenade' && input.released.grenade)
      ) {
        this.releaseAim(player, time);
      }
      this.updatePlayerAnimation(player, grounded, horizontal, time);
      return;
    }

    if (this.isInShootStance(player, time)) {
      this.updateCrouchState(player, grounded, downHeld, time);
      if (grounded) {
        player.sprite.setVelocityX(0);
      }
      this.updateJumpPhysics(player, grounded, input, time);
      this.applyBodyPose(player, grounded);
      this.updateAimVisuals(player);
      this.updatePlayerAnimation(player, grounded, 0, time);
      return;
    }

    if (
      input.pressed.crouch &&
      grounded &&
      player.onThinPlatform
    ) {
      player.dropUntil = time + DROP_DURATION;
      player.sprite.setVelocityY(110);
      player.onThinPlatform = false;
    }

    const ladder = this.getIntersectingLadder(player);
    if (ladder && vertical !== 0) {
      player.climbing = true;
    }
    if (player.climbing) {
      this.resetJumpState(player);
      this.updateClimbing(player, ladder, vertical, horizontal, time, input);
      this.updatePlayerAnimation(player, true, horizontal, time);
      return;
    }

    body.setAllowGravity(true);
    this.updateCrouchState(player, grounded, downHeld, time);
    this.applyBodyPose(player, grounded);

    if (player.crouching) {
      player.sprite.setVelocityX(0);
    } else if (horizontal !== 0) {
      player.facing = horizontal;
      player.sprite.setFlipX(horizontal < 0);
      player.sprite.setVelocityX(horizontal * this.getMoveSpeed(player, time));
    } else {
      player.sprite.setVelocityX(0);
    }

    if (
      input.pressed.jump &&
      grounded &&
      !player.crouching &&
      time >= player.dropUntil
    ) {
      this.startJump(player, time);
    }

    this.updateJumpPhysics(player, grounded, input, time);

    if (input.pressed.melee) {
      this.handleMeleePressed(player, time);
    }

    this.updatePlayerAnimation(player, grounded, horizontal, time);
    this.updateAimVisuals(player);
  }

  updateKnockedPlayer(player) {
    player.aiming = false;
    this.endShootStance(player);
    player.climbing = false;
    player.sprite.body.setAllowGravity(true);
    player.sprite.setAngle(player.facing > 0 ? 82 : -82);
    player.sprite.play('girl-crouch', true);
    player.sprite.setVelocityX(player.sprite.body.velocity.x * 0.96);
  }

  startJump(player, time) {
    player.sprite.setVelocityY(-this.configData.movement.jumpSpeed);
    player.jumpHeldUntil = time + this.configData.movement.jumpHoldMs;
    player.jumpReleased = false;
    const animationName = player.weapon ? 'jumpPrepGun' : 'jumpPrep';
    player.jumpPrepUntil = time + this.getAnimationDurationMs(animationName);
    player.jumpLandUntil = 0;
    player.onThinPlatform = false;
    player.sprite.play(this.getPlayerAnimationKey(animationName));
  }

  startJumpLand(player, time) {
    player.jumpPrepUntil = 0;
    const animationName = player.weapon ? 'jumpGunLand' : 'jumpLand';
    player.jumpLandUntil = time + this.getAnimationDurationMs(animationName);
    player.sprite.play(this.getPlayerAnimationKey(animationName));
  }

  updateJumpPhysics(player, grounded, input, time) {
    const body = player.sprite.body;
    const movement = this.configData.movement;
    body.setAllowGravity(true);

    if (grounded && body.velocity.y >= 0) {
      this.resetJumpState(player);
      body.setGravityY(0);
      return;
    }

    if (
      !player.jumpReleased &&
      input.released.jump &&
      body.velocity.y < movement.jumpReleaseVelocity
    ) {
      body.setVelocityY(movement.jumpReleaseVelocity);
      player.jumpReleased = true;
    }

    const holdingJump = input.down.jump && !player.jumpReleased && time < player.jumpHeldUntil;
    const gravityMultiplier =
      body.velocity.y < 0 && holdingJump
        ? movement.jumpHoldGravityMultiplier
        : movement.fallGravityMultiplier;

    body.setGravityY(this.physics.world.gravity.y * (gravityMultiplier - 1));
  }

  resetJumpState(player) {
    player.jumpHeldUntil = 0;
    player.jumpReleased = true;
    player.sprite.body?.setGravityY(0);
  }

  isInShootStance(player, time) {
    return !player.aiming && player.aimMode === 'gun' && time < player.shootStanceUntil;
  }

  endShootStance(player) {
    player.shootStanceUntil = 0;
    player.aiming = false;
    player.aimMode = null;
    this.setAimVisible(player, false);
  }

  getMoveSpeed(player, time) {
    let speed = this.configData.movement.walkSpeed;
    if (time < player.slowedUntil) {
      speed *= this.configData.powerups.slowmo.slowMultiplier;
    }
    if (time < player.hasteUntil) {
      speed *= this.configData.powerups.haste.speedMultiplier;
    }

    return speed;
  }

  updateCrouchState(player, grounded, downHeld, time) {
    const wasCrouching = player.crouching;
    player.crouching = Boolean(downHeld && grounded);
    if (player.crouching && !wasCrouching) {
      this.startCrouchTransition(player, time);
    } else if (!player.crouching && wasCrouching) {
      this.startStandTransition(player, time);
    } else if (!player.crouching) {
      player.crouchTransitionUntil = 0;
    }
  }

  startCrouchTransition(player, time) {
    player.crouchTransitionGun = Boolean(player.weapon);
    player.standTransitionUntil = 0;
    const animationName = player.crouchTransitionGun ? 'crouchDownGun' : 'crouchDown';
    player.crouchTransitionUntil = time + this.getAnimationDurationMs(animationName);
    player.sprite.play(this.getPlayerAnimationKey(animationName));
  }

  startStandTransition(player, time) {
    player.standTransitionGun = Boolean(player.weapon);
    player.crouchTransitionUntil = 0;
    const animationName = player.standTransitionGun ? 'standUpGun' : 'standUp';
    player.standTransitionUntil = time + this.getAnimationDurationMs(animationName);
    player.sprite.play(this.getPlayerAnimationKey(animationName));
  }

  getPlayerAnimationKey(animationName) {
    const animationKeys = {
      idle: 'girl-idle',
      idleAimStraight: 'girl-idle-gun',
      run: 'girl-run',
      runGun: 'girl-run-gun',
      aim: 'girl-aim',
      melee: 'girl-melee',
      crouchDown: 'girl-crouch-down',
      crouchDownGun: 'girl-crouch-down-gun',
      crouch: 'girl-crouch',
      crouchMelee: 'girl-crouch-melee',
      standUp: 'girl-stand-up',
      standUpGun: 'girl-stand-up-gun',
      jumpPrep: 'girl-jump-prep',
      jumpPrepGun: 'girl-jump-prep-gun',
      jumpUp: 'girl-jump-up',
      jumpPeak: 'girl-jump-peak',
      jumpDown: 'girl-jump-down',
      jumpLand: 'girl-jump-land',
      jumpGunUp: 'girl-jump-up-gun',
      jumpGunPeak: 'girl-jump-peak-gun',
      jumpGunDown: 'girl-jump-down-gun',
      jumpGunLand: 'girl-jump-land-gun',
      jumpMelee: 'girl-jump-melee',
      pickup: 'girl-pickup',
    };
    return animationKeys[animationName] ?? 'girl-idle';
  }

  continueOneShotAnimation(sprite, animationKey) {
    if (sprite.anims.currentAnim?.key !== animationKey) {
      sprite.play(animationKey);
    }
  }

  getAnimationDurationMs(animationName) {
    const setting = this.animationConfig?.[animationName];
    if (!setting) {
      return 220;
    }

    const frames = makeFrameList1Based(setting, this.animationFrameCount ?? 1);
    return Math.max(80, (frames.length / Math.max(1, setting.fps)) * 1000);
  }

  applyBodyPose(player) {
    const { sprite } = player;
    if (player.crouching || this.time.now < player.knockedUntil) {
      const crouchBody = this.configData.playerBody.crouch;
      if (sprite.body.height !== crouchBody.height * sprite.scaleY) {
        this.applyBodyConfig(sprite, crouchBody);
      }
      return;
    }

    const standingBody = this.configData.playerBody.standing;
    if (sprite.body.height !== standingBody.height * sprite.scaleY) {
      this.applyBodyConfig(sprite, standingBody);
    }
  }

  applyBodyConfig(sprite, bodyConfig) {
    sprite.body.setSize(bodyConfig.width, bodyConfig.height);
    sprite.body.setOffset(
      getCharacterCanvasPadding() + bodyConfig.offsetX,
      getCharacterCanvasPadding() + bodyConfig.offsetY,
    );
  }

  updatePlayerAnimation(player, grounded, horizontal, time) {
    const { sprite } = player;
    const gunStanceActive = player.aiming || this.isInShootStance(player, time);

    if (gunStanceActive && !player.crouching && time < player.standTransitionUntil) {
      this.continueOneShotAnimation(sprite, player.standTransitionGun ? 'girl-stand-up-gun' : 'girl-stand-up');
      return;
    }

    if (gunStanceActive && player.crouching && time < player.crouchTransitionUntil) {
      this.continueOneShotAnimation(sprite, player.crouchTransitionGun ? 'girl-crouch-down-gun' : 'girl-crouch-down');
      return;
    }

    if (gunStanceActive) {
      sprite.play(player.crouching ? 'girl-crouch' : 'girl-aim', true);
      return;
    }

    if (time < player.pickupAnimationUntil) {
      this.continueOneShotAnimation(sprite, 'girl-pickup');
      return;
    }

    if (time < player.meleeAnimationUntil && player.meleeAnimationKey) {
      if (sprite.anims.currentAnim?.key !== player.meleeAnimationKey) {
        sprite.play(player.meleeAnimationKey);
      }
      return;
    }

    if (time < player.dashAttackUntil) {
      sprite.play('girl-run', true);
      return;
    }

    if (time < player.jumpPrepUntil) {
      this.continueOneShotAnimation(sprite, this.getPlayerAnimationKey(player.weapon ? 'jumpPrepGun' : 'jumpPrep'));
      return;
    }

    if (!grounded || sprite.body.velocity.y < -8) {
      const velocityY = sprite.body.velocity.y;
      const animationName = player.weapon
        ? velocityY < -95
          ? 'jumpGunUp'
          : velocityY < 95
            ? 'jumpGunPeak'
            : 'jumpGunDown'
        : velocityY < -95
          ? 'jumpUp'
          : velocityY < 95
            ? 'jumpPeak'
            : 'jumpDown';
      sprite.play(this.getPlayerAnimationKey(animationName), true);
      return;
    }

    if (time < player.jumpLandUntil) {
      this.continueOneShotAnimation(sprite, this.getPlayerAnimationKey(player.weapon ? 'jumpGunLand' : 'jumpLand'));
      return;
    }

    if (!player.crouching && time < player.standTransitionUntil) {
      this.continueOneShotAnimation(sprite, player.standTransitionGun ? 'girl-stand-up-gun' : 'girl-stand-up');
      return;
    }

    if (player.crouching && time < player.crouchTransitionUntil) {
      this.continueOneShotAnimation(sprite, player.crouchTransitionGun ? 'girl-crouch-down-gun' : 'girl-crouch-down');
      return;
    }

    if (player.crouching) {
      sprite.play('girl-crouch', true);
      return;
    }

    if (horizontal !== 0) {
      sprite.play(this.getPlayerAnimationKey(player.weapon ? 'runGun' : 'run'), true);
      return;
    }

    sprite.play(this.getPlayerAnimationKey(player.weapon ? 'idleAimStraight' : 'idle'), true);
  }

  beginAim(player, mode, time) {
    const continuingGunStance = mode === 'gun' && this.isInShootStance(player, time);

    if (mode === 'gun') {
      if (!player.weapon || player.weapon.ammo <= 0) {
        this.showMessage(player.weapon ? 'Out of ammo' : 'No weapon', 450);
        this.endShootStance(player);
        return;
      }
    }

    if (mode === 'grenade') {
      if (player.grenadeAmmo <= 0 || time < player.nextGrenadeAt) {
        this.showMessage('No grenades', 450);
        return;
      }
    }

    player.aiming = true;
    player.aimMode = mode;
    player.shootStanceUntil = 0;
    if (continuingGunStance) {
      player.aimFacing = player.aimFacing || (player.facing >= 0 ? 1 : -1);
      player.aimOffset = this.getAimOffsetFromAngle(player.aimAngle, player.aimFacing);
    } else {
      player.aimFacing = player.facing >= 0 ? 1 : -1;
      player.aimOffset = 0;
      player.aimAngle = this.getAimAngle(player.aimFacing, player.aimOffset);
    }
    player.sprite.setFlipX(player.aimFacing < 0);
    this.setAimVisible(player, true);
  }

  updateAim(player, horizontal, vertical, delta) {
    const rotateSpeed = Phaser.Math.DegToRad(this.configData.movement.aimRotateDegPerSecond);
    const aimFacing = player.aimFacing || (player.facing >= 0 ? 1 : -1);
    const nextOffset = (player.aimOffset ?? 0) + vertical * aimFacing * rotateSpeed * (delta / 1000);
    player.aimFacing = aimFacing;
    player.aimOffset = Phaser.Math.Clamp(nextOffset, -AIM_HALF_ARC, AIM_HALF_ARC);
    player.aimAngle = this.getAimAngle(player.aimFacing, player.aimOffset);

    player.facing = aimFacing;
    player.sprite.setFlipX(aimFacing < 0);

    const grounded = player.sprite.body.blocked.down || player.sprite.body.touching.down;
    if (horizontal !== 0 && !(player.crouching && grounded)) {
      player.sprite.setVelocityX(horizontal * this.configData.movement.aimSpeed);
    } else if (grounded) {
      player.sprite.setVelocityX(0);
    }

    this.updateAimVisuals(player);
  }

  getAimAngle(facing, offset) {
    const baseAngle = facing >= 0 ? 0 : Math.PI;
    return Phaser.Math.Angle.Normalize(baseAngle + offset);
  }

  getAimOffsetFromAngle(angle, facing) {
    const baseAngle = facing >= 0 ? 0 : Math.PI;
    const wrapped = Math.atan2(Math.sin(angle - baseAngle), Math.cos(angle - baseAngle));
    return Phaser.Math.Clamp(wrapped, -AIM_HALF_ARC, AIM_HALF_ARC);
  }

  releaseAim(player, time) {
    const mode = player.aimMode;
    player.aiming = false;

    if (mode === 'gun') {
      this.fireWeapon(player, time);
      player.aimMode = 'gun';
      player.shootStanceUntil = time + this.configData.movement.shootStanceMs;
      this.setAimVisible(player, true);
    } else if (mode === 'grenade') {
      player.aimMode = null;
      this.setAimVisible(player, false);
      this.throwAimedGrenade(player, time);
    } else {
      player.aimMode = null;
      this.setAimVisible(player, false);
    }
  }

  setAimVisible(player, visible) {
    player.arm.setVisible(false);
    player.weaponSprite.setVisible(visible && player.aimMode === 'gun' && Boolean(player.weapon));
    player.crosshair.setVisible(visible);
    player.aimGraphics.setVisible(visible);
    if (!visible) {
      player.aimGraphics.clear();
    }
  }

  updateAimVisuals(player) {
    const aimVisualActive = player.aiming || this.isInShootStance(player, this.time.now);
    const heldGunVisible = Boolean(player.weapon) && (aimVisualActive || this.isGunCarryAnimation(player));
    const visualFacing = aimVisualActive ? player.aimFacing : player.facing;
    const visualAngle = aimVisualActive ? player.aimAngle : visualFacing > 0 ? 0 : Math.PI;
    const carryAnchor = this.getAimAnchor(player, visualAngle);
    const direction = new Phaser.Math.Vector2(Math.cos(visualAngle), Math.sin(visualAngle));
    const reticle = this.getAimReticlePosition(player, visualAngle);

    player.arm.setVisible(false);
    player.weaponSprite.setTexture(player.weapon ? `weapon-${player.weapon.id}` : 'weapon-pistol');
    player.weaponSprite.setPosition(carryAnchor.x, carryAnchor.y);
    player.weaponSprite.setRotation(visualAngle);
    player.weaponSprite.setFlipY(visualFacing < 0);
    player.weaponSprite.setVisible(heldGunVisible);
    player.crosshair.setPosition(reticle.x, reticle.y);
    player.crosshair.setVisible(aimVisualActive);
    player.aimGraphics.setVisible(aimVisualActive);

    player.aimGraphics.clear();
    if (!aimVisualActive) {
      return;
    }

    const currentWeapon = player.weapon ? this.configData.weapons[player.weapon.id] : null;
    if (player.aimMode === 'gun' && currentWeapon?.laser) {
      player.aimGraphics.lineStyle(1, 0xff304b, 0.75);
      player.aimGraphics.lineBetween(reticle.x, reticle.y, reticle.x + direction.x * 620, reticle.y + direction.y * 620);
    }

    if (player.aimMode === 'grenade') {
      this.drawGrenadeArc(player, reticle, direction);
    }
  }

  isGunCarryAnimation(player) {
    const key = player.sprite.anims.currentAnim?.key;
    return [
      'girl-idle-gun',
      'girl-run-gun',
      'girl-crouch-down',
      'girl-crouch',
      'girl-stand-up',
      'girl-crouch-down-gun',
      'girl-stand-up-gun',
      'girl-jump-prep-gun',
      'girl-jump-up-gun',
      'girl-jump-peak-gun',
      'girl-jump-down-gun',
      'girl-jump-land-gun',
    ].includes(key);
  }

  getShoulder(player) {
    return this.getAimPivot(player);
  }

  getAimPivot(player) {
    const body = player.sprite.body;
    if (!body) {
      return { x: player.sprite.x, y: player.sprite.y };
    }
    return {
      x: body.x + body.width / 2,
      y: body.y + body.height / 2,
    };
  }

  getAimReticlePosition(player, angle = player.aimAngle) {
    const pivot = this.getAimPivot(player);
    const distance = this.configData.visuals.crosshairDistance;
    return {
      x: pivot.x + Math.cos(angle) * distance,
      y: pivot.y + Math.sin(angle) * distance,
    };
  }

  getAimAnchor(player, angle = player.aimAngle) {
    const direction = Math.cos(angle) >= 0 ? 1 : -1;
    const hand = this.getCharacterHandPoint(player, direction);
    const handX = direction > 0
      ? hand.x
      : CHARACTER_SHEET.frameSize - hand.x;
    return {
      x: player.sprite.x + (handX - CHARACTER_SHEET.frameSize / 2) * PLAYER_SCALE,
      y: player.sprite.y + (hand.y - CHARACTER_SHEET.frameSize / 2) * PLAYER_SCALE,
    };
  }

  getCharacterHandPoint(player) {
    const frame = getEmpressFrameNumber(player.sprite.texture.key);
    return CHARACTER_HAND_POINTS[frame] ?? DEFAULT_CHARACTER_HAND_POINT;
  }

  drawGrenadeArc(player, shoulder, direction) {
    const speed = this.configData.grenades.throwSpeed;
    const gravity = this.physics.world.gravity.y;
    player.aimGraphics.fillStyle(0xffffff, 0.65);

    for (let i = 1; i <= 12; i += 1) {
      const t = i * 0.11;
      const x = shoulder.x + direction.x * speed * t;
      const y = shoulder.y + direction.y * speed * t + 0.5 * gravity * t * t;
      player.aimGraphics.fillCircle(x, y, 2);
    }
  }

  fireWeapon(player, time) {
    if (!player.weapon || player.weapon.ammo <= 0 || time < player.nextShotAt) {
      return;
    }

    const weapon = this.configData.weapons[player.weapon.id];
    player.nextShotAt = time + weapon.cooldownMs;
    player.weapon.ammo -= 1;

    for (let burstIndex = 0; burstIndex < weapon.burst; burstIndex += 1) {
      this.time.delayedCall(burstIndex * weapon.burstDelayMs, () => {
        if (!player.sprite.active || this.matchOver) {
          return;
        }
        this.fireWeaponBurst(player, weapon);
      });
    }

    const recoilVector = new Phaser.Math.Vector2(Math.cos(player.aimAngle), Math.sin(player.aimAngle));
    player.sprite.setVelocityX(player.sprite.body.velocity.x - recoilVector.x * weapon.recoil);

    if (player.weapon.ammo <= 0) {
      this.time.delayedCall(250, () => {
        if (player.weapon?.ammo <= 0) {
          player.weapon = null;
          this.endShootStance(player);
          this.showMessage(`${player.label} weapon empty`, 700);
        }
      });
    }
  }

  fireWeaponBurst(player, weapon) {
    const baseAngle = player.aimAngle;
    const origin = this.getBulletOrigin(player);
    this.spawnMuzzleFlash(
      origin.x,
      origin.y,
      baseAngle,
      weapon.bulletColor,
    );

    for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
      const spread = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-weapon.spreadDeg, weapon.spreadDeg));
      const angle = baseAngle + spread;
      this.spawnBullet(player, weapon, angle, origin.x, origin.y);
    }
  }

  getBulletOrigin(player) {
    return this.getAimPivot(player);
  }

  spawnBullet(player, weapon, angle, originX, originY) {
    const color = parseHexColor(weapon.bulletColor, 0xffffff);
    const bullet = this.physics.add
      .image(originX, originY, PROJECTILE_TEXTURE_KEY)
      .setDepth(9)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color);
    bullet.setDisplaySize(weapon.bulletWidth ?? 18, weapon.bulletHeight ?? 18);
    this.bullets.add(bullet);
    bullet.body.setAllowGravity(false);
    bullet.body.setCircle(7, 2, 2);
    bullet.body.setVelocity(Math.cos(angle) * weapon.muzzleVelocity, Math.sin(angle) * weapon.muzzleVelocity);
    bullet.body.setMaxVelocity(weapon.muzzleVelocity, weapon.muzzleVelocity);
    bullet.setData('owner', player.id);
    bullet.setData('weaponId', player.weapon.id);
    bullet.setData('damage', weapon.damage);
    bullet.setData('knockback', weapon.knockback);
    bullet.setData('directionX', Math.cos(angle) >= 0 ? 1 : -1);
    bullet.setData('hitColor', color);
    bullet.setData('explosiveRadius', weapon.explosiveRadius ?? 0);
    bullet.setData('explosiveDamage', weapon.explosiveDamage ?? weapon.damage);

    this.time.delayedCall(weapon.bulletLifeMs, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });

    return bullet;
  }

  throwAimedGrenade(player, time) {
    if (player.grenadeAmmo <= 0 || time < player.nextGrenadeAt) {
      return;
    }

    player.nextGrenadeAt = time + 500;
    player.grenadeAmmo -= 1;

    const direction = new Phaser.Math.Vector2(Math.cos(player.aimAngle), Math.sin(player.aimAngle));
    const origin = this.getGrenadeOrigin(player);
    const grenade = this.physics.add
      .image(origin.x, origin.y, 'grenade-pixel')
      .setDepth(9);
    this.grenades.add(grenade);
    grenade.setBounce(this.configData.grenades.bounce);
    grenade.setDragX(50);
    grenade.body.setCircle(7);
    grenade.body.setVelocity(direction.x * this.configData.grenades.throwSpeed, direction.y * this.configData.grenades.throwSpeed);
    grenade.setData('owner', player.id);

    this.time.delayedCall(this.configData.grenades.fuseMs, () => {
      if (grenade.active) {
        this.explodeGrenade(grenade, player.id);
      }
    });
  }

  getGrenadeOrigin(player) {
    return this.getAimPivot(player);
  }

  handleMeleePressed(player, time) {
    if (time < player.meleeAnimationUntil || time < player.pickupAnimationUntil) {
      return;
    }

    if (player.crouching && player.currentPickup) {
      if (this.canTakePickup(player, player.currentPickup)) {
        this.takePickup(player, player.currentPickup, time);
        return;
      }
      if (this.canSwapPickup(player, player.currentPickup)) {
        this.swapPickup(player, player.currentPickup, time);
        return;
      }
    }

    if (player.crouching && player.currentPickup?.getData('kind') === 'weapon') {
      return;
    }

    const grounded = player.sprite.body.blocked.down || player.sprite.body.touching.down;
    const horizontal = (player.inputState.down.right ? 1 : 0) - (player.inputState.down.left ? 1 : 0);
    if (!player.crouching && grounded && horizontal !== 0) {
      player.facing = horizontal;
      player.sprite.setFlipX(horizontal < 0);
      this.startDashAttack(player, time);
      return;
    }

    this.performMeleeCombo(player, time);
  }

  performMeleeCombo(player, time) {
    if (time < player.nextMeleeAt) {
      return;
    }

    if (time > player.comboResetAt) {
      player.comboIndex = 0;
    }

    const hit = this.configData.melee.hits[player.comboIndex];
    const comboNumber = player.comboIndex + 1;
    const animationName = this.getMeleeAnimationName(player);
    const animationDuration = this.getAnimationDurationMs(animationName);
    player.nextMeleeAt = time + Math.max(this.configData.melee.cooldownMs, animationDuration);
    player.comboResetAt = time + this.configData.melee.comboResetMs;
    player.comboIndex = (player.comboIndex + 1) % this.configData.melee.hits.length;
    this.startMeleeAnimation(player, animationName, time, animationDuration);

    const pivot = this.getAimPivot(player);
    const centerX = pivot.x + player.facing * 34;
    const centerY = pivot.y;
    this.flashHitbox(centerX, centerY, this.configData.melee.hitboxWidth, this.configData.melee.hitboxHeight, player.facing, 0xffffff, 0.28);
    this.breakWindowsInBox(centerX, centerY, this.configData.melee.hitboxWidth, this.configData.melee.hitboxHeight, hit.damage);

    const opponent = this.getOpponent(player);
    if (this.time.now < opponent.knockedUntil) {
      return;
    }

    if (this.isTargetInBox(opponent.sprite, centerX, centerY, this.configData.melee.hitboxWidth, this.configData.melee.hitboxHeight)) {
      this.damagePlayer(opponent, hit.damage, player.facing, hit.knockbackX, hit.knockbackY, {
        source: `${player.label} combo ${comboNumber}`,
      });
    }
  }

  getMeleeAnimationName(player) {
    if (!player.sprite.body.blocked.down && !player.sprite.body.touching.down) {
      return 'jumpMelee';
    }
    return player.crouching ? 'crouchMelee' : 'melee';
  }

  startMeleeAnimation(player, animationName, time, duration) {
    const keyByAnimation = {
      melee: 'girl-melee',
      crouchMelee: 'girl-crouch-melee',
      jumpMelee: 'girl-jump-melee',
    };
    const animationKey = keyByAnimation[animationName] ?? 'girl-melee';
    player.meleeAnimationKey = animationKey;
    player.meleeAnimationUntil = time + duration;
    player.sprite.play(animationKey);
  }

  startPickupAnimation(player, time) {
    player.pickupAnimationUntil = time + this.getAnimationDurationMs('pickup');
    player.crouchTransitionUntil = 0;
    player.standTransitionUntil = 0;
    player.meleeAnimationUntil = 0;
    player.sprite.setVelocityX(0);
    player.sprite.play('girl-pickup');
  }

  startDashAttack(player, time) {
    if (time < player.nextMeleeAt) {
      return;
    }

    player.nextMeleeAt = time + 520;
    player.dashAttackUntil = time + this.configData.movement.dashAttackMs;
    player.dashDirection = player.facing;
    player.dashHitTargets.clear();
    player.sprite.setVelocityX(player.facing * this.configData.movement.dashAttackSpeed);
    player.sprite.setVelocityY(-this.configData.movement.dashAttackLift);
    const pivot = this.getAimPivot(player);
    this.flashHitbox(pivot.x + player.facing * 40, pivot.y, 64, 44, player.facing, 0xffd166, 0.3);
  }

  updateDashAttacks(time) {
    for (const player of this.players) {
      if (time >= player.dashAttackUntil) {
        continue;
      }

      const pivot = this.getAimPivot(player);
      const centerX = pivot.x + player.dashDirection * 40;
      const centerY = pivot.y;
      this.breakWindowsInBox(centerX, centerY, 70, 48, this.configData.melee.dashDamage);

      const opponent = this.getOpponent(player);
      if (!player.dashHitTargets.has(opponent.id) && time >= opponent.knockedUntil && this.isTargetInBox(opponent.sprite, centerX, centerY, 70, 48)) {
        player.dashHitTargets.add(opponent.id);
        this.damagePlayer(opponent, this.configData.melee.dashDamage, player.dashDirection, this.configData.melee.dashKnockbackX, this.configData.melee.dashKnockbackY, {
          knockdownMs: this.configData.melee.dashKnockdownMs,
          source: `${player.label} dash takedown`,
        });
      }
    }
  }

  updateClimbing(player, ladder, vertical, horizontal, time, input) {
    if (!ladder) {
      player.climbing = false;
      player.sprite.body.setAllowGravity(true);
      return;
    }

    player.sprite.body.setAllowGravity(false);
    player.sprite.setVelocityY(vertical * this.configData.movement.climbSpeed);
    if (horizontal !== 0) {
      player.sprite.setVelocityX(horizontal * this.configData.movement.walkSpeed * 0.45);
      player.facing = horizontal;
      player.sprite.setFlipX(horizontal < 0);
    }

    if (input.pressed.jump) {
      player.climbing = false;
      player.sprite.body.setAllowGravity(true);
      player.sprite.setVelocityY(-this.configData.movement.jumpSpeed * 0.75);
    }

    if (time < player.slowedUntil) {
      player.sprite.setVelocityY(player.sprite.body.velocity.y * this.configData.powerups.slowmo.slowMultiplier);
    }
  }

  getIntersectingLadder(player) {
    const playerBounds = getBodyBounds(player.sprite);
    return this.ladders.find((ladder) => Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, ladder.getData('bounds'))) ?? null;
  }

  handleBulletHit(spriteOrBullet, maybeSprite) {
    const bullet = spriteOrBullet.getData('owner') ? spriteOrBullet : maybeSprite;
    const sprite = bullet === spriteOrBullet ? maybeSprite : spriteOrBullet;
    const player = this.playerBySprite.get(sprite);

    if (!player || bullet.getData('owner') === player.id) {
      return;
    }

    const explosiveRadius = bullet.getData('explosiveRadius') ?? 0;
    if (explosiveRadius > 0) {
      this.spawnHitEffect(bullet.x, bullet.y, bullet.getData('hitColor') ?? 0xfff3a3);
      this.explodeAt(
        bullet.x,
        bullet.y,
        explosiveRadius,
        bullet.getData('explosiveDamage'),
        bullet.getData('owner'),
      );
      bullet.destroy();
      return;
    }

    this.damagePlayer(player, bullet.getData('damage'), bullet.getData('directionX'), bullet.getData('knockback'), 125, {
      source: bullet.getData('weaponId'),
    });
    this.spawnHitEffect(bullet.x, bullet.y, bullet.getData('hitColor') ?? 0xfff3a3);

    bullet.destroy();
  }

  bulletPlayerProcess(objectA, objectB) {
    const bullet = this.getCollisionObjectFromGroup(this.bullets, objectA, objectB, 'weaponId');
    const sprite = bullet === objectA ? objectB : objectA;
    const player = this.playerBySprite.get(sprite);
    return Boolean(bullet?.active && player && bullet.getData('owner') !== player.id);
  }

  grenadePlayerProcess(objectA, objectB) {
    const grenade = this.getCollisionObjectFromGroup(this.grenades, objectA, objectB, 'owner');
    const sprite = grenade === objectA ? objectB : objectA;
    const player = this.playerBySprite.get(sprite);
    return Boolean(grenade?.active && player && grenade.getData('owner') !== player.id);
  }

  getCollisionObjectFromGroup(group, objectA, objectB, dataKey = null) {
    if (objectA && group?.getChildren().includes(objectA)) {
      return objectA;
    }
    if (objectB && group?.getChildren().includes(objectB)) {
      return objectB;
    }
    if (dataKey && objectA?.getData?.(dataKey) !== undefined) {
      return objectA;
    }
    if (dataKey && objectB?.getData?.(dataKey) !== undefined) {
      return objectB;
    }
    return null;
  }

  handleBulletWall(objectA, objectB) {
    const bullet = this.getCollisionObjectFromGroup(this.bullets, objectA, objectB, 'weaponId');
    if (!bullet?.active) {
      return;
    }

    this.spawnHitEffect(bullet.x, bullet.y, bullet.getData('hitColor') ?? 0xfff3a3);
    const explosiveRadius = bullet.getData('explosiveRadius') ?? 0;
    if (explosiveRadius > 0) {
      this.explodeAt(
        bullet.x,
        bullet.y,
        explosiveRadius,
        bullet.getData('explosiveDamage'),
        bullet.getData('owner'),
      );
    }
    bullet.destroy();
  }

  handleBulletWindow(objectA, objectB) {
    const bullet = this.getCollisionObjectFromGroup(this.bullets, objectA, objectB, 'weaponId');
    const windowPane = bullet === objectA ? objectB : objectA;
    if (!bullet || !windowPane) {
      return;
    }

    if (windowPane?.active && windowPane.getData('breakable')) {
      this.breakWindow(windowPane, bullet.x, bullet.y);
      this.spawnHitEffect(bullet.x, bullet.y, bullet.getData('hitColor') ?? 0xfff3a3);
      return;
    }
    this.handleBulletWall(bullet);
  }

  handleGrenadeWindow(objectA, objectB) {
    const grenade = this.getCollisionObjectFromGroup(this.grenades, objectA, objectB, 'owner');
    const windowPane = grenade === objectA ? objectB : objectA;
    if (!grenade || !windowPane) {
      return;
    }

    this.breakWindow(windowPane, grenade.x, grenade.y);
  }

  explodeGrenade(grenade, ownerId) {
    const x = grenade.x;
    const y = grenade.y;
    grenade.destroy();
    this.explodeAt(x, y, this.configData.grenades.radius, this.configData.grenades.damage, ownerId, true);
  }

  explodeAt(x, y, radius, damage, ownerId, grenade = false) {
    const burst = this.add.circle(x, y, 18, COLORS.explosion, 0.52).setDepth(20);
    this.tweens.add({
      targets: burst,
      scale: radius / 18,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    });

    // Level platforms are intentionally indestructible. Explosions can break glass and hurt players only.
    this.breakWindowsInRadius(x, y, radius);

    for (const player of this.players) {
      const distance = Phaser.Math.Distance.Between(x, y, player.sprite.x, player.sprite.y);
      if (distance <= radius) {
        const direction = player.sprite.x >= x ? 1 : -1;
        const selfHit = player.id === ownerId;
        const amount = grenade && selfHit ? this.configData.grenades.selfDamage : damage;
        const strength = Phaser.Math.Linear(this.configData.grenades.knockback, 120, distance / radius);
        this.damagePlayer(player, amount, direction, strength, 320, {
          source: 'explosion',
        });
      }
    }

    this.cameras.main.shake(110, 0.006);
  }

  damagePlayer(player, amount, direction, knockbackX, knockbackY, options = {}) {
    const now = this.time.now;
    if (now < player.invulnerableUntil) {
      return;
    }

    const reducedAmount = now < player.shieldUntil ? Math.ceil(amount * this.configData.powerups.shield.damageMultiplier) : amount;
    player.health = Math.max(0, player.health - reducedAmount);
    player.sprite.setVelocityX(direction * knockbackX);
    player.sprite.setVelocityY(-knockbackY);

    if (options.knockdownMs) {
      player.knockedUntil = Math.max(player.knockedUntil, now + options.knockdownMs);
    }

    this.cameras.main.shake(60, 0.0035);
    this.flashDamage(player);

    if (player.health <= 0) {
      this.scoreKill(this.getOpponent(player), player, options.source ?? 'KO');
    }
  }

  scoreKill(winner, loser, source) {
    if (this.matchOver) {
      return;
    }

    this.dropInventoryOnDeath(loser);
    winner.kills += 1;
    loser.lives -= 1;
    this.showMessage(`${winner.label} KO - ${source}`, 850);

    if (loser.lives <= 0) {
      this.endMatch(winner, `${loser.label} is out of lives`);
      return;
    }

    this.respawn(loser);
  }

  respawn(player) {
    player.health = PLAYER_MAX_HEALTH;
    player.weapon = null;
    player.powerup = null;
    player.grenadeAmmo = this.configData.grenades.startCount;
    player.dropUntil = 0;
    this.resetJumpState(player);
    player.jumpPrepUntil = 0;
    player.jumpLandUntil = 0;
    player.wasGrounded = true;
    player.knockedUntil = 0;
    player.dashAttackUntil = 0;
    player.dashDirection = 0;
    player.dashHitTargets.clear();
    player.comboIndex = 0;
    player.comboResetAt = 0;
    player.nextMeleeAt = 0;
    player.nextShotAt = 0;
    player.nextGrenadeAt = 0;
    player.nextPowerupAt = 0;
    player.meleeAnimationUntil = 0;
    player.meleeAnimationKey = null;
    player.pickupAnimationUntil = 0;
    player.currentPickup = null;
    player.shootStanceUntil = 0;
    player.slowedUntil = 0;
    player.shieldUntil = 0;
    player.hasteUntil = 0;
    player.aiming = false;
    player.aimMode = null;
    player.aimFacing = player.facing >= 0 ? 1 : -1;
    player.aimOffset = 0;
    player.aimAngle = this.getAimAngle(player.aimFacing, player.aimOffset);
    player.crouching = false;
    player.crouchTransitionUntil = 0;
    player.standTransitionUntil = 0;
    player.climbing = false;
    player.sprite.body.setAllowGravity(true);
    player.invulnerableUntil = this.time.now + this.configData.round.respawnInvulnerabilityMs;
    player.sprite.setAngle(0);
    player.sprite.setAlpha(1);
    player.sprite.clearTint();
    player.sprite.setPosition(player.spawnX, player.spawnY);
    player.sprite.body.reset(player.spawnX, player.spawnY);
    player.sprite.setVelocity(0, 0);
    player.sprite.setFlipX(player.facing < 0);
    this.applyBodyPose(player);
    this.setAimVisible(player, false);
  }

  dropInventoryOnDeath(player) {
    const dropY = player.sprite.y - 18;
    const drops = [];

    if (player.weapon) {
      drops.push({ kind: 'weapon', id: player.weapon.id });
    }
    if (player.powerup) {
      drops.push({ kind: 'powerup', id: player.powerup });
    }
    if (player.grenadeAmmo > 0) {
      drops.push({ kind: 'grenade', id: 'grenade' });
    }

    const spacing = 34;
    const startX = player.sprite.x - ((drops.length - 1) * spacing) / 2;
    for (let index = 0; index < drops.length; index += 1) {
      const drop = drops[index];
      this.createPickup(startX + index * spacing, dropY, drop.kind, drop.id);
    }
  }

  checkKillZones() {
    const worldWidth = this.worldWidth ?? WORLD_WIDTH;
    const worldHeight = this.worldHeight ?? WORLD_HEIGHT;
    for (const player of this.players) {
      const { x, y } = player.sprite;
      if (x < -180 || x > worldWidth + 180 || y > worldHeight + 260) {
        this.scoreKill(this.getOpponent(player), player, 'fall');
      }
    }
  }

  checkRoundTimer(time) {
    if (time < this.roundEndsAt) {
      return;
    }

    const winner = this.pickTimerWinner();
    this.endMatch(winner, 'time limit');
  }

  pickTimerWinner() {
    if (this.p1.lives !== this.p2.lives) {
      return this.p1.lives > this.p2.lives ? this.p1 : this.p2;
    }
    if (this.p1.health !== this.p2.health) {
      return this.p1.health > this.p2.health ? this.p1 : this.p2;
    }
    if (this.p1.kills !== this.p2.kills) {
      return this.p1.kills > this.p2.kills ? this.p1 : this.p2;
    }
    return null;
  }

  endMatch(winner, reason) {
    this.matchOver = true;
    this.physics.world.pause();
    const winnerText = winner ? `${winner.label} wins` : 'Draw';
    this.showEndOverlay(winnerText, reason);
  }

  showEndOverlay(winnerText, reason) {
    this.endOverlayState = { winnerText, reason };
    this.endContainer?.destroy();
    this.endContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(220);
    const viewportWidth = this.getViewportWidth();
    const viewportHeight = this.getViewportHeight();
    const centerX = viewportWidth / 2;
    const panelY = viewportHeight / 2;
    const panelWidth = Math.min(530, Math.max(300, viewportWidth - 32));
    const panelHeight = Math.min(260, Math.max(230, viewportHeight - 32));
    const shade = this.add.rectangle(0, 0, viewportWidth, viewportHeight, 0x070b11, 0.82).setOrigin(0);
    const panel = this.add.rectangle(centerX, panelY, panelWidth, panelHeight, 0x151e2b, 0.96).setStrokeStyle(2, 0xffd166);
    const title = this.add
      .text(centerX, panelY - 62, winnerText, {
        fontFamily: UI_FONT,
        fontSize: viewportWidth < 420 ? '27px' : '34px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    const body = this.add
      .text(centerX, panelY - 10, `${reason}\nEnter/Space: rematch   Esc: menu`, {
        fontFamily: UI_FONT,
        fontSize: '16px',
        color: '#dbe7ff',
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: panelWidth - 34 },
      })
      .setOrigin(0.5);
    const button = this.createMenuButton(centerX, panelY + 78, 'Rematch', () => this.restartMatch());
    this.endContainer.add([shade, panel, title, body, button]);
    this.addToUiLayer(this.endContainer);
    this.updateUiLayer();
  }

  updatePickups(time) {
    if (time < this.pickupSpawnTimer) {
      return;
    }

    this.pickupSpawnTimer = time + this.configData.pickups.spawnEveryMs;
    const activeCount = this.pickups.getChildren().filter((pickup) => pickup.active).length;
    if (activeCount < this.configData.pickups.maxOnMap) {
      this.spawnRandomPickup();
    }
  }

  spawnInitialPickups() {
    let spawnedCount = 0;
    if (this.p1?.sprite) {
      this.createPickup(this.p1.sprite.x + this.p1.facing * 44, this.p1.sprite.y + 4, 'weapon', 'pistol');
      spawnedCount += 1;
    }
    if (this.p2?.sprite) {
      this.createPickup(this.p2.sprite.x + this.p2.facing * 44, this.p2.sprite.y + 4, 'weapon', 'pistol');
      spawnedCount += 1;
    }

    const guaranteedGunPoints = this.pickupSpawnPoints.slice(0, Math.max(0, this.configData.pickups.maxOnMap - spawnedCount));
    for (const point of guaranteedGunPoints) {
      this.createPickup(point.x, point.y, 'weapon', this.pickWeightedWeapon());
      spawnedCount += 1;
    }

    for (let i = spawnedCount; i < this.configData.pickups.maxOnMap; i += 1) {
      this.spawnRandomPickup();
    }
  }

  spawnRandomPickup() {
    const openSpawnPoints = this.pickupSpawnPoints.filter((point) => !this.isPickupSpawnOccupied(point));
    if (!openSpawnPoints.length) {
      return;
    }

    const point = Phaser.Utils.Array.GetRandom(openSpawnPoints);
    const roll = Math.random();

    if (roll < 0.75) {
      this.createPickup(point.x, point.y, 'weapon', this.pickWeightedWeapon());
    } else if (roll < 0.78) {
      this.createPickup(point.x, point.y, 'grenade', 'grenade');
    } else {
      this.createPickup(point.x, point.y, 'powerup', Phaser.Utils.Array.GetRandom(Object.keys(this.configData.powerups)));
    }
  }

  isPickupSpawnOccupied(point) {
    return this.pickups.getChildren().some((pickup) => (
      pickup.active &&
      Phaser.Math.Distance.Between(point.x, point.y, pickup.x, pickup.y) < 44
    ));
  }

  createPickup(x, y, kind, id) {
    const texture = kind === 'weapon' ? `weapon-${id}` : kind === 'grenade' ? 'grenade-pixel' : `powerup-${id}`;
    const pickup = this.physics.add.staticImage(x, y, texture).setDepth(8);
    pickup.setData('kind', kind);
    pickup.setData('id', id);
    pickup.setScale(kind === 'weapon' ? 0.58 : 1.1);
    pickup.body.setSize(28, 28);
    pickup.refreshBody();

    const label = this.pickupLabel(kind, id);
    const text = this.add
      .text(x, y + this.configData.visuals.pickupTextOffset, label, {
        fontFamily: UI_FONT,
        fontSize: '10px',
        color: '#ffffff',
        stroke: '#101622',
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0)
      .setDepth(8);
    pickup.setData('labelObj', text);
    this.pickups.add(pickup);
    return pickup;
  }

  pickupLabel(kind, id) {
    if (kind === 'weapon') {
      return this.configData.weapons[id].label;
    }
    if (kind === 'grenade') {
      return '+Grenades';
    }
    return this.configData.powerups[id].label;
  }

  findNearbyPickup(player) {
    let closest = null;
    let closestDistance = Infinity;

    for (const pickup of this.pickups.getChildren()) {
      if (!pickup.active) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, pickup.x, pickup.y);
      if (distance < 58 && distance < closestDistance) {
        closest = pickup;
        closestDistance = distance;
      }
    }

    return closest;
  }

  tryAutoPickup(player) {
    const pickup = player.currentPickup;
    if (!pickup || !pickup.active) {
      return;
    }

    const kind = pickup.getData('kind');
    if (kind === 'weapon' && !player.weapon) {
      this.takePickup(player, pickup);
    } else if (kind === 'grenade' && player.grenadeAmmo < this.configData.grenades.maxCount) {
      this.takePickup(player, pickup);
    } else if (kind === 'powerup' && !player.powerup) {
      this.takePickup(player, pickup);
    }
  }

  canTakePickup(player, pickup) {
    const kind = pickup.getData('kind');
    return (
      (kind === 'weapon' && !player.weapon) ||
      (kind === 'grenade' && player.grenadeAmmo < this.configData.grenades.maxCount) ||
      (kind === 'powerup' && !player.powerup)
    );
  }

  canSwapPickup(player, pickup) {
    const kind = pickup.getData('kind');
    return (
      (kind === 'weapon' && Boolean(player.weapon)) ||
      (kind === 'grenade' && player.grenadeAmmo > 0) ||
      (kind === 'powerup' && Boolean(player.powerup))
    );
  }

  swapPickup(player, pickup, time = this.time.now) {
    const kind = pickup.getData('kind');
    const oldX = pickup.x;
    const oldY = pickup.y;

    if (kind === 'weapon' && player.weapon) {
      this.createPickup(oldX, oldY, 'weapon', player.weapon.id);
    } else if (kind === 'grenade' && player.grenadeAmmo > 0) {
      this.createPickup(oldX, oldY, 'grenade', 'grenade');
      player.grenadeAmmo = 0;
    } else if (kind === 'powerup' && player.powerup) {
      this.createPickup(oldX, oldY, 'powerup', player.powerup);
    }

    this.takePickup(player, pickup, time);
  }

  takePickup(player, pickup, time = null) {
    const kind = pickup.getData('kind');
    const id = pickup.getData('id');

    if (kind === 'weapon') {
      player.weapon = this.makeWeaponState(id);
      this.showMessage(`${player.label} picked up ${this.configData.weapons[id].label}`, 650);
    } else if (kind === 'grenade') {
      player.grenadeAmmo = Math.min(this.configData.grenades.maxCount, player.grenadeAmmo + 1);
    } else if (kind === 'powerup') {
      player.powerup = id;
      this.showMessage(`${player.label} picked up ${this.configData.powerups[id].label}`, 650);
    }

    if (time !== null) {
      this.startPickupAnimation(player, time);
    }

    pickup.getData('labelObj')?.destroy();
    pickup.destroy();
  }

  makeWeaponState(id) {
    return {
      id,
      ammo: this.configData.weapons[id].ammo,
    };
  }

  pickWeightedWeapon() {
    const entries = Object.entries(this.configData.weapons);
    const totalWeight = entries.reduce((total, [, weapon]) => total + Math.max(0, weapon.weight ?? 1), 0);
    let roll = Math.random() * Math.max(1, totalWeight);
    for (const [id, weapon] of entries) {
      roll -= Math.max(0, weapon.weight ?? 1);
      if (roll <= 0) {
        return id;
      }
    }
    return entries[0]?.[0] ?? 'pistol';
  }

  activatePowerup(player, time) {
    if (!player.powerup || time < player.nextPowerupAt) {
      return;
    }

    const id = player.powerup;
    player.powerup = null;
    player.nextPowerupAt = time + 400;

    if (id === 'slowmo') {
      this.getOpponent(player).slowedUntil = time + this.configData.powerups.slowmo.durationMs;
      this.showMessage(`${player.label} used Slowmo`, 850);
    } else if (id === 'heal') {
      player.health = Math.min(PLAYER_MAX_HEALTH, player.health + this.configData.powerups.heal.amount);
      this.showMessage(`${player.label} healed`, 650);
    } else if (id === 'shield') {
      player.shieldUntil = time + this.configData.powerups.shield.durationMs;
      this.showMessage(`${player.label} shielded`, 650);
    } else if (id === 'haste') {
      player.hasteUntil = time + this.configData.powerups.haste.durationMs;
      this.showMessage(`${player.label} is faster`, 650);
    }

    const ring = this.add.circle(player.sprite.x, player.sprite.y - 7, 28, 0xa8f5ff, 0.24).setDepth(8);
    this.tweens.add({
      targets: ring,
      scale: 1.8,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  platformProcess(sprite, platform) {
    const player = this.playerBySprite.get(sprite);
    if (!player || !platform.getData('thin')) {
      return true;
    }

    if (this.time.now < player.dropUntil || player.climbing) {
      return false;
    }

    if (sprite.body.velocity.y < -8) {
      return false;
    }

    const playerBottom = sprite.body.y + sprite.body.height;
    const platformTop = platform.body.y;
    return playerBottom <= platformTop + 14;
  }

  handlePlatformContact(sprite, platform) {
    const player = this.playerBySprite.get(sprite);
    if (player && platform.getData('thin')) {
      player.onThinPlatform = true;
    }
  }

  breakWindowsInBox(centerX, centerY, width, height, damage) {
    const hitbox = new Phaser.Geom.Rectangle(centerX - width / 2, centerY - height / 2, width, height);
    for (const windowPane of this.glassWindows.getChildren()) {
      if (!windowPane.active) {
        continue;
      }
      if (!windowPane.getData('breakable')) {
        continue;
      }
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, windowPane.getBounds())) {
        const health = windowPane.getData('health') - damage;
        windowPane.setData('health', health);
        if (health <= 0) {
          this.breakWindow(windowPane, centerX, centerY);
        }
      }
    }
  }

  breakWindowsInRadius(x, y, radius) {
    for (const windowPane of this.glassWindows.getChildren()) {
      if (!windowPane.active) {
        continue;
      }
      if (!windowPane.getData('breakable')) {
        continue;
      }
      if (this.circleOverlapsObject(x, y, radius, windowPane)) {
        this.breakWindow(windowPane, x, y);
      }
    }
  }

  breakWindow(windowPane, impactX, impactY) {
    if (!windowPane.active || !windowPane.getData('breakable')) {
      return;
    }

    const x = windowPane.x;
    const y = windowPane.y;
    const width = windowPane.displayWidth;
    const height = windowPane.displayHeight;
    windowPane.getData('shine')?.destroy();
    windowPane.destroy();

    for (let i = 0; i < 9; i += 1) {
      const shard = this.add.rectangle(
        x + Phaser.Math.Between(-width / 2, width / 2),
        y + Phaser.Math.Between(-height / 2, height / 2),
        Phaser.Math.Between(3, 7),
        Phaser.Math.Between(2, 5),
        COLORS.glass,
        0.72,
      ).setDepth(15);
      this.tweens.add({
        targets: shard,
        x: shard.x + Phaser.Math.Between(-40, 40) + Math.sign(shard.x - impactX) * 24,
        y: shard.y + Phaser.Math.Between(18, 70) + Math.sign(shard.y - impactY) * 16,
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: 420,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      });
    }
  }

  drawHud(time) {
    this.positionHudObjects();
    const viewportWidth = this.getViewportWidth();
    const compact = viewportWidth < 620 || isMobileLike();
    const hudWidth = compact ? Math.max(132, Math.min(178, Math.floor((viewportWidth - 54) / 2))) : 286;
    const hudY = compact ? 28 : 25;
    const hudLeftX = compact ? 18 : 24;
    const hudRightX = compact ? viewportWidth - hudWidth - 18 : viewportWidth - 310;
    const timerWidth = compact ? 88 : 104;
    const timerHeight = compact ? 30 : 34;
    const timerY = compact ? 84 : 9;

    this.ui.clear();
    if (!compact) {
      this.ui.fillStyle(0x08101b, 0.62);
      this.ui.fillRoundedRect(8, 5, 274, 19, 4);
    }
    this.ui.fillStyle(0x08101b, 0.62);
    this.ui.fillRoundedRect(viewportWidth / 2 - timerWidth / 2, timerY, timerWidth, timerHeight, 4);
    this.drawPlayerHud(hudLeftX, hudY, hudWidth, this.p1, false, time);
    this.drawPlayerHud(hudRightX, hudY, hudWidth, this.p2, true, time);

    const secondsLeft = Math.max(0, Math.ceil((this.roundEndsAt - time) / 1000));
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = String(secondsLeft % 60).padStart(2, '0');
    this.timerText.setText(`${minutes}:${seconds}`);

    this.p1StatusText.setText(this.statusLine(this.p1));
    this.p2StatusText.setText(this.statusLine(this.p2));
  }

  drawPlayerHud(x, y, width, player, alignRight, time) {
    const healthPct = Phaser.Math.Clamp(player.health / PLAYER_MAX_HEALTH, 0, 1);
    const fillWidth = Math.round(width * healthPct);
    const fillX = alignRight ? x + width - fillWidth : x;

    this.ui.fillStyle(0x172033, 0.9);
    this.ui.fillRoundedRect(x - 8, y - 8, width + 16, 55, 4);
    this.ui.fillStyle(0xffffff, 0.18);
    this.ui.fillRect(x, y, width, 12);
    this.ui.fillStyle(player.color, 1);
    this.ui.fillRect(fillX, y, fillWidth, 12);
    this.ui.lineStyle(2, player.darkColor, 1);
    this.ui.strokeRect(x, y, width, 12);

    const lifeY = y + 17;
    for (let i = 0; i < this.configData.round.lives; i += 1) {
      const boxX = alignRight ? x + width - 13 - i * 15 : x + i * 15;
      this.ui.fillStyle(i < player.lives ? player.color : 0x2d3748, 1);
      this.ui.fillRect(boxX, lifeY, 11, 8);
    }

    if (time < player.shieldUntil) {
      this.ui.lineStyle(2, 0x8cffab, 0.9);
      this.ui.strokeRoundedRect(x - 9, y - 9, width + 18, 32, 6);
    }
  }

  statusLine(player) {
    const weapon = player.weapon ? `${this.configData.weapons[player.weapon.id].label}:${player.weapon.ammo}` : 'No weapon';
    const power = player.powerup ? this.configData.powerups[player.powerup].label : 'No power';
    return `${player.label}  ${weapon}  G:${player.grenadeAmmo}  ${power}`;
  }

  showMessage(message, duration) {
    this.messageText.setText(message);
    this.time.delayedCall(duration, () => {
      if (this.messageText.text === message) {
        this.messageText.setText('');
      }
    });
  }

  flashDamage(player) {
    player.sprite.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (player.sprite.active && this.time.now >= player.shieldUntil) {
        player.sprite.clearTint();
      }
    });
  }

  flashHitbox(x, y, width, height, direction, color, alpha) {
    const flash = this.add.rectangle(x + direction * 8, y, width, height, color, alpha).setDepth(18);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.15,
      scaleY: 0.86,
      duration: 110,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  spawnMuzzleFlash(x, y, angle, color) {
    const flash = this.add.rectangle(x, y, 18, 8, parseHexColor(color, 0xfff3a3), 0.9).setRotation(angle).setDepth(16);
    this.tweens.add({
      targets: flash,
      scaleX: 1.8,
      alpha: 0,
      duration: 90,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  spawnHitEffect(x, y, color) {
    for (let i = 0; i < 5; i += 1) {
      const chip = this.add.rectangle(x, y, 4, 3, color, 0.9).setDepth(16);
      this.tweens.add({
        targets: chip,
        x: x + Phaser.Math.Between(-22, 22),
        y: y + Phaser.Math.Between(-22, 22),
        alpha: 0,
        duration: 210,
        ease: 'Cubic.easeOut',
        onComplete: () => chip.destroy(),
      });
    }
  }

  isTargetInBox(sprite, centerX, centerY, width, height) {
    return this.isObjectInBox(sprite, centerX, centerY, width, height);
  }

  isObjectInBox(object, centerX, centerY, width, height) {
    const hitbox = new Phaser.Geom.Rectangle(centerX - width / 2, centerY - height / 2, width, height);
    return Phaser.Geom.Intersects.RectangleToRectangle(hitbox, getBodyBounds(object));
  }

  circleOverlapsObject(x, y, radius, object) {
    const bounds = object.getBounds();
    const closestX = Phaser.Math.Clamp(x, bounds.left, bounds.right);
    const closestY = Phaser.Math.Clamp(y, bounds.top, bounds.bottom);
    return Phaser.Math.Distance.Squared(x, y, closestX, closestY) <= radius * radius;
  }

  getOpponent(player) {
    return player.id === 'p1' ? this.p2 : this.p1;
  }
}

function createInputDown() {
  return INPUT_ACTIONS.reduce((state, action) => {
    state[action] = false;
    return state;
  }, {});
}

function createInputState() {
  return {
    down: createInputDown(),
    pressed: createInputDown(),
    released: createInputDown(),
  };
}

function updateInputState(state, nextDown) {
  for (const action of INPUT_ACTIONS) {
    const isDown = Boolean(nextDown?.[action]);
    state.pressed[action] = isDown && !state.down[action];
    state.released[action] = !isDown && state.down[action];
    state.down[action] = isDown;
  }
}

function mergeInputDown(...sources) {
  const merged = createInputDown();
  for (const source of sources) {
    for (const action of INPUT_ACTIONS) {
      merged[action] = merged[action] || Boolean(source?.[action]);
    }
  }
  return merged;
}

function sanitizeInputDown(input) {
  const sanitized = createInputDown();
  for (const action of INPUT_ACTIONS) {
    sanitized[action] = Boolean(input?.[action]);
  }
  return sanitized;
}

function normalizeLobbyCode(code) {
  return String(code ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 4)
    .toUpperCase();
}

function isTypingIntoDomField() {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return false;
  }
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    activeElement.isContentEditable
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getOnlineServerLabel() {
  return new URL(getDefaultOnlineServerText()).host;
}

function getDefaultOnlineServerText() {
  const envUrl = import.meta.env.VITE_GECKOS_URL;
  const envPort = import.meta.env.VITE_GECKOS_PORT;
  if (envUrl) {
    return envPort ? `${envUrl}:${envPort}` : envUrl;
  }
  if (window.location.port && window.location.port !== '5173' && window.location.port !== '5174') {
    return window.location.origin;
  }
  if (window.location.protocol === 'https:' && !window.location.port) {
    return window.location.origin;
  }
  return `${window.location.protocol}//${window.location.hostname}:9208`;
}

function parseOnlineServerConfig() {
  const value = getDefaultOnlineServerText();
  const parsed = new URL(value.includes('://') ? value : `${window.location.protocol}//${value}`);
  return {
    label: parsed.host,
    options: {
      url: `${parsed.protocol}//${parsed.hostname}`,
      port: Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80)),
    },
  };
}

function roundForNetwork(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function clampNetworkNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Phaser.Math.Clamp(number, min, max);
}

function isMobileLike() {
  return (
    window.matchMedia?.('(pointer: coarse)').matches ||
    window.matchMedia?.('(max-width: 860px)').matches ||
    /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
  );
}

function detectSheetFrameGeometry(sourceImage, sheet, options = {}) {
  const pixels = getImagePixels(sourceImage);
  const rowStarts = detectAssetRowStarts(sourceImage, sheet, pixels);
  const cells = [];
  let detectedColumns = 0;

  for (let row = 0; row < rowStarts.length; row += 1) {
    const y = rowStarts[row];
    const rowCells = options.includeExtensions
      ? detectFrameCellsForRow(sourceImage, sheet, pixels, row, y)
      : detectRegularFrameCellsForRow(sourceImage, sheet, pixels, row, y);
    detectedColumns = Math.max(detectedColumns, rowCells.length);
    cells.push(...rowCells);
  }

  return {
    columns: detectedColumns,
    rows: rowStarts.length,
    rowStarts,
    frameCells: cells.map((cell) => ({
      ...cell,
      render: options.includeExtensions
        ? detectFrameRenderRect(sourceImage, sheet, pixels, cell)
        : {
          x: cell.x,
          y: cell.y,
          width: sheet.frameSize,
          height: sheet.frameSize,
          originX: 0,
          originY: 0,
        },
    })),
  };
}

function detectFrameCellsForRow(sourceImage, sheet, pixels, row, y) {
  const cells = [];
  const size = sheet.frameSize;
  let x = sheet.leftOffset ?? 0;

  while (x + size <= sourceImage.naturalWidth) {
    while (x + size <= sourceImage.naturalWidth && !isFrameStartCandidate(sourceImage, sheet, pixels, x, y)) {
      x += 1;
    }

    if (x + size > sourceImage.naturalWidth) {
      break;
    }

    cells.push({ row, column: cells.length, x, y });
    x += size;

    while (x < sourceImage.naturalWidth && stripHasExtensionBackground(sheet, pixels, x, y, 1, size)) {
      x += 1;
    }
    while (x < sourceImage.naturalWidth && isSheetBackgroundPixel(sheet, pixels, x, y)) {
      x += 1;
    }
  }

  return cells;
}

function detectRegularFrameCellsForRow(sourceImage, sheet, pixels, row, y) {
  const cells = [];
  const stride = sheet.frameSize + sheet.gap;
  const leftOffset = sheet.leftOffset ?? 0;
  let column = 0;

  for (let x = leftOffset; x + sheet.frameSize <= sourceImage.naturalWidth; x += stride) {
    const lightPixels = countAssetBackgroundPixelsInRect(sheet, pixels, x, y, sheet.frameSize, sheet.frameSize);
    if (lightPixels >= sheet.cellLightThreshold) {
      cells.push({ row, column, x, y });
    }
    column += 1;
  }

  return cells;
}

function isFrameStartCandidate(sourceImage, sheet, pixels, x, y) {
  if (x > 0 && !isSheetBackgroundPixel(sheet, pixels, x - 1, y)) {
    return false;
  }
  if (!isAssetCellBackgroundPixel(sheet, pixels, x, y)) {
    return false;
  }
  if (
    countAssetBackgroundPixelsInRect(sheet, pixels, x, y, sheet.frameSize, 1) <
    Math.floor(sheet.frameSize * 0.35)
  ) {
    return false;
  }

  const rightEdge = x + sheet.frameSize;
  if (
    rightEdge < sourceImage.naturalWidth &&
    !isSheetBackgroundPixel(sheet, pixels, rightEdge, y) &&
    !isExtensionBackgroundPixel(sheet, pixels, rightEdge, y)
  ) {
    return false;
  }

  return countAssetBackgroundPixelsInRect(sheet, pixels, x, y, sheet.frameSize, sheet.frameSize) >= sheet.cellLightThreshold;
}

function detectFrameRenderRect(sourceImage, sheet, pixels, cell) {
  const size = sheet.frameSize;
  const maxExtension = sheet.maxExtension ?? size;
  const base = {
    left: cell.x,
    top: cell.y,
    right: cell.x + size,
    bottom: cell.y + size,
  };
  const bounds = { ...base };

  expandHorizontal(sourceImage, sheet, bounds, pixels, 1, maxExtension);
  expandHorizontal(sourceImage, sheet, bounds, pixels, -1, maxExtension);
  expandVertical(sourceImage, sheet, bounds, pixels, 1, maxExtension);
  expandVertical(sourceImage, sheet, bounds, pixels, -1, maxExtension);

  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
    originX: base.left - bounds.left,
    originY: base.top - bounds.top,
  };
}

function expandHorizontal(sourceImage, sheet, bounds, pixels, direction, maxExtension) {
  let hasExtension = false;
  for (let step = 0; step < maxExtension; step += 1) {
    const x = direction > 0 ? bounds.right : bounds.left - 1;
    if (x < 0 || x >= sourceImage.naturalWidth) {
      return;
    }

    if (stripHasExtensionBackground(sheet, pixels, x, bounds.top, 1, bounds.bottom - bounds.top)) {
      if (direction > 0) {
        bounds.right += 1;
      } else {
        bounds.left -= 1;
      }
      hasExtension = true;
      continue;
    }

    if (hasExtension && stripHasSpritePixels(sheet, pixels, x, bounds.top, 1, bounds.bottom - bounds.top)) {
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

function expandVertical(sourceImage, sheet, bounds, pixels, direction, maxExtension) {
  let hasExtension = false;
  for (let step = 0; step < maxExtension; step += 1) {
    const y = direction > 0 ? bounds.bottom : bounds.top - 1;
    if (y < 0 || y >= sourceImage.naturalHeight) {
      return;
    }

    if (stripHasExtensionBackground(sheet, pixels, bounds.left, y, bounds.right - bounds.left, 1)) {
      if (direction > 0) {
        bounds.bottom += 1;
      } else {
        bounds.top -= 1;
      }
      hasExtension = true;
      continue;
    }

    if (hasExtension && stripHasSpritePixels(sheet, pixels, bounds.left, y, bounds.right - bounds.left, 1)) {
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

function makeFrameCanvas(sourceImage, sheet, cell, options = {}) {
  const render = cell.render ?? {
    x: cell.x,
    y: cell.y,
    width: sheet.frameSize,
    height: sheet.frameSize,
    originX: 0,
    originY: 0,
  };
  const fixedCanvas = Boolean(options.fixedCanvas);
  const padding = fixedCanvas ? getCharacterCanvasPadding() : 0;
  const canvas = document.createElement('canvas');
  canvas.width = fixedCanvas ? sheet.frameSize + padding * 2 : render.width;
  canvas.height = fixedCanvas ? sheet.frameSize + padding * 2 : render.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  context.drawImage(
    sourceImage,
    render.x,
    render.y,
    render.width,
    render.height,
    fixedCanvas ? padding - render.originX : 0,
    fixedCanvas ? padding - render.originY : 0,
    render.width,
    render.height,
  );

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (isTransparentAssetPixel(sheet, imageData.data, index)) {
      imageData.data[index + 3] = 0;
    }
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function getCharacterCanvasPadding() {
  return CHARACTER_SHEET.maxExtension ?? 0;
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

function detectAssetRowStarts(sourceImage, sheet, pixels) {
  const lightRows = [];
  for (let y = 0; y < sourceImage.naturalHeight; y += 1) {
    let lightCount = 0;
    for (let x = 0; x < sourceImage.naturalWidth; x += 1) {
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

function stripHasExtensionBackground(sheet, pixels, startX, startY, width, height) {
  if (!sheet.extensionBackground) {
    return false;
  }
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      if (isExtensionBackgroundPixel(sheet, pixels, x, y)) {
        return true;
      }
    }
  }
  return false;
}

function stripHasSpritePixels(sheet, pixels, startX, startY, width, height) {
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      if (isSpritePixel(sheet, pixels, x, y)) {
        return true;
      }
    }
  }
  return false;
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

function isAssetCellBackgroundPixel(sheet, pixels, x, y) {
  if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }

  const index = (y * pixels.width + x) * 4;
  return isNearColor(pixels.data, index, sheet.cellBackground);
}

function isExtensionBackgroundPixel(sheet, pixels, x, y) {
  if (!sheet.extensionBackground || x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }

  const index = (y * pixels.width + x) * 4;
  return isNearColor(pixels.data, index, sheet.extensionBackground);
}

function isSheetBackgroundPixel(sheet, pixels, x, y) {
  if (!sheet.sheetBackground || x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }

  const index = (y * pixels.width + x) * 4;
  return isNearColor(pixels.data, index, sheet.sheetBackground);
}

function isSpritePixel(sheet, pixels, x, y) {
  if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) {
    return false;
  }

  const index = (y * pixels.width + x) * 4;
  return (
    pixels.data[index + 3] > 0 &&
    !isAssetCellBackgroundPixel(sheet, pixels, x, y) &&
    !isExtensionBackgroundPixel(sheet, pixels, x, y) &&
    !isSheetBackgroundPixel(sheet, pixels, x, y)
  );
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

function parseHexColor(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.replace('#', '');
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBodyBounds(object) {
  if (object?.body) {
    return new Phaser.Geom.Rectangle(object.body.x, object.body.y, object.body.width, object.body.height);
  }
  return object.getBounds();
}

function getEmpressFrameNumber(textureKey) {
  const match = /^empress-frame-(\d+)$/.exec(textureKey ?? '');
  return match ? Number.parseInt(match[1], 10) : null;
}

loadUiFont().finally(() => {
  retireServiceWorkers();
  createBootMenu();
});

function createBootMenu() {
  const existing = document.querySelector('.boot-menu');
  existing?.remove();

  const initialCode = getInitialLobbyCode();
  const overlay = document.createElement('main');
  overlay.className = 'boot-menu';
  overlay.innerHTML = `
    <section class="boot-panel">
      <canvas class="boot-sprite" width="64" height="64" aria-hidden="true"></canvas>
      <h1>Superfighters</h1>
      <p class="boot-copy">Choose a match type.</p>
      <div class="boot-actions">
        <button class="boot-local" type="button">Local Multiplayer</button>
        <button class="boot-online" type="button">Online Multiplayer</button>
      </div>
      <section class="boot-online-panel" hidden>
        <p class="online-server-fixed">Server: ${escapeHtml(getOnlineServerLabel())}</p>
        <div class="online-actions-row">
          <button class="boot-create" type="button">Create Lobby</button>
          <label class="online-code-field">
            <span>Code</span>
            <input class="boot-code-input" type="text" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" value="${escapeHtml(initialCode)}">
          </label>
          <button class="boot-join" type="button">Join</button>
        </div>
        <div class="online-lobby-result" hidden>
          <div class="online-code-display">----</div>
          <button class="boot-copy-link" type="button">Copy Invite Link</button>
          <button class="boot-start" type="button" hidden disabled>Start Game</button>
        </div>
        <p class="online-status">Offline</p>
        <p class="online-mobile-note">On iPhone, open the invite link in Safari. For less browser chrome, Share, Add to Home Screen, then launch from the icon. Portrait play is supported.</p>
      </section>
      <nav class="start-links">
        <a href="./debug.html">Debug</a>
        <a href="./level-editor.html">Level Editor</a>
      </nav>
    </section>
  `;

  document.body.appendChild(overlay);
  startBootSpriteAnimation(overlay.querySelector('.boot-sprite'));

  const state = {
    channel: null,
    connected: false,
    handlersBound: false,
    code: null,
    playerId: null,
    isHost: false,
    playerCount: 0,
    started: false,
  };
  const onlinePanel = overlay.querySelector('.boot-online-panel');
  const codeInput = overlay.querySelector('.boot-code-input');
  const result = overlay.querySelector('.online-lobby-result');
  const codeDisplay = overlay.querySelector('.online-code-display');
  const status = overlay.querySelector('.online-status');
  const startButton = overlay.querySelector('.boot-start');

  const setStatus = (message) => {
    status.textContent = message;
  };
  const showOnlinePanel = () => {
    onlinePanel.hidden = false;
    codeInput.focus();
  };
  const updateLobbyUi = () => {
    const showInvite = Boolean(state.code && state.isHost);
    result.hidden = !showInvite;
    codeDisplay.textContent = state.code ?? '----';
    startButton.hidden = !showInvite;
    startButton.disabled = !(showInvite && state.playerCount >= 2 && !state.started);
  };
  const ensureChannel = () => {
    if (state.channel && state.connected) {
      return Promise.resolve(state.channel);
    }

    const config = parseOnlineServerConfig();
    setStatus(`Connecting to ${config.label}...`);
    const channel = geckos(config.options);
    state.channel = channel;

    return new Promise((resolve, reject) => {
      channel.onConnect((error) => {
        if (error) {
          state.connected = false;
          reject(error);
          return;
        }
        state.connected = true;
        bindBootOnlineChannel(channel);
        setStatus('Connected. Create or join a lobby.');
        resolve(channel);
      });
    });
  };
  const bindBootOnlineChannel = (channel) => {
    if (state.handlersBound) {
      return;
    }
    state.handlersBound = true;

    const handleLobbyAssigned = (data, action) => {
      state.code = data.code;
      state.playerId = data.playerId;
      state.isHost = data.playerId === 'p1';
      state.playerCount = data.players?.length ?? 1;
      state.started = Boolean(data.started);
      updateLobbyUi();
      setStatus(
        action === 'created'
          ? `Lobby ${data.code} created. Waiting for opponent...`
          : `Joined lobby ${data.code}. Waiting for match start...`,
      );
    };

    channel.on('lobby-created', (data) => handleLobbyAssigned(data, 'created'));
    channel.on('lobby-joined', (data) => handleLobbyAssigned(data, 'joined'));
    channel.on('lobby-state', (data) => {
      if (data?.code) {
        state.code = data.code;
      }
      state.playerCount = data?.players?.length ?? 0;
      state.started = Boolean(data?.started);
      updateLobbyUi();
      if (state.playerCount < 2) {
        setStatus(`Lobby ${state.code ?? '----'}: waiting for opponent (${state.playerCount}/2).`);
      } else if (state.started) {
        setStatus(`Lobby ${state.code}: starting...`);
      } else if (state.isHost) {
        setStatus(`Lobby ${state.code}: both players connected. Start when ready.`);
      } else {
        setStatus(`Lobby ${state.code}: waiting for host to start.`);
      }
    });
    channel.on('match-start', (data) => {
      state.started = true;
      startGameFromBoot(overlay, {
        mode: 'online',
        channel,
        code: data?.code ?? state.code,
        playerId: state.playerId,
        playerCount: state.playerCount,
      });
    });
    channel.on('lobby-error', (data) => setStatus(data?.message || 'Lobby error'));
    channel.onDisconnect(() => {
      state.connected = false;
      setStatus('Disconnected from online server.');
    });
  };
  const createLobby = async () => {
    try {
      const channel = await ensureChannel();
      setStatus('Creating lobby...');
      channel.emit('create-lobby', {}, { reliable: true });
    } catch (error) {
      setStatus(error.message || 'Could not connect');
    }
  };
  const joinLobby = async () => {
    const code = normalizeLobbyCode(codeInput.value);
    codeInput.value = code;
    if (code.length !== 4) {
      setStatus('Enter a four-letter code.');
      return;
    }
    try {
      const channel = await ensureChannel();
      setStatus(`Joining ${code}...`);
      channel.emit('join-lobby', { code }, { reliable: true });
    } catch (error) {
      setStatus(error.message || 'Could not connect');
    }
  };

  overlay.querySelector('.boot-local')?.addEventListener('click', () => {
    state.channel?.close();
    startGameFromBoot(overlay, { mode: 'local' });
  });
  overlay.querySelector('.boot-online')?.addEventListener('click', showOnlinePanel);
  overlay.querySelector('.boot-create')?.addEventListener('click', createLobby);
  overlay.querySelector('.boot-join')?.addEventListener('click', joinLobby);
  codeInput.addEventListener('input', () => {
    codeInput.value = normalizeLobbyCode(codeInput.value);
  });
  codeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      joinLobby();
    }
  });
  overlay.querySelector('.boot-copy-link')?.addEventListener('click', async () => {
    if (!state.code) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('join', state.code);
    await navigator.clipboard?.writeText(url.toString());
    setStatus(`Copied invite link for ${state.code}.`);
  });
  startButton.addEventListener('click', () => {
    if (!state.channel || !state.isHost) {
      setStatus('Only the host can start the game.');
      return;
    }
    if (state.playerCount < 2) {
      setStatus('Waiting for opponent.');
      return;
    }
    setStatus('Starting game...');
    state.channel.emit('start-match', { lobbyCode: state.code }, { reliable: true });
  });

  if (initialCode) {
    showOnlinePanel();
    window.setTimeout(joinLobby, 250);
  }
}

function startGameFromBoot(bootOverlay, options) {
  pendingBootOptions = options;
  bootOverlay?.remove();
  window.__superfightersGame?.destroy(true);
  window.__superfightersGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    resolution: RENDER_RESOLUTION,
    backgroundColor: '#8dd8ff',
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoRound: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 1450 },
        debug: false,
      },
    },
    scene: FightScene,
  });
}

function consumeBootOptions() {
  const options = pendingBootOptions ?? { mode: 'local' };
  pendingBootOptions = null;
  return options;
}

function getInitialLobbyCode() {
  const params = new URLSearchParams(window.location.search);
  return normalizeLobbyCode(params.get('join') || params.get('code') || '');
}

function startBootSpriteAnimation(canvas) {
  if (!canvas) {
    return;
  }
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  const image = new Image();
  image.onload = () => {
    const geometry = detectSheetFrameGeometry(image, CHARACTER_SHEET, { includeExtensions: false });
    const frames = makeFrameList1Based(DEFAULT_EMPRESS_ANIMATION_CONFIG.idle, geometry.frameCells.length);
    const frameCanvases = frames
      .map((frame) => geometry.frameCells[frame - 1])
      .filter(Boolean)
      .map((cell) => makeFrameCanvas(image, CHARACTER_SHEET, cell, { fixedCanvas: false }));
    if (!frameCanvases.length) {
      return;
    }
    let frameIndex = 0;
    let lastFrameAt = 0;
    const draw = (time) => {
      if (!canvas.isConnected) {
        return;
      }
      if (time - lastFrameAt < 140) {
        window.requestAnimationFrame(draw);
        return;
      }
      const frame = frameCanvases[frameIndex % frameCanvases.length];
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(frame, 0, 0);
      frameIndex += 1;
      lastFrameAt = time;
      window.requestAnimationFrame(draw);
    };
    window.requestAnimationFrame(draw);
  };
  image.src = assetUrl('assets/empress.png');
}

async function loadUiFont() {
  if (!('FontFace' in window) || !document.fonts) {
    return;
  }

  const font = new FontFace(UI_FONT, `url("${FUSION_FONT_URL}") format("woff")`);
  const loadedFont = await font.load();
  document.fonts.add(loadedFont);
}

function retireServiceWorkers() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    return;
  }

  window.addEventListener('load', () => {
    const baseScopeUrl = new URL(BASE_URL, window.location.href).href;
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations
        .filter((registration) => registration.scope.startsWith(baseScopeUrl))
        .map((registration) => registration.unregister())))
      .then(deleteSuperfightersCaches)
      .catch(() => {
        // The game should still run normally if service worker cleanup fails.
      });
  });
}

async function deleteSuperfightersCaches() {
  if (!('caches' in window)) {
    return;
  }
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith('superfighters-')).map((key) => caches.delete(key)));
}
