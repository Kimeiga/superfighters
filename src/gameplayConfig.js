export const GAMEPLAY_STORAGE_KEY = 'superfighters.gameplayConfig.v1';

const DEFAULT_WEAPONS = {
  pistol: {
    label: 'Pistol',
    ammo: 24,
    damage: 10,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 280,
    spreadDeg: 2,
    muzzleVelocity: 760,
    bulletLifeMs: 760,
    bulletWidth: 12,
    bulletHeight: 4,
    bulletColor: '#fff0a8',
    knockback: 180,
    recoil: 55,
    weight: 0,
  },
  smg: {
    label: 'SMG',
    ammo: 45,
    damage: 7,
    pellets: 1,
    burst: 3,
    burstDelayMs: 58,
    cooldownMs: 390,
    spreadDeg: 7,
    muzzleVelocity: 720,
    bulletLifeMs: 700,
    bulletWidth: 10,
    bulletHeight: 3,
    bulletColor: '#f7d56b',
    knockback: 105,
    recoil: 40,
    weight: 0,
  },
  shotgun: {
    label: 'Shotgun',
    ammo: 12,
    damage: 6,
    pellets: 7,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 720,
    spreadDeg: 18,
    muzzleVelocity: 620,
    bulletLifeMs: 560,
    bulletWidth: 7,
    bulletHeight: 3,
    bulletColor: '#ffb85f',
    knockback: 80,
    recoil: 125,
    weight: 0,
  },
  rifle: {
    label: 'Rifle',
    ammo: 30,
    damage: 13,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 320,
    spreadDeg: 2.5,
    muzzleVelocity: 890,
    bulletLifeMs: 820,
    bulletWidth: 14,
    bulletHeight: 4,
    bulletColor: '#ffffff',
    knockback: 210,
    recoil: 70,
    weight: 0,
  },
  sniper: {
    label: 'Sniper',
    ammo: 8,
    damage: 45,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 980,
    spreadDeg: 0.4,
    muzzleVelocity: 1240,
    bulletLifeMs: 900,
    bulletWidth: 22,
    bulletHeight: 4,
    bulletColor: '#fffbdf',
    knockback: 410,
    recoil: 180,
    laser: true,
    weight: 0,
  },
  launcher: {
    label: 'Launcher',
    ammo: 5,
    damage: 22,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 900,
    spreadDeg: 1,
    muzzleVelocity: 440,
    bulletLifeMs: 1300,
    bulletWidth: 15,
    bulletHeight: 8,
    bulletColor: '#a7ff8a',
    knockback: 300,
    recoil: 155,
    explosiveRadius: 82,
    explosiveDamage: 32,
    weight: 0,
  },
  bolt45: {
    label: 'Bolt45',
    ammo: 18,
    damage: 15,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 340,
    spreadDeg: 3,
    muzzleVelocity: 780,
    bulletLifeMs: 780,
    bulletWidth: 13,
    bulletHeight: 4,
    bulletColor: '#ffdca3',
    knockback: 210,
    recoil: 75,
    weight: 5,
  },
  lightGun: {
    label: 'Light Gun',
    ammo: 34,
    damage: 7,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 180,
    spreadDeg: 5.5,
    muzzleVelocity: 710,
    bulletLifeMs: 710,
    bulletWidth: 9,
    bulletHeight: 3,
    bulletColor: '#f8e889',
    knockback: 95,
    recoil: 28,
    weight: 4,
  },
  raygun: {
    label: 'Raygun',
    ammo: 16,
    damage: 18,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 460,
    spreadDeg: 1.5,
    muzzleVelocity: 660,
    bulletLifeMs: 900,
    bulletWidth: 18,
    bulletHeight: 7,
    bulletColor: '#5ff7ff',
    knockback: 260,
    recoil: 90,
    explosiveRadius: 42,
    explosiveDamage: 14,
    weight: 2,
  },
  peashooter: {
    label: 'Peashooter',
    ammo: 46,
    damage: 5,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 145,
    spreadDeg: 6.5,
    muzzleVelocity: 680,
    bulletLifeMs: 660,
    bulletWidth: 8,
    bulletHeight: 3,
    bulletColor: '#f5ef93',
    knockback: 70,
    recoil: 20,
    weight: 4,
  },
  jager: {
    label: 'Jager',
    ammo: 8,
    damage: 42,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 940,
    spreadDeg: 0.5,
    muzzleVelocity: 1240,
    bulletLifeMs: 960,
    bulletWidth: 23,
    bulletHeight: 4,
    bulletColor: '#fff7d6',
    knockback: 395,
    recoil: 170,
    laser: true,
    weight: 2,
  },
  boltSixShooter: {
    label: 'Bolt Six-Shooter',
    ammo: 18,
    damage: 16,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 370,
    spreadDeg: 2.5,
    muzzleVelocity: 790,
    bulletLifeMs: 780,
    bulletWidth: 13,
    bulletHeight: 4,
    bulletColor: '#ffdf9e',
    knockback: 225,
    recoil: 80,
    weight: 4,
  },
  derringer: {
    label: 'Derringer',
    ammo: 10,
    damage: 9,
    pellets: 2,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 520,
    spreadDeg: 10,
    muzzleVelocity: 650,
    bulletLifeMs: 560,
    bulletWidth: 8,
    bulletHeight: 3,
    bulletColor: '#ffe1b0',
    knockback: 115,
    recoil: 62,
    weight: 3,
  },
  kleinP8: {
    label: 'Klein P8',
    ammo: 28,
    damage: 9,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 235,
    spreadDeg: 3,
    muzzleVelocity: 760,
    bulletLifeMs: 740,
    bulletWidth: 11,
    bulletHeight: 4,
    bulletColor: '#fff0a8',
    knockback: 145,
    recoil: 42,
    weight: 5,
  },
  k9Pistol: {
    label: 'K9 Pistol',
    ammo: 24,
    damage: 11,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 290,
    spreadDeg: 2.2,
    muzzleVelocity: 820,
    bulletLifeMs: 780,
    bulletWidth: 12,
    bulletHeight: 4,
    bulletColor: '#ffd382',
    knockback: 170,
    recoil: 55,
    weight: 5,
  },
  frazetta: {
    label: 'Frazetta',
    ammo: 14,
    damage: 19,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 510,
    spreadDeg: 2,
    muzzleVelocity: 800,
    bulletLifeMs: 760,
    bulletWidth: 15,
    bulletHeight: 5,
    bulletColor: '#ffc878',
    knockback: 260,
    recoil: 115,
    weight: 3,
  },
  frazetta93s: {
    label: 'Frazetta 93S',
    ammo: 30,
    damage: 8,
    pellets: 1,
    burst: 3,
    burstDelayMs: 52,
    cooldownMs: 430,
    spreadDeg: 6,
    muzzleVelocity: 740,
    bulletLifeMs: 700,
    bulletWidth: 10,
    bulletHeight: 3,
    bulletColor: '#f7d56b',
    knockback: 105,
    recoil: 45,
    weight: 4,
  },
  regulator: {
    label: 'Regulator',
    ammo: 32,
    damage: 9,
    pellets: 1,
    burst: 2,
    burstDelayMs: 70,
    cooldownMs: 310,
    spreadDeg: 2,
    muzzleVelocity: 805,
    bulletLifeMs: 760,
    bulletWidth: 11,
    bulletHeight: 4,
    bulletColor: '#fff2bc',
    knockback: 135,
    recoil: 48,
    weight: 4,
  },
  spark: {
    label: 'Spark',
    ammo: 28,
    damage: 8,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 170,
    spreadDeg: 4,
    muzzleVelocity: 880,
    bulletLifeMs: 720,
    bulletWidth: 11,
    bulletHeight: 4,
    bulletColor: '#fff36d',
    knockback: 110,
    recoil: 32,
    weight: 4,
  },
  socom: {
    label: 'SOCOM',
    ammo: 24,
    damage: 10,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 280,
    spreadDeg: 1.6,
    muzzleVelocity: 790,
    bulletLifeMs: 780,
    bulletWidth: 12,
    bulletHeight: 4,
    bulletColor: '#fff0a8',
    knockback: 180,
    recoil: 55,
    weight: 5,
  },
  frostbite: {
    label: 'Frostbite',
    ammo: 20,
    damage: 12,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 330,
    spreadDeg: 2.8,
    muzzleVelocity: 720,
    bulletLifeMs: 820,
    bulletWidth: 13,
    bulletHeight: 5,
    bulletColor: '#9ae7ff',
    knockback: 175,
    recoil: 60,
    weight: 3,
  },
  tracker: {
    label: 'Tracker',
    ammo: 20,
    damage: 13,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 305,
    spreadDeg: 0.9,
    muzzleVelocity: 930,
    bulletLifeMs: 840,
    bulletWidth: 14,
    bulletHeight: 4,
    bulletColor: '#ffd890',
    knockback: 190,
    recoil: 68,
    weight: 4,
  },
  maelstrom: {
    label: 'Maelstrom',
    ammo: 36,
    damage: 7,
    pellets: 1,
    burst: 4,
    burstDelayMs: 48,
    cooldownMs: 440,
    spreadDeg: 8,
    muzzleVelocity: 700,
    bulletLifeMs: 680,
    bulletWidth: 9,
    bulletHeight: 3,
    bulletColor: '#ffc96d',
    knockback: 95,
    recoil: 48,
    weight: 3,
  },
  violencePistol: {
    label: 'Violence Pistol',
    ammo: 12,
    damage: 7,
    pellets: 5,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 650,
    spreadDeg: 15,
    muzzleVelocity: 610,
    bulletLifeMs: 560,
    bulletWidth: 7,
    bulletHeight: 3,
    bulletColor: '#ffb85f',
    knockback: 85,
    recoil: 120,
    weight: 2,
  },
  splinter: {
    label: 'Splinter',
    ammo: 18,
    damage: 5,
    pellets: 3,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 360,
    spreadDeg: 12,
    muzzleVelocity: 760,
    bulletLifeMs: 620,
    bulletWidth: 8,
    bulletHeight: 3,
    bulletColor: '#ffe0a0',
    knockback: 75,
    recoil: 70,
    weight: 3,
  },
  fuliga: {
    label: 'Fuliga',
    ammo: 30,
    damage: 9,
    pellets: 1,
    burst: 2,
    burstDelayMs: 62,
    cooldownMs: 330,
    spreadDeg: 4.5,
    muzzleVelocity: 770,
    bulletLifeMs: 740,
    bulletWidth: 11,
    bulletHeight: 4,
    bulletColor: '#ffb65c',
    knockback: 140,
    recoil: 55,
    weight: 3,
  },
  beehive: {
    label: 'Beehive',
    ammo: 10,
    damage: 5,
    pellets: 9,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 780,
    spreadDeg: 22,
    muzzleVelocity: 590,
    bulletLifeMs: 540,
    bulletWidth: 6,
    bulletHeight: 3,
    bulletColor: '#ffc44d',
    knockback: 65,
    recoil: 140,
    weight: 2,
  },
  goldenGun: {
    label: 'Golden Gun',
    ammo: 6,
    damage: 60,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 1100,
    spreadDeg: 0.2,
    muzzleVelocity: 1320,
    bulletLifeMs: 980,
    bulletWidth: 25,
    bulletHeight: 5,
    bulletColor: '#fff36d',
    knockback: 520,
    recoil: 240,
    laser: true,
    weight: 1,
  },
  dread: {
    label: 'Dread',
    ammo: 10,
    damage: 24,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 650,
    spreadDeg: 2,
    muzzleVelocity: 860,
    bulletLifeMs: 820,
    bulletWidth: 18,
    bulletHeight: 5,
    bulletColor: '#ffd2a1',
    knockback: 315,
    recoil: 145,
    weight: 2,
  },
  detroitEnforcer: {
    label: 'Detroit Enforcer',
    ammo: 42,
    damage: 7,
    pellets: 1,
    burst: 3,
    burstDelayMs: 50,
    cooldownMs: 380,
    spreadDeg: 6,
    muzzleVelocity: 750,
    bulletLifeMs: 710,
    bulletWidth: 10,
    bulletHeight: 3,
    bulletColor: '#f4de89',
    knockback: 105,
    recoil: 42,
    weight: 3,
  },
  whirlybird: {
    label: 'Whirlybird',
    ammo: 45,
    damage: 6,
    pellets: 1,
    burst: 5,
    burstDelayMs: 44,
    cooldownMs: 520,
    spreadDeg: 9,
    muzzleVelocity: 710,
    bulletLifeMs: 690,
    bulletWidth: 9,
    bulletHeight: 3,
    bulletColor: '#ffe78d',
    knockback: 85,
    recoil: 45,
    weight: 2,
  },
  finalJustice: {
    label: 'Final Justice',
    ammo: 8,
    damage: 32,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 840,
    spreadDeg: 1.2,
    muzzleVelocity: 980,
    bulletLifeMs: 880,
    bulletWidth: 20,
    bulletHeight: 5,
    bulletColor: '#fff0a5',
    knockback: 395,
    recoil: 185,
    weight: 2,
  },
  antibody: {
    label: 'Antibody',
    ammo: 22,
    damage: 11,
    pellets: 1,
    burst: 1,
    burstDelayMs: 0,
    cooldownMs: 300,
    spreadDeg: 2.8,
    muzzleVelocity: 760,
    bulletLifeMs: 760,
    bulletWidth: 12,
    bulletHeight: 4,
    bulletColor: '#9cff87',
    knockback: 150,
    recoil: 48,
    weight: 3,
  },
};

