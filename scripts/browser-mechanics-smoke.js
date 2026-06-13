window.__superfightersMechanicsSmokeResult = null;
window.__superfightersMechanicsSmoke = (async () => {
  const game = window.__superfightersGame;
  const scene = game?.scene?.keys?.fight;
  if (!scene) {
    return { ok: false, failures: [{ name: 'scene loaded', details: 'Fight scene not found' }] };
  }

  const checks = [];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const active = (group) => group.getChildren().filter((child) => child.active);
  const check = (name, pass, details = {}) => {
    checks.push({ name, pass: Boolean(pass), details });
  };

  const clearGroup = (group) => {
    for (const child of [...group.getChildren()]) {
      child.getData?.('labelObj')?.destroy?.();
      child.destroy();
    }
  };

  const snapshotPlatforms = () => scene.platforms.map((platform) => ({
    active: platform.active,
    visible: platform.visible,
    x: Math.round(platform.x * 100) / 100,
    y: Math.round(platform.y * 100) / 100,
    width: Math.round(platform.displayWidth * 100) / 100,
    height: Math.round(platform.displayHeight * 100) / 100,
    bodyEnabled: platform.body?.enable !== false,
    levelGeometry: platform.getData('levelGeometry') === true,
    indestructible: platform.getData('indestructible') === true,
  }));

  const samePlatformSnapshot = (before, after) => JSON.stringify(before) === JSON.stringify(after);

  const resetPlayer = (player, x, y, facing) => {
    player.sprite.setPosition(x, y);
    player.sprite.body?.reset?.(x, y);
    player.sprite.setVelocity(0, 0);
    player.facing = facing;
    player.sprite.setFlipX(facing < 0);
    player.aimFacing = facing;
    player.aimOffset = 0;
    player.aimAngle = scene.getAimAngle(facing, 0);
    player.aiming = false;
    player.aimMode = null;
    player.crouching = false;
    player.climbing = false;
    player.health = 100;
    player.weapon = null;
    player.grenadeAmmo = scene.configData.grenades.startCount;
    player.powerup = null;
    player.currentPickup = null;
    player.invulnerableUntil = 0;
    player.knockedUntil = 0;
    player.sprite.body?.setAllowGravity?.(true);
    player.nextMeleeAt = 0;
    player.meleeAnimationUntil = 0;
    player.pickupAnimationUntil = 0;
    player.dashAttackUntil = 0;
    player.dashHitTargets.clear();
    scene.applyBodyPose(player);
    scene.setAimVisible(player, false);
  };

  scene.beginLocalGame();
  scene.matchPaused = false;
  scene.matchOver = false;
  scene.physics.world.resume();
  clearGroup(scene.pickups);
  clearGroup(scene.bullets);
  clearGroup(scene.grenades);
  resetPlayer(scene.p1, 700, 484, 1);
  resetPlayer(scene.p2, 1040, 484, -1);

  const weaponIds = Object.keys(scene.configData.weapons);
  check(
    'weapon textures exist',
    weaponIds.every((id) => scene.textures.exists(`weapon-${id}`)),
    { weaponIds },
  );

  const originalRandom = Math.random;
  const deterministicRolls = [0.05, 0.35, 0.58, 0.72, 0.9, 0.99];
  const deterministicWeapons = [];
  try {
    for (const roll of deterministicRolls) {
      Math.random = () => roll;
      deterministicWeapons.push(scene.pickWeightedWeapon());
    }
  } finally {
    Math.random = originalRandom;
  }
  check(
    'weighted weapon picker covers configured guns',
    new Set(deterministicWeapons).size >= Math.min(weaponIds.length, 5),
    { deterministicWeapons },
  );

  for (const id of weaponIds) {
    const pickup = scene.createPickup(470 + weaponIds.indexOf(id) * 34, 380, 'weapon', id);
    check(`weapon pickup creates ${id}`, pickup.active && pickup.getData('id') === id, { texture: pickup.texture.key });
  }
  clearGroup(scene.pickups);

  const p1 = scene.p1;
  const p2 = scene.p2;
  p1.crouching = true;
  p1.weapon = null;
  let pickup = scene.createPickup(p1.sprite.x, p1.sprite.y, 'weapon', 'rifle');
  p1.currentPickup = pickup;
  scene.handleMeleePressed(p1, scene.time.now + 10);
  check('crouch melee picks up weapon', p1.weapon?.id === 'rifle' && !pickup.active, { weapon: p1.weapon?.id });

  p1.pickupAnimationUntil = 0;
  p1.meleeAnimationUntil = 0;
  p1.crouching = true;
  p1.weapon = scene.makeWeaponState('pistol');
  pickup = scene.createPickup(p1.sprite.x + 5, p1.sprite.y, 'weapon', 'sniper');
  p1.currentPickup = pickup;
  scene.handleMeleePressed(p1, scene.time.now + 30);
  const droppedPistol = active(scene.pickups).some((item) => item.getData('kind') === 'weapon' && item.getData('id') === 'pistol');
  check('crouch melee swaps weapon', p1.weapon?.id === 'sniper' && droppedPistol, { weapon: p1.weapon?.id, droppedPistol });
  clearGroup(scene.pickups);

  const aimCheck = (name, facing, vertical, shouldBeAbove) => {
    resetPlayer(p1, 700, 484, facing);
    p1.weapon = scene.makeWeaponState('pistol');
    scene.beginAim(p1, 'gun', scene.time.now + 50);
    scene.updateAim(p1, 0, vertical, 500);
    const pivot = scene.getAimPivot(p1);
    const reticle = scene.getAimReticlePosition(p1, p1.aimAngle);
    check(name, shouldBeAbove ? reticle.y < pivot.y : reticle.y > pivot.y, {
      facing,
      vertical,
      pivotY: Math.round(pivot.y),
      reticleY: Math.round(reticle.y),
      angle: Number(p1.aimAngle.toFixed(3)),
    });
  };
  aimCheck('aim up while facing right', 1, -1, true);
  aimCheck('aim down while facing right', 1, 1, false);
  aimCheck('aim up while facing left', -1, -1, true);
  aimCheck('aim down while facing left', -1, 1, false);

  for (const id of weaponIds) {
    clearGroup(scene.bullets);
    resetPlayer(p1, 700, 220, 1);
    p1.sprite.body.setAllowGravity(false);
    p1.weapon = scene.makeWeaponState(id);
    p1.aimMode = 'gun';
    p1.aiming = true;
    p1.aimFacing = 1;
    p1.aimAngle = 0;
    p1.nextShotAt = 0;
    const weapon = scene.configData.weapons[id];
    const ammoBefore = p1.weapon.ammo;
    const originalSpawnBullet = scene.spawnBullet.bind(scene);
    const spawnedBullets = [];
    scene.spawnBullet = (...args) => {
      const spawnedBullet = originalSpawnBullet(...args);
      spawnedBullets.push(spawnedBullet);
      return spawnedBullet;
    };
    try {
      scene.fireWeapon(p1, scene.time.now + 100 + weaponIds.indexOf(id) * 1000);
      await wait(Math.max(90, weapon.burst * weapon.burstDelayMs + 80));
    } finally {
      scene.spawnBullet = originalSpawnBullet;
    }
    const bullets = active(scene.bullets);
    check(`shooting spawns ${id} projectile(s)`, spawnedBullets.length >= weapon.burst * weapon.pellets, {
      bullets: spawnedBullets.length,
      activeBullets: bullets.length,
      expected: weapon.burst * weapon.pellets,
      ammoBefore,
      ammoAfter: p1.weapon?.ammo,
    });
    check(`shooting consumes ${id} ammo`, p1.weapon?.ammo === ammoBefore - 1, {
      ammoBefore,
      ammoAfter: p1.weapon?.ammo,
    });
    check(`projectiles fly straight for ${id}`, spawnedBullets.every((bullet) => bullet?.body && !bullet.body.allowGravity && bullet.body.velocity.x > 0), {
      velocities: spawnedBullets.map((bullet) => bullet?.body ? { x: Math.round(bullet.body.velocity.x), y: Math.round(bullet.body.velocity.y) } : null),
    });
  }
  clearGroup(scene.bullets);

  resetPlayer(p1, 700, 484, 1);
  resetPlayer(p2, 825, 484, -1);
  p1.weapon = scene.makeWeaponState('pistol');
  p2.health = 100;
  p2.invulnerableUntil = 0;
  scene.spawnBullet(p1, scene.configData.weapons.pistol, 0, p2.sprite.x, p2.sprite.y);
  let bullet = active(scene.bullets).at(-1);
  scene.handleBulletHit(bullet, p2.sprite);
  check('bullet hit registration damages opponent', p2.health === 90 && !bullet.active, { p2Health: p2.health });

  const windowPane = scene.createWindow(905, 420, 30, 34);
  scene.spawnBullet(p1, scene.configData.weapons.pistol, 0, windowPane.x, windowPane.y);
  bullet = active(scene.bullets).at(-1);
  scene.handleBulletWindow(bullet, windowPane);
  check('bullet breaks glass window', !windowPane.active && !bullet.active, {
    windowActive: windowPane.active,
    bulletActive: bullet.active,
  });

  const targetPlatform = scene.platforms.find((platform) => platform.active && platform.getData('levelGeometry'));
  const taggedPlatforms = snapshotPlatforms();
  check('platform geometry is tagged indestructible', taggedPlatforms.length > 0 && taggedPlatforms.every((platform) => platform.levelGeometry && platform.indestructible), {
    platformCount: taggedPlatforms.length,
    taggedPlatforms,
  });

  const bulletPlatformBefore = snapshotPlatforms();
  if (targetPlatform) {
    p1.weapon = scene.makeWeaponState('launcher');
    scene.spawnBullet(
      p1,
      scene.configData.weapons.launcher,
      Math.PI / 2,
      targetPlatform.x,
      targetPlatform.y - targetPlatform.displayHeight / 2 - 8,
    );
    bullet = active(scene.bullets).at(-1);
    scene.handleBulletWall(bullet, targetPlatform);
  }
  const bulletPlatformAfter = snapshotPlatforms();
  check('bullet impacts do not destroy platform geometry', Boolean(targetPlatform) && bullet && samePlatformSnapshot(bulletPlatformBefore, bulletPlatformAfter) && !bullet.active, {
    bulletActive: bullet?.active,
    before: bulletPlatformBefore,
    after: bulletPlatformAfter,
  });

  const grenadePlatformBefore = snapshotPlatforms();
  if (targetPlatform) {
    scene.explodeAt(targetPlatform.x, targetPlatform.y, 140, 1, p1.id, true);
  }
  const grenadePlatformAfter = snapshotPlatforms();
  check('grenade explosions do not destroy platform geometry', Boolean(targetPlatform) && samePlatformSnapshot(grenadePlatformBefore, grenadePlatformAfter), {
    before: grenadePlatformBefore,
    after: grenadePlatformAfter,
  });

  resetPlayer(p1, 700, 484, 1);
  resetPlayer(p2, 735, 484, -1);
  p2.invulnerableUntil = 0;
  scene.performMeleeCombo(p1, scene.time.now + 1500);
  check('melee combo damages opponent', p2.health < 100, { p2Health: p2.health });
  check('normal melee does not knock down', p2.knockedUntil <= scene.time.now, {
    knockedUntil: p2.knockedUntil,
    now: scene.time.now,
  });

  resetPlayer(p1, 700, 484, 1);
  resetPlayer(p2, 745, 484, -1);
  p2.invulnerableUntil = 0;
  scene.startDashAttack(p1, scene.time.now + 1800);
  scene.updateDashAttacks(scene.time.now + 1810);
  check('dash takedown damages opponent', p2.health < 100, { p2Health: p2.health });
  check('dash takedown knocks opponent down', p2.knockedUntil > scene.time.now, {
    knockedUntil: p2.knockedUntil,
    now: scene.time.now,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.grenadeAmmo = 3;
  scene.beginAim(p1, 'grenade', scene.time.now + 2200);
  scene.updateAim(p1, 0, -1, 250);
  scene.releaseAim(p1, scene.time.now + 2250);
  const grenades = active(scene.grenades);
  check('grenade aim release throws grenade', p1.grenadeAmmo === 2 && grenades.length >= 1, {
    grenadeAmmo: p1.grenadeAmmo,
    grenades: grenades.length,
    velocity: grenades[0] ? {
      x: Math.round(grenades[0].body.velocity.x),
      y: Math.round(grenades[0].body.velocity.y),
    } : null,
  });

  const failures = checks.filter((item) => !item.pass);
  return {
    ok: failures.length === 0,
    passed: checks.length - failures.length,
    failed: failures.length,
    failures,
    checks,
  };
})()
  .then((result) => {
    window.__superfightersMechanicsSmokeResult = result;
    return result;
  })
  .catch((error) => {
    window.__superfightersMechanicsSmokeResult = {
      ok: false,
      failures: [{ name: 'mechanics smoke script threw', details: String(error?.stack || error) }],
    };
    return window.__superfightersMechanicsSmokeResult;
  });
