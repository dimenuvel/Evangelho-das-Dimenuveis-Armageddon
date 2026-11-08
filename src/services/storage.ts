/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameSettings, PlayerStats } from '../types/game';

const SETTINGS_KEY = 'gospel_dimenuves_settings';
const STATS_KEY = 'gospel_dimenuves_stats';

export const defaultSettings: GameSettings = {
  language: 'en',
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 0.8,
  musicVolume: 0.4,
  turnTimeLimit: 45,
  teamSize: 3,
  hasSeenTour: false,
};

export const defaultStats: PlayerStats = {
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  damageDealt: 0,
  pinsKnocked: 0,
  voidDrownings: 0,
  campaignStars: 0,
  unlockedDeityIds: ['pinhead_thoth', 'sophia'],
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

const CAMPAIGN_KEY = 'gospel_dimenuves_campaign';

export function loadCompletedCampaignMissions(): number[] {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === 'number' && id >= 1 && id <= 6);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveCompletedCampaignMission(missionId: number): number[] {
  try {
    const current = loadCompletedCampaignMissions();
    if (!current.includes(missionId)) {
      current.push(missionId);
      current.sort((a, b) => a - b);
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(current));
    }
    return current;
  } catch {
    return [missionId];
  }
}

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const completedMissions = loadCompletedCampaignMissions();
    const computedStars = Math.min(18, completedMissions.length * 3);
    if (!raw) return { ...defaultStats, campaignStars: computedStars };
    const parsed = JSON.parse(raw);
    return {
      ...defaultStats,
      ...parsed,
      campaignStars: Math.max(parsed.campaignStars || 0, computedStars),
    };
  } catch {
    return { ...defaultStats };
  }
}

export function saveStats(stats: PlayerStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordMatchResult(won: boolean, damage: number, pins: number, voidKills: number) {
  const current = loadStats();
  current.matchesPlayed += 1;
  if (won) current.wins += 1;
  else current.losses += 1;
  current.damageDealt += damage;
  current.pinsKnocked += pins;
  current.voidDrownings += voidKills;
  saveStats(current);
  return current;
}

export function unlockDeity(deityId: string): PlayerStats {
  const current = loadStats();
  let changed = false;
  if (!current.unlockedDeityIds.includes(deityId)) {
    current.unlockedDeityIds.push(deityId);
    changed = true;
  }
  const completedMissions = loadCompletedCampaignMissions();
  const stars = Math.min(18, completedMissions.length * 3);
  if (current.campaignStars < stars) {
    current.campaignStars = stars;
    changed = true;
  }
  if (changed) {
    saveStats(current);
  }
  return current;
}
