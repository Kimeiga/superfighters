import Phaser from 'phaser';
import geckos from '@geckos.io/client';
import { ANIMATION_ORDER, DEFAULT_EMPRESS_ANIMATION_CONFIG, makeFrameList1Based } from './animationConfig.js';
import { DEFAULT_GAMEPLAY_CONFIG, getGameplayConfig } from './gameplayConfig.js';
import { TILE_DEFS, TILE_INDEX, createCurrentArenaSeed, getDoorInstances, getDoorKey, getSavedLevel, mergeTilesToRects } from './levelData.js';
import './styles.css';

const BASE_URL = import.meta.env.BASE_URL;
const assetUrl = (path) => `${BASE_URL}${String(path).replace(/^\/+/, '')}`;
const GAME_WIDTH = Math.floor(window.innerWidth);
const GAME_HEIGHT = Math.floor(window.innerHeight);
const RENDER_RESOLUTION = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
const WORLD_WIDTH = Math.max(1900, GAME_WIDTH);
const WORLD_HEIGHT = Math.max(720, GAME_HEIGHT);
const FRAME_SIZE = 64;
const PLAYER_SCALE = 1;
const UI_FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const PLAYER_MAX_HEALTH = 100;
const DROP_DURATION = 310;
const DOWN_DOUBLE_TAP_MS = 340;
const PLATFORM_STROKE_WIDTH = 4;
const JUMP_BUFFER_MS = 140;
const PLAYER_HEAD_SUPPORT_MS = 130;
const DOOR_EXIT_MS = 520;
const LADDER_END_VISUAL_DROP = 38;
const AIM_HALF_ARC = Math.PI / 2;
const INPUT_ACTIONS = ['left', 'right', 'jump', 'crouch', 'melee', 'pickup', 'shoot', 'grenade', 'powerup', 'aimUp', 'aimDown'];
const GAME_DEFAULT_CAPTURE_CODES = new Set(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'Slash', 'KeyE', 'Quote']);
const ONLINE_INPUT_SEND_MS = 50;
const ONLINE_SNAPSHOT_SEND_MS = 90;
const CPU_PLAYER_ID = 'p2';
const CPU_SHOOT_HOLD_MS = 360;
const CPU_GRENADE_HOLD_MS = 520;
const CPU_ACTION_RELEASE_WINDOW_MS = 150;
const CHARACTER_SOURCE_KEY = 'empress-source';
const CHARACTER_TEXTURE_PREFIX = 'empress-frame';
const HANDGUN_SOURCE_KEY = 'handgun-source';
const PROJECTILE_TEXTURE_KEY = 'projectile-glow';
const GRENADE_TIMER_FONT = '14px';
const ROLL_SPEED = 330;
const ROLL_INVULNERABLE_MS = 520;
const FIRE_TICK_MS = 360;
const FIRE_DAMAGE = 4;
const FIRE_DURATION_MS = 3600;
const BARREL_BURN_MS = 950;
const BARREL_FLAME_RADIUS = 46;
const BARREL_EXPLOSION_RADIUS = 128;
const MELEE_COMBO_ANIMATIONS = {
  melee: [
    { key: 'girl-melee-1', frames: [45, 46, 47, 48], fps: 18, activeDelayMs: 82 },
    { key: 'girl-melee-2', frames: [49, 50, 51], fps: 18, activeDelayMs: 54 },
    { key: 'girl-melee-3', frames: [52, 53, 54], fps: 18, activeDelayMs: 54 },
  ],
  ladderMelee: [
    { key: 'girl-ladder-melee-1', frames: [229, 230, 231, 232], fps: 16, activeDelayMs: 88 },
    { key: 'girl-ladder-melee-2', frames: [233, 234, 235], fps: 16, activeDelayMs: 62 },
    { key: 'girl-ladder-melee-3', frames: [236], fps: 10, activeDelayMs: 0 },
  ],
  jumpMelee: [
    { key: 'girl-jump-melee-1', frames: [122, 195, 196, 197], fps: 16, activeDelayMs: 88 },
    { key: 'girl-jump-melee-2', frames: [198, 199, 200], fps: 16, activeDelayMs: 62 },
    { key: 'girl-jump-melee-3', frames: [201, 202, 203], fps: 16, activeDelayMs: 62 },
  ],
};
const MELEE_ACTIVE_FRAMES = {
  melee: { start: 47, end: 51 },
  crouchMelee: { start: 83, end: 87 },
  ladderMelee: { start: 231, end: 235 },
  jumpMelee: { start: 127, end: 201 },
};
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
  58: { x: 39, y: 50 },
  59: { x: 42, y: 52 },
  60: { x: 42, y: 67 },
  61: { x: 42, y: 66 },
  62: { x: 42, y: 66 },
  63: { x: 42, y: 66 },
  64: { x: 42, y: 66 },
  68: { x: 42, y: 67 },
  69: { x: 42, y: 52 },
  70: { x: 39, y: 50 },
  133: { x: 41, y: 57 },
  134: { x: 41, y: 57 },
  135: { x: 41, y: 57 },
  136: { x: 41, y: 57 },
  137: { x: 41, y: 57 },
  138: { x: 41, y: 57 },
  139: { x: 41, y: 57 },
  140: { x: 41, y: 57 },
  141: { x: 41, y: 57 },
  142: { x: 41, y: 57 },
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
  thinPlatform: 0x8b929c,
  glass: 0xbfeaff,
  ladder: 0xb88751,
  grenade: 0x89e072,
  explosion: 0xffb84d,
  fire: 0xff6b2f,
  panel: 0x101622,
  crate: 0xa8794a,
  barrel: 0xcc6547,
  smallExplosive: 0xff9f43,
  door: 0x4a78d8,
  light: 0xfff0a6,
};

