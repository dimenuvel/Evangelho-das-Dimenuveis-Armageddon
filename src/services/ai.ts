/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIDifficulty, Character, Team, WeaponId } from '../types/game';
import { WEAPONS } from './gameConstants';
import { GRAVITY } from './physics';
import { terrain, VOID_LEVEL } from './terrain';

export interface AIDecision {
  weapon: WeaponId;
  angle: number; // in degrees (0 = right, 180 = left)
  power: number; // 20 to 100
  targetX?: number; // For airstrikes or teleport
  moveDirection?: 'left' | 'right' | null;
  moveDurationMs?: number;
}

interface SimOutcome {
  angle: number;
  power: number;
  minEnemyDist: number;
  impactDistFromTarget: number;
  hitsSelfOrAlly: boolean;
  blockedEarly: boolean;
  score: number;
}

function simulateTrajectory(
  shooter: Character,
  target: Character,
  allCharacters: Character[],
  angleDeg: number,
  power: number,
  wind: number,
  isWindAffected: boolean,
  bounciness: number,
  maxBounces: number,
  fuseSeconds: number
): SimOutcome {
  const rad = (angleDeg * Math.PI) / 180;
  const speed = (Math.max(20, power) / 100) * 12;

  let x = shooter.x + Math.cos(rad) * 18;
  let y = shooter.y - Math.sin(rad) * 18;
  let vx = Math.cos(rad) * speed;
  let vy = -Math.sin(rad) * speed;

  // Immediate terrain block right at muzzle
  if (terrain.isSolid(x, y)) {
    return {
      angle: angleDeg,
      power,
      minEnemyDist: Infinity,
      impactDistFromTarget: Infinity,
      hitsSelfOrAlly: true,
      blockedEarly: true,
      score: -100000,
    };
  }

  let bounces = 0;
  let timer = fuseSeconds;
  let minEnemyDist = Infinity;
  let impactX = x;
  let impactY = y;
  let impacted = false;
  let blockedEarly = false;

  const allies = allCharacters.filter((c) => c.teamId === shooter.teamId && !c.isDead);
  const enemies = allCharacters.filter((c) => c.teamId !== shooter.teamId && !c.isDead);

  for (let tick = 0; tick < 180; tick++) {
    if (isWindAffected) {
      vx += wind * 0.00035;
    }
    vy += GRAVITY * 0.85;
    timer -= 0.03;

    const steps = Math.max(1, Math.ceil(Math.hypot(vx, vy) / 4));
    for (let s = 1; s <= steps; s++) {
      const curX = x + (vx / steps) * s;
      const curY = y + (vy / steps) * s;

      if (curY >= VOID_LEVEL) {
        impactX = curX;
        impactY = curY;
        impacted = true;
        break;
      }

      const dTarget = Math.hypot(target.x - curX, target.y - curY);
      if (dTarget < minEnemyDist) minEnemyDist = dTarget;

      const hitTerrain = terrain.isSolid(curX, curY);
      let hitEnemy = false;
      for (const e of enemies) {
        if (Math.hypot(e.x - curX, e.y - curY) < 16) {
          hitEnemy = true;
          break;
        }
      }

      if (hitTerrain || hitEnemy) {
        if (bounciness > 0 && bounces < maxBounces && timer > 0 && !hitEnemy) {
          bounces++;
          vy = -vy * bounciness;
          vx = vx * 0.7;
          x = curX + vx;
          y = curY + vy;
          break;
        } else {
          impactX = curX;
          impactY = curY;
          impacted = true;
          if (tick < 4 && Math.hypot(curX - shooter.x, curY - shooter.y) < 48) {
            blockedEarly = true;
          }
          break;
        }
      }
    }

    if (impacted) break;

    x += vx;
    y += vy;

    if (timer <= 0) {
      impactX = x;
      impactY = y;
      impacted = true;
      break;
    }
  }

  const impactDistFromTarget = Math.hypot(impactX - target.x, impactY - target.y);

  // Check if impact hits shooter or any ally
  let hitsSelfOrAlly = false;
  for (const ally of allies) {
    if (Math.hypot(impactX - ally.x, impactY - ally.y) < 58) {
      hitsSelfOrAlly = true;
      break;
    }
  }

  // Score: closer impact to target is much better; penalize hitting allies or walls right next to shooter
  let score = -impactDistFromTarget;
  if (minEnemyDist < 22) score += 120;
  else if (impactDistFromTarget < 45) score += 80;
  if (hitsSelfOrAlly) score -= 500;
  if (blockedEarly) score -= 800;

  return {
    angle: angleDeg,
    power,
    minEnemyDist,
    impactDistFromTarget,
    hitsSelfOrAlly,
    blockedEarly,
    score,
  };
}

