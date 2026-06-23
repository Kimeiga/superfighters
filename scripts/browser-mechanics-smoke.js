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
    player.currentLadder = null;
    for (const inputPart of Object.values(player.inputState)) {
      for (const action of Object.keys(inputPart)) {
        inputPart[action] = false;
      }
    }
    player.health = 100;
    player.weapon = null;
    player.grenadeAmmo = scene.configData.grenades.startCount;
    player.powerup = null;
    player.currentPickup = null;
    player.invulnerableUntil = 0;
    player.knockedUntil = 0;
    player.sprite.body?.setAllowGravity?.(true);
    player.nextMeleeAt = 0;
    player.nextShotAt = 0;
    player.nextGrenadeAt = 0;
    player.nextPowerupAt = 0;
    player.meleeAnimationUntil = 0;
    player.pickupAnimationUntil = 0;
    player.crouchTransitionUntil = 0;
    player.crouchTransitionGun = false;
    player.standTransitionUntil = 0;
    player.standTransitionGun = false;
    player.climbIntroUntil = 0;
    player.climbEndUntil = 0;
    player.ladderGunDrawUntil = 0;
    player.ladderEndFootY = 0;
    player.dashAttackUntil = 0;
    player.rollUntil = 0;
    player.rollEndAt = 0;
    player.rollDirection = 0;
    player.grenadeCookStartedAt = 0;
    player.grenadeCookText?.destroy?.();
    player.grenadeCookText = null;
    player.onFireUntil = 0;
    player.nextFireDamageAt = 0;
    player.fireOwnerId = null;
    player.fireEffect?.destroy?.();
    player.fireEffect = null;
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

  let uiClickCount = 0;
  let uiClickPrevented = false;
  const uiSmokeContainer = scene.add.container(0, 0).setVisible(true);
  const uiSmokeButton = scene.createMenuButton(180, 180, 'Smoke Button', () => {
    uiClickCount += 1;
  });
  uiSmokeContainer.add(uiSmokeButton);
  scene.addToUiLayer(uiSmokeContainer);
  scene.handleUiPointerDown({
    x: 180,
    y: 180,
    event: {
      preventDefault: () => {
        uiClickPrevented = true;
      },
    },
  });
  check('screen-space UI button dispatcher handles nested buttons', uiClickCount === 1 && uiClickPrevented, {
    uiClickCount,
    uiClickPrevented,
  });
  uiSmokeContainer.destroy();

  const weaponIds = Object.keys(scene.configData.weapons);
  check('movement speed is tuned down', scene.configData.movement.walkSpeed === 225 && scene.configData.movement.runSpeed === 225, {
    walkSpeed: scene.configData.movement.walkSpeed,
    runSpeed: scene.configData.movement.runSpeed,
  });
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

  resetPlayer(p1, 700, 484, 1);
  p1.weapon = null;
  let pickup = scene.createPickup(p1.sprite.x, p1.sprite.y, 'weapon', 'pistol');
  p1.currentPickup = pickup;
  scene.tryAutoPickup(p1);
  check('empty weapon slot auto-picks weapon on walkover', p1.weapon?.id === 'pistol' && !pickup.active, {
    weapon: p1.weapon?.id,
    pickupActive: pickup.active,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.weapon = scene.makeWeaponState('pistol');
  pickup = scene.createPickup(p1.sprite.x, p1.sprite.y, 'weapon', 'rifle');
  p1.currentPickup = pickup;
  scene.tryAutoPickup(p1);
  check('filled weapon slot does not auto-pick weapon on walkover', p1.weapon?.id === 'pistol' && pickup.active, {
    weapon: p1.weapon?.id,
    pickupActive: pickup.active,
    pickupId: pickup.getData('id'),
  });
  clearGroup(scene.pickups);

  resetPlayer(p1, 700, 484, 1);
  scene.startCrouchTransition(p1, scene.time.now + 5);
  check('crouch transition without weapon uses no-gun animation', !p1.crouchTransitionGun && p1.sprite.anims.currentAnim?.key === 'girl-crouch-down', {
    crouchTransitionGun: p1.crouchTransitionGun,
    animation: p1.sprite.anims.currentAnim?.key,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.weapon = scene.makeWeaponState('pistol');
  scene.startCrouchTransition(p1, scene.time.now + 5);
  check('crouch transition with weapon uses gun animation', p1.crouchTransitionGun && p1.sprite.anims.currentAnim?.key === 'girl-crouch-down-gun', {
    crouchTransitionGun: p1.crouchTransitionGun,
    animation: p1.sprite.anims.currentAnim?.key,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.crouching = true;
  p1.weapon = null;
  pickup = scene.createPickup(p1.sprite.x, p1.sprite.y, 'weapon', 'rifle');
  p1.currentPickup = pickup;
  scene.handlePickupPressed(p1, scene.time.now + 10);
  check('pickup button takes weapon while crouched', p1.weapon?.id === 'rifle' && !pickup.active, { weapon: p1.weapon?.id });

  p1.pickupAnimationUntil = 0;
  p1.meleeAnimationUntil = 0;
  p1.crouching = true;
  p1.weapon = scene.makeWeaponState('pistol');
  pickup = scene.createPickup(p1.sprite.x + 5, p1.sprite.y, 'weapon', 'sniper');
  p1.currentPickup = pickup;
  scene.handlePickupPressed(p1, scene.time.now + 30);
  const droppedPistol = active(scene.pickups).some((item) => item.getData('kind') === 'weapon' && item.getData('id') === 'pistol');
  check('pickup button swaps weapon', p1.weapon?.id === 'sniper' && droppedPistol, { weapon: p1.weapon?.id, droppedPistol });
  clearGroup(scene.pickups);

  const aimCheck = (name, facing, vertical, shouldBeAbove) => {
    resetPlayer(p1, 700, 484, facing);
    p1.weapon = scene.makeWeaponState('pistol');
    scene.beginAim(p1, 'gun', scene.time.now + 50);
    scene.updateAim(p1, 0, vertical, 500);
    const pivot = scene.getAimPivot(p1);
    const reticle = scene.getAimReticlePosition(p1, p1.aimAngle);
    const anchor = scene.getAimAnchor(p1, p1.aimAngle, p1.aimFacing);
    const weaponDistance = Phaser.Math.Distance.Between(p1.weaponSprite.x, p1.weaponSprite.y, anchor.x, anchor.y);
    const expectedArmSign = shouldBeAbove ? (facing > 0 ? -1 : 1) : (facing > 0 ? 1 : -1);
    check(name, shouldBeAbove ? reticle.y < pivot.y : reticle.y > pivot.y, {
      facing,
      vertical,
      pivotY: Math.round(pivot.y),
      reticleY: Math.round(reticle.y),
      angle: Number(p1.aimAngle.toFixed(3)),
    });
    check(`${name} rotates arm and keeps weapon on hand`, p1.arm.visible && weaponDistance <= 1 && Math.sign(p1.arm.rotation) === expectedArmSign, {
      facing,
      vertical,
      armRotation: Number(p1.arm.rotation.toFixed(3)),
      weaponDistance: Number(weaponDistance.toFixed(2)),
      armVisible: p1.arm.visible,
    });
  };
  aimCheck('aim up while facing right', 1, -1, true);
  aimCheck('aim down while facing right', 1, 1, false);
  aimCheck('aim up while facing left', -1, -1, true);
  aimCheck('aim down while facing left', -1, 1, false);

  resetPlayer(p1, 700, 484, 1);
  resetPlayer(p2, 1040, 484, -1);
  p1.weapon = scene.makeWeaponState('pistol');
  p2.weapon = scene.makeWeaponState('pistol');
  scene.beginAim(p1, 'gun', scene.time.now + 51);
  scene.beginAim(p2, 'gun', scene.time.now + 51);
  scene.updateAimVisuals(p1);
  scene.updateAimVisuals(p2);
  check('all guns draw player-colored aim lasers', p1.aimGraphics.visible && p2.aimGraphics.visible && scene.getLaserColor(p1) !== scene.getLaserColor(p2), {
    p1Laser: scene.getLaserColor(p1),
    p2Laser: scene.getLaserColor(p2),
    p1GraphicsVisible: p1.aimGraphics.visible,
    p2GraphicsVisible: p2.aimGraphics.visible,
  });
  scene.setAimVisible(p1, false);
  scene.setAimVisible(p2, false);

  const empressFrameOf = (sprite) => Number((sprite?.texture?.key ?? '').match(/empress-frame-(\d+)$/)?.[1] ?? NaN);
  const gunLayerCheck = (name, animationKey, bodyFrame, expectedArmFrame) => {
    resetPlayer(p1, 700, 484, 1);
    p1.weapon = scene.makeWeaponState('pistol');
    p1.sprite.play(animationKey, true);
    p1.sprite.setTexture(scene.getCharacterTextureKey(bodyFrame));
    scene.updateAimVisuals(p1);
    check(name, empressFrameOf(p1.sprite) === bodyFrame && empressFrameOf(p1.arm) === expectedArmFrame && p1.weaponSprite.visible && p1.arm.visible && p1.sprite.depth < p1.weaponSprite.depth && p1.weaponSprite.depth < p1.arm.depth, {
      bodyFrame: empressFrameOf(p1.sprite),
      armFrame: empressFrameOf(p1.arm),
      weaponVisible: p1.weaponSprite.visible,
      armVisible: p1.arm.visible,
      depths: {
        body: p1.sprite.depth,
        weapon: p1.weaponSprite.depth,
        arm: p1.arm.depth,
      },
    });
  };
  gunLayerCheck('idle gun keeps full body plus arm overlay', 'girl-idle-gun', 29, 37);
  gunLayerCheck('run gun keeps full body plus arm overlay', 'girl-run-gun', 106, 114);
  gunLayerCheck('crouch gun keeps full body plus arm overlay', 'girl-crouch', 61, 73);
  gunLayerCheck('jump gun keeps full body plus arm overlay', 'girl-jump-up-gun', 134, 145);

  const ladderBounds = new Phaser.Geom.Rectangle(700, 392, 30, 190);
  const fakeLadder = { active: true, getData: (key) => (key === 'bounds' ? ladderBounds : null) };
  resetPlayer(p1, 700, 484, 1);
  p1.weapon = scene.makeWeaponState('pistol');
  p1.sprite.play('girl-jump-up-gun', true);
  p1.sprite.setTexture(scene.getCharacterTextureKey(134));
  scene.updateAimVisuals(p1);
  const ladderBefore = { armVisible: p1.arm.visible, weaponVisible: p1.weaponSprite.visible };
  scene.startLadderClimb(p1, fakeLadder, -1, scene.time.now + 55);
  scene.updatePlayerAnimation(p1, true, 0, scene.time.now + 55);
  scene.updateAimVisuals(p1);
  check('entering ladder clears stale gun animation layers', ladderBefore.armVisible && ladderBefore.weaponVisible && p1.climbing && p1.sprite.anims.currentAnim?.key === 'girl-climb-ladder' && !p1.arm.visible && !p1.weaponSprite.visible, {
    before: ladderBefore,
    animation: p1.sprite.anims.currentAnim?.key,
    climbing: p1.climbing,
    armVisible: p1.arm.visible,
    weaponVisible: p1.weaponSprite.visible,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.weapon = scene.makeWeaponState('pistol');
  scene.startLadderEnd(p1, fakeLadder, scene.time.now + 60);
  const ladderEndBody = p1.sprite.body;
  const targetFootY = ladderBounds.y + 2;
  const visualFootY = Math.round(ladderEndBody.y + ladderEndBody.height);
  scene.finishLadderEnd(p1);
  const finalFootY = Math.round(p1.sprite.body.y + p1.sprite.body.height);
  check('ladder end animation is visually lowered then snaps to the platform top', visualFootY === Math.round(targetFootY + 38) && finalFootY === Math.round(targetFootY), {
    visualFootY,
    finalFootY,
    targetFootY,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.weapon = scene.makeWeaponState('pistol');
  p1.crouching = true;
  pickup = scene.createPickup(p1.sprite.x + 4, p1.sprite.y, 'weapon', 'rifle');
  p1.currentPickup = pickup;
  scene.handleMeleePressed(p1, scene.time.now + 70);
  check('crouch plus melee swaps pickup instead of crouch melee', p1.weapon?.id === 'rifle' && p1.sprite.anims.currentAnim?.key === 'girl-pickup', {
    weapon: p1.weapon?.id,
    animation: p1.sprite.anims.currentAnim?.key,
  });
  clearGroup(scene.pickups);

  resetPlayer(p1, 700, 484, 1);
  p1.sprite.body.blocked.down = true;
  p1.sprite.body.touching.down = true;
  scene.performMeleeCombo(p1, scene.time.now + 80);
  const comboFirst = p1.sprite.anims.currentAnim?.key;
  const firstUntil = p1.meleeAnimationUntil;
  scene.performMeleeCombo(p1, scene.time.now + 90);
  const comboStillFirst = p1.sprite.anims.currentAnim?.key;
  p1.meleeAnimationUntil = 0;
  p1.nextMeleeAt = 0;
  scene.performMeleeCombo(p1, firstUntil + 25);
  const comboSecond = p1.sprite.anims.currentAnim?.key;
  check('melee combo advances one hit per press', comboFirst === 'girl-melee-1' && comboStillFirst === 'girl-melee-1' && comboSecond === 'girl-melee-2', {
    comboFirst,
    comboStillFirst,
    comboSecond,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.weapon = scene.makeWeaponState('pistol');
  p1.aimMode = 'gun';
  p1.aiming = true;
  p1.aimFacing = 1;
  p1.aimAngle = 0;
  const bulletPivot = scene.getAimPivot(p1);
  const gunAnchor = scene.getAimAnchor(p1, p1.aimAngle);
  const bulletOrigin = scene.getBulletOrigin(p1);
  check('bullet origin comes from gun hand instead of body center', bulletOrigin.x > gunAnchor.x && bulletOrigin.x > bulletPivot.x + 18, {
    pivot: { x: Math.round(bulletPivot.x), y: Math.round(bulletPivot.y) },
    anchor: { x: Math.round(gunAnchor.x), y: Math.round(gunAnchor.y) },
    origin: { x: Math.round(bulletOrigin.x), y: Math.round(bulletOrigin.y) },
  });

  const targetPlatformForTrace = scene.platforms.find((platform) => platform.active && platform.getData('levelGeometry') && !platform.getData('thin'));
  if (targetPlatformForTrace) {
    clearGroup(scene.bullets);
    const traceY = targetPlatformForTrace.body.y + targetPlatformForTrace.body.height / 2;
    const traceBullet = scene.spawnBullet(p1, scene.configData.weapons.pistol, 0, targetPlatformForTrace.body.x - 22, traceY);
    traceBullet.setData('previousX', targetPlatformForTrace.body.x - 22);
    traceBullet.setData('previousY', traceY);
    traceBullet.setPosition(targetPlatformForTrace.body.x + targetPlatformForTrace.body.width + 22, traceY);
    check('bullet segment tracing catches wall tunneling', scene.findBulletSegmentWallHit(traceBullet) === targetPlatformForTrace, {
      platform: {
        x: Math.round(targetPlatformForTrace.body.x),
        y: Math.round(targetPlatformForTrace.body.y),
        width: Math.round(targetPlatformForTrace.body.width),
        height: Math.round(targetPlatformForTrace.body.height),
      },
    });
    traceBullet.destroy();
  }

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
    const spawnedBulletStates = [];
    scene.spawnBullet = (...args) => {
      const spawnedBullet = originalSpawnBullet(...args);
      spawnedBullets.push(spawnedBullet);
      spawnedBulletStates.push({
        allowGravity: spawnedBullet?.body?.allowGravity,
        velocityX: spawnedBullet?.body?.velocity?.x ?? 0,
        velocityY: spawnedBullet?.body?.velocity?.y ?? 0,
      });
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
    check(`projectiles fly straight for ${id}`, spawnedBulletStates.every((bullet) => !bullet.allowGravity && bullet.velocityX > 0), {
      velocities: spawnedBulletStates.map((bullet) => ({ x: Math.round(bullet.velocityX), y: Math.round(bullet.velocityY) })),
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
  check('bullet breaks and passes through glass window', !windowPane.active && bullet.active, {
    windowActive: windowPane.active,
    bulletActive: bullet.active,
  });
  clearGroup(scene.bullets);

  const targetPlatform = scene.platforms.find((platform) => platform.active && platform.getData('levelGeometry'));
  const taggedPlatforms = snapshotPlatforms().filter((platform) => platform.levelGeometry);
  check('platform geometry is tagged indestructible', taggedPlatforms.length > 0 && taggedPlatforms.every((platform) => platform.levelGeometry && platform.indestructible), {
    platformCount: taggedPlatforms.length,
    taggedPlatforms,
  });

  const bulletPlatformBefore = snapshotPlatforms();
  if (targetPlatform) {
    resetPlayer(p1, 700, 484, 1);
    resetPlayer(p2, targetPlatform.x, targetPlatform.y - targetPlatform.displayHeight / 2 - 8, -1);
    p2.invulnerableUntil = 0;
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
  check('launcher wall impact explodes without destroying platform geometry', Boolean(targetPlatform) && bullet && samePlatformSnapshot(bulletPlatformBefore, bulletPlatformAfter) && !bullet.active && p2.health < 100, {
    bulletActive: bullet?.active,
    p2Health: p2.health,
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
  resetPlayer(p2, 1040, 484, -1);
  p1.sprite.body.blocked.down = true;
  p1.sprite.body.touching.down = true;
  const meleePivot = scene.getAimPivot(p1);
  const meleeWindow = scene.createWindow(meleePivot.x + p1.facing * 34, meleePivot.y, 30, 34);
  scene.performMeleeCombo(p1, scene.time.now + 1450);
  scene.resolveMeleeActiveFrame(p1, p1.meleeAttackState.id);
  check('single melee hit breaks glass window', !meleeWindow.active, {
    windowActive: meleeWindow.active,
  });

  resetPlayer(p1, 700, 484, 1);
  resetPlayer(p2, 735, 484, -1);
  p1.sprite.body.blocked.down = true;
  p1.sprite.body.touching.down = true;
  p2.invulnerableUntil = 0;
  scene.performMeleeCombo(p1, scene.time.now + 1500);
  scene.resolveMeleeActiveFrame(p1, p1.meleeAttackState.id);
  check('melee combo damages opponent', p2.health < 100, { p2Health: p2.health });
  check('normal melee does not knock down', p2.knockedUntil <= scene.time.now, {
    knockedUntil: p2.knockedUntil,
    now: scene.time.now,
  });

  resetPlayer(p1, 700, 484, 1);
  resetPlayer(p2, 735, 484, -1);
  p2.invulnerableUntil = 0;
  p1.sprite.body.blocked.down = true;
  p1.sprite.body.touching.down = true;
  p1.inputState.down.right = true;
  p1.inputState.pressed.melee = true;
  scene.handleMeleePressed(p1, scene.time.now + 1650);
  scene.updateDashAttacks(scene.time.now + 1660);
  check('moving melee triggers dash takedown input path', p1.dashAttackUntil > scene.time.now && p2.knockedUntil > scene.time.now, {
    dashAttackUntil: p1.dashAttackUntil,
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
  p1.grenadeCookStartedAt = scene.time.now + 1200;
  scene.updateAim(p1, 0, -1, 250);
  const expectedGrenadeOrigin = scene.getGrenadeOrigin(p1);
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
  check('grenade spawns from hand anchor', grenades[0] && Phaser.Math.Distance.Between(grenades[0].x, grenades[0].y, expectedGrenadeOrigin.x, expectedGrenadeOrigin.y) <= 2, {
    expected: {
      x: Math.round(expectedGrenadeOrigin.x),
      y: Math.round(expectedGrenadeOrigin.y),
    },
    actual: grenades[0] ? {
      x: Math.round(grenades[0].x),
      y: Math.round(grenades[0].y),
    } : null,
  });
  check('grenade uses high ground-slide drag', grenades[0]?.body?.drag?.x >= scene.configData.grenades.dragX, {
    dragX: grenades[0]?.body?.drag?.x,
    configured: scene.configData.grenades.dragX,
  });
  check('thrown grenade keeps visible cooked fuse timer', grenades[0]?.getData('timerText')?.active && grenades[0]?.getData('fuseEnd') > scene.time.now, {
    timerActive: grenades[0]?.getData('timerText')?.active,
    fuseRemaining: grenades[0] ? Math.round(grenades[0].getData('fuseEnd') - scene.time.now) : null,
  });

  const oldSlopeTiles = scene.slopeTiles;
  const oldSlopeTileMap = scene.slopeTileMap;
  const oldEditorLevel = scene.editorLevel;
  scene.editorLevel = { tileSize: 30 };
  const testSlope = { x: 300, y: 300, size: 30, type: 'down', side: 'floor', thin: false, tileX: 10, tileY: 10 };
  scene.slopeTiles = [testSlope];
  scene.slopeTileMap = new Map([['10,10', testSlope]]);
  const slopeGrenade = scene.physics.add.image(315, 306, 'grenade-pixel');
  scene.grenades.add(slopeGrenade);
  slopeGrenade.body.setCircle(7);
  slopeGrenade.body.setVelocity(90, 160);
  const slopeResolved = scene.resolveGrenadeSlopeContact(slopeGrenade);
  const slopeGrenadeBottom = slopeGrenade.body.y + slopeGrenade.body.height;
  check('grenades resolve against solid slope floors', slopeResolved && slopeGrenadeBottom >= testSlope.y && slopeGrenadeBottom <= testSlope.y + testSlope.size, {
    slopeResolved,
    grenadeBottom: Math.round(slopeGrenadeBottom),
  });
  slopeGrenade.destroy();
  scene.slopeTiles = oldSlopeTiles;
  scene.slopeTileMap = oldSlopeTileMap;
  scene.editorLevel = oldEditorLevel;
  clearGroup(scene.grenades);

  resetPlayer(p1, 700, 484, 1);
  const barrel = scene.createLevelProp(p1.sprite.x + 8, p1.sprite.y, 30, 30, 'barrel');
  scene.damageLevelProp(barrel, 999, p1.id, p1.sprite.x, p1.sprite.y);
  scene.updateBurningProps(scene.time.now + 20);
  check('barrels ignite before exploding and set nearby players on fire', barrel.active && barrel.getData('ignited') && p1.onFireUntil > scene.time.now, {
    barrelActive: barrel.active,
    ignited: barrel.getData('ignited'),
    onFireUntil: p1.onFireUntil,
  });
  scene.startRoll(p1, scene.time.now + 40, 1);
  check('rolling extinguishes player fire', p1.onFireUntil === 0 && p1.rollUntil > scene.time.now, {
    onFireUntil: p1.onFireUntil,
    rollUntil: p1.rollUntil,
  });
  scene.explodeIgnitedBarrel(barrel);

  resetPlayer(p1, 700, 484, 1);
  p1.health = 50;
  const healPickup = scene.createPickup(p1.sprite.x, p1.sprite.y, 'powerup', 'heal');
  p1.currentPickup = healPickup;
  scene.tryAutoPickup(p1);
  scene.activatePowerup(p1, scene.time.now + 2400);
  check('heal powerup auto-picks and heals on activation', p1.health === 90 && p1.powerup === null && !healPickup.active, {
    health: p1.health,
    powerup: p1.powerup,
    pickupActive: healPickup.active,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.powerup = 'shield';
  scene.activatePowerup(p1, scene.time.now + 2450);
  p1.invulnerableUntil = 0;
  scene.damagePlayer(p1, 20, 1, 0, 0, { source: 'shield test' });
  check('shield powerup reduces incoming damage', p1.health === 91 && p1.powerup === null, {
    health: p1.health,
    shieldUntil: p1.shieldUntil,
    powerup: p1.powerup,
  });

  resetPlayer(p1, 700, 484, 1);
  resetPlayer(p2, 1040, 484, -1);
  p1.powerup = 'slowmo';
  scene.activatePowerup(p1, scene.time.now + 2500);
  check('slowmo powerup slows opponent movement', p2.slowedUntil > scene.time.now && scene.getMoveSpeed(p2, scene.time.now + 2500) < scene.configData.movement.walkSpeed, {
    slowedUntil: p2.slowedUntil,
    speed: scene.getMoveSpeed(p2, scene.time.now + 2500),
    walkSpeed: scene.configData.movement.walkSpeed,
  });

  resetPlayer(p1, 700, 484, 1);
  p1.powerup = 'haste';
  scene.activatePowerup(p1, scene.time.now + 2550);
  check('haste powerup increases movement speed', p1.hasteUntil > scene.time.now && scene.getMoveSpeed(p1, scene.time.now + 2550) > scene.configData.movement.walkSpeed, {
    hasteUntil: p1.hasteUntil,
    speed: scene.getMoveSpeed(p1, scene.time.now + 2550),
    walkSpeed: scene.configData.movement.walkSpeed,
  });

  clearGroup(scene.bullets);
  clearGroup(scene.pickups);
  resetPlayer(p1, 700, 220, 1);
  p1.sprite.body.setAllowGravity(false);
  p1.weapon = scene.makeWeaponState('pistol');
  p1.weapon.ammo = 1;
  p1.aimMode = 'gun';
  p1.aiming = true;
  p1.aimFacing = 1;
  p1.aimAngle = 0;
  p1.nextShotAt = 0;
  scene.fireWeapon(p1, scene.time.now + 2600);
  await wait(320);
  check('empty weapon is discarded after last shot', p1.weapon === null && p1.aimMode === null && p1.shootStanceUntil === 0, {
    weapon: p1.weapon,
    aimMode: p1.aimMode,
    shootStanceUntil: p1.shootStanceUntil,
  });

  resetPlayer(p2, 1040, 484, -1);
  p2.aimMode = 'gun';
  p2.aiming = true;
  p2.powerup = 'heal';
  p2.weapon = scene.makeWeaponState('rifle');
  scene.applyRemoteSnapshot(p2, {
    x: p2.sprite.x,
    y: p2.sprite.y,
    vx: 0,
    vy: 0,
    health: p2.health,
    lives: p2.lives,
    kills: p2.kills,
    facing: -1,
    aimFacing: -1,
    aimOffset: 0,
    aimAngle: Math.PI,
    aiming: false,
    aimMode: null,
    crouching: false,
    climbing: false,
    weapon: null,
    grenadeAmmo: 0,
    powerup: null,
  });
  check('remote snapshot clears stale weapon aim and powerup state', p2.weapon === null && p2.aimMode === null && p2.powerup === null && !p2.aiming, {
    weapon: p2.weapon,
    aimMode: p2.aimMode,
    powerup: p2.powerup,
    aiming: p2.aiming,
  });

  resetPlayer(p1, 700, 484, 1);
  resetPlayer(p2, 1040, 484, -1);
  clearGroup(scene.pickups);
  p1.kills = 0;
  p2.lives = scene.configData.round.lives;
  p2.invulnerableUntil = 0;
  p2.weapon = scene.makeWeaponState('rifle');
  p2.powerup = 'shield';
  p2.grenadeAmmo = 2;
  p2.dashAttackUntil = scene.time.now + 5000;
  p2.nextMeleeAt = scene.time.now + 5000;
  p2.nextShotAt = scene.time.now + 5000;
  p2.nextGrenadeAt = scene.time.now + 5000;
  p2.nextPowerupAt = scene.time.now + 5000;
  p2.meleeAnimationUntil = scene.time.now + 5000;
  p2.pickupAnimationUntil = scene.time.now + 5000;
  p2.slowedUntil = scene.time.now + 5000;
  p2.shieldUntil = scene.time.now + 5000;
  p2.hasteUntil = scene.time.now + 5000;
  p2.currentPickup = scene.createPickup(p2.sprite.x, p2.sprite.y, 'powerup', 'heal');
  const deathDropY = p2.sprite.y - 18;
  scene.damagePlayer(p2, 999, 1, 250, 250, { source: 'test lethal' });
  const deathDrops = active(scene.pickups)
    .filter((item) => Math.abs((item.getData('logicalY') ?? item.y) - deathDropY) < 1)
    .map((item) => `${item.getData('kind')}:${item.getData('id')}`);
  check('lethal damage respawns player with clean action state', (
    p1.kills === 1 &&
    p2.lives === scene.configData.round.lives - 1 &&
    p2.health === 100 &&
    p2.weapon === null &&
    p2.powerup === null &&
    p2.grenadeAmmo === scene.configData.grenades.startCount &&
    p2.invulnerableUntil > scene.time.now &&
    p2.dashAttackUntil === 0 &&
    p2.nextMeleeAt === 0 &&
    p2.nextShotAt === 0 &&
    p2.nextGrenadeAt === 0 &&
    p2.nextPowerupAt === 0 &&
    p2.meleeAnimationUntil === 0 &&
    p2.pickupAnimationUntil === 0 &&
    p2.slowedUntil === 0 &&
    p2.shieldUntil === 0 &&
    p2.hasteUntil === 0 &&
    p2.currentPickup === null &&
    deathDrops.length === 3 &&
    deathDrops.includes('weapon:rifle') &&
    deathDrops.includes('powerup:shield') &&
    deathDrops.includes('grenade:grenade') &&
    p2.sprite.x === p2.spawnX &&
    p2.sprite.y === p2.spawnY &&
    p2.sprite.body.velocity.x === 0 &&
    p2.sprite.body.velocity.y === 0
  ), {
    kills: p1.kills,
    lives: p2.lives,
    health: p2.health,
    weapon: p2.weapon,
    powerup: p2.powerup,
    grenadeAmmo: p2.grenadeAmmo,
    deathDrops,
    invulnerableUntil: p2.invulnerableUntil,
    now: scene.time.now,
    dashAttackUntil: p2.dashAttackUntil,
    nextMeleeAt: p2.nextMeleeAt,
    nextShotAt: p2.nextShotAt,
    nextGrenadeAt: p2.nextGrenadeAt,
    nextPowerupAt: p2.nextPowerupAt,
    meleeAnimationUntil: p2.meleeAnimationUntil,
    pickupAnimationUntil: p2.pickupAnimationUntil,
    slowedUntil: p2.slowedUntil,
    shieldUntil: p2.shieldUntil,
    hasteUntil: p2.hasteUntil,
    currentPickup: p2.currentPickup,
    x: p2.sprite.x,
    y: p2.sprite.y,
    spawnX: p2.spawnX,
    spawnY: p2.spawnY,
    velocity: {
      x: p2.sprite.body.velocity.x,
      y: p2.sprite.body.velocity.y,
    },
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