class FightScene extends Phaser.Scene {
  constructor() {
    super('fight');
    this.players = [];
    this.playerBySprite = new Map();
    this.platforms = [];
    this.ladders = [];
    this.doors = [];
    this.slopeTiles = [];
    this.slopeTileMap = new Map();
    this.movingPlatforms = [];
    this.dynamicProps = [];
    this.dynamicPropGroup = null;
    this.swingingCrates = [];
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
    this.doors = [];
    this.slopeTiles = [];
    this.slopeTileMap = new Map();
    this.movingPlatforms = [];
    this.dynamicProps = [];
    this.dynamicPropGroup = null;
    this.swingingCrates = [];
    this.clouds = [];
    this.levelSpawns = null;
    this.editorLevel = pendingBootOptions?.editorLevel ? getSavedLevel() ?? createCurrentArenaSeed() : null;
    this.worldWidth = WORLD_WIDTH;
    this.worldHeight = WORLD_HEIGHT;
    this.configData = getGameplayConfig();
    this.modeSelected = false;
    this.matchPaused = true;
    this.matchOver = false;
    this.cpuMode = false;
    this.cpuPlayerId = null;
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
    this.onlineLastHostSnapshotServerTime = 0;
    this.onlinePickupSnapshotKey = '';
    this.onlineRoundId = 0;
    this.touchInputDown = createInputDown();
    this.rawKeyboardDown = new Set();
    this.uiButtons = [];
    this.endOverlayState = null;
    this.setViewportSize();
    this.pickupSpawnTimer = 0;
    this.roundEndsAt = this.time.now + this.getRoundSeconds() * 1000;

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
    this.installPlaySurfaceInputGuards();
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.preResolveSlopeContacts, this);
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.lateResolveSlopeContacts, this);

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
        pickup: this.keys.e,
        shoot: this.keys.two,
        grenade: this.keys.three,
        powerup: this.keys.four,
      },
      keyboardCodes: {
        left: ['KeyA'],
        right: ['KeyD'],
        jump: ['KeyW'],
        crouch: ['KeyS'],
        melee: ['Digit1'],
        pickup: ['KeyE'],
        shoot: ['Digit2'],
        grenade: ['Digit3'],
        powerup: ['Digit4'],
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
        pickup: this.keys.quote,
        shoot: this.keys.comma,
        grenade: this.keys.period,
        powerup: this.keys.slash,
      },
      keyboardCodes: {
        left: ['ArrowLeft'],
        right: ['ArrowRight'],
        jump: ['ArrowUp'],
        crouch: ['ArrowDown'],
        melee: ['KeyM'],
        pickup: ['Quote'],
        shoot: ['Comma'],
        grenade: ['Period'],
        powerup: ['Slash'],
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
    const editorWorldWidth = this.editorLevel ? this.editorLevel.width * this.editorLevel.tileSize : 0;
    const editorWorldHeight = this.editorLevel ? this.editorLevel.height * this.editorLevel.tileSize : 0;
    this.worldWidth = Math.max(WORLD_WIDTH, this.viewportWidth, editorWorldWidth);
    this.worldHeight = Math.max(WORLD_HEIGHT, this.viewportHeight, editorWorldHeight);
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

    this.updateMovingPlatforms(time);
    this.updateDynamicProps();
    this.updateSwingingCrates(delta);
    this.updateBullets();
    this.updateGrenades(time, delta);
    this.updateBurningProps(time);
    this.updateBurningPlayers(time);

    for (const player of this.players) {
      this.updatePlayer(player, time, delta);
    }

    this.updateGrenadeCooking(time);
    this.updateDoorTeleports(time);
    this.updateDashAttacks(time);
    this.updatePickups(time);
    this.checkKillZones();
    this.checkRoundTimer(time);
    this.syncOnlineState(time);
    this.updateCamera(delta);
    this.updateUiLayer();
    this.drawHud(time);
  }

  preResolveSlopeContacts() {
    if (!this.players.length || this.matchPaused || this.matchOver) {
      return;
    }

    for (const player of this.players) {
      if (!player.sprite?.active || player.climbing) {
        continue;
      }

      this.resolveCeilingSlopeContact(player);
      this.resolveSlopeContact(player);
    }
  }

  lateResolveSlopeContacts(time) {
    if (!this.players.length || this.matchPaused || this.matchOver) {
      return;
    }

    for (const player of this.players) {
      if (!player.sprite?.active || player.climbing) {
        continue;
      }

      const wasGrounded = player.wasGrounded;
      this.resolveCeilingSlopeContact(player);
      const slopeGrounded = this.resolveSlopeContact(player);
      const solidGrounded = !slopeGrounded && this.resolveSolidFloorContact(player);
      if (!slopeGrounded && !solidGrounded) {
        continue;
      }

      this.resetJumpState(player);
      player.wasGrounded = true;
      if (!wasGrounded) {
        this.startJumpLand(player, time);
      }
    }
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
      roll: 'girl-roll',
      rollEnd: 'girl-roll-end',
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
      climbLadderBegin: 'girl-climb-ladder-begin',
      climbLadder: 'girl-climb-ladder',
      climbLadderEnd: 'girl-climb-ladder-end',
      ladderGunDraw: 'girl-ladder-gun-draw',
      ladderGunHold: 'girl-ladder-gun-hold',
      ladderMelee: 'girl-ladder-melee',
      pickup: 'girl-pickup',
    };

    for (const name of ANIMATION_ORDER) {
      if (!animationKeys[name]) {
        continue;
      }
      const setting = config[name];
      if (this.anims.exists(animationKeys[name])) {
        this.anims.remove(animationKeys[name]);
      }
      this.anims.create({
        key: animationKeys[name],
        frames: makeFrameList1Based(setting, frameCount).map((frame) => ({
          key: this.getCharacterTextureKey(frame),
        })),
        frameRate: setting.fps,
        repeat: setting.repeat ? -1 : 0,
      });
    }

    for (const combos of Object.values(MELEE_COMBO_ANIMATIONS)) {
      for (const combo of combos) {
        if (this.anims.exists(combo.key)) {
          this.anims.remove(combo.key);
        }
        this.anims.create({
          key: combo.key,
          frames: combo.frames.map((frame) => ({
            key: this.getCharacterTextureKey(frame),
          })),
          frameRate: combo.fps,
          repeat: 0,
        });
      }
    }
  }

  createLevel() {
    this.glassWindows = this.physics.add.staticGroup();
    this.levelProps = this.physics.add.staticGroup();
    this.dynamicProps = [];
    this.dynamicPropGroup = this.physics.add.group();
    this.doors = [];
    this.slopeTiles = [];
    this.slopeTileMap = new Map();
    this.movingPlatforms = [];
    this.swingingCrates = [];
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

    for (const rect of mergeTilesToRects(level, ['movingPlatform'])) {
      this.createMovingPlatform(rect);
    }

    for (const rect of mergeTilesToRects(level, ['glass'])) {
      this.createWindow(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
    }

    for (const rect of mergeTilesToRects(level, ['glassLeft'])) {
      this.createWindow(rect.x + 3, rect.y + rect.height / 2, 4, rect.height);
    }

    for (const rect of mergeTilesToRects(level, ['glassRight'])) {
      this.createWindow(rect.x + rect.width - 3, rect.y + rect.height / 2, 4, rect.height);
    }

    for (const rect of mergeTilesToRects(level, ['ladder'])) {
      this.createLadder(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.height);
    }

    for (const rect of mergeTilesToRects(level, ['ladderLeft'])) {
      this.createLadder(rect.x + 6, rect.y + rect.height / 2, rect.height);
    }

    for (const rect of mergeTilesToRects(level, ['ladderRight'])) {
      this.createLadder(rect.x + rect.width - 6, rect.y + rect.height / 2, rect.height);
    }

    for (const door of getDoorInstances(level).filter((item) => item.valid)) {
      this.createDoor(door, level.tileSize);
    }
    this.pairDoors(level);

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const tile = level.grid[y * level.width + x];
        const worldX = x * level.tileSize + level.tileSize / 2;
        const worldY = y * level.tileSize + level.tileSize / 2;

        if (
          tile === TILE_INDEX.slopeUp ||
          tile === TILE_INDEX.slopeDown ||
          tile === TILE_INDEX.ceilingSlopeUp ||
          tile === TILE_INDEX.ceilingSlopeDown ||
          tile === TILE_INDEX.slopePlatformUp ||
          tile === TILE_INDEX.slopePlatformDown
        ) {
          const isUpSlope =
            tile === TILE_INDEX.slopeUp ||
            tile === TILE_INDEX.ceilingSlopeUp ||
            tile === TILE_INDEX.slopePlatformUp;
          const isCeilingSlope = tile === TILE_INDEX.ceilingSlopeUp || tile === TILE_INDEX.ceilingSlopeDown;
          const slope = {
            x: x * level.tileSize,
            y: y * level.tileSize,
            tileX: x,
            tileY: y,
            size: level.tileSize,
            type: isUpSlope ? 'up' : 'down',
            side: isCeilingSlope ? 'ceiling' : 'floor',
            thin: tile === TILE_INDEX.slopePlatformUp || tile === TILE_INDEX.slopePlatformDown,
          };
          this.slopeTiles.push(slope);
          this.slopeTileMap.set(`${x},${y}`, slope);
        } else if (
          tile === TILE_INDEX.crate ||
          tile === TILE_INDEX.barrel ||
          tile === TILE_INDEX.smallExplosive ||
          tile === TILE_INDEX.swingingCrate
        ) {
          this.createLevelProp(worldX, worldY, level.tileSize, level.tileSize, TILE_DEFS[tile].id, { tileX: x, tileY: y });
        } else if (tile === TILE_INDEX.light) {
          this.createLightFixture(worldX, worldY, level.tileSize);
        } else if (tile === TILE_INDEX.pickup) {
          this.pickupSpawnPoints.push({
            x: worldX,
            y: worldY,
            ...this.resolveLevelPickupSpec(level, x, y),
          });
        } else if (tile === TILE_INDEX.p1) {
          this.levelSpawns.p1 = this.resolveEditorSpawn(level, worldX, worldY);
        } else if (tile === TILE_INDEX.p2) {
          this.levelSpawns.p2 = this.resolveEditorSpawn(level, worldX, worldY);
        }
      }
    }
  }

  resolveLevelPickupSpec(level, tileX, tileY) {
    const spec = level.pickupSpecs?.find((item) => item.x === tileX && item.y === tileY);
    if (!spec) {
      return { kind: 'random', id: 'random' };
    }
    return {
      kind: ['random', 'weapon', 'grenade', 'powerup'].includes(spec.kind) ? spec.kind : 'random',
      id: typeof spec.id === 'string' && spec.id ? spec.id : 'random',
    };
  }

  resolveEditorSpawn(level, worldX, worldY) {
    const tileSize = level.tileSize;
    const centerColumn = Math.floor(worldX / tileSize);
    const startRow = Math.floor(worldY / tileSize);
    const solidTiles = new Set([
      TILE_INDEX.solid,
      TILE_INDEX.platform,
      TILE_INDEX.movingPlatform,
      TILE_INDEX.slopeUp,
      TILE_INDEX.slopeDown,
      TILE_INDEX.slopePlatformUp,
      TILE_INDEX.slopePlatformDown,
    ]);

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
        const tile = level.backdrop?.[y * level.width + x] ?? TILE_INDEX.empty;
        if (tile === TILE_INDEX.empty) {
          continue;
        }
        const def = TILE_DEFS[tile] ?? TILE_DEFS[TILE_INDEX.backdrop];
        graphics.fillStyle(parseHexColor(def.color, 0x5b5366), def.id === 'void' ? 0.96 : 0.62);
        graphics.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        const tile = level.grid[y * level.width + x];
        if (
          tile === TILE_INDEX.empty ||
          tile === TILE_INDEX.backdrop ||
          tile === TILE_INDEX.void ||
          tile === TILE_INDEX.pickup ||
          tile === TILE_INDEX.p1 ||
          tile === TILE_INDEX.p2 ||
          tile === TILE_INDEX.glass ||
          tile === TILE_INDEX.glassLeft ||
          tile === TILE_INDEX.glassRight ||
          tile === TILE_INDEX.ladder ||
          tile === TILE_INDEX.ladderLeft ||
          tile === TILE_INDEX.ladderRight ||
          tile === TILE_INDEX.door ||
          tile === TILE_INDEX.light ||
          tile === TILE_INDEX.crate ||
          tile === TILE_INDEX.barrel ||
          tile === TILE_INDEX.smallExplosive ||
          tile === TILE_INDEX.swingingCrate ||
          tile === TILE_INDEX.movingPlatform
        ) {
          continue;
        }

        const def = TILE_DEFS[tile];
        const drawX = x * tileSize;
        const drawY = y * tileSize;
        const color = parseHexColor(def.color, 0x30283b);
        const alpha = def.id === 'backdrop' ? 0.78 : def.id === 'void' ? 0.96 : 1;
        if (def.id === 'slopeUp') {
          graphics.fillStyle(color, alpha);
          graphics.beginPath();
          graphics.moveTo(drawX, drawY + tileSize);
          graphics.lineTo(drawX + tileSize, drawY);
          graphics.lineTo(drawX + tileSize, drawY + tileSize);
          graphics.closePath();
          graphics.fillPath();
          graphics.lineStyle(2, COLORS.platformTop, 0.9);
          graphics.lineBetween(drawX, drawY + tileSize - 1, drawX + tileSize, drawY + 1);
        } else if (def.id === 'slopeDown') {
          graphics.fillStyle(color, alpha);
          graphics.beginPath();
          graphics.moveTo(drawX, drawY);
          graphics.lineTo(drawX, drawY + tileSize);
          graphics.lineTo(drawX + tileSize, drawY + tileSize);
          graphics.closePath();
          graphics.fillPath();
          graphics.lineStyle(2, COLORS.platformTop, 0.9);
          graphics.lineBetween(drawX, drawY + 1, drawX + tileSize, drawY + tileSize - 1);
        } else if (def.id === 'ceilingSlopeUp') {
          graphics.fillStyle(color, alpha);
          graphics.beginPath();
          graphics.moveTo(drawX, drawY);
          graphics.lineTo(drawX + tileSize, drawY);
          graphics.lineTo(drawX, drawY + tileSize);
          graphics.closePath();
          graphics.fillPath();
          graphics.lineStyle(2, COLORS.platformTop, 0.9);
          graphics.lineBetween(drawX, drawY + tileSize - 1, drawX + tileSize, drawY + 1);
        } else if (def.id === 'ceilingSlopeDown') {
          graphics.fillStyle(color, alpha);
          graphics.beginPath();
          graphics.moveTo(drawX, drawY);
          graphics.lineTo(drawX + tileSize, drawY);
          graphics.lineTo(drawX + tileSize, drawY + tileSize);
          graphics.closePath();
          graphics.fillPath();
          graphics.lineStyle(2, COLORS.platformTop, 0.9);
          graphics.lineBetween(drawX, drawY + 1, drawX + tileSize, drawY + tileSize - 1);
        } else if (def.id === 'platform') {
          graphics.fillStyle(COLORS.thinPlatform, 1);
          graphics.fillRect(drawX, drawY, tileSize, Math.min(PLATFORM_STROKE_WIDTH, tileSize));
        } else if (def.id === 'slopePlatformUp') {
          graphics.lineStyle(PLATFORM_STROKE_WIDTH, COLORS.thinPlatform, 1);
          graphics.lineBetween(drawX, drawY + tileSize - 2, drawX + tileSize, drawY + 2);
        } else if (def.id === 'slopePlatformDown') {
          graphics.lineStyle(PLATFORM_STROKE_WIDTH, COLORS.thinPlatform, 1);
          graphics.lineBetween(drawX, drawY + 2, drawX + tileSize, drawY + tileSize - 2);
        } else {
          graphics.fillStyle(color, alpha);
          graphics.fillRect(drawX, drawY, tileSize, tileSize);
        }

        if (def.id === 'solid') {
          const tileAbove = y > 0 ? level.grid[(y - 1) * level.width + x] : TILE_INDEX.empty;
          if (tileAbove !== TILE_INDEX.solid) {
            graphics.fillStyle(COLORS.platformTop, 0.88);
            graphics.fillRect(drawX, drawY, tileSize, 4);
          }
          graphics.fillStyle(0x000000, 0.18);
          graphics.fillRect(drawX, drawY + tileSize - 3, tileSize, 3);
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

  createMovingPlatform(rect) {
    const platform = this.add
      .rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, COLORS.thinPlatform, 0)
      .setOrigin(0.5);
    const visualHeight = Math.min(PLATFORM_STROKE_WIDTH, rect.height);
    const visual = this.add
      .rectangle(platform.x, rect.y + visualHeight / 2, rect.width, visualHeight, COLORS.thinPlatform, 1)
      .setOrigin(0.5);
    platform.setData('thin', true);
    platform.setData('levelGeometry', true);
    platform.setData('indestructible', true);
    this.physics.add.existing(platform, true);
    platform.body.setSize(rect.width, rect.height);
    platform.body.updateFromGameObject();
    this.platforms.push(platform);
    this.movingPlatforms.push({
      body: platform,
      visuals: [visual],
      baseY: platform.y,
      range: Math.max(rect.height * 1.8, (this.editorLevel?.tileSize ?? 24) * 2),
      phase: rect.x * 0.017,
      speed: 0.00135,
    });
    return platform;
  }

  createLevelProp(x, y, width, height, type, options = {}) {
    const colorByType = {
      crate: COLORS.crate,
      barrel: COLORS.barrel,
      smallExplosive: COLORS.smallExplosive,
      swingingCrate: 0xbf8f55,
    };
    const isSwinging = type === 'swingingCrate';
    const isPushableProp = type === 'crate' || type === 'barrel' || type === 'smallExplosive';
    const propScale = type === 'smallExplosive' ? 0.46 : 0.9;
    const anchor = isSwinging ? this.findSwingAnchor(options.tileX, options.tileY, x, y, height) : null;
    const visuals = [];
    const addVisual = (visual, offsetX = 0, offsetY = 0) => {
      visual.setData('offsetX', offsetX);
      visual.setData('offsetY', offsetY);
      visuals.push(visual);
      return visual;
    };

    const prop = this.add.rectangle(
      x,
      isSwinging && anchor ? anchor.y + Math.max(height * 1.75, y - anchor.y) : y,
      width * propScale,
      height * propScale,
      colorByType[type] ?? COLORS.crate,
      1,
    ).setOrigin(0.5);
    if (isSwinging && anchor) {
      const rope = this.add
        .line(0, 0, anchor.x, anchor.y, prop.x, prop.y - prop.displayHeight / 2, 0xd7c1a1, 0.78)
        .setOrigin(0, 0)
        .setDepth(2);
      rope.setData('rope', true);
      addVisual(rope);
    }
    prop.setData('propType', type);
    prop.setData('dynamicProp', isPushableProp);
    prop.setData('destructible', true);
    prop.setData('health', type === 'crate' || type === 'swingingCrate' ? 24 : 10);
    prop.setData('explosiveRadius', type === 'barrel' ? BARREL_EXPLOSION_RADIUS : type === 'smallExplosive' ? 72 : 0);
    prop.setData('explosiveDamage', type === 'barrel' ? 44 : type === 'smallExplosive' ? 26 : 0);
    prop.setData('levelGeometry', false);
    prop.setData('indestructible', false);
    prop.setData('visuals', visuals);
    this.physics.add.existing(prop, !(isSwinging || isPushableProp));
    prop.body.setSize(width * propScale, height * propScale);
    if (isSwinging) {
      prop.body.setAllowGravity(false);
      prop.body.setImmovable(true);
      prop.body.pushable = false;
    } else if (isPushableProp) {
      prop.body.setAllowGravity(true);
      prop.body.setImmovable(false);
      prop.body.pushable = true;
      prop.body.setMass(type === 'smallExplosive' ? 5 : type === 'barrel' ? 16 : 22);
      prop.body.setDragX(type === 'smallExplosive' ? 2600 : type === 'barrel' ? 4800 : 5600);
      prop.body.setBounce(type === 'barrel' ? 0.08 : 0.035, 0.02);
      prop.body.setMaxVelocity(type === 'smallExplosive' ? 95 : type === 'barrel' ? 70 : 60, 720);
      prop.setData('groundFriction', type === 'smallExplosive' ? 0.7 : type === 'barrel' ? 0.56 : 0.5);
    }
    prop.body.updateFromGameObject();
    if (isPushableProp) {
      this.dynamicProps.push(prop);
      this.dynamicPropGroup?.add(prop);
    } else if (!isSwinging) {
      this.levelProps.add(prop);
    }
    this.platforms.push(prop);

    if (type === 'crate' || type === 'swingingCrate') {
      const halfX = (prop.displayWidth - 7) / 2;
      const halfY = (prop.displayHeight - 7) / 2;
      addVisual(this.add.rectangle(prop.x, prop.y, prop.displayWidth - 7, prop.displayHeight - 7, 0x000000, 0).setStrokeStyle(2, 0x5e3f29, 0.95));
      addVisual(this.add.line(prop.x, prop.y, -halfX, -halfY, halfX, halfY, 0x5e3f29, 0.92));
      addVisual(this.add.line(prop.x, prop.y, halfX, -halfY, -halfX, halfY, 0x5e3f29, 0.92));
    } else if (type === 'barrel') {
      addVisual(this.add.rectangle(prop.x, prop.y - prop.displayHeight * 0.24, prop.displayWidth, 3, 0xffd166, 0.95), 0, -prop.displayHeight * 0.24);
      addVisual(this.add.rectangle(prop.x, prop.y + prop.displayHeight * 0.24, prop.displayWidth, 3, 0xffd166, 0.95), 0, prop.displayHeight * 0.24);
    } else if (type === 'smallExplosive') {
      addVisual(this.add.rectangle(prop.x, prop.y, prop.displayWidth * 0.66, prop.displayHeight * 0.66, 0x332134, 1).setAngle(45));
    }

    if (isSwinging && anchor) {
      const length = Math.max(height * 1.4, prop.y - anchor.y);
      const angle = Math.asin(Phaser.Math.Clamp((prop.x - anchor.x) / length, -0.95, 0.95));
      this.swingingCrates.push({
        body: prop,
        anchorX: anchor.x,
        anchorY: anchor.y,
        length,
        angle,
        angularVelocity: Phaser.Math.FloatBetween(-0.35, 0.35),
        visuals,
        lastX: prop.x,
        lastY: prop.y,
      });
    }

    return prop;
  }

  findSwingAnchor(tileX, tileY, fallbackX, fallbackY, tileSize) {
    if (!this.editorLevel || !Number.isFinite(tileX) || !Number.isFinite(tileY)) {
      return { x: fallbackX, y: fallbackY - tileSize * 2.5 };
    }

    const solidCeilingTiles = new Set([
      TILE_INDEX.solid,
      TILE_INDEX.slopeUp,
      TILE_INDEX.slopeDown,
      TILE_INDEX.ceilingSlopeUp,
      TILE_INDEX.ceilingSlopeDown,
    ]);
    for (let y = tileY - 1; y >= 0; y -= 1) {
      const tile = this.editorLevel.grid[y * this.editorLevel.width + tileX];
      if (solidCeilingTiles.has(tile)) {
        return {
          x: fallbackX,
          y: (y + 1) * this.editorLevel.tileSize,
        };
      }
    }
    return { x: fallbackX, y: fallbackY - tileSize * 2.5 };
  }

  createDoor(doorSpec, tileSize = this.editorLevel?.tileSize ?? 24) {
    const width = tileSize;
    const height = tileSize * 2;
    const x = (doorSpec.x + 0.5) * tileSize;
    const y = (doorSpec.y + 1) * tileSize;
    const frame = this.add.rectangle(x, y, width * 0.78, height * 0.92, COLORS.door, 0.85).setOrigin(0.5);
    const voidRect = this.add.rectangle(x, y + height * 0.08, width * 0.56, height * 0.72, 0x0b111c, 1).setOrigin(0.5);
    const exit = this.add.rectangle(x, y - height * 0.42, width * 0.62, 7, 0x8cffab, 0.95).setOrigin(0.5);
    const label = this.add.text(x, y - height * 0.49, 'EXIT', {
      fontFamily: UI_FONT,
      fontSize: '8px',
      color: '#0b111c',
    }).setOrigin(0.5, 0);
    const door = {
      x,
      y,
      width,
      height,
      key: doorSpec.key ?? getDoorKey(doorSpec.x, doorSpec.y),
      tileX: doorSpec.x,
      tileY: doorSpec.y,
      exitDirection: this.resolveDoorExitDirection(doorSpec),
      bounds: new Phaser.Geom.Rectangle(x - width * 0.38, y - height * 0.42, width * 0.76, height * 0.84),
      visuals: [frame, voidRect, exit, label],
      target: null,
    };
    this.doors.push(door);
    return door;
  }

  resolveDoorExitDirection(doorSpec) {
    if (doorSpec.exitDirection === -1 || doorSpec.exitDirection === 1) {
      return doorSpec.exitDirection;
    }
    if (!this.editorLevel) {
      return 1;
    }

    const sideScore = (direction) => {
      let score = 0;
      const sideX = doorSpec.x + direction;
      if (sideX < 0 || sideX >= this.editorLevel.width) {
        return -Infinity;
      }
      for (let y = doorSpec.y; y < doorSpec.y + 2; y += 1) {
        const tile = this.getEditorTileAt(sideX, y);
        score += this.isDoorExitBlockedTile(tile) ? -2 : 1;
      }
      return score;
    };
    const leftScore = sideScore(-1);
    const rightScore = sideScore(1);
    if (leftScore === rightScore) {
      return 1;
    }
    return leftScore > rightScore ? -1 : 1;
  }

  isDoorExitBlockedTile(tile) {
    return [
      TILE_INDEX.solid,
      TILE_INDEX.slopeUp,
      TILE_INDEX.slopeDown,
      TILE_INDEX.ceilingSlopeUp,
      TILE_INDEX.ceilingSlopeDown,
      TILE_INDEX.platform,
      TILE_INDEX.movingPlatform,
      TILE_INDEX.slopePlatformUp,
      TILE_INDEX.slopePlatformDown,
      TILE_INDEX.crate,
      TILE_INDEX.barrel,
      TILE_INDEX.smallExplosive,
      TILE_INDEX.swingingCrate,
      TILE_INDEX.glass,
      TILE_INDEX.glassLeft,
      TILE_INDEX.glassRight,
    ].includes(tile);
  }

  pairDoors(level = null) {
    const doorsByKey = new Map(this.doors.map((door) => [door.key, door]));
    const links = Array.isArray(level?.doorLinks) ? level.doorLinks : [];
    if (links.length) {
      for (const link of links) {
        const first = doorsByKey.get(getDoorKey(link.a.x, link.a.y));
        const second = doorsByKey.get(getDoorKey(link.b.x, link.b.y));
        if (!first || !second) {
          continue;
        }
        first.target = second;
        second.target = first;
      }
      return;
    }

    const sorted = [...this.doors].sort((a, b) => a.x - b.x || a.y - b.y);
    for (let i = 0; i < sorted.length; i += 2) {
      const first = sorted[i];
      const second = sorted[i + 1];
      if (!first || !second) {
        continue;
      }
      first.target = second;
      second.target = first;
    }
  }

  createLightFixture(x, y, size) {
    this.add.line(x, y - size * 0.24, 0, 0, 0, size * 0.34, 0x65758a, 0.9).setOrigin(0.5, 0);
    this.add.rectangle(x, y, size * 0.48, size * 0.18, COLORS.light, 1).setOrigin(0.5);
    this.add.triangle(x, y + size * 0.38, 0, 0, size * 0.96, 0, size * 0.72, size * 0.72, COLORS.light, 0.18).setOrigin(0.5, 0.05);
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
    const platform = this.add.rectangle(x, y, width, height, color, thin ? 0 : 1).setOrigin(0.5);
    platform.setData('thin', thin);
    platform.setData('levelGeometry', true);
    platform.setData('indestructible', true);
    this.physics.add.existing(platform, true);
    platform.body.setSize(width, height);
    platform.body.updateFromGameObject();

    if (thin) {
      const visualHeight = Math.min(PLATFORM_STROKE_WIDTH, height);
      this.add.rectangle(x, y - height / 2 + visualHeight / 2, width, visualHeight, COLORS.thinPlatform).setOrigin(0.5);
    } else if (overrideColor === null) {
      this.add.rectangle(x, y - height / 2 - 3, width + 14, 8, COLORS.platformTop).setOrigin(0.5);
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
      e: K.E,
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
      quote: K.QUOTES,
      slash: 191,
      esc: K.ESC,
      enter: K.ENTER,
      space: K.SPACE,
    });

    this.gameKeyDownHandler = (event) => {
      if (!isTypingIntoDomField() && this.input.keyboard.enabled) {
        this.rawKeyboardDown ??= new Set();
        this.rawKeyboardDown.add(event.code || event.key);
      }
      if (!isTypingIntoDomField() && GAME_DEFAULT_CAPTURE_CODES.has(event.code)) {
        event.preventDefault();
      }
    };
    this.gameKeyUpHandler = (event) => {
      this.rawKeyboardDown?.delete(event.code || event.key);
    };
    this.gameBlurHandler = () => {
      this.rawKeyboardDown?.clear();
    };
    window.addEventListener('keydown', this.gameKeyDownHandler, { capture: true });
    window.addEventListener('keyup', this.gameKeyUpHandler, { capture: true });
    window.addEventListener('blur', this.gameBlurHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.gameKeyDownHandler, { capture: true });
      window.removeEventListener('keyup', this.gameKeyUpHandler, { capture: true });
      window.removeEventListener('blur', this.gameBlurHandler);
    });

    this.input.on('pointerdown', (pointer) => this.handleUiPointerDown(pointer));
  }

  refreshInputStates(time) {
    this.updateCpuInputs(time);

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
    this.rawKeyboardDown ??= new Set();
    this.rawKeyboardDown.clear();
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

    if (this.cpuMode && player.id === this.cpuPlayerId) {
      return player.cpuInputDown ?? createInputDown();
    }

    if (player.id === 'p1') {
      return mergeInputDown(this.readKeyboardInput(player), this.touchInputDown);
    }
    return this.readKeyboardInput(player);
  }

  readOnlineKeyboardInput() {
    return mergeInputDown(
      this.p1 ? this.readKeyboardInput(this.p1) : null,
      this.p2 ? this.readKeyboardInput(this.p2) : null,
    );
  }

  readKeyboardInput(player) {
    const down = createInputDown();
    if (!player.controls || isTypingIntoDomField()) {
      return down;
    }

    for (const action of INPUT_ACTIONS) {
      down[action] = Boolean(player.controls[action]?.isDown || this.isRawKeyDown(player.keyboardCodes?.[action]));
    }
    return down;
  }

  isRawKeyDown(codes = []) {
    return codes.some((code) => this.rawKeyboardDown?.has(code));
  }

  updateCpuInputs(time) {
    if (!this.cpuMode || this.onlineMode || this.matchPaused || this.matchOver) {
      return;
    }

    const player = this.getPlayerById(this.cpuPlayerId);
    if (!player) {
      return;
    }

    player.cpuInputDown = this.buildCpuInput(player, time);
  }

  buildCpuInput(player, time) {
    const input = createInputDown();
    const state = player.cpuState ??= createCpuState();
    const opponent = this.getOpponent(player);
    if (!opponent?.sprite?.active || !player.sprite?.active || time < player.knockedUntil) {
      state.action = null;
      return input;
    }

    if (state.action) {
      if (time < state.actionEndAt) {
        return this.continueCpuAction(player, opponent, input, state, time);
      }
      state.action = null;
      state.desiredAimAngle = null;
    }

    if (time < player.pickupAnimationUntil || time < player.meleeAnimationUntil) {
      return input;
    }

    if (player.currentPickup && time >= state.nextPickupAt && this.shouldCpuTakePickup(player, player.currentPickup)) {
      input.pickup = true;
      state.nextPickupAt = time + 650;
      return input;
    }

    if (player.powerup && time >= state.nextPowerupAt && (player.health <= 70 || opponent.health <= 45)) {
      input.powerup = true;
      state.nextPowerupAt = time + 1200;
    }

    const pickupTarget = this.findCpuPickupTarget(player);
    if (pickupTarget && !player.aiming) {
      this.applyCpuMoveToward(input, player, pickupTarget.x, time, state);
      if (pickupTarget.y < player.sprite.y - 42 && Math.abs(pickupTarget.x - player.sprite.x) < 150) {
        this.applyCpuJump(input, player, time, state);
      }
      return input;
    }

    const dx = opponent.sprite.x - player.sprite.x;
    const dy = opponent.sprite.y - player.sprite.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const desiredFacing = dx >= 0 ? 1 : -1;
    const grounded = player.sprite.body.blocked.down || player.sprite.body.touching.down;

    if (absDy > 74 && grounded && time >= state.nextJumpAt && opponent.sprite.y < player.sprite.y) {
      this.applyCpuJump(input, player, time, state);
    }

    if (absDx > 82) {
      this.applyCpuMoveToward(input, player, opponent.sprite.x, time, state);
    } else if (!player.aiming && player.facing !== desiredFacing) {
      this.applyCpuMoveToward(input, player, player.sprite.x + desiredFacing * 20, time, state);
    }

    if (absDx < 76 && absDy < 62 && time >= state.nextMeleeAt) {
      if (!player.crouching) {
        input.melee = true;
        state.nextMeleeAt = time + 680;
      }
      return input;
    }

    if (
      player.grenadeAmmo > 0 &&
      absDx > 170 &&
      absDx < 470 &&
      absDy < 170 &&
      time >= state.nextGrenadeAt &&
      player.facing === desiredFacing
    ) {
      this.startCpuAction(player, opponent, state, time, 'grenade');
      return this.continueCpuAction(player, opponent, input, state, time);
    }

    if (
      player.weapon &&
      player.weapon.ammo > 0 &&
      absDx > 100 &&
      absDx < 760 &&
      absDy < 190 &&
      time >= state.nextShootAt &&
      player.facing === desiredFacing
    ) {
      this.startCpuAction(player, opponent, state, time, 'shoot');
      return this.continueCpuAction(player, opponent, input, state, time);
    }

    return input;
  }

  applyCpuMoveToward(input, player, targetX, time, state) {
    const dx = targetX - player.sprite.x;
    if (Math.abs(dx) < 18) {
      return;
    }
    input.right = dx > 0;
    input.left = dx < 0;
    if (Math.abs(dx) > 210 && time >= state.nextJumpAt && (player.sprite.body.blocked.down || player.sprite.body.touching.down)) {
      this.applyCpuJump(input, player, time, state);
    }
  }

  applyCpuJump(input, player, time, state) {
    if (!(player.sprite.body.blocked.down || player.sprite.body.touching.down) || player.crouching) {
      return;
    }
    input.jump = true;
    state.nextJumpAt = time + Phaser.Math.Between(760, 1150);
  }

  startCpuAction(player, opponent, state, time, action) {
    const holdMs = action === 'grenade' ? CPU_GRENADE_HOLD_MS : CPU_SHOOT_HOLD_MS;
    state.action = action;
    state.actionStartedAt = time;
    state.actionReleaseAt = time + holdMs;
    state.actionEndAt = state.actionReleaseAt + CPU_ACTION_RELEASE_WINDOW_MS;
    state.desiredAimAngle = this.getCpuAimAngle(player, opponent, action);

    if (action === 'grenade') {
      state.nextGrenadeAt = time + Phaser.Math.Between(3900, 5600);
    } else {
      const weapon = player.weapon ? this.configData.weapons[player.weapon.id] : null;
      state.nextShootAt = time + (weapon?.cooldownMs ?? 300) + Phaser.Math.Between(420, 760);
    }
  }

  continueCpuAction(player, opponent, input, state, time) {
    if (state.action === 'shoot' && (!player.weapon || player.weapon.ammo <= 0)) {
      state.action = null;
      return input;
    }
    if (state.action === 'grenade' && player.grenadeAmmo <= 0) {
      state.action = null;
      return input;
    }

    state.desiredAimAngle = this.getCpuAimAngle(player, opponent, state.action);
    this.applyCpuAimInput(player, input, state.desiredAimAngle);

    if (time < state.actionReleaseAt) {
      if (state.action === 'shoot') {
        input.shoot = true;
      } else {
        input.grenade = true;
      }
    }

    return input;
  }

  applyCpuAimInput(player, input, desiredAngle) {
    const facing = player.aiming ? player.aimFacing : player.facing;
    const baseAngle = facing >= 0 ? 0 : Math.PI;
    const desiredOffset = Phaser.Math.Clamp(
      Math.atan2(Math.sin(desiredAngle - baseAngle), Math.cos(desiredAngle - baseAngle)),
      -AIM_HALF_ARC,
      AIM_HALF_ARC,
    );
    const currentOffset = player.aiming ? (player.aimOffset ?? 0) : 0;
    const diff = desiredOffset - currentOffset;
    if (Math.abs(diff) < 0.06) {
      return;
    }

    const vertical = Math.sign(diff) * facing;
    input.aimDown = vertical > 0;
    input.aimUp = vertical < 0;
  }

  getCpuAimAngle(player, opponent, action) {
    const origin = this.getAimPivot(player);
    const target = this.getAimPivot(opponent);
    const leadX = Phaser.Math.Clamp(opponent.sprite.body.velocity.x * 0.16, -72, 72);
    const leadY = Phaser.Math.Clamp(opponent.sprite.body.velocity.y * 0.08, -42, 42);
    const arcBiasY = action === 'grenade' ? -76 : -4;
    return Math.atan2(
      target.y + leadY + arcBiasY - origin.y,
      target.x + leadX - origin.x,
    );
  }

  shouldCpuTakePickup(player, pickup) {
    const kind = pickup.getData('kind');
    if (this.canTakePickup(player, pickup)) {
      return true;
    }
    return kind === 'weapon' && Boolean(player.weapon) && player.weapon.ammo <= 4;
  }

  findCpuPickupTarget(player) {
    const wantsWeapon = !player.weapon || player.weapon.ammo <= 4;
    const wantsGrenade = player.grenadeAmmo <= 1;
    const wantsPowerup = !player.powerup && player.health <= 78;
    if (!wantsWeapon && !wantsGrenade && !wantsPowerup) {
      return null;
    }

    let best = null;
    let bestScore = Infinity;
    for (const pickup of this.pickups.getChildren()) {
      if (!pickup.active) {
        continue;
      }
      const kind = pickup.getData('kind');
      if (
        (kind === 'weapon' && !wantsWeapon) ||
        (kind === 'grenade' && !wantsGrenade) ||
        (kind === 'powerup' && !wantsPowerup)
      ) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, pickup.x, pickup.y);
      const verticalPenalty = Math.max(0, player.sprite.y - pickup.y - 28) * 1.4;
      const score = distance + verticalPenalty;
      if (score < bestScore) {
        best = pickup;
        bestScore = score;
      }
    }
    return best;
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
        <button class="mobile-control mobile-melee" data-action="melee" aria-label="Melee">M</button>
        <button class="mobile-control mobile-pickup" data-action="pickup" aria-label="Pickup">Pick</button>
        <button class="mobile-control mobile-shoot" data-action="shoot" aria-label="Shoot">Fire</button>
        <button class="mobile-control mobile-grenade" data-action="grenade" aria-label="Grenade">Grenade</button>
        <button class="mobile-control mobile-powerup" data-action="powerup" aria-label="Powerup">Power</button>
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

  installPlaySurfaceInputGuards() {
    const preventSelection = (event) => {
      if (!isPlaySurfaceEventTarget(event.target)) {
        return;
      }
      event.preventDefault();
    };
    const preventCanvasTouch = (event) => {
      if (!isGameCanvasEventTarget(event.target)) {
        return;
      }
      event.preventDefault();
    };
    const activeOptions = { passive: false };

    document.addEventListener('selectstart', preventSelection, activeOptions);
    document.addEventListener('dragstart', preventSelection, activeOptions);
    document.addEventListener('contextmenu', preventSelection, activeOptions);
    document.addEventListener('touchmove', preventSelection, activeOptions);
    document.addEventListener('touchstart', preventCanvasTouch, activeOptions);
    document.addEventListener('gesturestart', preventCanvasTouch, activeOptions);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('selectstart', preventSelection, activeOptions);
      document.removeEventListener('dragstart', preventSelection, activeOptions);
      document.removeEventListener('contextmenu', preventSelection, activeOptions);
      document.removeEventListener('touchmove', preventSelection, activeOptions);
      document.removeEventListener('touchstart', preventCanvasTouch, activeOptions);
      document.removeEventListener('gesturestart', preventCanvasTouch, activeOptions);
    });
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

    const arm = this.add
      .sprite(sprite.x, sprite.y, this.getCharacterTextureKey(37))
      .setScale(PLAYER_SCALE)
      .setDepth(14)
      .setOrigin(0.5)
      .setVisible(false);
    const weaponSprite = this.add
      .image(sprite.x, sprite.y, 'weapon-pistol')
      .setOrigin(DEFAULT_GUN_GRIP_POINT.x / HANDGUN_SHEET.frameSize, DEFAULT_GUN_GRIP_POINT.y / HANDGUN_SHEET.frameSize)
      .setScale(0.74)
      .setDepth(13)
      .setVisible(false);
    const crosshair = this.add.image(sprite.x, sprite.y, 'crosshair-pixel').setDepth(15).setVisible(false);
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
      cpuInputDown: createInputDown(),
      cpuState: createCpuState(),
      remoteInputSeq: 0,
      aimAngle: config.facing > 0 ? 0 : Math.PI,
      aimFacing: config.facing > 0 ? 1 : -1,
      aimOffset: 0,
      aimMode: null,
      aiming: false,
      crouching: false,
      climbing: false,
      currentLadder: null,
      climbIntroUntil: 0,
      climbEndUntil: 0,
      ladderGunDrawUntil: 0,
      ladderEndFootY: 0,
      onThinPlatform: false,
      onSlope: false,
      currentSlope: null,
      lastFloorSlope: null,
      lastSlopeGroundedAt: -Infinity,
      dropUntil: 0,
      currentThinPlatform: null,
      currentThinSlope: null,
      dropThroughPlatform: null,
      dropThroughSlope: null,
      doorCooldownUntil: 0,
      doorIgnoreKey: null,
      doorExitUntil: 0,
      doorExitDirection: 0,
      doorExitTargetX: 0,
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
      lastTapDownAt: -Infinity,
      crouchTransitionUntil: 0,
      crouchTransitionGun: false,
      standTransitionUntil: 0,
      standTransitionGun: false,
      dashAttackUntil: 0,
      dashDirection: 0,
      dashHitTargets: new Set(),
      rollUntil: 0,
      rollEndAt: 0,
      rollDirection: 0,
      meleeAnimationUntil: 0,
      meleeAnimationKey: null,
      meleeAttackId: 0,
      meleeAttackState: null,
      pickupAnimationUntil: 0,
      shootStanceUntil: 0,
      grenadeCookStartedAt: 0,
      grenadeCookText: null,
      jumpHeldUntil: 0,
      jumpReleased: true,
      jumpBufferUntil: 0,
      jumpPrepUntil: 0,
      jumpLandUntil: 0,
      wasGrounded: true,
      headSupportUntil: 0,
      headSupportPlayerId: null,
      knockedUntil: 0,
      invulnerableUntil: 0,
      slowedUntil: 0,
      shieldUntil: 0,
      hasteUntil: 0,
      onFireUntil: 0,
      nextFireDamageAt: 0,
      fireOwnerId: null,
      fireEffect: null,
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
    if (this.dynamicPropGroup?.getChildren?.().length) {
      this.physics.add.collider(this.dynamicPropGroup, this.getDynamicPropSupportPlatforms(), undefined, this.dynamicPropPlatformProcess, this);
      this.physics.add.collider(this.dynamicPropGroup, this.dynamicPropGroup);
    }
    this.physics.add.collider(this.bullets, this.platforms, this.handleBulletWall, this.bulletWallProcess, this);
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

    this.coordText = this.add
      .text(14, 28, '', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#eaf5ff',
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
      this.coordText,
      this.p2StatusText,
      this.messageText,
    ]);
    this.positionHudObjects();
  }

  positionHudObjects() {
    if (!this.timerText || !this.messageText || !this.p2StatusText || !this.hintText || !this.coordText) {
      return;
    }

    const width = this.getViewportWidth();
    const compact = width < 620 || isMobileLike();
    this.hintText.setVisible(!compact);
    this.coordText.setPosition(compact ? 10 : 14, compact ? 8 : 28);
    this.coordText.setFontSize(compact ? 11 : 12);
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
        "P1: WASD + 1 melee, E pickup, 2 shoot, 3 grenade, 4 power\nP2: Arrows + M melee, ' pickup, , shoot, . grenade, / power\nHold shoot/grenade to aim. Release to fire/throw.",
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
        <button class="start-cpu" type="button">Play vs CPU</button>
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
    overlay.querySelector('.start-cpu')?.addEventListener('click', () => this.beginCpuGame());
    overlay.querySelector('.start-local')?.addEventListener('click', () => this.beginLocalGame());
    overlay.querySelector('.start-online')?.addEventListener('click', () => this.beginOnlineFlow());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => overlay.remove());
  }

  applyBootOptions(options = {}) {
    if (options.mode === 'online') {
      this.applyOnlineBootOptions(options);
      return;
    }
    if (options.mode === 'cpu') {
      this.beginCpuGame();
      return;
    }

    this.beginLocalGame();
  }

  applyOnlineBootOptions(options) {
    this.cpuMode = false;
    this.cpuPlayerId = null;
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
    this.onlineLastHostSnapshotServerTime = 0;
    this.onlineRoundId = Number.isFinite(Number(options.roundId)) ? Number(options.roundId) : 0;
    if (this.onlineChannel) {
      this.bindOnlineChannel(this.onlineChannel);
    }
    this.handleOnlineMatchStart({ code: options.code, roundId: this.onlineRoundId });
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
    this.configData ??= getGameplayConfig();
    this.cpuMode = false;
    this.cpuPlayerId = null;
    if (this.p2) {
      this.p2.label = 'P2';
      this.p2.cpuInputDown = createInputDown();
      this.p2.cpuState = createCpuState();
    }
    this.onlineMode = false;
    this.onlineReady = false;
    this.localOnlinePlayerId = null;
    this.modeSelected = true;
    this.matchPaused = false;
    this.closeStartOverlay();
    this.closeOnlineOverlay();
    this.setGameKeyboardEnabled(true);
    this.roundEndsAt = this.time.now + this.getRoundSeconds() * 1000;
    this.physics.world.resume();
    this.showMessage('Fight', 900);
  }

  beginCpuGame() {
    this.disconnectOnlineChannel();
    this.configData ??= getGameplayConfig();
    this.cpuMode = true;
    this.cpuPlayerId = CPU_PLAYER_ID;
    this.onlineMode = false;
    this.onlineReady = false;
    this.localOnlinePlayerId = null;
    this.modeSelected = true;
    this.matchPaused = false;
    if (this.p2) {
      this.p2.label = 'CPU';
      this.p2.cpuInputDown = createInputDown();
      this.p2.cpuState = createCpuState();
    }
    this.closeStartOverlay();
    this.closeOnlineOverlay();
    this.setGameKeyboardEnabled(true);
    this.roundEndsAt = this.time.now + this.getRoundSeconds() * 1000;
    this.physics.world.resume();
    this.showMessage('CPU fight', 900);
  }

  getRoundSeconds() {
    return this.configData?.round?.seconds ?? DEFAULT_GAMEPLAY_CONFIG.round.seconds;
  }

  beginOnlineFlow(prefillCode = '') {
    this.modeSelected = true;
    this.cpuMode = false;
    this.cpuPlayerId = null;
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
      this.showMessage('Rematch requested', 700);
      return;
    }
    pendingBootOptions = {
      mode: this.cpuMode ? 'cpu' : 'local',
      editorLevel: Boolean(this.editorLevel),
    };
    this.scene.restart();
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
            <input id="onlineOverlayCodeInput" name="onlineOverlayCode" class="online-code-input" type="text" maxlength="4" autocomplete="off" spellcheck="false">
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
    channel.on('host-snapshot', (data) => this.handleOnlineHostSnapshot(data));
    channel.on('restart-match', (data) => this.handleOnlineRestartMatch(data));
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
    this.onlineLastHostSnapshotServerTime = 0;
    if (Number.isFinite(Number(data.roundId))) {
      this.onlineRoundId = Number(data.roundId);
    }
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
    if (Number.isFinite(Number(data?.roundId))) {
      this.onlineRoundId = Number(data.roundId);
    }
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
    if (Number.isFinite(Number(data.roundId)) && Number(data.roundId) !== this.onlineRoundId) {
      return;
    }
    const player = this.getPlayerById(data.playerId);
    if (!player) {
      return;
    }
    const seq = safeClientInteger(data.seq);
    if (seq && seq < (player.remoteInputSeq ?? 0)) {
      return;
    }
    player.remoteInputSeq = seq;
    player.remoteInputDown = sanitizeInputDown(data.input);
  }

  handleOnlinePlayerSnapshot(data) {
    if (!data || data.playerId === this.localOnlinePlayerId) {
      return;
    }
    if (Number.isFinite(Number(data.roundId)) && Number(data.roundId) !== this.onlineRoundId) {
      return;
    }
    const player = this.getPlayerById(data.playerId);
    if (!player || !data.snapshot) {
      return;
    }
    this.applyRemoteSnapshot(player, data.snapshot);
  }

  handleOnlineHostSnapshot(data) {
    if (!data || this.onlineIsHost) {
      return;
    }
    if (Number.isFinite(Number(data.roundId)) && Number(data.roundId) !== this.onlineRoundId) {
      return;
    }
    const serverTime = safeClientInteger(data.serverTime);
    if (serverTime && serverTime < this.onlineLastHostSnapshotServerTime) {
      return;
    }
    this.onlineLastHostSnapshotServerTime = serverTime;

    for (const playerId of ['p1', 'p2']) {
      const snapshot = data.snapshots?.[playerId];
      const player = this.getPlayerById(playerId);
      if (!player || !snapshot) {
        continue;
      }
      this.applyRemoteSnapshot(player, snapshot, {
        localReconcile: player.id === this.localOnlinePlayerId,
      });
    }

    if (Array.isArray(data.pickups)) {
      this.applyRemotePickupSnapshot(data.pickups);
    }
  }

  handleOnlineRestartMatch(data = {}) {
    if (Number.isFinite(Number(data.roundId))) {
      this.onlineRoundId = Number(data.roundId);
    } else {
      this.onlineRoundId += 1;
    }
    this.onlineMode = true;
    this.onlineReady = true;
    this.modeSelected = true;
    this.matchPaused = false;
    this.onlineLobbyStarted = true;
    this.resetMatchForOnline();
    this.closeStartOverlay();
    this.closeOnlineOverlay();
    this.closeMenu();
    this.physics.world.resume();
    this.setOnlineStatus(`Playing online lobby ${this.onlineLobbyCode} as ${this.localOnlinePlayerId?.toUpperCase()}.`);
    this.showMessage('Rematch', 850);
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
      player.remoteInputSeq = 0;
    }
    this.touchInputDown = createInputDown();
  }

  resetMatchForOnline() {
    this.matchOver = false;
    this.endOverlayState = null;
    this.endContainer?.destroy();
    this.endContainer = null;
    this.physics.world.resume();
    this.roundEndsAt = this.time.now + this.getRoundSeconds() * 1000;
    this.pickupSpawnTimer = 0;
    this.onlineInputSeq = 0;
    this.onlineLastInputPayload = '';
    this.onlineLastInputSentAt = 0;
    this.onlineLastSnapshotSentAt = 0;
    this.onlineLastHostSnapshotServerTime = 0;
    this.onlinePickupSnapshotKey = '';
    this.resetOnlineInputs();
    this.clearGameObjectGroup(this.bullets);
    this.clearGameObjectGroup(this.grenades);
    this.clearGameObjectGroup(this.pickups);
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
    if (this.onlineIsHost) {
      this.spawnInitialPickups();
    }
  }

  clearGameObjectGroup(group) {
    if (!group?.getChildren) {
      return;
    }
    for (const child of [...group.getChildren()]) {
      child.getData?.('labelObj')?.destroy?.();
      child.getData?.('glowObj')?.destroy?.();
      child.getData?.('shine')?.destroy?.();
      child.getData?.('timerText')?.destroy?.();
      child.destroy();
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
      roundId: this.onlineRoundId,
      seq: this.onlineInputSeq,
      input: player.inputState.down,
      t: Math.round(time),
    }, { reliable: true });
  }

  syncOnlineState(time) {
    if (!this.onlineMode || !this.onlineReady || !this.onlineChannel || !this.localOnlinePlayerId) {
      return;
    }
    if (!this.onlineIsHost) {
      return;
    }
    if (time - this.onlineLastSnapshotSentAt < ONLINE_SNAPSHOT_SEND_MS) {
      return;
    }
    this.onlineLastSnapshotSentAt = time;
    this.onlineChannel.emit('host-snapshot', {
      roundId: this.onlineRoundId,
      t: Math.round(time),
      snapshots: this.players.reduce((snapshots, player) => {
        snapshots[player.id] = this.serializePlayerSnapshot(player);
        return snapshots;
      }, {}),
      pickups: this.serializePickupSnapshot(),
    });
  }

  serializePickupSnapshot() {
    return this.pickups
      .getChildren()
      .filter((pickup) => pickup.active)
      .map((pickup) => ({
        x: roundForNetwork(pickup.getData('logicalX') ?? pickup.x),
        y: roundForNetwork(pickup.getData('logicalY') ?? pickup.y),
        kind: pickup.getData('kind'),
        id: pickup.getData('id'),
      }))
      .filter((pickup) => this.isValidPickup(pickup.kind, pickup.id))
      .sort(comparePickupSnapshotEntries);
  }

  applyRemotePickupSnapshot(pickups) {
    const normalizedPickups = pickups
      .map((pickup) => ({
        x: roundForNetwork(pickup?.x),
        y: roundForNetwork(pickup?.y),
        kind: String(pickup?.kind ?? ''),
        id: String(pickup?.id ?? ''),
      }))
      .filter((pickup) => (
        Number.isFinite(pickup.x) &&
        Number.isFinite(pickup.y) &&
        this.isValidPickup(pickup.kind, pickup.id)
      ))
      .slice(0, this.configData.pickups.maxOnMap + 8)
      .sort(comparePickupSnapshotEntries);
    const snapshotKey = JSON.stringify(normalizedPickups);
    if (snapshotKey === this.onlinePickupSnapshotKey) {
      return;
    }

    this.onlinePickupSnapshotKey = snapshotKey;
    this.clearGameObjectGroup(this.pickups);
    for (const pickup of normalizedPickups) {
      this.createPickup(pickup.x, pickup.y, pickup.kind, pickup.id);
    }
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

  applyRemoteSnapshot(player, snapshot, options = {}) {
    const x = Number(snapshot.x);
    const y = Number(snapshot.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const distance = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, x, y);
      const hardSnapDistance = options.localReconcile ? 96 : 58;
      const minimumCorrection = options.localReconcile ? 4 : 1;
      if (distance > hardSnapDistance) {
        player.sprite.setPosition(x, y);
        player.sprite.body.reset(x, y);
      } else if (distance > minimumCorrection) {
        const lerp = options.localReconcile ? 0.22 : 0.55;
        player.sprite.x = Phaser.Math.Linear(player.sprite.x, x, lerp);
        player.sprite.y = Phaser.Math.Linear(player.sprite.y, y, lerp);
        player.sprite.body.updateFromGameObject?.();
      }
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

  updateMovingPlatforms(time) {
    for (const platform of this.movingPlatforms) {
      const y = platform.baseY + Math.sin(time * platform.speed + platform.phase) * platform.range;
      const dy = y - platform.body.y;
      platform.body.y = y;
      platform.body.body.updateFromGameObject();
      for (const visual of platform.visuals) {
        visual.y += dy;
      }
    }
  }

  updateDynamicProps() {
    if (!this.dynamicProps?.length) {
      return;
    }

    for (const prop of this.dynamicProps) {
      if (!prop?.active) {
        continue;
      }
      if (prop.y > this.worldHeight + 900) {
        this.removeLevelProp(prop);
        continue;
      }
      prop.setData('grounded', false);
      this.resolveDynamicPropWallContact(prop);
      this.resolveDynamicPropPlatformContact(prop);
      this.resolveDynamicPropSlopeContact(prop);
      this.applyDynamicPropFloorFriction(prop);
      this.syncPropVisuals(prop);
    }
  }

  applyDynamicPropFloorFriction(prop) {
    const body = prop?.body;
    if (!body) {
      return;
    }

    const grounded = prop.getData('grounded') || body.blocked.down || body.touching.down;
    if (!grounded) {
      return;
    }

    const friction = prop.getData('groundFriction') ?? 0.58;
    body.setVelocityX(body.velocity.x * friction);
    if (Math.abs(body.velocity.x) < 8) {
      body.setVelocityX(0);
    }
  }

  syncPropVisuals(prop) {
    for (const visual of prop.getData('visuals') ?? []) {
      if (!visual?.active || visual.getData('rope')) {
        continue;
      }
      visual.setPosition(
        prop.x + (visual.getData('offsetX') ?? 0),
        prop.y + (visual.getData('offsetY') ?? 0),
      );
    }
  }

  resolveDynamicPropWallContact(prop) {
    const body = prop?.body;
    if (!body) {
      return false;
    }

    let resolved = false;
    for (const platform of this.getDynamicPropSupportPlatforms()) {
      if (platform.getData?.('thin')) {
        continue;
      }
      const platformBody = platform.body;
      if (!platformBody || !Phaser.Geom.Intersects.RectangleToRectangle(getBodyBounds(prop), getBodyBounds(platform))) {
        continue;
      }

      const prevLeft = body.prev?.x ?? body.x;
      const prevRight = prevLeft + body.width;
      const prevBottom = (body.prev?.y ?? body.y) + body.height;
      const platformTop = platformBody.y;
      const platformBottom = platformBody.y + platformBody.height;
      const verticalOverlap = body.y + body.height > platformTop + 2 && body.y < platformBottom - 2;
      const standingOnTop = prevBottom <= platformTop + 10 && body.y + body.height <= platformTop + 18;
      if (!verticalOverlap || standingOnTop) {
        continue;
      }

      if (prevRight <= platformBody.x + 8 && body.x + body.width > platformBody.x) {
        this.setDynamicPropBodyLeft(prop, platformBody.x - body.width);
        body.setVelocityX(Math.min(0, body.velocity.x));
        resolved = true;
      } else if (prevLeft >= platformBody.x + platformBody.width - 8 && body.x < platformBody.x + platformBody.width) {
        this.setDynamicPropBodyLeft(prop, platformBody.x + platformBody.width);
        body.setVelocityX(Math.max(0, body.velocity.x));
        resolved = true;
      }
    }

    const minX = 0;
    const maxX = (this.editorLevel?.width ?? 0) * (this.editorLevel?.tileSize ?? 0) || this.worldWidth;
    if (body.x < minX) {
      this.setDynamicPropBodyLeft(prop, minX);
      body.setVelocityX(Math.max(0, body.velocity.x));
      resolved = true;
    } else if (body.x + body.width > maxX) {
      this.setDynamicPropBodyLeft(prop, maxX - body.width);
      body.setVelocityX(Math.min(0, body.velocity.x));
      resolved = true;
    }

    return resolved;
  }

  resolveDynamicPropPlatformContact(prop) {
    const body = prop?.body;
    if (!body || body.velocity.y < -24) {
      return false;
    }

    const propLeft = body.x;
    const propRight = body.x + body.width;
    const propBottom = body.y + body.height;
    const prevBottom = (body.prev?.y ?? body.y) + body.height;
    const tolerance = Math.max(24, Math.abs(body.velocity.y) * (1 / 30) + 12);
    let bestTop = Infinity;

    for (const platform of this.getDynamicPropSupportPlatforms()) {
      const platformBody = platform.body;
      if (!platformBody) {
        continue;
      }
      const platformTop = platformBody.y;
      const overlapsX = propRight > platformBody.x + 1 && propLeft < platformBody.x + platformBody.width - 1;
      if (!overlapsX) {
        continue;
      }
      const crossedTop = prevBottom <= platformTop + 8 && propBottom >= platformTop - 6;
      const nearTop = propBottom >= platformTop - 6 && propBottom <= platformTop + tolerance && body.y < platformTop;
      if ((crossedTop || nearTop) && platformTop < bestTop) {
        bestTop = platformTop;
      }
    }

    if (!Number.isFinite(bestTop)) {
      return false;
    }

    this.setDynamicPropBodyTop(prop, bestTop - body.height);
    body.setVelocityY(0);
    body.touching.down = true;
    body.blocked.down = true;
    prop.setData('grounded', true);
    return true;
  }

  resolveDynamicPropSlopeContact(prop) {
    if (!this.slopeTiles.length || !prop.body || prop.body.velocity.y < -18) {
      return false;
    }

    const body = prop.body;
    const footY = body.y + body.height;
    const sampleXs = [
      body.x + body.width * 0.2,
      body.x + body.width * 0.5,
      body.x + body.width * 0.8,
    ];
    const tileSize = this.editorLevel?.tileSize ?? 24;
    const tileY = Math.floor((footY + 3) / tileSize);
    let bestSurface = Infinity;

    for (const sampleX of sampleXs) {
      const tileX = Math.floor(sampleX / tileSize);
      for (let y = tileY - 1; y <= tileY + 1; y += 1) {
        for (let x = tileX - 1; x <= tileX + 1; x += 1) {
          const slope = this.slopeTileMap.get(`${x},${y}`);
          if (!slope || slope.side !== 'floor' || slope.thin) {
            continue;
          }
          if (sampleX < slope.x - 2 || sampleX > slope.x + slope.size + 2) {
            continue;
          }
          const localX = Phaser.Math.Clamp(sampleX - slope.x, 0, slope.size);
          const surfaceY = slope.type === 'up'
            ? slope.y + slope.size - localX
            : slope.y + localX;
          if (footY >= surfaceY - 5 && footY <= surfaceY + Math.max(14, slope.size * 0.8) && surfaceY < bestSurface) {
            bestSurface = surfaceY;
          }
        }
      }
    }

    if (!Number.isFinite(bestSurface)) {
      return false;
    }

    this.setDynamicPropBodyTop(prop, bestSurface - body.height);
    if (body.velocity.y > 0) {
      body.setVelocityY(0);
    }
    body.touching.down = true;
    body.blocked.down = true;
    prop.setData('grounded', true);
    body.updateCenter();
    return true;
  }

  setDynamicPropBodyTop(prop, topY) {
    const body = prop.body;
    prop.y = topY + body.height / 2;
    body.y = topY;
    body.prev.y = topY;
    body.prevFrame.y = topY;
    body.autoFrame.y = topY;
    body.updateCenter();
  }

  setDynamicPropBodyLeft(prop, leftX) {
    const body = prop.body;
    prop.x = leftX + body.width / 2;
    body.x = leftX;
    body.prev.x = leftX;
    body.prevFrame.x = leftX;
    body.autoFrame.x = leftX;
    body.updateCenter();
  }

  updateSwingingCrates(delta) {
    if (!this.swingingCrates.length) {
      return;
    }

    const dt = Math.min(0.033, Math.max(0.001, delta / 1000));
    for (const crate of this.swingingCrates) {
      const prop = crate.body;
      if (!prop?.active) {
        continue;
      }

      for (const player of this.players) {
        if (!player.sprite?.active) {
          continue;
        }
        if (!Phaser.Geom.Intersects.RectangleToRectangle(getBodyBounds(player.sprite), prop.getBounds())) {
          continue;
        }
        const side = Math.sign(player.sprite.x - prop.x) || 1;
        const velocityTorque = Phaser.Math.Clamp(player.sprite.body.velocity.x * 0.0009, -0.12, 0.12);
        crate.angularVelocity += velocityTorque + side * 0.018;
      }

      crate.angularVelocity += -Math.sin(crate.angle) * 7.2 * dt;
      crate.angularVelocity *= 0.988;
      crate.angle = Phaser.Math.Clamp(crate.angle + crate.angularVelocity * dt, -1.12, 1.12);

      const nextX = crate.anchorX + Math.sin(crate.angle) * crate.length;
      const nextY = crate.anchorY + Math.cos(crate.angle) * crate.length;
      const vx = (nextX - prop.x) / dt;
      const vy = (nextY - prop.y) / dt;
      prop.setPosition(nextX, nextY);
      prop.body.setVelocity(vx, vy);
      prop.body.updateFromGameObject();

      for (const visual of crate.visuals) {
        if (!visual?.active) {
          continue;
        }
        if (visual.type === 'Line' && visual.x === 0 && visual.y === 0) {
          visual.setTo(crate.anchorX, crate.anchorY, prop.x, prop.y - prop.displayHeight / 2);
        } else {
          visual.setPosition(prop.x, prop.y);
        }
      }
    }
  }

  updateDoorTeleports(time) {
    if (this.doors.length < 2) {
      return;
    }
    for (const player of this.players) {
      if (!player.sprite.active || time < player.doorExitUntil) {
        continue;
      }
      const playerBounds = getBodyBounds(player.sprite);
      if (player.doorIgnoreKey) {
        const ignoredDoor = this.doors.find((candidate) => candidate.key === player.doorIgnoreKey);
        if (!ignoredDoor || !Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, ignoredDoor.bounds)) {
          player.doorIgnoreKey = null;
        }
      }
      if (time < player.doorCooldownUntil) {
        continue;
      }
      const door = this.doors.find((candidate) => (
        candidate.target &&
        candidate.key !== player.doorIgnoreKey &&
        this.isPlayerEnteringDoor(player, candidate) &&
        Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, candidate.bounds)
      ));
      if (!door?.target) {
        continue;
      }
      const target = door.target;
      const exitDirection = target.exitDirection || Math.sign(door.x - target.x) || player.facing || 1;
      this.placePlayerAtDoorExit(player, target);
      this.startDoorExit(player, target, exitDirection, time);
      player.dropUntil = time + 120;
      player.doorCooldownUntil = time + DOOR_EXIT_MS + 140;
      this.spawnDoorFlash(door);
      this.spawnDoorFlash(target);
    }
  }

  isPlayerEnteringDoor(player, door) {
    const exitDirection = door.exitDirection || 1;
    const horizontal = (player.inputState.down.right ? 1 : 0) - (player.inputState.down.left ? 1 : 0);
    const velocityDirection = Math.sign(player.sprite.body.velocity.x);
    const approachDirection = horizontal || velocityDirection;
    if (approachDirection !== -exitDirection) {
      return false;
    }

    const side = Math.sign(player.sprite.x - door.x) || exitDirection;
    return side === exitDirection || Math.abs(player.sprite.x - door.x) <= door.width * 0.35;
  }

  placePlayerAtDoorExit(player, door) {
    player.crouching = false;
    this.clearLadderState(player);
    this.applyBodyPose(player, true);
    const footY = this.getDoorFootY(door);
    const body = player.sprite.body;
    this.snapPlayerBodyTo(player, door.x - body.width / 2, footY - body.height);
    player.sprite.setVelocity(0, 0);
  }

  getDoorFootY(door) {
    const tileSize = door.height / 2;
    return (door.tileY + 2) * tileSize;
  }

  getDoorStandingY(door) {
    return this.getDoorFootY(door) - this.getStandingBodyBottomOffset();
  }

  startDoorExit(player, door, direction, time) {
    const exitDirection = direction < 0 ? -1 : 1;
    const tileSize = door.height / 2;
    player.aiming = false;
    player.aimMode = null;
    this.clearLadderState(player);
    player.crouching = false;
    player.doorIgnoreKey = door.key;
    player.doorExitDirection = exitDirection;
    player.doorExitTargetX = door.x + exitDirection * tileSize;
    player.doorExitUntil = time + DOOR_EXIT_MS;
    player.facing = exitDirection;
    player.sprite.setFlipX(exitDirection < 0);
    player.sprite.setVelocity(exitDirection * Math.max(90, this.configData.movement.walkSpeed * 0.55), 0);
    this.endShootStance(player);
    this.setAimVisible(player, false);
    this.applyBodyPose(player, true);
  }

  spawnDoorFlash(door) {
    const flash = this.add.rectangle(door.x, door.y, door.width * 0.82, door.height * 0.9, 0x8cffab, 0.28).setOrigin(0.5).setDepth(12);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.08,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  setPlayerBodyTop(player, topY) {
    const { sprite } = player;
    const body = sprite.body;
    const deltaY = topY - body.y;
    if (Math.abs(deltaY) < 0.001) {
      return;
    }
    sprite.y = topY + sprite.displayOriginY * sprite.scaleY - body.offset.y;
    body.y = topY;
    body.prev.y = topY;
    body.prevFrame.y = topY;
    body.autoFrame.y = topY;
    body.updateCenter();
  }

  snapPlayerBodyTo(player, leftX, topY) {
    const { sprite } = player;
    const body = sprite.body;
    sprite.x = leftX - sprite.scaleX * (body.offset.x - sprite.displayOriginX);
    sprite.y = topY - sprite.scaleY * (body.offset.y - sprite.displayOriginY);
    body.x = leftX;
    body.y = topY;
    body.prev.set(leftX, topY);
    body.prevFrame.set(leftX, topY);
    body.autoFrame.set(leftX, topY);
    body.updateCenter();
  }

  getEditorTileAt(tileX, tileY) {
    const level = this.editorLevel;
    if (!level || tileX < 0 || tileY < 0 || tileX >= level.width || tileY >= level.height) {
      return TILE_INDEX.empty;
    }
    return level.grid[tileY * level.width + tileX];
  }

  isSlopeLandingTile(tile) {
    return tile === TILE_INDEX.solid || tile === TILE_INDEX.platform || tile === TILE_INDEX.movingPlatform;
  }

  isSolidFloorTile(tile) {
    return (
      tile === TILE_INDEX.solid
    );
  }

  getBodyFootSampleXs(body) {
    return [
      body.x + Math.max(2, body.width * 0.08),
      body.x + body.width * 0.25,
      body.x + body.width * 0.5,
      body.x + body.width * 0.75,
      body.x + body.width - Math.max(2, body.width * 0.08),
    ];
  }

  resolveSolidFloorContact(player) {
    const level = this.editorLevel;
    const body = player?.sprite?.body;
    if (!level || !body || player.climbing || body.velocity.y < -20) {
      return false;
    }

    const tileSize = level.tileSize ?? 24;
    const footY = body.y + body.height;
    const sampleXs = this.getBodyFootSampleXs(body);
    const baseTileY = Math.floor((footY + 2) / tileSize);
    let bestTop = Infinity;

    for (let y = Math.max(0, baseTileY - 1); y <= Math.min(level.height - 1, baseTileY + 1); y += 1) {
      const topY = y * tileSize;
      if (footY < topY - 1 || footY > topY + Math.max(18, tileSize * 1.35)) {
        continue;
      }

      for (const sampleX of sampleXs) {
        const tileX = Math.floor(sampleX / tileSize);
        if (tileX < 0 || tileX >= level.width) {
          continue;
        }
        const tile = this.getEditorTileAt(tileX, y);
        if (!this.isSolidFloorTile(tile)) {
          continue;
        }
        const maxBelowTop = Math.max(18, tileSize * 1.35);
        if (footY <= topY + maxBelowTop && topY < bestTop) {
          bestTop = topY;
        }
      }
    }

    if (!Number.isFinite(bestTop)) {
      return false;
    }

    this.setPlayerBodyTop(player, bestTop - body.height);
    body.setVelocityY(0);
    body.touching.down = true;
    body.blocked.down = true;
    player.onSlope = false;
    player.currentSlope = null;
    player.onThinPlatform = false;
    player.currentThinPlatform = null;
    player.currentThinSlope = null;
    return true;
  }

  resolvePlayerHeadContact(player, time) {
    const other = this.getOpponent(player);
    const body = player?.sprite?.body;
    const otherBody = other?.sprite?.body;
    if (
      !body ||
      !otherBody ||
      !player.sprite.active ||
      !other.sprite.active ||
      player.climbing ||
      body.velocity.y < -20
    ) {
      return false;
    }

    const footY = body.y + body.height;
    const headY = otherBody.y;
    const overlapLeft = Math.max(body.x, otherBody.x);
    const overlapRight = Math.min(body.x + body.width, otherBody.x + otherBody.width);
    const overlapWidth = overlapRight - overlapLeft;
    const minOverlap = Math.max(6, Math.min(body.width, otherBody.width) * 0.28);
    const aboveOther = body.y + body.height * 0.65 <= otherBody.y + otherBody.height * 0.42;
    const onHead = overlapWidth >= minOverlap && aboveOther && footY >= headY - 10 && footY <= headY + 18;

    if (onHead) {
      this.setPlayerBodyTop(player, headY - body.height);
      if (body.velocity.y > 0) {
        body.setVelocityY(0);
      }
      body.touching.down = true;
      body.blocked.down = true;
      player.onSlope = false;
      player.currentSlope = null;
      player.onThinPlatform = false;
      player.currentThinPlatform = null;
      player.currentThinSlope = null;
      player.headSupportUntil = time + PLAYER_HEAD_SUPPORT_MS;
      player.headSupportPlayerId = other.id;
      return true;
    }

    return (
      player.headSupportPlayerId === other.id &&
      time < player.headSupportUntil &&
      body.velocity.y >= -20 &&
      overlapWidth >= minOverlap * 0.55
    );
  }

  resolveSlopeContact(player) {
    player.onSlope = false;
    player.currentSlope = null;
    if (!this.slopeTiles.length || player.climbing) {
      return false;
    }

    const body = player.sprite.body;
    const footY = body.y + body.height;
    const tileSize = this.editorLevel?.tileSize ?? 24;
    const tileY = Math.floor((footY + 3) / tileSize);
    const sampleXs = this.getBodyFootSampleXs(body);
    let bestSurface = Infinity;
    let bestSlope = null;

    for (const sampleX of sampleXs) {
      const tileX = Math.floor(sampleX / tileSize);
      for (let y = tileY - 1; y <= tileY + 1; y += 1) {
        for (let x = tileX - 1; x <= tileX + 1; x += 1) {
          const slope = this.slopeTileMap.get(`${x},${y}`);
          if (!slope || slope.side !== 'floor') {
            continue;
          }
          if (sampleX < slope.x - 2 || sampleX > slope.x + slope.size + 2) {
            continue;
          }
          const localX = Phaser.Math.Clamp(sampleX - slope.x, 0, slope.size);
          const surfaceY = slope.type === 'up'
            ? slope.y + slope.size - localX
            : slope.y + localX;
          if (body.velocity.y < -8 || this.isDroppingThroughSlope(player, slope)) {
            continue;
          }
          const tolerance = body.velocity.y >= -20 ? 18 : 4;
          const belowTolerance = slope.thin ? 12 : Math.max(34, slope.size * 1.5);
          if (footY >= surfaceY - tolerance && footY <= surfaceY + belowTolerance && surfaceY < bestSurface) {
            bestSurface = surfaceY;
            bestSlope = slope;
          }
        }
      }
    }

    if (!bestSlope) {
      return false;
    }

    this.setPlayerBodyTop(player, bestSurface - body.height);
    if (body.velocity.y > 0) {
      body.setVelocityY(0);
    }
    body.touching.down = true;
    body.blocked.down = true;
    player.onSlope = true;
    player.currentSlope = bestSlope;
    player.lastFloorSlope = bestSlope;
    player.lastSlopeGroundedAt = this.time.now;
    if (bestSlope.thin) {
      player.onThinPlatform = true;
      player.currentThinSlope = bestSlope;
      player.currentThinPlatform = null;
    } else {
      player.currentThinSlope = null;
    }
    return true;
  }

  resolveSlopeLandingBridge(player) {
    const slope = player.lastFloorSlope;
    if (!slope || slope.side !== 'floor' || this.time.now - player.lastSlopeGroundedAt > 90) {
      return false;
    }

    const body = player.sprite.body;
    if (!body || body.velocity.y < -20) {
      return false;
    }
    if (this.isDroppingThroughSlope(player, slope)) {
      return false;
    }

    const highDir = slope.type === 'up' ? 1 : -1;
    const landingTile = this.getEditorTileAt(slope.tileX + highDir, slope.tileY);
    if (!this.isSlopeLandingTile(landingTile)) {
      return false;
    }

    const footX = body.x + body.width / 2;
    const footY = body.y + body.height;
    const highEdgeX = highDir > 0 ? slope.x + slope.size : slope.x;
    const pastHighEdge = highDir > 0 ? footX >= highEdgeX - 1 : footX <= highEdgeX + 1;
    const distancePastEdge = highDir > 0 ? footX - highEdgeX : highEdgeX - footX;
    const landingTop = slope.y;

    if (!pastHighEdge || distancePastEdge > body.width * 1.15) {
      return false;
    }
    if (footY < landingTop - 5 || footY > landingTop + 8) {
      return false;
    }

    this.setPlayerBodyTop(player, landingTop - body.height);
    body.setVelocityY(0);
    body.touching.down = true;
    body.blocked.down = true;
    player.onSlope = false;
    player.currentSlope = null;
    player.onThinPlatform = false;
    player.currentThinPlatform = null;
    player.currentThinSlope = null;
    return true;
  }

  assistSlopeLanding(player, horizontal) {
    const slope = player.currentSlope;
    if (!slope || slope.side !== 'floor' || !horizontal) {
      return false;
    }

    const highDir = slope.type === 'up' ? 1 : -1;
    if (horizontal !== highDir) {
      return false;
    }

    const body = player.sprite.body;
    if (body.velocity.y < -20) {
      return false;
    }
    if (this.isDroppingThroughSlope(player, slope)) {
      return false;
    }

    const landingTile = this.getEditorTileAt(slope.tileX + highDir, slope.tileY);
    if (!this.isSlopeLandingTile(landingTile)) {
      return false;
    }

    const footX = body.x + body.width / 2;
    const highEdgeX = highDir > 0 ? slope.x + slope.size : slope.x;
    const distanceToEdge = highDir > 0 ? highEdgeX - footX : footX - highEdgeX;
    const blockedTowardLanding = highDir > 0 ? body.blocked.right : body.blocked.left;
    const maxDistance = blockedTowardLanding
      ? Math.max(10, body.width * 0.7)
      : Math.max(5, body.width * 0.38);

    if (distanceToEdge < -4 || distanceToEdge > maxDistance) {
      return false;
    }

    const landingTop = slope.y;
    const footY = body.y + body.height;
    if (footY < landingTop - 4 || footY > landingTop + slope.size) {
      return false;
    }

    this.snapPlayerBodyTo(player, body.x, landingTop - body.height);
    body.setVelocityY(0);
    body.touching.down = true;
    body.blocked.down = true;
    body.blocked.left = false;
    body.blocked.right = false;
    player.onSlope = false;
    player.currentSlope = null;
    player.onThinPlatform = false;
    player.currentThinPlatform = null;
    player.currentThinSlope = null;
    player.lastSlopeGroundedAt = this.time.now;
    return true;
  }

  resolveCeilingSlopeContact(player) {
    if (!this.slopeTiles.length || player.climbing) {
      return false;
    }

    const body = player.sprite.body;
    const headX = body.x + body.width / 2;
    const headY = body.y;
    const tileSize = this.editorLevel?.tileSize ?? 24;
    const tileX = Math.floor(headX / tileSize);
    const tileY = Math.floor((headY - 3) / tileSize);
    let bestSurface = -Infinity;
    let hitCeiling = false;

    for (let y = tileY - 1; y <= tileY + 1; y += 1) {
      for (let x = tileX - 1; x <= tileX + 1; x += 1) {
        const slope = this.slopeTileMap.get(`${x},${y}`);
        if (!slope || slope.side !== 'ceiling') {
          continue;
        }
        if (headX < slope.x - 2 || headX > slope.x + slope.size + 2) {
          continue;
        }

        const localX = Phaser.Math.Clamp(headX - slope.x, 0, slope.size);
        const surfaceY = slope.type === 'up'
          ? slope.y + slope.size - localX
          : slope.y + localX;
        const tolerance = body.velocity.y <= 20 ? 16 : 5;
        const bodyOverlapsTile = body.y + body.height > slope.y && body.y < slope.y + slope.size;
        if (bodyOverlapsTile && headY <= surfaceY + tolerance && surfaceY > bestSurface) {
          bestSurface = surfaceY;
          hitCeiling = true;
        }
      }
    }

    if (!hitCeiling) {
      return false;
    }

    this.setPlayerBodyTop(player, bestSurface);
    if (body.velocity.y < 0) {
      body.setVelocityY(0);
    }
    body.touching.up = true;
    body.blocked.up = true;
    return true;
  }

  updatePlayer(player, time, delta) {
    const body = player.sprite.body;
    this.clearCompletedPlatformDrop(player, time);
    this.resolveCeilingSlopeContact(player);
    const slopeGrounded = this.resolveSlopeContact(player);
    const slopeBridgeGrounded = !slopeGrounded && this.resolveSlopeLandingBridge(player);
    const solidGrounded = !slopeGrounded && !slopeBridgeGrounded && this.resolveSolidFloorContact(player);
    const headGrounded =
      !slopeGrounded &&
      !slopeBridgeGrounded &&
      !solidGrounded &&
      this.resolvePlayerHeadContact(player, time);
    const grounded =
      body.blocked.down ||
      body.touching.down ||
      slopeGrounded ||
      slopeBridgeGrounded ||
      solidGrounded ||
      headGrounded;
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

    if (time < player.doorExitUntil) {
      this.updateDoorExit(player, grounded, time);
      return;
    }

    if (input.pressed.jump) {
      player.jumpBufferUntil = time + JUMP_BUFFER_MS;
    }

    player.currentPickup = this.findNearbyPickup(player);
    this.tryAutoPickup(player, time);
    if (!grounded) {
      player.onThinPlatform = false;
      player.currentThinPlatform = null;
      player.currentThinSlope = null;
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

    if (time < player.rollUntil) {
      this.endShootStance(player);
      player.crouching = false;
      body.setAllowGravity(true);
      this.applyBodyPose(player, grounded);
      player.sprite.setVelocityX(player.rollDirection * ROLL_SPEED);
      this.updateJumpPhysics(player, grounded, input, time);
      this.updatePlayerAnimation(player, grounded, player.rollDirection, time);
      this.updateAimVisuals(player);
      return;
    }

    player.sprite.setAngle(0);
    player.sprite.setAlpha(time < player.invulnerableUntil && Math.floor(time / 80) % 2 === 0 ? 0.42 : 1);

    if (input.pressed.powerup) {
      this.activatePowerup(player, time);
    }

    if (input.pressed.pickup) {
      this.handlePickupPressed(player, time);
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
      if (player.climbing) {
        player.crouching = false;
        body.setAllowGravity(false);
        body.setVelocity(0, 0);
        if (input.pressed.jump) {
          this.endShootStance(player);
          this.startJump(player, time);
          if (horizontal !== 0) {
            player.sprite.setVelocityX(horizontal * this.getMoveSpeed(player, time));
          }
          this.updatePlayerAnimation(player, false, horizontal, time);
          this.updateAimVisuals(player);
          return;
        }
        this.updateAim(player, 0, vertical, delta);
        if (
          (player.aimMode === 'gun' && input.released.shoot) ||
          (player.aimMode === 'grenade' && input.released.grenade)
        ) {
          this.releaseAim(player, time);
        }
        this.updatePlayerAnimation(player, true, 0, time);
        this.updateAimVisuals(player);
        return;
      }
      this.updateCrouchState(player, grounded, false, time);
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

    const ladder = this.getIntersectingLadder(player) ?? this.getLadderUnderPlayer(player) ?? player.currentLadder;
    if (player.climbing || (ladder && vertical !== 0)) {
      if (!player.climbing) {
        this.startLadderClimb(player, ladder, vertical, time);
      }
      if (input.pressed.melee) {
        this.handleMeleePressed(player, time);
      }
      this.resetJumpState(player);
      this.updateClimbing(player, ladder, vertical, horizontal, time, input);
      this.updatePlayerAnimation(player, true, horizontal, time);
      this.updateAimVisuals(player);
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

    if (input.pressed.crouch && grounded && horizontal !== 0) {
      this.startRoll(player, time, horizontal);
      this.updatePlayerAnimation(player, grounded, horizontal, time);
      this.updateAimVisuals(player);
      return;
    }

    if (input.pressed.crouch && this.tryStartPlatformDrop(player, grounded, time)) {
      player.lastTapDownAt = -Infinity;
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

    const slopeLandingGrounded = this.assistSlopeLanding(player, horizontal);

    if (
      time <= player.jumpBufferUntil &&
      grounded &&
      !player.crouching &&
      time >= player.dropUntil &&
      body.velocity.y >= -20
    ) {
      this.startJump(player, time);
    }

    this.updateJumpPhysics(player, grounded || slopeLandingGrounded, input, time);

    if (input.pressed.melee) {
      this.handleMeleePressed(player, time);
    }

    this.updatePlayerAnimation(player, grounded || slopeLandingGrounded, horizontal, time);
    this.updateAimVisuals(player);
  }

  updateDoorExit(player, grounded, time) {
    const direction = player.doorExitDirection || player.facing || 1;
    const reachedTarget = direction > 0
      ? player.sprite.x >= player.doorExitTargetX
      : player.sprite.x <= player.doorExitTargetX;

    player.aiming = false;
    player.aimMode = null;
    player.climbing = false;
    player.crouching = false;
    player.facing = direction;
    player.sprite.setFlipX(direction < 0);
    player.sprite.body.setAllowGravity(true);
    this.applyBodyPose(player, grounded);

    if (reachedTarget || time >= player.doorExitUntil - 16) {
      player.doorExitUntil = 0;
      player.doorExitDirection = 0;
      player.doorExitTargetX = 0;
      if (grounded) {
        player.sprite.setVelocityX(0);
      }
      this.updatePlayerAnimation(player, grounded, 0, time);
      this.updateAimVisuals(player);
      return;
    }

    player.sprite.setVelocityX(direction * Math.max(90, this.configData.movement.walkSpeed * 0.55));
    this.updatePlayerAnimation(player, grounded, direction, time);
    this.updateAimVisuals(player);
  }

  updateKnockedPlayer(player) {
    player.aiming = false;
    this.endShootStance(player);
    this.clearLadderState(player);
    player.sprite.body.setAllowGravity(true);
    player.sprite.setAngle(player.facing > 0 ? 82 : -82);
    player.sprite.play('girl-crouch', true);
    player.sprite.setVelocityX(player.sprite.body.velocity.x * 0.96);
  }

  tryStartPlatformDrop(player, grounded, time) {
    if (!grounded || time < player.dropUntil) {
      return false;
    }

    const targetPlatform = player.currentThinPlatform?.active
      ? player.currentThinPlatform
      : this.findThinPlatformUnderPlayer(player);
    const targetSlope = targetPlatform
      ? null
      : player.currentThinSlope ?? (player.currentSlope?.thin ? player.currentSlope : null);
    if (!targetPlatform && !targetSlope) {
      return false;
    }

    player.onThinPlatform = true;
    player.currentThinPlatform = targetPlatform;
    player.currentThinSlope = targetSlope;

    const isDoubleTap = time - player.lastTapDownAt <= DOWN_DOUBLE_TAP_MS;
    player.lastTapDownAt = time;
    if (!isDoubleTap) {
      return false;
    }

    player.dropUntil = time + DROP_DURATION;
    player.dropThroughPlatform = targetPlatform;
    player.dropThroughSlope = targetSlope;
    player.sprite.setVelocityY(110);
    player.onThinPlatform = false;
    player.currentThinPlatform = null;
    player.currentThinSlope = null;
    return true;
  }

  clearCompletedPlatformDrop(player, time) {
    const body = player?.sprite?.body;
    let clearPlatform = false;
    let clearSlope = false;

    if (player.dropThroughPlatform) {
      const platformBody = player.dropThroughPlatform.body;
      clearPlatform = !body || !platformBody || time >= player.dropUntil || body.y > platformBody.y + 2;
    }

    if (player.dropThroughSlope) {
      clearSlope = !body || time >= player.dropUntil || body.y > player.dropThroughSlope.y + player.dropThroughSlope.size - 2;
    }

    if (clearPlatform) {
      player.dropThroughPlatform = null;
    }
    if (clearSlope) {
      player.dropThroughSlope = null;
    }
    if (!player.dropThroughPlatform && !player.dropThroughSlope && (clearPlatform || clearSlope || time >= player.dropUntil)) {
      player.dropUntil = 0;
    }
  }

  findThinPlatformUnderPlayer(player) {
    const body = player?.sprite?.body;
    if (!body) {
      return null;
    }

    const playerBottom = body.y + body.height;
    for (const platform of this.platforms) {
      if (!platform.active || !platform.getData('thin') || !platform.body) {
        continue;
      }
      const platformBody = platform.body;
      const overlapsX = body.x + body.width > platformBody.x + 1 && body.x < platformBody.x + platformBody.width - 1;
      const closeToTop = playerBottom >= platformBody.y - 2 && playerBottom <= platformBody.y + 16;
      if (overlapsX && closeToTop) {
        return platform;
      }
    }
    return null;
  }

  startJump(player, time) {
    this.clearLadderState(player);
    player.sprite.body.setAllowGravity(true);
    player.sprite.setVelocityY(-this.configData.movement.jumpSpeed);
    player.sprite.body.touching.down = false;
    player.sprite.body.blocked.down = false;
    player.jumpBufferUntil = 0;
    player.headSupportUntil = 0;
    player.headSupportPlayerId = null;
    player.jumpHeldUntil = time + this.configData.movement.jumpHoldMs;
    player.jumpReleased = false;
    const animationName = player.weapon ? 'jumpPrepGun' : 'jumpPrep';
    player.jumpPrepUntil = time + this.getAnimationDurationMs(animationName);
    player.jumpLandUntil = 0;
    player.onThinPlatform = false;
    player.currentThinPlatform = null;
    player.currentThinSlope = null;
    player.dropThroughPlatform = null;
    player.dropThroughSlope = null;
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
    player.ladderGunDrawUntil = 0;
    player.grenadeCookStartedAt = 0;
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
      roll: 'girl-roll',
      rollEnd: 'girl-roll-end',
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
      climbLadderBegin: 'girl-climb-ladder-begin',
      climbLadder: 'girl-climb-ladder',
      climbLadderEnd: 'girl-climb-ladder-end',
      ladderGunDraw: 'girl-ladder-gun-draw',
      ladderGunHold: 'girl-ladder-gun-hold',
      ladderGun: 'girl-ladder-gun-hold',
      ladderMelee: 'girl-ladder-melee',
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

  clearLadderState(player) {
    player.climbing = false;
    player.currentLadder = null;
    player.climbIntroUntil = 0;
    player.climbEndUntil = 0;
    player.ladderGunDrawUntil = 0;
    player.ladderEndFootY = 0;
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

    if (player.climbing) {
      if (time < player.meleeAnimationUntil && player.meleeAnimationKey) {
        this.continueOneShotAnimation(sprite, player.meleeAnimationKey);
        return;
      }
      if (player.aiming && player.aimMode === 'gun' && time < player.ladderGunDrawUntil) {
        this.continueOneShotAnimation(sprite, this.getPlayerAnimationKey('ladderGunDraw'));
        return;
      }
      if ((player.aiming || this.isInShootStance(player, time)) && player.aimMode === 'gun') {
        sprite.play(this.getPlayerAnimationKey('ladderGunHold'), true);
        return;
      }
      if (time < player.climbIntroUntil) {
        this.continueOneShotAnimation(sprite, this.getPlayerAnimationKey('climbLadderBegin'));
        return;
      }
      if (time < player.climbEndUntil) {
        this.continueOneShotAnimation(sprite, this.getPlayerAnimationKey('climbLadderEnd'));
        return;
      }
      if (Math.abs(sprite.body.velocity.y) > 8 || horizontal !== 0) {
        sprite.anims.resume();
        sprite.play(this.getPlayerAnimationKey('climbLadder'), true);
      } else if (sprite.anims.currentAnim?.key !== this.getPlayerAnimationKey('climbLadder')) {
        sprite.play(this.getPlayerAnimationKey('climbLadder'), true);
        sprite.anims.pause();
      } else {
        sprite.anims.pause();
      }
      return;
    }

    if (time < player.rollUntil) {
      this.continueOneShotAnimation(sprite, time < player.rollEndAt ? 'girl-roll' : 'girl-roll-end');
      return;
    }

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
    player.grenadeCookStartedAt = mode === 'grenade' ? time : 0;
    if (player.climbing && mode === 'gun') {
      player.ladderGunDrawUntil = time + this.getAnimationDurationMs('ladderGunDraw');
      player.sprite.play(this.getPlayerAnimationKey('ladderGunDraw'));
    } else {
      player.ladderGunDrawUntil = 0;
    }
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
    if (!visible) {
      player.arm.setVisible(false);
    }
    player.weaponSprite.setVisible(visible && player.aimMode === 'gun' && Boolean(player.weapon));
    player.crosshair.setVisible(visible);
    player.aimGraphics.setVisible(visible);
    if (!visible) {
      player.aimGraphics.clear();
      this.clearGrenadeCookText(player);
    }
  }

  updateAimVisuals(player) {
    const aimVisualActive = player.aiming || this.isInShootStance(player, this.time.now);
    const heldGunVisible = Boolean(player.weapon) && (aimVisualActive || this.isGunCarryAnimation(player));
    const visualFacing = aimVisualActive ? player.aimFacing : player.facing;
    const visualAngle = aimVisualActive ? player.aimAngle : visualFacing > 0 ? 0 : Math.PI;
    const carryAnchor = this.getAimAnchor(player, visualAngle, visualFacing);
    const direction = new Phaser.Math.Vector2(Math.cos(visualAngle), Math.sin(visualAngle));
    const reticle = this.getAimReticlePosition(player, visualAngle);
    const armOverlayVisible = heldGunVisible && this.shouldShowGunArmOverlay(player, aimVisualActive);

    player.weaponSprite.setTexture(player.weapon ? `weapon-${player.weapon.id}` : 'weapon-pistol');
    player.weaponSprite.setPosition(carryAnchor.x, carryAnchor.y);
    player.weaponSprite.setRotation(visualAngle);
    player.weaponSprite.setFlipY(visualFacing < 0);
    player.weaponSprite.setVisible(heldGunVisible);
    this.updateGunArmOverlay(player, armOverlayVisible, visualFacing, visualAngle, aimVisualActive);
    player.crosshair.setPosition(reticle.x, reticle.y);
    player.crosshair.setVisible(aimVisualActive);
    player.aimGraphics.setVisible(aimVisualActive);

    player.aimGraphics.clear();
    if (!aimVisualActive) {
      return;
    }

    const currentWeapon = player.weapon ? this.configData.weapons[player.weapon.id] : null;
    if (player.aimMode === 'gun' && currentWeapon) {
      const muzzle = this.getBulletOrigin(player);
      player.aimGraphics.lineStyle(1, this.getLaserColor(player), 0.78);
      player.aimGraphics.lineBetween(muzzle.x, muzzle.y, muzzle.x + direction.x * 900, muzzle.y + direction.y * 900);
    }

    if (player.aimMode === 'grenade') {
      this.drawGrenadeArc(player, this.getGrenadeOrigin(player), direction);
      this.updateGrenadeCookText(player);
    }
  }

  getLaserColor(player) {
    return player.id === 'p1' ? 0x53d7ff : 0xff5ec7;
  }

  shouldShowGunArmOverlay(player, aimVisualActive) {
    if (!player.weapon) {
      return false;
    }
    if (player.climbing && this.time.now < player.ladderGunDrawUntil) {
      return false;
    }

    const key = player.sprite.anims.currentAnim?.key;
    return (
      aimVisualActive ||
      [
        'girl-aim',
        'girl-idle-gun',
        'girl-run-gun',
        'girl-crouch-down-gun',
        'girl-crouch',
        'girl-stand-up-gun',
        'girl-jump-prep-gun',
        'girl-jump-up-gun',
        'girl-jump-peak-gun',
        'girl-jump-down-gun',
        'girl-jump-land-gun',
        'girl-ladder-gun-hold',
      ].includes(key)
    );
  }

  updateGunArmOverlay(player, visible, facing, angle = facing > 0 ? 0 : Math.PI, aimVisualActive = false) {
    if (!visible) {
      player.arm.setVisible(false);
      return;
    }

    const bodyFrame = getEmpressFrameNumber(player.sprite.texture.key);
    const armFrame = getGunArmOverlayFrame(bodyFrame);
    const offset = this.getAimOffsetFromAngle(angle, facing);
    const rotation = aimVisualActive ? offset : 0;
    const pivot = this.getAimPivot(player);
    const textureSize = CHARACTER_SHEET.frameSize + getCharacterCanvasPadding() * 2;
    const relativePivotX = (pivot.x - player.sprite.x) / PLAYER_SCALE;
    const relativePivotY = (pivot.y - player.sprite.y) / PLAYER_SCALE;
    const originX = Phaser.Math.Clamp(
      (textureSize / 2 + (facing < 0 ? -relativePivotX : relativePivotX)) / textureSize,
      0,
      1,
    );
    const originY = Phaser.Math.Clamp((textureSize / 2 + relativePivotY) / textureSize, 0, 1);

    player.arm.stop();
    player.arm
      .setTexture(this.getCharacterTextureKey(armFrame))
      .setOrigin(originX, originY)
      .setPosition(pivot.x, pivot.y)
      .setScale(PLAYER_SCALE)
      .setFlipX(facing < 0)
      .setRotation(rotation)
      .setVisible(true);
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
      'girl-ladder-gun-hold',
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

  getAimAnchor(player, angle = player.aimAngle, facing = player.aimFacing || player.facing || (Math.cos(angle) >= 0 ? 1 : -1)) {
    const direction = facing >= 0 ? 1 : -1;
    const hand = this.getCharacterHandPoint(player, direction);
    const handX = direction > 0
      ? hand.x
      : CHARACTER_SHEET.frameSize - hand.x;
    const baseX = player.sprite.x + (handX - CHARACTER_SHEET.frameSize / 2) * PLAYER_SCALE;
    const baseY = player.sprite.y + (hand.y - CHARACTER_SHEET.frameSize / 2) * PLAYER_SCALE;
    const pivot = this.getAimPivot(player);
    const baseAngle = direction >= 0 ? 0 : Math.PI;
    const offset = Math.atan2(Math.sin(angle - baseAngle), Math.cos(angle - baseAngle));
    const cos = Math.cos(offset);
    const sin = Math.sin(offset);
    const dx = baseX - pivot.x;
    const dy = baseY - pivot.y;
    return {
      x: pivot.x + dx * cos - dy * sin,
      y: pivot.y + dx * sin + dy * cos,
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
      const y = shoulder.y + (direction.y * speed - (this.configData.grenades.throwLift ?? 0)) * t + 0.5 * gravity * t * t;
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
    return this.getMuzzleOrigin(player, player.aimAngle, player.aimFacing || player.facing);
  }

  getMuzzleOrigin(player, angle = player.aimAngle, facing = player.aimFacing || player.facing) {
    const anchor = this.getAimAnchor(player, angle, facing);
    const offset = this.configData.visuals.gunMuzzleOffset ?? 28;
    const muzzle = {
      x: anchor.x + Math.cos(angle) * offset,
      y: anchor.y + Math.sin(angle) * offset,
    };
    return this.getClearProjectileOrigin(anchor, muzzle);
  }

  getClearProjectileOrigin(anchor, target) {
    if (!this.pointInsideSolidWall(target.x, target.y)) {
      return target;
    }

    for (let step = 0.85; step >= 0; step -= 0.15) {
      const candidate = {
        x: Phaser.Math.Linear(anchor.x, target.x, step),
        y: Phaser.Math.Linear(anchor.y, target.y, step),
      };
      if (!this.pointInsideSolidWall(candidate.x, candidate.y)) {
        return candidate;
      }
    }

    return anchor;
  }

  pointInsideSolidWall(x, y) {
    return this.platforms.some((platform) => {
      if (!platform?.active || platform.getData?.('thin')) {
        return false;
      }
      const body = platform.body;
      if (!body) {
        return false;
      }
      return x >= body.x && x <= body.x + body.width && y >= body.y && y <= body.y + body.height;
    });
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
    bullet.setData('previousX', originX);
    bullet.setData('previousY', originY);

    return bullet;
  }

  updateBullets() {
    if (!this.bullets) {
      return;
    }

    const margin = 240;
    const minX = -margin;
    const minY = -margin;
    const maxX = this.worldWidth + margin;
    const maxY = this.worldHeight + margin;
    for (const bullet of this.bullets.getChildren()) {
      if (!bullet?.active) {
        continue;
      }
      const wall = this.findBulletSegmentWallHit(bullet);
      if (wall) {
        this.handleBulletWall(bullet, wall);
        continue;
      }
      if (bullet.x < minX || bullet.x > maxX || bullet.y < minY || bullet.y > maxY) {
        bullet.destroy();
        continue;
      }
      bullet.setData('previousX', bullet.x);
      bullet.setData('previousY', bullet.y);
    }
  }

  findBulletSegmentWallHit(bullet) {
    const previousX = bullet.getData('previousX');
    const previousY = bullet.getData('previousY');
    if (!Number.isFinite(previousX) || !Number.isFinite(previousY)) {
      return null;
    }

    const line = new Phaser.Geom.Line(previousX, previousY, bullet.x, bullet.y);
    for (const platform of this.platforms) {
      if (!platform?.active || platform.getData?.('thin')) {
        continue;
      }
      const body = platform.body;
      if (!body) {
        continue;
      }
      const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      if (
        rect.contains(previousX, previousY) ||
        rect.contains(bullet.x, bullet.y) ||
        Phaser.Geom.Intersects.LineToRectangle(line, rect)
      ) {
        return platform;
      }
    }
    return null;
  }

  throwAimedGrenade(player, time) {
    if (player.grenadeAmmo <= 0 || time < player.nextGrenadeAt) {
      return;
    }

    player.nextGrenadeAt = time + 500;
    player.grenadeAmmo -= 1;

    const cookedMs = Math.max(0, time - (player.grenadeCookStartedAt || time));
    const remainingFuseMs = Math.max(120, this.configData.grenades.fuseMs - cookedMs);
    const direction = new Phaser.Math.Vector2(Math.cos(player.aimAngle), Math.sin(player.aimAngle));
    const origin = this.getGrenadeOrigin(player);
    const grenade = this.physics.add
      .image(origin.x, origin.y, 'grenade-pixel')
      .setDepth(9);
    this.grenades.add(grenade);
    grenade.setBounce(this.configData.grenades.bounce);
    grenade.setDragX(this.configData.grenades.dragX ?? 170);
    grenade.body.setCircle(7);
    grenade.body.setVelocity(
      direction.x * this.configData.grenades.throwSpeed,
      direction.y * this.configData.grenades.throwSpeed - (this.configData.grenades.throwLift ?? 0),
    );
    grenade.body.setMaxVelocity(this.configData.grenades.throwSpeed * 1.15, 920);
    grenade.setData('owner', player.id);
    grenade.setData('fuseEnd', time + remainingFuseMs);
    grenade.setData('timerText', this.createGrenadeTimerText(grenade));

    player.grenadeCookStartedAt = 0;
    this.clearGrenadeCookText(player);

    this.time.delayedCall(remainingFuseMs, () => {
      if (grenade.active) {
        this.explodeGrenade(grenade, player.id);
      }
    });
  }

  getGrenadeOrigin(player) {
    return this.getAimAnchor(player, player.aimAngle, player.aimFacing || player.facing);
  }

  createGrenadeTimerText(grenade) {
    return this.add
      .text(grenade.x + 12, grenade.y - 20, '', {
        fontFamily: UI_FONT,
        fontSize: GRENADE_TIMER_FONT,
        color: '#ffffff',
        stroke: '#111827',
        strokeThickness: 3,
      })
      .setDepth(18)
      .setOrigin(0, 0.5);
  }

  clearGrenadeCookText(player) {
    player.grenadeCookText?.destroy?.();
    player.grenadeCookText = null;
  }

  updateGrenadeCookText(player) {
    if (player.aimMode !== 'grenade' || !player.grenadeCookStartedAt) {
      this.clearGrenadeCookText(player);
      return;
    }

    if (!player.grenadeCookText?.active) {
      player.grenadeCookText = this.add
        .text(0, 0, '', {
          fontFamily: UI_FONT,
          fontSize: GRENADE_TIMER_FONT,
          color: '#ffffff',
          stroke: '#111827',
          strokeThickness: 3,
        })
        .setDepth(18)
        .setOrigin(0, 0.5);
    }

    const origin = this.getGrenadeOrigin(player);
    const remainingSeconds = Math.max(0, (this.configData.grenades.fuseMs - (this.time.now - player.grenadeCookStartedAt)) / 1000);
    player.grenadeCookText
      .setPosition(origin.x + 12, origin.y - 20)
      .setText(remainingSeconds.toFixed(1));
  }

  updateGrenadeCooking(time) {
    for (const player of this.players) {
      if (player.aimMode !== 'grenade' || !player.aiming || !player.grenadeCookStartedAt) {
        continue;
      }
      if (time - player.grenadeCookStartedAt < this.configData.grenades.fuseMs) {
        continue;
      }

      const origin = this.getGrenadeOrigin(player);
      if (player.grenadeAmmo > 0) {
        player.grenadeAmmo -= 1;
      }
      player.nextGrenadeAt = time + 500;
      player.aiming = false;
      player.aimMode = null;
      player.grenadeCookStartedAt = 0;
      this.setAimVisible(player, false);
      this.explodeAt(origin.x, origin.y, this.configData.grenades.radius, this.configData.grenades.damage, player.id, true);
    }
  }

  updateGrenades(time, delta) {
    if (!this.grenades) {
      return;
    }

    const dt = Math.min(0.05, Math.max(0.001, delta / 1000));
    for (const grenade of this.grenades.getChildren()) {
      if (!grenade?.active) {
        continue;
      }

      this.resolveGrenadeSlopeContact(grenade);
      grenade.angle += (grenade.body?.velocity?.x ?? 0) * dt * 0.65;

      const timerText = grenade.getData('timerText');
      if (timerText?.active) {
        const remainingSeconds = Math.max(0, ((grenade.getData('fuseEnd') ?? time) - time) / 1000);
        timerText
          .setPosition(grenade.x + 12, grenade.y - 20)
          .setText(remainingSeconds.toFixed(1));
      }

      if (grenade.y > this.worldHeight + 900) {
        timerText?.destroy?.();
        grenade.destroy();
      }
    }
  }

  resolveGrenadeSlopeContact(grenade) {
    const body = grenade?.body;
    if (!body || !this.slopeTiles.length || body.velocity.y < -22) {
      return false;
    }

    const footY = body.y + body.height;
    const sampleXs = [
      body.x + body.width * 0.25,
      body.x + body.width * 0.5,
      body.x + body.width * 0.75,
    ];
    const tileSize = this.editorLevel?.tileSize ?? 24;
    const tileY = Math.floor((footY + 3) / tileSize);
    let bestSurface = Infinity;

    for (const sampleX of sampleXs) {
      const tileX = Math.floor(sampleX / tileSize);
      for (let y = tileY - 1; y <= tileY + 1; y += 1) {
        for (let x = tileX - 1; x <= tileX + 1; x += 1) {
          const slope = this.slopeTileMap.get(`${x},${y}`);
          if (!slope || slope.side !== 'floor' || slope.thin) {
            continue;
          }
          if (sampleX < slope.x - 2 || sampleX > slope.x + slope.size + 2) {
            continue;
          }
          const localX = Phaser.Math.Clamp(sampleX - slope.x, 0, slope.size);
          const surfaceY = slope.type === 'up'
            ? slope.y + slope.size - localX
            : slope.y + localX;
          if (footY >= surfaceY - 5 && footY <= surfaceY + Math.max(14, slope.size * 0.8) && surfaceY < bestSurface) {
            bestSurface = surfaceY;
          }
        }
      }
    }

    if (!Number.isFinite(bestSurface)) {
      return false;
    }

    this.setGrenadeBodyTop(grenade, bestSurface - body.height);
    if (body.velocity.y > 0) {
      body.setVelocityY(-Math.min(105, body.velocity.y * this.configData.grenades.bounce));
    }
    body.touching.down = true;
    body.blocked.down = true;
    body.updateCenter();
    return true;
  }

  setGrenadeBodyTop(grenade, topY) {
    const body = grenade.body;
    grenade.y = topY + body.height / 2;
    body.y = topY;
    body.prev.y = topY;
    body.prevFrame.y = topY;
    body.autoFrame.y = topY;
    body.updateCenter();
  }

  handleMeleePressed(player, time) {
    if (time < player.meleeAnimationUntil || time < player.pickupAnimationUntil) {
      return;
    }

    if (player.crouching) {
      this.handlePickupPressed(player, time);
      return;
    }

    if (player.climbing) {
      this.performMeleeCombo(player, time);
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

  handlePickupPressed(player, time) {
    if (time < player.meleeAnimationUntil || time < player.pickupAnimationUntil || this.isRemoteOnlineClient()) {
      return;
    }

    const pickup = player.currentPickup;
    if (!pickup?.active) {
      return;
    }

    if (this.canTakePickup(player, pickup)) {
      this.takePickup(player, pickup, time);
      return;
    }

    if (this.canSwapPickup(player, pickup)) {
      this.swapPickup(player, pickup, time);
    }
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
    const comboSetting = this.getMeleeComboAnimationSetting(animationName, comboNumber);
    const animationDuration = comboSetting
      ? Math.max(80, (comboSetting.frames.length / Math.max(1, comboSetting.fps)) * 1000)
      : this.getAnimationDurationMs(animationName);
    player.nextMeleeAt = time + Math.max(this.configData.melee.cooldownMs, animationDuration);
    player.comboResetAt = time + this.configData.melee.comboResetMs;
    player.comboIndex = (player.comboIndex + 1) % this.configData.melee.hits.length;
    this.startMeleeAnimation(player, animationName, time, animationDuration, hit, comboNumber);
  }

  getMeleeAnimationName(player) {
    if (player.climbing) {
      return 'ladderMelee';
    }
    if (!player.sprite.body.blocked.down && !player.sprite.body.touching.down) {
      return 'jumpMelee';
    }
    return 'melee';
  }

  startMeleeAnimation(player, animationName, time, duration, hit = this.configData.melee.hits[0], comboNumber = 1) {
    const comboSetting = this.getMeleeComboAnimationSetting(animationName, comboNumber);
    const keyByAnimation = {
      melee: 'girl-melee',
      crouchMelee: 'girl-crouch-melee',
      jumpMelee: 'girl-jump-melee',
      ladderMelee: 'girl-ladder-melee',
    };
    const animationKey = comboSetting?.key ?? keyByAnimation[animationName] ?? 'girl-melee';
    player.meleeAnimationKey = animationKey;
    player.meleeAnimationUntil = time + duration;
    player.meleeAttackId += 1;
    player.meleeAttackState = {
      id: player.meleeAttackId,
      animationName,
      hit,
      comboNumber,
      activeDelayMs: comboSetting?.activeDelayMs,
      hitTargets: new Set(),
      environmentHitApplied: false,
    };
    player.sprite.play(animationKey);
    this.scheduleMeleeActiveFrames(player, player.meleeAttackState);
  }

  getMeleeComboAnimationSetting(animationName, comboNumber) {
    const combos = MELEE_COMBO_ANIMATIONS[animationName];
    if (!combos?.length) {
      return null;
    }
    return combos[Phaser.Math.Clamp(comboNumber - 1, 0, combos.length - 1)] ?? null;
  }

  scheduleMeleeActiveFrames(player, attackState) {
    if (Number.isFinite(attackState.activeDelayMs)) {
      this.time.delayedCall(attackState.activeDelayMs, () => this.resolveMeleeActiveFrame(player, attackState.id));
      return;
    }

    const setting = this.animationConfig?.[attackState.animationName];
    const active = MELEE_ACTIVE_FRAMES[attackState.animationName];
    if (!setting || !active) {
      this.time.delayedCall(0, () => this.resolveMeleeActiveFrame(player, attackState.id));
      return;
    }

    const frames = makeFrameList1Based(setting, this.animationFrameCount ?? 1);
    const frameMs = 1000 / Math.max(1, setting.fps);
    let scheduled = 0;
    frames.forEach((frame, index) => {
      if (frame < active.start || frame > active.end) {
        return;
      }
      scheduled += 1;
      this.time.delayedCall(index * frameMs, () => this.resolveMeleeActiveFrame(player, attackState.id));
    });

    if (scheduled === 0) {
      this.time.delayedCall(Math.min(120, frameMs), () => this.resolveMeleeActiveFrame(player, attackState.id));
    }
  }

  resolveMeleeActiveFrame(player, attackId) {
    const attack = player.meleeAttackState;
    if (!attack || attack.id !== attackId || this.time.now > player.meleeAnimationUntil || !player.sprite.active) {
      return;
    }

    const hit = attack.hit;
    const pivot = this.getAimPivot(player);
    const centerX = pivot.x + player.facing * 34;
    const centerY = pivot.y;
    this.flashHitbox(centerX, centerY, this.configData.melee.hitboxWidth, this.configData.melee.hitboxHeight, player.facing, 0xffffff, 0.2);

    if (!attack.environmentHitApplied) {
      this.breakWindowsInBox(centerX, centerY, this.configData.melee.hitboxWidth, this.configData.melee.hitboxHeight, hit.damage);
      this.damagePropsInBox(centerX, centerY, this.configData.melee.hitboxWidth, this.configData.melee.hitboxHeight, hit.damage, player.id);
      attack.environmentHitApplied = true;
    }

    const opponent = this.getOpponent(player);
    if (!opponent?.sprite?.active || attack.hitTargets.has(opponent.id) || this.time.now < opponent.knockedUntil) {
      return;
    }

    if (this.isTargetInBox(opponent.sprite, centerX, centerY, this.configData.melee.hitboxWidth, this.configData.melee.hitboxHeight)) {
      attack.hitTargets.add(opponent.id);
      this.damagePlayer(opponent, hit.damage, player.facing, hit.knockbackX, hit.knockbackY, {
        source: `${player.label} combo ${attack.comboNumber}`,
      });
    }
  }

  startPickupAnimation(player, time) {
    player.pickupAnimationUntil = time + this.getAnimationDurationMs('pickup');
    player.crouchTransitionUntil = 0;
    player.standTransitionUntil = 0;
    player.meleeAnimationUntil = 0;
    player.sprite.setVelocityX(0);
    player.sprite.play('girl-pickup');
  }

  startRoll(player, time, direction) {
    const rollDirection = direction || player.facing || 1;
    const rollMs = this.getAnimationDurationMs('roll');
    const rollEndMs = this.getAnimationDurationMs('rollEnd');
    player.rollDirection = rollDirection;
    player.rollEndAt = time + rollMs;
    player.rollUntil = time + rollMs + rollEndMs;
    player.invulnerableUntil = Math.max(player.invulnerableUntil, time + ROLL_INVULNERABLE_MS);
    player.crouching = false;
    player.crouchTransitionUntil = 0;
    player.standTransitionUntil = 0;
    player.meleeAnimationUntil = 0;
    player.onFireUntil = 0;
    player.nextFireDamageAt = 0;
    player.fireOwnerId = null;
    player.fireEffect?.destroy?.();
    player.fireEffect = null;
    player.facing = rollDirection;
    player.sprite.setFlipX(rollDirection < 0);
    player.sprite.setVelocityX(rollDirection * ROLL_SPEED);
    player.sprite.play('girl-roll');
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
      this.damagePropsInBox(centerX, centerY, 70, 48, this.configData.melee.dashDamage, player.id);

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

  startLadderClimb(player, ladder, vertical, time) {
    if (!ladder) {
      return;
    }
    player.climbing = true;
    player.currentLadder = ladder;
    player.crouching = false;
    player.crouchTransitionUntil = 0;
    player.standTransitionUntil = 0;
    player.sprite.body.setAllowGravity(false);
    player.sprite.setVelocity(0, 0);
    this.applyBodyPose(player, true);

    if (vertical > 0 && (player.sprite.body.blocked.down || player.sprite.body.touching.down)) {
      player.dropThroughPlatform = player.currentThinPlatform?.active
        ? player.currentThinPlatform
        : this.findThinPlatformUnderPlayer(player);
      player.dropThroughSlope = player.currentThinSlope ?? (player.currentSlope?.thin ? player.currentSlope : null);
      player.dropUntil = time + DROP_DURATION;
      player.climbIntroUntil = time + this.getAnimationDurationMs('climbLadderBegin');
      player.sprite.setVelocityY(this.configData.movement.climbSpeed * 0.38);
      player.sprite.play(this.getPlayerAnimationKey('climbLadderBegin'));
    } else {
      player.climbIntroUntil = 0;
    }
    this.updateAimVisuals(player);
  }

  startLadderEnd(player, ladder, time) {
    const bounds = ladder?.getData('bounds');
    const body = player.sprite.body;
    const targetFootY = bounds ? bounds.y + 2 : body.y + body.height;
    player.currentLadder = ladder;
    player.climbIntroUntil = 0;
    player.climbEndUntil = time + this.getAnimationDurationMs('climbLadderEnd');
    player.ladderEndFootY = targetFootY;
    player.sprite.setVelocity(0, 0);
    body.setAllowGravity(false);
    this.applyBodyPose(player, true);
    this.snapPlayerBodyTo(player, body.x, targetFootY + LADDER_END_VISUAL_DROP - body.height);
    player.sprite.play(this.getPlayerAnimationKey('climbLadderEnd'));
    this.updateAimVisuals(player);
  }

  finishLadderEnd(player) {
    const body = player.sprite.body;
    const footY = player.ladderEndFootY || body.y + body.height;
    this.clearLadderState(player);
    player.crouching = false;
    player.wasGrounded = true;
    body.setAllowGravity(true);
    this.applyBodyPose(player, true);
    this.snapPlayerBodyTo(player, body.x, footY - body.height);
    player.sprite.setVelocity(0, 0);
  }

  updateClimbing(player, ladder, vertical, horizontal, time, input) {
    if (player.climbEndUntil > 0) {
      if (time < player.climbEndUntil) {
        player.sprite.body.setAllowGravity(false);
        player.sprite.setVelocity(0, 0);
        return;
      }
      this.finishLadderEnd(player);
      return;
    }

    if (!ladder) {
      this.clearLadderState(player);
      player.sprite.body.setAllowGravity(true);
      return;
    }

    player.currentLadder = ladder;
    player.sprite.body.setAllowGravity(false);

    if (input.pressed.jump) {
      this.endShootStance(player);
      this.startJump(player, time);
      if (horizontal !== 0) {
        player.sprite.setVelocityX(horizontal * this.getMoveSpeed(player, time));
      }
      return;
    }

    if (time < player.climbIntroUntil) {
      player.sprite.setVelocityX(0);
      player.sprite.setVelocityY(this.configData.movement.climbSpeed * 0.38);
      return;
    }
    player.climbIntroUntil = 0;

    if (time < player.meleeAnimationUntil || player.aiming) {
      player.sprite.setVelocity(0, 0);
      return;
    }

    const bounds = ladder.getData('bounds');
    const body = player.sprite.body;
    if (horizontal !== 0 && this.shouldExitLadderSide(player, bounds, horizontal)) {
      this.exitLadderSide(player, horizontal, time);
      return;
    }

    if (vertical < 0 && bounds && body.y + body.height <= bounds.y + 10) {
      this.startLadderEnd(player, ladder, time);
      return;
    }

    if (vertical > 0 && bounds && body.y > bounds.bottom + 4) {
      this.clearLadderState(player);
      player.sprite.body.setAllowGravity(true);
      return;
    }

    player.sprite.setVelocityY(vertical * this.configData.movement.climbSpeed);
    if (horizontal !== 0) {
      player.sprite.setVelocityX(horizontal * this.configData.movement.walkSpeed * 0.45);
      player.facing = horizontal;
      player.sprite.setFlipX(horizontal < 0);
    } else {
      player.sprite.setVelocityX(0);
    }

    if (time < player.slowedUntil) {
      player.sprite.setVelocityY(player.sprite.body.velocity.y * this.configData.powerups.slowmo.slowMultiplier);
    }
  }

  shouldExitLadderSide(player, bounds, horizontal) {
    const body = player?.sprite?.body;
    if (!body || !bounds || horizontal === 0) {
      return false;
    }

    const centerX = body.x + body.width / 2;
    const edgeBuffer = Math.max(3, body.width * 0.12);
    return horizontal > 0
      ? centerX >= bounds.right + edgeBuffer
      : centerX <= bounds.left - edgeBuffer;
  }

  exitLadderSide(player, horizontal, time) {
    this.clearLadderState(player);
    player.sprite.body.setAllowGravity(true);
    player.facing = horizontal;
    player.sprite.setFlipX(horizontal < 0);
    player.sprite.setVelocityX(horizontal * this.getMoveSpeed(player, time));
    player.sprite.setVelocityY(Math.max(player.sprite.body.velocity.y, 0));
  }

  getIntersectingLadder(player) {
    const playerBounds = getBodyBounds(player.sprite);
    return this.ladders.find((ladder) => Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, ladder.getData('bounds'))) ?? null;
  }

  getLadderUnderPlayer(player) {
    const body = player?.sprite?.body;
    if (!body) {
      return null;
    }
    const footY = body.y + body.height;
    const centerX = body.x + body.width / 2;
    return this.ladders.find((ladder) => {
      const bounds = ladder.getData('bounds');
      return (
        centerX >= bounds.x - 4 &&
        centerX <= bounds.right + 4 &&
        footY >= bounds.y - 10 &&
        footY <= bounds.y + 18
      );
    }) ?? null;
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
    return Boolean(
      bullet?.active &&
      player &&
      bullet.getData('owner') !== player.id &&
      this.time.now >= player.rollUntil,
    );
  }

  bulletWallProcess(objectA, objectB) {
    const bullet = this.getCollisionObjectFromGroup(this.bullets, objectA, objectB, 'weaponId');
    const wall = bullet === objectA ? objectB : objectA;
    if (!bullet?.active || !wall?.active) {
      return false;
    }
    return wall.getData?.('thin') !== true;
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
    const wall = bullet === objectA ? objectB : objectA;
    if (!bullet?.active) {
      return;
    }

    this.spawnHitEffect(bullet.x, bullet.y, bullet.getData('hitColor') ?? 0xfff3a3);
    if (wall?.getData?.('destructible')) {
      this.damageLevelProp(wall, bullet.getData('damage') ?? 8, bullet.getData('owner'), bullet.x, bullet.y);
    }
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
    grenade.getData('timerText')?.destroy?.();
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
    this.damagePropsInRadius(x, y, radius, damage, ownerId);

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
    player.currentThinPlatform = null;
    player.currentThinSlope = null;
    player.dropThroughPlatform = null;
    player.dropThroughSlope = null;
    player.jumpBufferUntil = 0;
    player.headSupportUntil = 0;
    player.headSupportPlayerId = null;
    this.resetJumpState(player);
    player.jumpPrepUntil = 0;
    player.jumpLandUntil = 0;
    player.wasGrounded = true;
    player.knockedUntil = 0;
    player.dashAttackUntil = 0;
    player.dashDirection = 0;
    player.dashHitTargets.clear();
    player.rollUntil = 0;
    player.rollEndAt = 0;
    player.rollDirection = 0;
    player.comboIndex = 0;
    player.comboResetAt = 0;
    player.nextMeleeAt = 0;
    player.nextShotAt = 0;
    player.nextGrenadeAt = 0;
    player.nextPowerupAt = 0;
    player.meleeAnimationUntil = 0;
    player.meleeAnimationKey = null;
    player.meleeAttackState = null;
    player.meleeAttackId += 1;
    player.pickupAnimationUntil = 0;
    player.currentPickup = null;
    player.cpuInputDown = createInputDown();
    player.cpuState = createCpuState();
    player.onSlope = false;
    player.doorCooldownUntil = 0;
    player.doorIgnoreKey = null;
    player.doorExitUntil = 0;
    player.doorExitDirection = 0;
    player.doorExitTargetX = 0;
    player.shootStanceUntil = 0;
    player.grenadeCookStartedAt = 0;
    this.clearGrenadeCookText(player);
    player.slowedUntil = 0;
    player.shieldUntil = 0;
    player.hasteUntil = 0;
    player.onFireUntil = 0;
    player.nextFireDamageAt = 0;
    player.fireOwnerId = null;
    player.fireEffect?.destroy?.();
    player.fireEffect = null;
    player.aiming = false;
    player.aimMode = null;
    player.aimFacing = player.facing >= 0 ? 1 : -1;
    player.aimOffset = 0;
    player.aimAngle = this.getAimAngle(player.aimFacing, player.aimOffset);
    player.crouching = false;
    player.crouchTransitionUntil = 0;
    player.standTransitionUntil = 0;
    this.clearLadderState(player);
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
    if (this.isRemoteOnlineClient()) {
      return;
    }
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
      this.createConfiguredPickup(point, true);
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
    this.createConfiguredPickup(point);
  }

  createConfiguredPickup(point, preferWeapon = false) {
    const kind = point.kind ?? 'random';
    const id = point.id ?? 'random';
    if (kind === 'weapon') {
      const weaponId = id !== 'random' && this.configData.weapons[id] ? id : this.pickWeightedWeapon();
      this.createPickup(point.x, point.y, 'weapon', weaponId);
      return;
    }
    if (kind === 'grenade') {
      this.createPickup(point.x, point.y, 'grenade', 'grenade');
      return;
    }
    if (kind === 'powerup') {
      const powerupId = id !== 'random' && this.configData.powerups[id]
        ? id
        : Phaser.Utils.Array.GetRandom(Object.keys(this.configData.powerups));
      this.createPickup(point.x, point.y, 'powerup', powerupId);
      return;
    }
    if (preferWeapon) {
      this.createPickup(point.x, point.y, 'weapon', this.pickWeightedWeapon());
      return;
    }

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
      Phaser.Math.Distance.Between(point.x, point.y, pickup.getData('logicalX') ?? pickup.x, pickup.getData('logicalY') ?? pickup.y) < 44
    ));
  }

  createPickup(x, y, kind, id) {
    const texture = kind === 'weapon' ? `weapon-${id}` : kind === 'grenade' ? 'grenade-pixel' : `powerup-${id}`;
    const visualY = kind === 'weapon' ? y + 9 : y + 4;
    const pickup = this.physics.add.staticImage(x, visualY, texture).setDepth(9);
    pickup.setData('kind', kind);
    pickup.setData('id', id);
    pickup.setData('logicalX', x);
    pickup.setData('logicalY', y);
    pickup.setScale(kind === 'weapon' ? 0.62 : 1.05);
    pickup.body.setSize(kind === 'weapon' ? 34 : 28, 22);
    pickup.refreshBody();

    const glowColor = kind === 'weapon' ? 0xffe45c : kind === 'grenade' ? COLORS.grenade : parseHexColor(this.configData.powerups[id]?.color, 0x8cffab);
    const glow = this.add
      .ellipse(pickup.x, pickup.y + 1, kind === 'weapon' ? 48 : 34, kind === 'weapon' ? 18 : 20, glowColor, 0.22)
      .setDepth(7);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.14, to: 0.34 },
      scaleX: { from: 0.92, to: 1.08 },
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const label = this.pickupLabel(kind, id);
    const text = this.add
      .text(pickup.x, pickup.y + (kind === 'weapon' ? 15 : 16), label, {
        fontFamily: UI_FONT,
        fontSize: '10px',
        color: '#ffffff',
        stroke: '#101622',
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0)
      .setDepth(8);
    pickup.setData('glowObj', glow);
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

  isValidPickup(kind, id) {
    if (kind === 'weapon') {
      return Boolean(this.configData.weapons[id]);
    }
    if (kind === 'grenade') {
      return id === 'grenade';
    }
    if (kind === 'powerup') {
      return Boolean(this.configData.powerups[id]);
    }
    return false;
  }

  isRemoteOnlineClient() {
    return this.onlineMode && this.onlineReady && !this.onlineIsHost;
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

  tryAutoPickup(player, time = this.time.now) {
    if (
      this.isRemoteOnlineClient() ||
      time < player.meleeAnimationUntil ||
      time < player.pickupAnimationUntil
    ) {
      return false;
    }

    const pickup = player.currentPickup ?? this.findNearbyPickup(player);
    if (!pickup?.active || !this.canTakePickup(player, pickup)) {
      return false;
    }

    this.takePickup(player, pickup, null);
    return true;
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
    if (this.isRemoteOnlineClient()) {
      return;
    }
    const kind = pickup.getData('kind');
    const oldX = pickup.getData('logicalX') ?? pickup.x;
    const oldY = pickup.getData('logicalY') ?? pickup.y;

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
    if (this.isRemoteOnlineClient()) {
      return;
    }
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
    pickup.getData('glowObj')?.destroy();
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
    if (!player) {
      return true;
    }

    if (this.shouldIgnoreSlopeLandingSide(player, platform)) {
      return false;
    }

    if (!platform.getData('thin')) {
      return true;
    }

    if (this.isDroppingThroughPlatform(player, platform) || player.climbing) {
      return false;
    }

    if (sprite.body.velocity.y < -8) {
      return false;
    }

    const playerBottom = sprite.body.y + sprite.body.height;
    const platformTop = platform.body.y;
    return playerBottom <= platformTop + 14;
  }

  dynamicPropPlatformProcess(prop, platform) {
    if (!prop?.body || !platform?.body || prop === platform || platform.getData?.('dynamicProp')) {
      return false;
    }
    if (!platform.getData?.('thin')) {
      return true;
    }
    if (prop.body.velocity.y < -8) {
      return false;
    }
    const propBottom = prop.body.y + prop.body.height;
    return propBottom <= platform.body.y + 14;
  }

  getDynamicPropSupportPlatforms() {
    return this.platforms.filter((platform) => (
      platform?.active &&
      platform.body &&
      !platform.getData?.('dynamicProp')
    ));
  }

  shouldIgnoreSlopeLandingSide(player, platform) {
    const slope = player.currentSlope;
    const body = player.sprite.body;
    const platformBody = platform.body;
    if (!slope || slope.side !== 'floor' || !body || !platformBody) {
      return false;
    }

    const highDir = slope.type === 'up' ? 1 : -1;
    const highEdgeX = highDir > 0 ? slope.x + slope.size : slope.x;
    const lowEdgeX = highDir > 0 ? slope.x : slope.x + slope.size;
    const platformSideX = highDir > 0 ? platformBody.x : platformBody.x + platformBody.width;
    const lowDir = -highDir;
    const lowPlatformSideX = lowDir > 0 ? platformBody.x : platformBody.x + platformBody.width;
    const platformSpansY = (targetY) => platformBody.y <= targetY + 2 && platformBody.y + platformBody.height >= targetY - 2;
    const adjacentHighEdge = Math.abs(platformSideX - highEdgeX) <= 2 && platformSpansY(slope.y);
    const adjacentLowEdge =
      Math.abs(lowPlatformSideX - lowEdgeX) <= 2 &&
      platformSpansY(slope.y + slope.size);
    if (!adjacentHighEdge && !adjacentLowEdge) {
      return false;
    }

    const footX = body.x + body.width / 2;
    const edgeX = adjacentHighEdge ? highEdgeX : lowEdgeX;
    if (Math.abs(footX - edgeX) > body.width * 0.95) {
      return false;
    }

    const footY = body.y + body.height;
    const localX = Phaser.Math.Clamp(footX - slope.x, 0, slope.size);
    const surfaceY = slope.type === 'up'
      ? slope.y + slope.size - localX
      : slope.y + localX;
    const belowTolerance = slope.thin ? 12 : 34;
    return footY >= surfaceY - 7 && footY <= surfaceY + belowTolerance;
  }

  handlePlatformContact(sprite, platform) {
    const player = this.playerBySprite.get(sprite);
    if (player && platform.getData('thin')) {
      player.onThinPlatform = true;
      player.currentThinPlatform = platform;
      player.currentThinSlope = null;
    }
  }

  isDroppingThroughPlatform(player, platform) {
    if (player.dropThroughPlatform !== platform) {
      return false;
    }
    if (this.time.now >= player.dropUntil) {
      player.dropThroughPlatform = null;
      if (!player.dropThroughSlope) {
        player.dropUntil = 0;
      }
      return false;
    }
    return true;
  }

  isDroppingThroughSlope(player, slope) {
    if (player.dropThroughSlope !== slope) {
      return false;
    }
    if (this.time.now >= player.dropUntil) {
      player.dropThroughSlope = null;
      if (!player.dropThroughPlatform) {
        player.dropUntil = 0;
      }
      return false;
    }
    return true;
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

  damagePropsInBox(centerX, centerY, width, height, damage, ownerId = null) {
    const hitbox = new Phaser.Geom.Rectangle(centerX - width / 2, centerY - height / 2, width, height);
    for (const prop of this.getLevelProps()) {
      if (!prop.active || !prop.getData('destructible')) {
        continue;
      }
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, prop.getBounds())) {
        this.damageLevelProp(prop, damage, ownerId, centerX, centerY);
      }
    }
  }

  damagePropsInRadius(x, y, radius, damage, ownerId = null) {
    for (const prop of this.getLevelProps()) {
      if (!prop.active || !prop.getData('destructible')) {
        continue;
      }
      if (this.circleOverlapsObject(x, y, radius, prop)) {
        this.damageLevelProp(prop, damage, ownerId, x, y);
      }
    }
  }

  getLevelProps() {
    return [
      ...(this.levelProps?.getChildren?.() ?? []),
      ...(this.dynamicProps ?? []),
      ...this.swingingCrates.map((crate) => crate.body).filter(Boolean),
    ];
  }

  igniteBarrel(prop, ownerId = null) {
    prop.setData('ignited', true);
    prop.setData('ignitedUntil', this.time.now + BARREL_BURN_MS);
    prop.setData('ignitedBy', ownerId);
    prop.setData('health', 1);
    prop.setFillStyle(COLORS.fire, 1);

    const flame = this.add
      .circle(prop.x, prop.y - prop.displayHeight * 0.48, Math.max(8, prop.displayWidth * 0.26), COLORS.fire, 0.72)
      .setDepth(14)
      .setBlendMode(Phaser.BlendModes.ADD);
    flame.setData('offsetX', 0);
    flame.setData('offsetY', -prop.displayHeight * 0.48);
    const visuals = prop.getData('visuals') ?? [];
    visuals.push(flame);
    prop.setData('visuals', visuals);
    prop.setData('flameVisual', flame);
  }

  updateBurningProps(time) {
    for (const prop of this.getLevelProps()) {
      if (!prop?.active || !prop.getData('ignited')) {
        continue;
      }

      const flame = prop.getData('flameVisual');
      if (flame?.active) {
        const pulse = 0.82 + Math.sin(time * 0.018) * 0.22;
        flame.setScale(pulse);
        flame.setAlpha(0.58 + Math.sin(time * 0.021) * 0.18);
      }

      for (const player of this.players) {
        if (!player.sprite?.active || time < player.rollUntil) {
          continue;
        }
        const distance = Phaser.Math.Distance.Between(prop.x, prop.y, player.sprite.x, player.sprite.y);
        if (distance <= BARREL_FLAME_RADIUS) {
          this.ignitePlayer(player, prop.getData('ignitedBy'), time);
        }
      }

      if (time >= prop.getData('ignitedUntil')) {
        this.explodeIgnitedBarrel(prop);
      }
    }
  }

  explodeIgnitedBarrel(prop) {
    if (!prop?.active) {
      return;
    }
    const radius = prop.getData('explosiveRadius') ?? BARREL_EXPLOSION_RADIUS;
    const explosiveDamage = prop.getData('explosiveDamage') ?? 44;
    const ownerId = prop.getData('ignitedBy');
    const explosionX = prop.x;
    const explosionY = prop.y;
    this.breakLevelProp(prop, explosionX, explosionY);
    this.explodeAt(explosionX, explosionY, radius, explosiveDamage, ownerId, true);
  }

  ignitePlayer(player, ownerId = null, time = this.time.now) {
    player.onFireUntil = Math.max(player.onFireUntil, time + FIRE_DURATION_MS);
    player.nextFireDamageAt = Math.max(player.nextFireDamageAt || 0, time + FIRE_TICK_MS);
    player.fireOwnerId = ownerId;
    if (!player.fireEffect?.active) {
      player.fireEffect = this.add
        .circle(player.sprite.x, player.sprite.y - 20, 13, COLORS.fire, 0.48)
        .setDepth(16)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  updateBurningPlayers(time) {
    for (const player of this.players) {
      if (time < player.rollUntil && player.onFireUntil > 0) {
        player.onFireUntil = 0;
      }

      if (time >= player.onFireUntil) {
        player.fireEffect?.destroy?.();
        player.fireEffect = null;
        continue;
      }

      if (player.fireEffect?.active) {
        player.fireEffect
          .setPosition(player.sprite.x, player.sprite.y - 20)
          .setAlpha(0.38 + Math.sin(time * 0.024) * 0.18)
          .setScale(0.9 + Math.sin(time * 0.019) * 0.18);
      }

      if (time < player.nextFireDamageAt) {
        continue;
      }

      player.nextFireDamageAt = time + FIRE_TICK_MS;
      const amount = time < player.shieldUntil
        ? Math.ceil(FIRE_DAMAGE * this.configData.powerups.shield.damageMultiplier)
        : FIRE_DAMAGE;
      player.health = Math.max(0, player.health - amount);
      if (player.health <= 0) {
        const owner = this.getPlayerById(player.fireOwnerId) ?? this.getOpponent(player);
        this.scoreKill(owner === player ? this.getOpponent(player) : owner, player, 'fire');
      }
    }
  }

  damageLevelProp(prop, damage, ownerId = null, impactX = prop.x, impactY = prop.y) {
    if (!prop.active || !prop.getData('destructible')) {
      return;
    }

    const health = (prop.getData('health') ?? 1) - damage;
    prop.setData('health', health);
    this.spawnHitEffect(prop.x, prop.y, prop.getData('explosiveRadius') ? COLORS.explosion : COLORS.crate);
    if (health > 0) {
      return;
    }

    if (prop.getData('propType') === 'barrel' && !prop.getData('ignited')) {
      this.igniteBarrel(prop, ownerId);
      return;
    }

    const radius = prop.getData('explosiveRadius') ?? 0;
    const explosiveDamage = prop.getData('explosiveDamage') ?? damage;
    const explosionX = prop.x;
    const explosionY = prop.y;
    this.breakLevelProp(prop, impactX, impactY);
    if (radius > 0) {
      this.explodeAt(explosionX, explosionY, radius, explosiveDamage, ownerId, true);
    }
  }

  breakLevelProp(prop, impactX, impactY) {
    if (!prop.active) {
      return;
    }
    const x = prop.x;
    const y = prop.y;
    const width = prop.displayWidth;
    const height = prop.displayHeight;
    const color = prop.fillColor ?? COLORS.crate;
    this.removeLevelProp(prop);

    for (let i = 0; i < 8; i += 1) {
      const chunk = this.add.rectangle(
        x + Phaser.Math.Between(-width / 2, width / 2),
        y + Phaser.Math.Between(-height / 2, height / 2),
        Phaser.Math.Between(3, 7),
        Phaser.Math.Between(3, 7),
        color,
        0.86,
      ).setDepth(13);
      this.tweens.add({
        targets: chunk,
        x: chunk.x + Phaser.Math.Between(-34, 34) + Math.sign(chunk.x - impactX) * 18,
        y: chunk.y + Phaser.Math.Between(14, 56) + Math.sign(chunk.y - impactY) * 12,
        alpha: 0,
        angle: Phaser.Math.Between(-140, 140),
        duration: 360,
        ease: 'Cubic.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }
  }

  removeLevelProp(prop) {
    if (!prop?.active) {
      return;
    }
    const index = this.platforms.indexOf(prop);
    if (index >= 0) {
      this.platforms.splice(index, 1);
    }
    this.dynamicProps = (this.dynamicProps ?? []).filter((candidate) => candidate !== prop);
    this.dynamicPropGroup?.remove?.(prop, false, false);
    this.swingingCrates = this.swingingCrates.filter((crate) => crate.body !== prop);
    for (const visual of prop.getData('visuals') ?? []) {
      visual.destroy();
    }
    prop.destroy();
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

    this.coordText?.setText(this.formatCoordinateLine());
    this.p1StatusText.setText(this.statusLine(this.p1));
    this.p2StatusText.setText(this.statusLine(this.p2));
  }

  formatCoordinateLine() {
    const player = this.p1;
    const body = player?.sprite?.body;
    if (!player || !body) {
      return '';
    }
    const tileSize = this.editorLevel?.tileSize ?? 24;
    const footX = body.x + body.width / 2;
    const footY = body.y + body.height;
    return `P1 x:${Math.round(footX)} y:${Math.round(footY)} tile:${Math.floor(footX / tileSize)},${Math.floor(footY / tileSize)}`;
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

function createCpuState() {
  return {
    action: null,
    actionStartedAt: 0,
    actionReleaseAt: 0,
    actionEndAt: 0,
    desiredAimAngle: null,
    nextPickupAt: 0,
    nextPowerupAt: 0,
    nextJumpAt: 0,
    nextMeleeAt: 0,
    nextShootAt: 0,
    nextGrenadeAt: 0,
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

function isEditableDomTarget(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function isPlaySurfaceEventTarget(target) {
  if (!(target instanceof Element) || isEditableDomTarget(target)) {
    return false;
  }
  return Boolean(target.closest('#game, .mobile-controls'));
}

function isGameCanvasEventTarget(target) {
  if (!(target instanceof Element) || isEditableDomTarget(target)) {
    return false;
  }
  return Boolean(target.closest('#game canvas'));
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

function safeClientInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function roundForNetwork(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function comparePickupSnapshotEntries(left, right) {
  return (
    left.y - right.y ||
    left.x - right.x ||
    String(left.kind).localeCompare(String(right.kind)) ||
    String(left.id).localeCompare(String(right.id))
  );
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

function getGunArmOverlayFrame(bodyFrame) {
  if (bodyFrame >= 29 && bodyFrame <= 32) {
    return bodyFrame + 8;
  }
  if (bodyFrame >= 58 && bodyFrame <= 60) {
    return bodyFrame + 13;
  }
  if (bodyFrame >= 61 && bodyFrame <= 64) {
    return 73;
  }
  if (bodyFrame >= 68 && bodyFrame <= 70) {
    return bodyFrame + 10;
  }
  if (bodyFrame >= 106 && bodyFrame <= 113) {
    return bodyFrame + 8;
  }
  if (bodyFrame >= 133 && bodyFrame <= 143) {
    return bodyFrame + 11;
  }
  if (bodyFrame === 227) {
    return 228;
  }
  return 37;
}

retireServiceWorkers();
createBootMenu();

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
        <button class="boot-cpu" type="button">Play vs CPU</button>
        <button class="boot-local" type="button">Local Multiplayer</button>
        <button class="boot-online" type="button">Online Multiplayer</button>
      </div>
      <section class="boot-online-panel" hidden>
        <p class="online-server-fixed">Server: ${escapeHtml(getOnlineServerLabel())}</p>
        <div class="online-actions-row">
          <button class="boot-create" type="button">Create Lobby</button>
          <label class="online-code-field">
            <span>Code</span>
            <input id="onlineLobbyCodeInput" name="onlineLobbyCode" class="boot-code-input" type="text" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" value="${escapeHtml(initialCode)}">
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
  overlay.querySelector('.boot-cpu')?.addEventListener('click', () => {
    state.channel?.close();
    startGameFromBoot(overlay, { mode: 'cpu' });
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
  } else if (shouldAutoPlaytestEditorLevel()) {
    startGameFromBoot(overlay, { mode: 'local', editorLevel: true });
  }
}

function shouldAutoPlaytestEditorLevel() {
  const params = new URLSearchParams(window.location.search);
  return params.get('playtestLevel') === '1';
}

function startGameFromBoot(bootOverlay, options) {
  pendingBootOptions = {
    editorLevel: true,
    ...(options ?? {}),
  };
  bootOverlay?.remove();
  window.__superfightersGame?.destroy(true);
  window.__superfightersGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    resolution: RENDER_RESOLUTION,
    backgroundColor: '#8dd8ff',
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoRound: false,
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
  const options = pendingBootOptions ?? { mode: 'local', editorLevel: true };
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