export function computeAITurn(
  activeChar: Character,
  allCharacters: Character[],
  activeTeam: Team,
  difficulty: AIDifficulty,
  wind: number
): AIDecision {
  // Find living opponents
  const enemies = allCharacters.filter((c) => c.teamId !== activeChar.teamId && !c.isDead);

  if (enemies.length === 0) {
    return {
      weapon: 'SKIP_TURN',
      angle: 45,
      power: 50,
    };
  }

  // Choose target: on Nightmare, target lowest HP or near edge
  let target = enemies[0];
  if (difficulty === 'ARCHON_NIGHTMARE') {
    target = enemies.reduce((prev, curr) => {
      const scorePrev = (100 - prev.hp) + (prev.y > 600 ? 50 : 0);
      const scoreCurr = (100 - curr.hp) + (curr.y > 600 ? 50 : 0);
      return scoreCurr > scorePrev ? curr : prev;
    });
  } else {
    // Normal / Easy: pick closest enemy
    let closestDist = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - activeChar.x, e.y - activeChar.y);
      if (d < closestDist) {
        closestDist = d;
        target = e;
      }
    }
  }

  const dx = target.x - activeChar.x;
  const dy = target.y - activeChar.y;
  const dist = Math.hypot(dx, dy);
  const isRight = dx >= 0;

  // Available weapons check
  const hasWeapons = activeTeam.weapons;

  // Strategic Weapon Choice
  let chosenWeapon: WeaponId = 'COSMIC_ROCKET';

  if (dist < 65 && hasWeapons['HOLY_DYNAMITE'] > 0) {
    chosenWeapon = 'HOLY_DYNAMITE';
  } else if (dist > 340 && (hasWeapons['ARCHON_TAX_COLLECTOR'] > 0 || hasWeapons['SEVEN_CHAKRA_STRIKE'] > 0 || hasWeapons['AKASHIC_METEOR'] > 0)) {
    if (Math.random() < 0.5 && hasWeapons['ARCHON_TAX_COLLECTOR'] > 0) {
      chosenWeapon = 'ARCHON_TAX_COLLECTOR';
    } else if (hasWeapons['SEVEN_CHAKRA_STRIKE'] > 0 && Math.random() < 0.6) {
      chosenWeapon = 'SEVEN_CHAKRA_STRIKE';
    } else if (hasWeapons['AKASHIC_METEOR'] > 0 && Math.random() < 0.5) {
      chosenWeapon = 'AKASHIC_METEOR';
    }
  } else if (dist > 150 && dist < 500 && Math.abs(dy) < 80 && hasWeapons['COSMIC_BOWLING_BALL'] > 0) {
    if (Math.random() < 0.4) {
      chosenWeapon = 'COSMIC_BOWLING_BALL';
    }
  } else if (dist > 200 && dist < 450 && hasWeapons['HOLY_HAND_GRENADE'] > 0) {
    if (difficulty !== 'EASY' && Math.random() < 0.35) {
      chosenWeapon = 'HOLY_HAND_GRENADE';
    }
  } else if (hasWeapons['GOLDEN_RATIO_CANNON'] > 0 && Math.random() < 0.3) {
    chosenWeapon = 'GOLDEN_RATIO_CANNON';
  }

  const safeFacingAngle = isRight ? 45 : 135;

  // If airstrike chosen, target directly over enemy X (and keep angle pointing toward enemy, never 90!)
  if (WEAPONS[chosenWeapon]?.isAirstrike) {
    let variance = 0;
    if (difficulty === 'EASY') variance = (Math.random() - 0.5) * 90;
    else if (difficulty === 'NORMAL') variance = (Math.random() - 0.5) * 35;

    return {
      weapon: chosenWeapon,
      angle: safeFacingAngle,
      power: 75,
      targetX: Math.max(80, Math.min(1720, target.x + variance)),
    };
  }

  if (chosenWeapon === 'HOLY_DYNAMITE') {
    return {
      weapon: chosenWeapon,
      angle: safeFacingAngle,
      power: 40,
      moveDirection: isRight ? 'left' : 'right',
      moveDurationMs: 500,
    };
  }

  // Ballistic solver: simulate candidate (angle, power) pairs on the target's hemisphere
  // Deliberately avoid straight-up angles (83..97) unless target is almost directly overhead
  const weaponDef = WEAPONS[chosenWeapon] || WEAPONS.COSMIC_ROCKET;
  const candidateAngles = isRight
    ? [15, 25, 35, 45, 55, 65, 75]
    : [165, 155, 145, 135, 125, 115, 105];

  if (Math.abs(dx) < 35 && dy < -50) {
    candidateAngles.push(isRight ? 82 : 98);
  }

  const candidatePowers = [25, 38, 50, 62, 75, 88, 100];

  let best: SimOutcome | null = null;

  for (const ang of candidateAngles) {
    for (const pwr of candidatePowers) {
      const outcome = simulateTrajectory(
        activeChar,
        target,
        allCharacters,
        ang,
        pwr,
        wind,
        weaponDef.isWindAffected,
        weaponDef.bounciness ?? 0,
        weaponDef.bounciness ? 4 : 0,
        weaponDef.fuseSeconds ?? 10
      );
      if (!best || outcome.score > best.score) {
        best = outcome;
      }
    }
  }

  // If chosen specialty weapon is blocked or dangerous, fall back to standard COSMIC_ROCKET check
  if ((!best || best.blockedEarly || best.hitsSelfOrAlly) && chosenWeapon !== 'COSMIC_ROCKET') {
    chosenWeapon = 'COSMIC_ROCKET';
    for (const ang of candidateAngles) {
      for (const pwr of candidatePowers) {
        const outcome = simulateTrajectory(
          activeChar,
          target,
          allCharacters,
          ang,
          pwr,
          wind,
          true,
          0,
          0,
          10
        );
        if (!best || outcome.score > best.score) {
          best = outcome;
        }
      }
    }
  }

  let calculatedAngleDeg = best ? best.angle : safeFacingAngle;
  let calculatedPower = best ? best.power : Math.min(100, Math.max(25, Math.round(dist * 0.14)));

  // Fine-tune search around best solution for Normal / Nightmare
  if (best && !best.blockedEarly && difficulty !== 'EASY') {
    for (let dAng = -6; dAng <= 6; dAng += 3) {
      for (let dPwr = -8; dPwr <= 8; dPwr += 4) {
        const testAng = isRight
          ? Math.min(82, Math.max(8, best.angle + dAng))
          : Math.min(172, Math.max(98, best.angle + dAng));
        const testPwr = Math.min(100, Math.max(20, best.power + dPwr));
        const outcome = simulateTrajectory(
          activeChar,
          target,
          allCharacters,
          testAng,
          testPwr,
          wind,
          WEAPONS[chosenWeapon].isWindAffected,
          WEAPONS[chosenWeapon].bounciness ?? 0,
          WEAPONS[chosenWeapon].bounciness ? 4 : 0,
          WEAPONS[chosenWeapon].fuseSeconds ?? 10
        );
        if (outcome.score > best.score) {
          best = outcome;
          calculatedAngleDeg = testAng;
          calculatedPower = testPwr;
        }
      }
    }
  }

  // Apply difficulty variance
  if (difficulty === 'EASY') {
    calculatedAngleDeg += (Math.random() - 0.5) * 18;
    calculatedPower += (Math.random() - 0.5) * 24;
  } else if (difficulty === 'NORMAL') {
    calculatedAngleDeg += (Math.random() - 0.5) * 6;
    calculatedPower += (Math.random() - 0.5) * 8;
  } else {
    calculatedAngleDeg += (Math.random() - 0.5) * 2;
    calculatedPower += (Math.random() - 0.5) * 3;
  }

  // Clamp strictly so bots never randomly shoot straight up (83..97)
  calculatedPower = Math.min(100, Math.max(20, Math.round(calculatedPower)));
  if (isRight) {
    calculatedAngleDeg = Math.min(82, Math.max(8, Math.round(calculatedAngleDeg)));
  } else {
    calculatedAngleDeg = Math.min(172, Math.max(98, Math.round(calculatedAngleDeg)));
  }

  // Decide if bot needs a quick reposition walk (e.g. close to edge or blocked)
  let moveDir: 'left' | 'right' | null = null;
  let moveDur = 0;
  if (activeChar.x < 150) {
    moveDir = 'right';
    moveDur = 550;
  } else if (activeChar.x > 1650) {
    moveDir = 'left';
    moveDur = 550;
  } else if (best?.blockedEarly) {
    moveDir = isRight ? 'left' : 'right';
    moveDur = 450;
  }

  return {
    weapon: chosenWeapon,
    angle: calculatedAngleDeg,
    power: calculatedPower,
    moveDirection: moveDir,
    moveDurationMs: moveDur,
  };
}
