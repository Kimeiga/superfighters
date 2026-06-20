export const ANIMATION_STORAGE_KEY = 'superfighters.animationConfig.v1';

export const ANIMATION_ORDER = [
  'intro',
  'idle',
  'idleAimStraight',
  'idleAimUp',
  'melee',
  'crouchDown',
  'crouchDownGun',
  'crouch',
  'standUp',
  'standUpGun',
  'crouchMelee',
  'roll',
  'rollEnd',
  'run',
  'runGun',
  'aim',
  'shoot',
  'crouchWalk',
  'jumpPrep',
  'jumpUp',
  'jumpPeak',
  'jumpDown',
  'jumpLand',
  'jumpPrepGun',
  'jumpGunUp',
  'jumpGunPeak',
  'jumpGunDown',
  'jumpGunLand',
  'jumpAimStraight',
  'jumpAimUp',
  'jumpAimDown',
  'jumpMelee',
  'climbLadderBegin',
  'climbLadder',
  'climbLadderEnd',
  'ladderGunDraw',
  'ladderGunHold',
  'ladderGun',
  'ladderMelee',
  'grenadePrep',
  'grenadeThrow',
  'grenadePrepAir',
  'grenadeThrowAir',
  'pickup',
  'placeC4',
  'riotShield',
  'adrenalineSyringe',
  'zipline',
  'ziplineMelee',
  'ziplineAimStraight',
  'ziplineAimUp',
  'ziplineAimDown',
  'hurt',
  'hurtGun',
  'die',
  'dieAir',
  'deathFall',
  'deathLand',
  'revive',
  'door',
  'teleport',
  'victory',
  'timeoutLoss',
  'missionFailed',
];

