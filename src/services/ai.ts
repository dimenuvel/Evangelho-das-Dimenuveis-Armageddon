/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIDifficulty, Character, Team, WeaponId } from '../types/game';
import { GRAVITY } from './physics';
import { terrain, VOID_LEVEL } from './terrain';

export interface AIDecision {
  weapon: WeaponId;
  angle: number; // in degrees (0 = right, 180 = left)
  power: number; // 0 to 100
  targetX?: number; // For airstrikes or teleport
  moveDirection?: 'left' | 'right' | null;
  moveDurationMs?: number;
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
      // Prioritize enemies close to void or low HP
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

  // Available weapons check
  const hasWeapons = activeTeam.weapons;

  // Strategic Weapon Choice
  let chosenWeapon: WeaponId = 'COSMIC_ROCKET';

  if (dist < 70 && hasWeapons['HOLY_DYNAMITE'] > 0) {
    chosenWeapon = 'HOLY_DYNAMITE';
  } else if (dist > 350 && (hasWeapons['ARCHON_TAX_COLLECTOR'] > 0 || hasWeapons['SEVEN_CHAKRA_STRIKE'] > 0)) {
    // High distance, airstrike is optimal!
    if (Math.random() < 0.6 && hasWeapons['ARCHON_TAX_COLLECTOR'] > 0) {
      chosenWeapon = 'ARCHON_TAX_COLLECTOR';
    } else if (hasWeapons['SEVEN_CHAKRA_STRIKE'] > 0) {
      chosenWeapon = 'SEVEN_CHAKRA_STRIKE';
    }
  } else if (dist > 150 && dist < 500 && Math.abs(dy) < 80 && hasWeapons['COSMIC_BOWLING_BALL'] > 0) {
    if (Math.random() < 0.45) {
      chosenWeapon = 'COSMIC_BOWLING_BALL';
    }
  } else if (dist > 200 && dist < 450 && hasWeapons['HOLY_HAND_GRENADE'] > 0) {
    if (difficulty !== 'EASY' && Math.random() < 0.4) {
      chosenWeapon = 'HOLY_HAND_GRENADE';
    }
  } else if (hasWeapons['GOLDEN_RATIO_CANNON'] > 0 && Math.random() < 0.35) {
    chosenWeapon = 'GOLDEN_RATIO_CANNON';
  }

  // If airstrike chosen, target is directly on the enemy's X
  if (chosenWeapon === 'ARCHON_TAX_COLLECTOR' || chosenWeapon === 'SEVEN_CHAKRA_STRIKE') {
    let variance = 0;
    if (difficulty === 'EASY') variance = (Math.random() - 0.5) * 80;
    else if (difficulty === 'NORMAL') variance = (Math.random() - 0.5) * 30;

    return {
      weapon: chosenWeapon,
      angle: 90,
      power: 80,
      targetX: Math.max(80, Math.min(1720, target.x + variance)),
    };
  }

  // Trajectory calculation
  // Base angle towards target in radians
  const isRight = dx >= 0;
  let baseLaunchAngleRad = isRight ? Math.PI / 4 : (3 * Math.PI) / 4; // 45 or 135 deg

  // If target is high up, increase angle; if target is far, adjust
  if (dy < -60) {
    baseLaunchAngleRad = isRight ? Math.PI / 3 : (2 * Math.PI) / 3; // 60 or 120 deg
  }

  // Solve physics power: Range R ~ (v^2 * sin(2*theta)) / g
  // Compensation for wind: wind pushes in direction of wind
  const windOffset = wind * 0.0035 * dist;
  const effectiveDx = dx - windOffset;
  const absDx = Math.abs(effectiveDx);

  // Parabolic approximation for required speed
  const theta = isRight ? baseLaunchAngleRad : Math.PI - baseLaunchAngleRad;
  const sin2Theta = Math.sin(2 * theta);
  const term = Math.max(0.1, sin2Theta);

  // v = sqrt( (g * dx^2) / (2 * cos^2(theta) * (dx*tan(theta) - dy)) )
  let requiredSpeed = Math.sqrt((GRAVITY * absDx) / term);
  if (isNaN(requiredSpeed) || !isFinite(requiredSpeed)) {
    requiredSpeed = Math.sqrt(absDx * 0.4);
  }

  // Convert speed to 0-100 power scale (max speed ~ 18)
  let calculatedPower = Math.min(100, Math.max(15, (requiredSpeed / 13) * 100));
  let calculatedAngleDeg = (baseLaunchAngleRad * 180) / Math.PI;

  // Apply difficulty variance
  if (difficulty === 'EASY') {
    calculatedAngleDeg += (Math.random() - 0.5) * 24;
    calculatedPower += (Math.random() - 0.5) * 32;
  } else if (difficulty === 'NORMAL') {
    calculatedAngleDeg += (Math.random() - 0.5) * 8;
    calculatedPower += (Math.random() - 0.5) * 12;
  } else {
    // Archon Nightmare: fine-tune
    calculatedAngleDeg += (Math.random() - 0.5) * 2;
    calculatedPower += (Math.random() - 0.5) * 4;
  }

  // Clamp
  calculatedPower = Math.min(100, Math.max(15, Math.round(calculatedPower)));
  calculatedAngleDeg = Math.min(175, Math.max(5, Math.round(calculatedAngleDeg)));

  // Decide if bot needs a quick reposition walk (e.g. if close to cliff)
  let moveDir: 'left' | 'right' | null = null;
  let moveDur = 0;
  if (activeChar.x < 150) {
    moveDir = 'right';
    moveDur = 600;
  } else if (activeChar.x > 1650) {
    moveDir = 'left';
    moveDur = 600;
  }

  return {
    weapon: chosenWeapon,
    angle: calculatedAngleDeg,
    power: calculatedPower,
    moveDirection: moveDir,
    moveDurationMs: moveDur,
  };
}