export const DEFAULT_GAMEPLAY_CONFIG = {
  round: {
    lives: 5,
    seconds: 120,
    respawnInvulnerabilityMs: 1400,
  },
  movement: {
    walkSpeed: 225,
    runSpeed: 225,
    crouchSpeed: 0,
    aimSpeed: 78,
    jumpSpeed: 390,
    jumpHoldMs: 185,
    jumpHoldGravityMultiplier: 0.42,
    jumpReleaseVelocity: -260,
    fallGravityMultiplier: 1.08,
    climbSpeed: 155,
    shootStanceMs: 650,
    dashTapMs: 260,
    runHoldMs: 900,
    dashAttackMs: 430,
    dashAttackSpeed: 500,
    dashAttackLift: 210,
    aimRotateDegPerSecond: 155,
  },
  visuals: {
    shoulderX: 8,
    shoulderY: -16,
    crosshairDistance: 92,
    gunMuzzleOffset: 28,
    pickupTextOffset: 18,
  },
  playerBody: {
    standing: {
      width: 23,
      height: 43,
      offsetX: 21,
      offsetY: 19,
    },
    crouch: {
      width: 28,
      height: 27,
      offsetX: 18,
      offsetY: 35,
    },
  },
  melee: {
    comboResetMs: 680,
    cooldownMs: 120,
    hitboxWidth: 58,
    hitboxHeight: 42,
    stunThreshold: 100,
    stunRecoverPerSecond: 18,
    knockdownStun: 115,
    jumpStun: 48,
    hits: [
      { damage: 8, knockbackX: 155, knockbackY: 115, stun: 20 },
      { damage: 10, knockbackX: 205, knockbackY: 145, stun: 27 },
      { damage: 15, knockbackX: 285, knockbackY: 230, stun: 42 },
    ],
    dashDamage: 18,
    dashKnockbackX: 420,
    dashKnockbackY: 285,
    dashKnockdownMs: 1050,
  },
  pickups: {
    spawnEveryMs: 4500,
    maxOnMap: 8,
  },
  grenades: {
    startCount: 3,
    maxCount: 3,
    throwSpeed: 860,
    throwLift: 185,
    fuseMs: 2500,
    bounce: 0.5,
    airDragX: 0,
    dragX: 420,
    radius: 154,
    damage: 28,
    selfDamage: 12,
    knockback: 420,
  },
  powerups: {
    slowmo: {
      label: 'Slowmo',
      durationMs: 5000,
      slowMultiplier: 0.48,
    },
    heal: {
      label: 'Medkit',
      amount: 40,
    },
    shield: {
      label: 'Shield',
      durationMs: 5000,
      damageMultiplier: 0.45,
    },
    haste: {
      label: 'Haste',
      durationMs: 5000,
      speedMultiplier: 1.35,
    },
  },
  weapons: DEFAULT_WEAPONS,
};

