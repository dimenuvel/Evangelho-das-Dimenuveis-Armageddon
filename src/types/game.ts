/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameMode = 'SINGLE_PLAYER_AI' | 'HOT_SEAT_LOCAL' | 'CAMPAIGN' | 'PRACTICE' | 'LOCAL_NETWORK';

export type AIDifficulty = 'EASY' | 'NORMAL' | 'ARCHON_NIGHTMARE';

export type Language = 'en' | 'pt';

export type FactionId =
  | 'DIMENUVELS'
  | 'GNOSTIC_ORDER'
  | 'ARCHONS'
  | 'COSMIC_BOWLERS'
  | 'HERMETIC_COUNCIL'
  | 'NIHILISTS'
  | 'CELESTIAL_MISFITS';

export interface FactionInfo {
  id: FactionId;
  nameKey: string;
  descKey: string;
  primaryColor: string;
  secondaryColor: string;
  symbol: string;
  defaultNames: string[];
}

export type WeaponId =
  | 'COSMIC_ROCKET'
  | 'COSMIC_BOWLING_BALL'
  | 'HOLY_HAND_GRENADE'
  | 'ARCHON_TAX_COLLECTOR'
  | 'GOLDEN_RATIO_CANNON'
  | 'SEVEN_CHAKRA_STRIKE'
  | 'AKASHIC_METEOR'
  | 'HERMETIC_BOOMERANG'
  | 'EGO_ERASER'
  | 'TEN_PLAGUES'
  | 'DIVINE_BOWLING_STRIKE'
  | 'HOLY_DYNAMITE'
  | 'DIMENSIONAL_TELEPORT'
  | 'COSMIC_JETPACK'
  | 'SKIP_TURN';

export type WeaponCategory = 'ARTILLERY' | 'COSMIC_BOWLING' | 'SACRED_DIVINE' | 'AIRSTRIKE' | 'TACTICAL_UTILITY';

export interface WeaponDef {
  id: WeaponId;
  nameKey: string;
  descKey: string;
  category: WeaponCategory;
  damage: number;
  blastRadius: number;
  initialAmmo: number; // -1 for infinite
  fuseSeconds?: number;
  isWindAffected: boolean;
  bounciness?: number;
  isAirstrike?: boolean;
  isUtility?: boolean;
  iconName: string;
}

export type MapId =
  | 'COSMIC_BOWLING_ALLEY'
  | 'GARDEN_OF_EDEN'
  | 'ARCHON_CITADEL'
  | 'SEVEN_HEAVENS'
  | 'AKASHIC_LIBRARY'
  | 'VOID_OF_NOTHINGNESS';

export interface MapDef {
  id: MapId;
  nameKey: string;
  descKey: string;
  bgImage?: string;
  skyGradient: [string, string];
  voidColor: string;
  terrainFill: string;
  terrainAccent: string;
  ambientParticles: string;
}

export interface Character {
  id: string;
  teamId: string;
  name: string;
  faction: FactionId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1; // 1 = right, -1 = left
  isGrounded: boolean;
  isDead: boolean;
  jetpackFuel: number;
  animFrame: number;
  walkTimer: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  faction: FactionId;
  isAI: boolean;
  aiDifficulty: AIDifficulty;
  score: number;
  weapons: Record<WeaponId, number>;
}

export interface Projectile {
  id: string;
  type: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  timer: number; // in seconds
  radius: number;
  damage: number;
  blastRadius: number;
  bounces: number;
  maxBounces: number;
  bounciness: number;
  isWindAffected: boolean;
  shooterTeamId: string;
  targetX?: number; // For airstrikes/teleports
  submunitionsCount?: number;
  specialData?: Record<string, any>;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'DIRT' | 'SPARK' | 'SMOKE' | 'GLYPH' | 'PIN' | 'RAINBOW';
  char?: string;
}

export interface DamageIndicator {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export interface GameSettings {
  language: Language;
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  turnTimeLimit: number; // 30, 45, 60, or 0 (unlimited)
  teamSize: number; // 2, 3, or 4
  hasSeenTour: boolean;
}

export interface CampaignMission {
  id: number;
  titleKey: string;
  descKey: string;
  mapId: MapId;
  difficulty: AIDifficulty;
  playerFaction: FactionId;
  enemyFaction: FactionId;
  playerTeamSize: number;
  enemyTeamSize: number;
  unlockDeityId: string;
  storyDialogKey: string;
}

export interface DeityInfo {
  id: string;
  name: string;
  nameKey: string;
  titleKey: string;
  loreKey: string;
  faction: FactionId;
  avatarIcon: string;
  unlockedByDefault: boolean;
}

export interface PlayerStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  damageDealt: number;
  pinsKnocked: number;
  voidDrownings: number;
  campaignStars: number;
  unlockedDeityIds: string[];
}
