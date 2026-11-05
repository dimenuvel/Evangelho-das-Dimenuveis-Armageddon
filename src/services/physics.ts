/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character, DamageIndicator, Particle, Projectile, WeaponId } from '../types/game';
import { sound } from './sound';
import { terrain, VOID_LEVEL, WORLD_HEIGHT, WORLD_WIDTH } from './terrain';

export const GRAVITY = 0.24;
export const MAX_FALL_SPEED = 14;

export interface PhysicsTickResult {
  explosions: Array<{ x: number; y: number; radius: number; isCosmic: boolean }>;
  newProjectiles: Projectile[];
  damagedCharacters: Array<{ character: Character; damage: number }>;
  voidEliminations: Character[];
}

export function updateCharacterPhysics(
  char: Character,
  moveInput: { left: boolean; right: boolean; jump: boolean; backflip: boolean; jetpack: boolean },
  damageIndicators: DamageIndicator[],
  particles: Particle[]
): { diedInVoid: boolean; fellDown: boolean } {
  if (char.isDead) return { diedInVoid: false, fellDown: false };

  // Jetpack movement
  if (moveInput.jetpack && char.jetpackFuel > 0) {
    char.vy -= 0.6;
    if (char.vy < -4.5) char.vy = -4.5;
    char.jetpackFuel = Math.max(0, char.jetpackFuel - 0.7);

    // Jetpack thrust particles
    if (Math.random() < 0.6) {
      particles.push({
        x: char.x + (Math.random() * 8 - 4),
        y: char.y + 12,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 2 + Math.random() * 2,
        color: '#38bdf8',
        size: 3,
        life: 0,
        maxLife: 20,
        type: 'SPARK',
      });
    }
  }

  // Horizontal walking
  let speed = 1.3;
  if (moveInput.left) {
    char.facing = -1;
    char.vx = -speed;
    char.walkTimer += 1;
    char.animFrame = Math.floor(char.walkTimer / 6) % 4;
  } else if (moveInput.right) {
    char.facing = 1;
    char.vx = speed;
    char.walkTimer += 1;
    char.animFrame = Math.floor(char.walkTimer / 6) % 4;
  } else {
    // Ground friction when standing, light drag when in air
    if (char.isGrounded) {
      char.vx *= 0.6;
      if (Math.abs(char.vx) < 0.05) char.vx = 0;
    } else {
      char.vx *= 0.96;
    }
    char.animFrame = 0;
  }

  // Jumping & Backflip
  if (char.isGrounded) {
    if (moveInput.jump) {
      char.vy = -6.8;
      char.vx = char.facing * 2.6;
      char.y -= 4; // Lift off ground immediately so feet clear ground
      char.isGrounded = false;
      moveInput.jump = false;
      sound.playJump();
    } else if (moveInput.backflip) {
      char.vy = -9.2; // High backwards leap
      char.vx = -char.facing * 3.4;
      char.y -= 4; // Lift off ground immediately
      char.isGrounded = false;
      moveInput.backflip = false;
      sound.playJump();
    }
  }

  // Apply gravity
  if (!char.isGrounded) {
    char.vy += GRAVITY;
    if (char.vy > MAX_FALL_SPEED) char.vy = MAX_FALL_SPEED;
  }

  // Test horizontal movement with slope stepping (up to 4px steps)
  if (char.vx !== 0) {
    const nextX = char.x + char.vx;
    // Bounds check
    if (nextX >= 16 && nextX <= WORLD_WIDTH - 16) {
      // Step test
      let canMove = true;
      let stepY = 0;
      for (let s = 0; s <= 5; s++) {
        if (!terrain.isSolid(nextX, char.y - s)) {
          stepY = -s;
          break;
        }
        if (s === 5) canMove = false;
      }

      if (canMove) {
        char.x = nextX;
        char.y += stepY;
      } else {
        char.vx = 0;
      }
    }
  }

  // Ceiling check when jumping upwards
  if (char.vy < 0 && terrain.isSolid(char.x, char.y - 14)) {
    char.vy = 0.5; // Bump head
  }

  // Test vertical movement & ground collision
  const prevVy = char.vy;
  char.y += char.vy;

  // Feet position (ONLY test landing when falling downwards: char.vy >= 0)
  if (char.vy >= 0) {
    const feetX = char.x;
    const feetY = char.y + 12;

    if (terrain.isSolid(feetX, feetY)) {
      // Landed on ground
      let gy = feetY;
      while (terrain.isSolid(feetX, gy) && gy > char.y - 10) {
        gy--;
      }
      char.y = gy - 12;

      // Check fall damage
      if (prevVy > 8.5) {
        const damage = Math.min(50, Math.floor((prevVy - 8.5) * 11));
        if (damage > 0) {
          char.hp = Math.max(0, char.hp - damage);
          sound.playGrunt();
          damageIndicators.push({
            id: Math.random().toString(),
            x: char.x,
            y: char.y - 25,
            text: `-${damage}`,
            color: '#f87171',
            alpha: 1,
            vy: -1.2,
          });
        }
      }

      char.vy = 0;
      char.isGrounded = true;
    } else {
      char.isGrounded = false;
    }
  } else {
    // Currently ascending in air
    char.isGrounded = false;
  }

  // Void elimination check
  if (char.y >= VOID_LEVEL) {
    char.isDead = true;
    char.hp = 0;
    sound.playSplash();

    // Void splash particles
    for (let i = 0; i < 15; i++) {
      particles.push({
        x: char.x + (Math.random() * 20 - 10),
        y: VOID_LEVEL,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 3,
        color: '#c084fc',
        size: 3 + Math.random() * 3,
        life: 0,
        maxLife: 25,
        type: 'RAINBOW',
      });
    }

    return { diedInVoid: true, fellDown: false };
  }

  return { diedInVoid: false, fellDown: false };
}