export function getGameplayConfig() {
  return mergeConfig(DEFAULT_GAMEPLAY_CONFIG, migrateSavedGameplayConfig(readSavedGameplayConfig()));
}

export function saveGameplayConfig(config) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    GAMEPLAY_STORAGE_KEY,
    JSON.stringify(mergeConfig(DEFAULT_GAMEPLAY_CONFIG, config)),
  );
}

export function resetGameplayConfig() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(GAMEPLAY_STORAGE_KEY);
}

function readSavedGameplayConfig() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(GAMEPLAY_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function migrateSavedGameplayConfig(saved) {
  if (!isPlainObject(saved)) {
    return saved;
  }

  const migrated = structuredClone(saved);
  if (migrated.movement?.walkSpeed === 320) {
    migrated.movement.walkSpeed = DEFAULT_GAMEPLAY_CONFIG.movement.walkSpeed;
  }
  if (migrated.movement?.walkSpeed === 255) {
    migrated.movement.walkSpeed = DEFAULT_GAMEPLAY_CONFIG.movement.walkSpeed;
  }
  if (migrated.movement?.runSpeed === 320) {
    migrated.movement.runSpeed = DEFAULT_GAMEPLAY_CONFIG.movement.runSpeed;
  }
  if (migrated.movement?.runSpeed === 255) {
    migrated.movement.runSpeed = DEFAULT_GAMEPLAY_CONFIG.movement.runSpeed;
  }
  if (migrated.movement?.jumpSpeed === 590) {
    migrated.movement.jumpSpeed = DEFAULT_GAMEPLAY_CONFIG.movement.jumpSpeed;
  }
  if (
    migrated.playerBody?.standing?.width === 11 &&
    migrated.playerBody?.standing?.height === 21 &&
    migrated.playerBody?.crouch?.width === 11 &&
    migrated.playerBody?.crouch?.height === 14
  ) {
    migrated.playerBody = structuredClone(DEFAULT_GAMEPLAY_CONFIG.playerBody);
  }
  if (migrated.grenades?.throwSpeed === 510) {
    migrated.grenades.throwSpeed = DEFAULT_GAMEPLAY_CONFIG.grenades.throwSpeed;
  }
  if (migrated.grenades?.throwSpeed === 680) {
    migrated.grenades.throwSpeed = DEFAULT_GAMEPLAY_CONFIG.grenades.throwSpeed;
  }
  if (migrated.grenades?.throwLift === 140) {
    migrated.grenades.throwLift = DEFAULT_GAMEPLAY_CONFIG.grenades.throwLift;
  }
  if (migrated.grenades?.fuseMs === 1700) {
    migrated.grenades.fuseMs = DEFAULT_GAMEPLAY_CONFIG.grenades.fuseMs;
  }
  if (migrated.grenades?.dragX === 900) {
    migrated.grenades.dragX = DEFAULT_GAMEPLAY_CONFIG.grenades.dragX;
  }
  if (migrated.grenades?.dragX === 170) {
    migrated.grenades.dragX = DEFAULT_GAMEPLAY_CONFIG.grenades.dragX;
  }
  if (migrated.grenades?.radius === 116) {
    migrated.grenades.radius = DEFAULT_GAMEPLAY_CONFIG.grenades.radius;
  }
  return migrated;
}

function mergeConfig(defaults, overrides) {
  if (!isPlainObject(defaults)) {
    return overrides ?? defaults;
  }

  const merged = { ...defaults };
  if (!isPlainObject(overrides)) {
    return merged;
  }

  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = isPlainObject(defaults[key])
      ? mergeConfig(defaults[key], value)
      : value ?? defaults[key];
  }

  return merged;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