export const DEFAULT_ANIMATION_CONFIG = {
  intro: {
    label: 'Intro',
    start: 1,
    end: 1,
    fps: 8,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  idle: {
    label: 'Idle',
    start: 1,
    end: 1,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  idleAimStraight: {
    label: 'Idle Aim Straight',
    start: 7,
    end: 7,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  idleAimUp: {
    label: 'Idle Aim Up',
    start: 7,
    end: 7,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  melee: {
    label: 'Melee',
    start: 1,
    end: 1,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  crouchDown: {
    label: 'Crouch Down',
    start: 9,
    end: 9,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 9,
    fallbackEnd: 9,
  },
  crouchDownGun: {
    label: 'Crouch Down Gun',
    start: 9,
    end: 9,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 9,
    fallbackEnd: 9,
  },
  run: {
    label: 'Walk / Run',
    start: 2,
    end: 6,
    fps: 13,
    repeat: true,
    pingPong: true,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  runGun: {
    label: 'Run Gun',
    start: 2,
    end: 6,
    fps: 13,
    repeat: true,
    pingPong: true,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  aim: {
    label: 'Aim',
    start: 7,
    end: 7,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  shoot: {
    label: 'Fire',
    start: 8,
    end: 8,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  crouch: {
    label: 'Crouch',
    start: 9,
    end: 9,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  standUp: {
    label: 'Stand Up',
    start: 9,
    end: 9,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  standUpGun: {
    label: 'Stand Up Gun',
    start: 9,
    end: 9,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  crouchWalk: {
    label: 'Crouch Walk',
    start: 9,
    end: 12,
    fps: 8,
    repeat: true,
    pingPong: true,
    fallbackStart: 9,
    fallbackEnd: 9,
  },
  crouchMelee: {
    label: 'Crouch Melee',
    start: 9,
    end: 9,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 9,
    fallbackEnd: 9,
  },
  roll: {
    label: 'Roll',
    start: 1,
    end: 1,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  rollEnd: {
    label: 'Roll End',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpPrep: {
    label: 'Jump Prep',
    start: 13,
    end: 13,
    fps: 1,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpUp: {
    label: 'Jump Up',
    start: 13,
    end: 13,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpPrepGun: {
    label: 'Jump Prep Gun',
    start: 13,
    end: 13,
    fps: 1,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpGunUp: {
    label: 'Jump Gun Up',
    start: 13,
    end: 13,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpGunPeak: {
    label: 'Jump Gun Peak',
    start: 13,
    end: 13,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpGunDown: {
    label: 'Jump Gun Fall',
    start: 14,
    end: 14,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpGunLand: {
    label: 'Jump Gun Land',
    start: 14,
    end: 14,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpPeak: {
    label: 'Jump Peak',
    start: 13,
    end: 13,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpDown: {
    label: 'Jump Down',
    start: 14,
    end: 14,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpLand: {
    label: 'Jump Land',
    start: 14,
    end: 14,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpAimStraight: {
    label: 'Jump Aim Straight',
    start: 13,
    end: 13,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpAimUp: {
    label: 'Jump Aim Up',
    start: 13,
    end: 13,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpAimDown: {
    label: 'Jump Aim Down',
    start: 14,
    end: 14,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  jumpMelee: {
    label: 'Jump Melee',
    start: 13,
    end: 13,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  climbLadderBegin: {
    label: 'Climb Ladder Begin',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  climbLadder: {
    label: 'Climb Ladder',
    start: 1,
    end: 1,
    fps: 10,
    repeat: true,
    pingPong: true,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  climbLadderEnd: {
    label: 'Climb Ladder End',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  ladderGunDraw: {
    label: 'Ladder Gun Draw',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  ladderGunHold: {
    label: 'Ladder Gun Hold',
    start: 1,
    end: 1,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  ladderGun: {
    label: 'Ladder Gun',
    start: 1,
    end: 1,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  ladderMelee: {
    label: 'Ladder Melee',
    start: 1,
    end: 1,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  grenadePrep: {
    label: 'Grenade Prep',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  grenadeThrow: {
    label: 'Grenade Throw',
    start: 1,
    end: 1,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  grenadePrepAir: {
    label: 'Grenade Prep Air',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  grenadeThrowAir: {
    label: 'Grenade Throw Air',
    start: 1,
    end: 1,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  pickup: {
    label: 'Pickup',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  placeC4: {
    label: 'Place C4',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  riotShield: {
    label: 'Riot Shield',
    start: 1,
    end: 1,
    fps: 10,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  adrenalineSyringe: {
    label: 'Adrenaline Syringe',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  zipline: {
    label: 'Zipline',
    start: 1,
    end: 1,
    fps: 10,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  ziplineMelee: {
    label: 'Zipline Melee',
    start: 1,
    end: 1,
    fps: 14,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  ziplineAimStraight: {
    label: 'Zipline Aim Straight',
    start: 1,
    end: 1,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  ziplineAimUp: {
    label: 'Zipline Aim Up',
    start: 1,
    end: 1,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  ziplineAimDown: {
    label: 'Zipline Aim Down',
    start: 1,
    end: 1,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  hurt: {
    label: 'Hurt',
    start: 1,
    end: 1,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  hurtGun: {
    label: 'Hurt Gun',
    start: 1,
    end: 1,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  die: {
    label: 'Die',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  dieAir: {
    label: 'Die Air',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  deathFall: {
    label: 'Death Fall',
    start: 1,
    end: 1,
    fps: 10,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  deathLand: {
    label: 'Death Land',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  revive: {
    label: 'Revive',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  door: {
    label: 'Door',
    start: 1,
    end: 1,
    fps: 10,
    repeat: true,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  teleport: {
    label: 'Teleport',
    start: 1,
    end: 1,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  victory: {
    label: 'Victory',
    start: 1,
    end: 1,
    fps: 10,
    repeat: true,
    pingPong: true,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  timeoutLoss: {
    label: 'Timeout Loss',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
  missionFailed: {
    label: 'Mission Failed',
    start: 1,
    end: 1,
    fps: 10,
    repeat: false,
    pingPong: false,
    fallbackStart: 1,
    fallbackEnd: 1,
  },
};

export const DEFAULT_EMPRESS_ANIMATION_CONFIG = mergeAnimationDefaults(DEFAULT_ANIMATION_CONFIG, {
  intro: {
    start: 1,
    end: 18,
    fps: 10,
    repeat: false,
  },
  idle: {
    start: 23,
    end: 28,
    fps: 6,
    repeat: true,
  },
  idleAimStraight: {
    label: 'Idle Gun',
    start: 29,
    end: 32,
    fps: 8,
    repeat: true,
  },
  idleAimUp: {
    label: 'Idle Gun Up',
    start: 29,
    end: 32,
    fps: 8,
    repeat: true,
  },
  aim: {
    label: 'Gun Idle',
    start: 29,
    end: 32,
    fps: 8,
    repeat: true,
  },
  melee: {
    start: 45,
    end: 54,
    fps: 16,
    repeat: false,
  },
  crouchDown: {
    start: 55,
    end: 57,
    fps: 12,
    repeat: false,
  },
  crouchDownGun: {
    label: 'Crouch Down Gun',
    start: 58,
    end: 60,
    fps: 12,
    repeat: false,
  },
  crouch: {
    start: 61,
    end: 64,
    fps: 6,
    repeat: true,
  },
  crouchWalk: {
    start: 61,
    end: 64,
    fps: 6,
    repeat: true,
  },
  standUp: {
    start: 65,
    end: 67,
    fps: 12,
    repeat: false,
  },
  standUpGun: {
    start: 68,
    end: 70,
    fps: 12,
    repeat: false,
  },
  crouchMelee: {
    start: 81,
    end: 89,
    fps: 16,
    repeat: false,
  },
  roll: {
    start: 90,
    end: 94,
    fps: 16,
    repeat: false,
  },
  rollEnd: {
    start: 96,
    end: 97,
    fps: 8,
    repeat: false,
  },
  run: {
    start: 98,
    end: 105,
    fps: 13,
    repeat: true,
    pingPong: false,
  },
  runGun: {
    start: 106,
    end: 113,
    fps: 13,
    repeat: true,
    pingPong: false,
  },
  jumpPrep: {
    start: 122,
    end: 122,
    fps: 12,
    repeat: false,
  },
  jumpUp: {
    start: 123,
    end: 125,
    fps: 12,
    repeat: false,
  },
  jumpPeak: {
    start: 126,
    end: 128,
    fps: 12,
    repeat: false,
  },
  jumpDown: {
    start: 129,
    end: 131,
    fps: 12,
    repeat: true,
  },
  jumpLand: {
    start: 132,
    end: 132,
    fps: 12,
    repeat: false,
  },
  jumpPrepGun: {
    start: 133,
    end: 133,
    fps: 12,
    repeat: false,
  },
  jumpGunUp: {
    start: 134,
    end: 136,
    fps: 12,
    repeat: false,
  },
  jumpGunPeak: {
    start: 137,
    end: 139,
    fps: 12,
    repeat: false,
  },
  jumpGunDown: {
    start: 140,
    end: 142,
    fps: 12,
    repeat: true,
  },
  jumpGunLand: {
    start: 143,
    end: 143,
    fps: 12,
    repeat: false,
  },
  jumpAimStraight: {
    start: 134,
    end: 136,
    fps: 12,
    repeat: false,
  },
  jumpAimUp: {
    start: 137,
    end: 139,
    fps: 12,
    repeat: false,
  },
  jumpAimDown: {
    start: 140,
    end: 142,
    fps: 12,
    repeat: true,
  },
  jumpMelee: {
    frames: '122,195-203',
    start: 122,
    end: 203,
    fps: 16,
    repeat: false,
  },
  climbLadderBegin: {
    start: 204,
    end: 209,
    fps: 10,
    repeat: false,
  },
  climbLadder: {
    start: 210,
    end: 217,
    fps: 10,
    repeat: true,
  },
  climbLadderEnd: {
    start: 218,
    end: 223,
    fps: 10,
    repeat: false,
  },
  ladderGunDraw: {
    start: 224,
    end: 226,
    fps: 10,
    repeat: false,
  },
  ladderGunHold: {
    start: 227,
    end: 227,
    fps: 1,
    repeat: true,
  },
  ladderGun: {
    start: 227,
    end: 227,
    fps: 1,
    repeat: true,
  },
  ladderMelee: {
    start: 229,
    end: 236,
    fps: 14,
    repeat: false,
  },
  grenadePrep: {
    start: 237,
    end: 242,
    fps: 10,
    repeat: false,
  },
  grenadeThrow: {
    start: 243,
    end: 247,
    fps: 14,
    repeat: false,
    eventFrame: 245,
  },
  grenadePrepAir: {
    start: 243,
    end: 253,
    fps: 10,
    repeat: false,
  },
  grenadeThrowAir: {
    start: 254,
    end: 258,
    fps: 14,
    repeat: false,
    eventFrame: 256,
  },
  pickup: {
    start: 259,
    end: 264,
    fps: 10,
    repeat: false,
  },
  die: {
    start: 333,
    end: 344,
    fps: 10,
    repeat: false,
  },
  dieAir: {
    start: 345,
    end: 348,
    fps: 10,
    repeat: false,
  },
  deathFall: {
    start: 349,
    end: 351,
    fps: 8,
    repeat: true,
  },
  deathLand: {
    start: 352,
    end: 358,
    fps: 10,
    repeat: false,
  },
  victory: {
    start: 406,
    end: 415,
    fps: 8,
    repeat: true,
  },
  timeoutLoss: {
    start: 416,
    end: 419,
    fps: 8,
    repeat: false,
  },
  missionFailed: {
    label: 'Timeout Loss',
    start: 416,
    end: 419,
    fps: 8,
    repeat: false,
  },
});

export const DEFAULT_EMPRESS_ARM_OVERLAY_CONFIG = {
  idleAimStraight: {
    label: 'Idle Aim Straight Arm',
    start: 37,
    end: 40,
    fps: 8,
    repeat: true,
    pingPong: false,
    fallbackStart: 37,
    fallbackEnd: 40,
    frames: '',
    eventFrame: null,
  },
  aim: {
    label: 'Aim Arm',
    start: 37,
    end: 40,
    fps: 8,
    repeat: true,
    pingPong: false,
    fallbackStart: 37,
    fallbackEnd: 40,
    frames: '',
    eventFrame: null,
  },
  crouchDownGun: {
    label: 'Crouch Down Gun Arm',
    start: 71,
    end: 73,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 71,
    fallbackEnd: 73,
    frames: '',
    eventFrame: null,
  },
  crouch: {
    label: 'Crouch Gun Arm',
    start: 73,
    end: 73,
    fps: 1,
    repeat: true,
    pingPong: false,
    fallbackStart: 73,
    fallbackEnd: 73,
    frames: '',
    eventFrame: null,
  },
  standUpGun: {
    label: 'Stand Up Gun Arm',
    start: 78,
    end: 80,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 78,
    fallbackEnd: 80,
    frames: '',
    eventFrame: null,
  },
  runGun: {
    label: 'Run Gun Arm',
    start: 114,
    end: 121,
    fps: 13,
    repeat: true,
    pingPong: false,
    fallbackStart: 114,
    fallbackEnd: 121,
    frames: '',
    eventFrame: null,
  },
  jumpPrepGun: {
    label: 'Jump Prep Gun Arm',
    start: 144,
    end: 144,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 144,
    fallbackEnd: 144,
    frames: '',
    eventFrame: null,
  },
  jumpGunUp: {
    label: 'Jump Up Gun Arm',
    start: 145,
    end: 147,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 145,
    fallbackEnd: 147,
    frames: '',
    eventFrame: null,
  },
  jumpGunPeak: {
    label: 'Jump Peak Gun Arm',
    start: 148,
    end: 150,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 148,
    fallbackEnd: 150,
    frames: '',
    eventFrame: null,
  },
  jumpGunDown: {
    label: 'Jump Fall Gun Arm',
    start: 151,
    end: 153,
    fps: 12,
    repeat: true,
    pingPong: false,
    fallbackStart: 151,
    fallbackEnd: 153,
    frames: '',
    eventFrame: null,
  },
  jumpGunLand: {
    label: 'Jump Land Gun Arm',
    start: 154,
    end: 154,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 154,
    fallbackEnd: 154,
    frames: '',
    eventFrame: null,
  },
  jumpAimStraight: {
    label: 'Jump Aim Straight Arm',
    start: 145,
    end: 147,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 145,
    fallbackEnd: 147,
    frames: '',
    eventFrame: null,
  },
  jumpAimUp: {
    label: 'Jump Aim Up Arm',
    start: 148,
    end: 150,
    fps: 12,
    repeat: false,
    pingPong: false,
    fallbackStart: 148,
    fallbackEnd: 150,
    frames: '',
    eventFrame: null,
  },
  jumpAimDown: {
    label: 'Jump Aim Down Arm',
    start: 151,
    end: 153,
    fps: 12,
    repeat: true,
    pingPong: false,
    fallbackStart: 151,
    fallbackEnd: 153,
    frames: '',
    eventFrame: null,
  },
};

export function getAnimationConfig() {
  return mergeAnimationConfig(readSavedAnimationConfig());
}

export function saveAnimationConfig(config) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ANIMATION_STORAGE_KEY, JSON.stringify(mergeAnimationConfig(config)));
}

export function resetAnimationConfig() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ANIMATION_STORAGE_KEY);
}

export function mergeAnimationConfig(config = {}, defaultsConfig = DEFAULT_ANIMATION_CONFIG) {
  return Object.fromEntries(
    ANIMATION_ORDER.map((key) => {
      const defaults = defaultsConfig[key] ?? DEFAULT_ANIMATION_CONFIG[key];
      const saved = config[key] ?? {};
      return [
        key,
        {
          ...defaults,
          ...saved,
          label: defaults.label,
          start: toInteger(saved.start, defaults.start),
          end: toInteger(saved.end, defaults.end),
          fps: clamp(toNumber(saved.fps, defaults.fps), 1, 30),
          repeat: typeof saved.repeat === 'boolean' ? saved.repeat : defaults.repeat,
          pingPong: typeof saved.pingPong === 'boolean' ? saved.pingPong : defaults.pingPong,
          frames: typeof saved.frames === 'string' ? saved.frames : defaults.frames ?? '',
          eventFrame: toNullableInteger(saved.eventFrame, defaults.eventFrame ?? null),
          fallbackStart: defaults.fallbackStart,
          fallbackEnd: defaults.fallbackEnd,
        },
      ];
    }),
  );
}

export function makeFrameList1Based(setting, frameCount) {
  const maxFrame = Math.max(1, frameCount);
  const explicitFrames = parseFramePattern(setting.frames, maxFrame);
  if (explicitFrames.length) {
    return explicitFrames;
  }

  let start = toInteger(setting.start, setting.fallbackStart);
  let end = toInteger(setting.end, setting.fallbackEnd);

  if (start > end) {
    [start, end] = [end, start];
  }

  if (start > maxFrame || end < 1) {
    start = toInteger(setting.fallbackStart, 1);
    end = toInteger(setting.fallbackEnd, start);
  }

  start = clamp(start, 1, maxFrame);
  end = clamp(end, 1, maxFrame);

  if (start > end) {
    [start, end] = [end, start];
  }

  const frames = [];
  for (let frame = start; frame <= end; frame += 1) {
    frames.push(frame);
  }

  if (setting.pingPong && frames.length > 2) {
    for (let index = frames.length - 2; index > 0; index -= 1) {
      frames.push(frames[index]);
    }
  }

  return frames;
}

export function makePhaserFrames(textureKey, setting, frameCount) {
  return makeFrameList1Based(setting, frameCount).map((frame) => ({
    key: textureKey,
    frame: frame - 1,
  }));
}

function readSavedAnimationConfig() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(ANIMATION_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function mergeAnimationDefaults(base, overrides) {
  return Object.fromEntries(
    ANIMATION_ORDER.map((key) => {
      const merged = {
        ...base[key],
        ...(overrides[key] ?? {}),
      };
      if (overrides[key]?.start !== undefined && overrides[key]?.fallbackStart === undefined) {
        merged.fallbackStart = merged.start;
      }
      if (overrides[key]?.end !== undefined && overrides[key]?.fallbackEnd === undefined) {
        merged.fallbackEnd = merged.end;
      }
      if (overrides[key]?.frames && overrides[key]?.fallbackStart === undefined) {
        merged.fallbackStart = merged.start;
      }
      if (overrides[key]?.frames && overrides[key]?.fallbackEnd === undefined) {
        merged.fallbackEnd = merged.end;
      }
      return [key, merged];
    }),
  );
}

function parseFramePattern(pattern, maxFrame) {
  if (typeof pattern !== 'string' || !pattern.trim()) {
    return [];
  }

  const frames = [];
  for (const part of pattern.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      let start = toInteger(range[1], 1);
      let end = toInteger(range[2], start);
      if (start > end) {
        [start, end] = [end, start];
      }
      for (let frame = start; frame <= end; frame += 1) {
        frames.push(clamp(frame, 1, maxFrame));
      }
      continue;
    }

    const frame = Number.parseInt(trimmed, 10);
    if (Number.isFinite(frame)) {
      frames.push(clamp(frame, 1, maxFrame));
    }
  }

  return frames;
}

function toInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function toNullableInteger(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function toNumber(value, fallback) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