export function updateProjectiles(
  projectiles: Projectile[],
  characters: Character[],
  wind: number,
  dt: number,
  particles: Particle[],
  damageIndicators: DamageIndicator[]
): PhysicsTickResult {
  const result: PhysicsTickResult = {
    explosions: [],
    newProjectiles: [],
    damagedCharacters: [],
    voidEliminations: [],
  };

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    // Wind influence
    if (p.isWindAffected) {
      p.vx += wind * 0.00035;
    }

    // Special behavior
    if (p.type === 'HERMETIC_BOOMERANG') {
      // Arcs forward then turns back towards shooter
      p.vx -= 0.08;
    }

    // Gravity
    p.vy += GRAVITY * 0.85;

    // Rotation
    p.rotation += p.vRot;

    // Countdown fuse
    p.timer -= dt;

    // Sub-step raycasting to prevent tunneling through thin terrain
    const steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) / 4));
    let hitSomething = false;
    let hitX = p.x;
    let hitY = p.y;

    for (let s = 1; s <= steps; s++) {
      const curX = p.x + (p.vx / steps) * s;
      const curY = p.y + (p.vy / steps) * s;

      // Void check
      if (curY >= VOID_LEVEL) {
        sound.playSplash();
        projectiles.splice(i, 1);
        hitSomething = true;
        break;
      }

      // Terrain collision
      const hitTerrain = terrain.isSolid(curX, curY);

      // Character proximity collision
      let hitChar: Character | null = null;
      for (const char of characters) {
        if (!char.isDead && Math.hypot(char.x - curX, char.y - curY) < 16) {
          hitChar = char;
          break;
        }
      }

      if (hitTerrain || hitChar) {
        hitX = curX;
        hitY = curY;

        // Bouncing logic for Bowling Ball, Holy Hand Grenade, etc.
        if (p.bounciness > 0 && p.bounces < p.maxBounces && p.timer > 0) {
          p.bounces++;
          // Invert velocity with dampening
          p.vy = -p.vy * p.bounciness;
          p.vx = p.vx * 0.7;

          // Sound
          if (p.type === 'COSMIC_BOWLING_BALL') {
            sound.playShoot('BOWLING');
          }

          p.x = curX + p.vx;
          p.y = curY + p.vy;
          hitSomething = true;
          break;
        } else {
          // Detonate!
          hitSomething = true;
          projectiles.splice(i, 1);
          triggerExplosion(p, hitX, hitY, characters, result, particles, damageIndicators);
          break;
        }
      }
    }

    if (hitSomething) continue;

    // Update position
    p.x += p.vx;
    p.y += p.vy;

    // Trail particles
    if (Math.random() < 0.4) {
      particles.push({
        x: p.x,
        y: p.y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        color: p.type === 'HOLY_HAND_GRENADE' ? '#fde047' : '#c084fc',
        size: 2 + Math.random() * 2,
        life: 0,
        maxLife: 15,
        type: 'SPARK',
      });
    }

    // Timer expired detonation (for grenades, dynamite, etc.)
    if (p.timer <= 0) {
      projectiles.splice(i, 1);
      triggerExplosion(p, p.x, p.y, characters, result, particles, damageIndicators);
    }
  }

  return result;
}

