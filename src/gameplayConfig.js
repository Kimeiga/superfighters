export const GAMEPLAY_STORAGE_KEY = 'superfighters.gameplayConfig.v1';

export const DEFAULT_GAMEPLAY_CONFIG = {
  round: {
    lives: 5,
    seconds: 120,
    respawnInvulnerabilityMs: 1400,
  },
  movement: {
    walkSpeed: 255,
    runSpeed: 255,
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
    dashAttackSpeed: 520,
    dashAttackLift: 210,
    aimRotateDegPerSecond: 155,
  },
  visuals: {
    shoulderX: 8,
    shoulderY: -16,
    crosshairDistance: 92,
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
    comboResetMs: 760,
    cooldownMs: 250,
    hitboxWidth: 58,
    hitboxHeight: 42,
    hits: [
      { damage: 8, knockbackX: 155, knockbackY: 115 },
      { damage: 10, knockbackX: 205, knockbackY: 145 },
      { damage: 15, knockbackX: 285, knockbackY: 230 },
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
    throwSpeed: 510,
    throwLift: 0,
    fuseMs: 1700,
    bounce: 0.55,
    radius: 116,
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
  weapons: {
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
      weight: 5,
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
      weight: 4,
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
      weight: 3,
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
      weight: 3,
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
      weight: 2,
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
      gravity: true,
      weight: 1,
    },
  },
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
  if (migrated.movement?.runSpeed === 320) {
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