export function triggerExplosion(
  p: Projectile,
  ex: number,
  ey: number,
  characters: Character[],
  result: PhysicsTickResult,
  particles: Particle[],
  damageIndicators: DamageIndicator[]
) {
  // Special weapon cluster splits
  if (p.type === 'GOLDEN_RATIO_CANNON' && (!p.submunitionsCount || p.submunitionsCount === 0)) {
    // Splits into 3 Fibonacci spiral clusters
    for (let c = 0; c < 3; c++) {
      const angle = (c * 2.399963) - Math.PI / 2; // Golden angle (approx 137.5 deg)
      result.newProjectiles.push({
        id: Math.random().toString(),
        type: 'GOLDEN_RATIO_CANNON',
        x: ex,
        y: ey - 5,
        vx: Math.cos(angle) * 3.5,
        vy: Math.sin(angle) * 3.5 - 2,
        rotation: 0,
        vRot: 0.1,
        timer: 1.2,
        radius: 4,
        damage: 30,
        blastRadius: 38,
        bounces: 0,
        maxBounces: 1,
        bounciness: 0.3,
        isWindAffected: true,
        shooterTeamId: p.shooterTeamId,
        submunitionsCount: 1, // Prevent infinite split
      });
    }
  } else if (p.type === 'TEN_PLAGUES' && (!p.submunitionsCount || p.submunitionsCount === 0)) {
    // Bursts into 8 hopping plague globules
    for (let g = 0; g < 8; g++) {
      const angle = (g / 8) * Math.PI * 2;
      result.newProjectiles.push({
        id: Math.random().toString(),
        type: 'TEN_PLAGUES',
        x: ex,
        y: ey - 4,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3) - 2,
        rotation: 0,
        vRot: 0.1,
        timer: 1.5 + Math.random() * 0.8,
        radius: 3,
        damage: 18,
        blastRadius: 28,
        bounces: 0,
        maxBounces: 2,
        bounciness: 0.6,
        isWindAffected: true,
        shooterTeamId: p.shooterTeamId,
        submunitionsCount: 1,
      });
    }
  }

  // Audio trigger
  const isCosmic =
    p.type === 'HOLY_HAND_GRENADE' ||
    p.type === 'SEVEN_CHAKRA_STRIKE' ||
    p.type === 'EGO_ERASER' ||
    p.type === 'COSMIC_BOWLING_BALL';

  if (p.type === 'HOLY_HAND_GRENADE') {
    sound.playHolyChime();
    sound.playExplosion(p.blastRadius * 1.3, true);
  } else if (p.type === 'DIVINE_BOWLING_STRIKE' || p.type === 'COSMIC_BOWLING_BALL') {
    sound.playBowlingStrike();
  } else if (p.type === 'EGO_ERASER') {
    sound.playEgoImplosion();
  } else if (p.type === 'ARCHON_TAX_COLLECTOR') {
    sound.playBureaucratStamp();
    sound.playExplosion(p.blastRadius, false);
  } else {
    sound.playExplosion(p.blastRadius, isCosmic);
  }

  // Terrain Carve
  terrain.carveExplosion(ex, ey, p.blastRadius, particles);

  result.explosions.push({
    x: ex,
    y: ey,
    radius: p.blastRadius,
    isCosmic,
  });

  // Blast and knockback characters
  for (const char of characters) {
    if (char.isDead) continue;
    const dist = Math.hypot(char.x - ex, char.y - ey);

    if (dist < p.blastRadius * 1.15) {
      const factor = Math.max(0.15, 1 - dist / (p.blastRadius * 1.15));
      const damage = Math.round(p.damage * factor);

      char.hp = Math.max(0, char.hp - damage);
      result.damagedCharacters.push({ character: char, damage });

      // Knockback impulse vector
      const angle = Math.atan2(char.y - ey, char.x - ex);
      const impulse = (p.blastRadius / 8) * factor * 1.8;
      char.vx += Math.cos(angle) * impulse;
      char.vy += Math.sin(angle) * impulse - 3.5; // Always loft up
      char.isGrounded = false;

      // Floating damage number
      damageIndicators.push({
        id: Math.random().toString(),
        x: char.x,
        y: char.y - 25,
        text: `-${damage}`,
        color: damage > 40 ? '#ef4444' : '#fbbf24',
        alpha: 1,
        vy: -1.4,
      });

      if (char.hp <= 0) {
        char.isDead = true;
        sound.playGrunt();
      }
    }
  }

  // Smoke & blast flash particles
  const particleCount = Math.min(45, Math.floor(p.blastRadius * 0.7));
  for (let k = 0; k < particleCount; k++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * (p.blastRadius / 10);
    particles.push({
      x: ex,
      y: ey,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: isCosmic ? (Math.random() < 0.5 ? '#e879f9' : '#38bdf8') : '#fb923c',
      size: 3 + Math.random() * 5,
      life: 0,
      maxLife: 20 + Math.random() * 25,
      type: 'SMOKE',
    });
  }
}
