/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CampaignModal } from './components/CampaignModal';
import { DeitiesModal } from './components/DeitiesModal';
import { FirstLaunchTourModal } from './components/FirstLaunchTourModal';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { HotSeatTransitionModal } from './components/HotSeatTransitionModal';
import { LocalNetworkModal } from './components/LocalNetworkModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleMenu } from './components/TitleMenu';
import { WeaponSheet } from './components/WeaponSheet';
import { computeAITurn } from './services/ai';
import { networkService, NetworkMatchConfig } from './services/networkService';
import {
  CAMPAIGN_MISSIONS,
  DEITIES,
  FACTIONS,
  MAPS,
  WEAPONS,
} from './services/gameConstants';
import { getTranslation, translations } from './services/localization';
import {
  triggerExplosion,
  updateCharacterPhysics,
  updateProjectiles,
} from './services/physics';
import { sound } from './services/sound';
import {
  loadCompletedCampaignMissions,
  loadSettings,
  loadStats,
  recordMatchResult,
  saveCompletedCampaignMission,
  saveSettings,
  saveStats,
  unlockDeity,
} from './services/storage';
import { terrain, VOID_LEVEL, WORLD_HEIGHT, WORLD_WIDTH } from './services/terrain';
import {
  AIDifficulty,
  CampaignMission,
  Character,
  DamageIndicator,
  FactionId,
  GameMode,
  GameSettings,
  Language,
  MapDef,
  MapId,
  Particle,
  PlayerStats,
  Projectile,
  Team,
  WeaponDef,
  WeaponId,
} from './types/game';

export default function App() {
  // Global App States
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [stats, setStats] = useState<PlayerStats>(() => loadStats());
  const [view, setView] = useState<'MENU' | 'MATCH'>('MENU');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Modals
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => !loadSettings().hasSeenTour);
  const [isCampaignOpen, setIsCampaignOpen] = useState<boolean>(false);
  const [isDeitiesOpen, setIsDeitiesOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isWeaponSheetOpen, setIsWeaponSheetOpen] = useState<boolean>(false);
  const [isHotSeatModalOpen, setIsHotSeatModalOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);

  // Match State
  const [gameMode, setGameMode] = useState<GameMode>('SINGLE_PLAYER_AI');
  const [currentMap, setCurrentMap] = useState<MapDef>(MAPS.COSMIC_BOWLING_ALLEY);
  const [teams, setTeams] = useState<Team[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(0);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [wind, setWind] = useState<number>(0);
  const [turnTimer, setTurnTimer] = useState<number>(45);
  const [turnPhase, setTurnPhase] = useState<'AIMING' | 'FIRING' | 'IMPACT_SETTLING' | 'RETREAT'>('AIMING');
  const [impactPoint, setImpactPoint] = useState<{ x: number; y: number } | null>(null);
  const lastExplosionTimeRef = useRef<number>(0);
  const settlingStartTimeRef = useRef<number>(0);
  const pendingAirstrikesRef = useRef<number>(0);
  const hasRetreatedRef = useRef<boolean>(false);
  const [isRetreating, setIsRetreating] = useState<boolean>(false);
  const [retreatTimer, setRetreatTimer] = useState<number>(0);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [completedCampaignMissions, setCompletedCampaignMissions] = useState<number[]>(() =>
    loadCompletedCampaignMissions()
  );
  const [activeCampaignMission, setActiveCampaignMission] = useState<CampaignMission | null>(null);
  const [privacyHandoffEnabled, setPrivacyHandoffEnabled] = useState<boolean>(true);

  // Local Wi-Fi Network Mode State
  const [isLocalNetworkModalOpen, setIsLocalNetworkModalOpen] = useState<boolean>(false);
  const [networkRole, setNetworkRole] = useState<'HOST' | 'GUEST' | null>(null);
  const [networkMatchConfig, setNetworkMatchConfig] = useState<NetworkMatchConfig | null>(null);

  // Check if it's the local player's turn to control in Local Network mode
  const isMyNetworkTurn =
    gameMode !== 'LOCAL_NETWORK' ||
    (networkRole === 'HOST' ? activeTeamIdx === 0 : activeTeamIdx === 1);
  const isRemoteOpponentTurn = gameMode === 'LOCAL_NETWORK' && !isMyNetworkTurn;

  // Match Stats Accumulator
  const [totalTurnsCount, setTotalTurnsCount] = useState<number>(0);
  const [totalDamageCount, setTotalDamageCount] = useState<number>(0);
  const [pinsKnockedCount, setPinsKnockedCount] = useState<number>(0);
  const [voidElimsCount, setVoidElimsCount] = useState<number>(0);
  const [winningTeam, setWinningTeam] = useState<Team | null>(null);

  // Controls & Aiming State
  const [aimAngle, setAimAngle] = useState<number>(45);
  const [aimPower, setAimPower] = useState<number>(50);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [selectedWeaponId, setSelectedWeaponId] = useState<WeaponId>('COSMIC_ROCKET');
  const [airstrikeTargetX, setAirstrikeTargetX] = useState<number | null>(null);
  const [isJetpackActive, setIsJetpackActive] = useState<boolean>(false);

  // Camera State
  const [zoom, setZoom] = useState<number>(1.0);
  const [isFreeCamera, setIsFreeCamera] = useState<boolean>(false);
  const [isMapPanned, setIsMapPanned] = useState<boolean>(false);
  const handlePanStateChange = useCallback((panned: boolean) => {
    setIsMapPanned(panned);
  }, []);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [cameraOffset, setCameraOffset] = useState<{ x: number; y: number }>({
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
  });

  // Movement input states
  const moveInputRef = useRef({
    left: false,
    right: false,
    jump: false,
    backflip: false,
    jetpack: false,
  });

  // Dynamic entities
  const projectilesRef = useRef<Projectile[]>([]);
  const [activeProjectiles, setActiveProjectiles] = useState<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const [activeParticles, setActiveParticles] = useState<Particle[]>([]);
  const damageIndicatorsRef = useRef<DamageIndicator[]>([]);
  const [activeDamageIndicators, setActiveDamageIndicators] = useState<DamageIndicator[]>([]);

  // Charging power interval ref
  const chargeIntervalRef = useRef<number | null>(null);
  const powerRef = useRef<number>(50);
  const isAITurnActiveRef = useRef<boolean>(false);

  // Sync settings with sound engine
  useEffect(() => {
    sound.updateSettings(
      settings.soundEnabled,
      settings.musicEnabled,
      settings.soundVolume,
      settings.musicVolume
    );
  }, [settings]);

  // Handle tour completion
  const handleCloseTour = () => {
    setIsTourOpen(false);
    const updated = { ...settings, hasSeenTour: true };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleResetProgress = () => {
    localStorage.clear();
    setSettings(loadSettings());
    setStats(loadStats());
    setCompletedCampaignMissions([1]);
  };

  // Auto-open local network modal if URL has ?join=XXXX and sanitize HTTPS storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'https:') {
        const saved = localStorage.getItem('gospel_lan_server_url');
        if (saved && saved.startsWith('http://')) {
          localStorage.removeItem('gospel_lan_server_url');
        }
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('join')) {
        setIsLocalNetworkModalOpen(true);
      }
    }
  }, []);

  // Listen to remote actions in Local Network mode
  useEffect(() => {
    const unsubAction = networkService.on('gameAction', (payload: any) => {
      if (gameMode !== 'LOCAL_NETWORK') return;

      const { action, data } = payload;
      switch (action) {
        case 'MOVE':
          moveInputRef.current = {
            left: !!data.left,
            right: !!data.right,
            jump: !!data.jump,
            backflip: !!data.backflip,
            jetpack: !!data.jetpack,
          };
          if (data.jetpack !== undefined) {
            setIsJetpackActive(data.jetpack);
          }
          if (data.x !== undefined || data.y !== undefined) {
            const activeChar = characters.find((c) => c.id === activeCharId);
            if (activeChar) {
              if (data.x !== undefined) activeChar.x = data.x;
              if (data.y !== undefined) activeChar.y = data.y;
              if (data.facing !== undefined) activeChar.facing = data.facing;
            }
          }
          break;

        case 'AIM':
          if (data.angle !== undefined) {
            setAimAngle(data.angle);
            const activeChar = characters.find((c) => c.id === activeCharId);
            if (activeChar && data.facing !== undefined) {
              activeChar.facing = data.facing;
            }
          }
          break;

        case 'WEAPON_SELECT':
          if (data.weaponId) {
            setSelectedWeaponId(data.weaponId);
          }
          break;

        case 'CYCLE_WARRIOR':
          if (data.charId) {
            setActiveCharId(data.charId);
            sound.playClick();
            setIsMapPanned(false);
            setRecenterTrigger((c) => c + 1);
          }
          break;

        case 'JETPACK':
          setIsJetpackActive(!!data.active);
          moveInputRef.current.jetpack = !!data.active;
          break;

        case 'FIRE':
          if (data.weaponId) {
            setSelectedWeaponId(data.weaponId);
          }
          fireCurrentWeapon(data.angle, data.power, data.targetX);
          break;

        case 'ADVANCE_TURN':
          if (data.wind !== undefined) {
            setWind(data.wind);
          }
          break;
      }
    });

    const unsubSync = networkService.on('syncState', (payload: any) => {
      if (payload.characters && Array.isArray(payload.characters)) {
        setCharacters(payload.characters);
      }
      if (payload.wind !== undefined) {
        setWind(payload.wind);
      }
      if (payload.activeCharId) {
        setActiveCharId(payload.activeCharId);
      }
    });

    const unsubDisconnect = networkService.on('opponentDisconnected', () => {
      if (gameMode === 'LOCAL_NETWORK') {
        setAnnouncement(
          settings.language === 'pt'
            ? '⚠️ Oponente desconectado da rede Wi-Fi local'
            : '⚠️ Opponent disconnected from local Wi-Fi'
        );
        setTimeout(() => setAnnouncement(null), 5000);
      }
    });

    return () => {
      unsubAction();
      unsubSync();
      unsubDisconnect();
    };
  }, [gameMode, activeCharId, characters, settings.language]);

  // Launch Local Network Match
  const handleLaunchNetworkMatch = (config: NetworkMatchConfig) => {
    setIsLocalNetworkModalOpen(false);
    setNetworkRole(config.myRole);
    setNetworkMatchConfig(config);

    setupMatch({
      mode: 'LOCAL_NETWORK',
      team1Name: config.host.name || (settings.language === 'pt' ? 'Anfitrião Alfa' : 'Alpha Host'),
      team1Faction: config.host.faction,
      team1Color: FACTIONS[config.host.faction].primaryColor,
      team2Name: config.guest.name || (settings.language === 'pt' ? 'Convidado Ômega' : 'Omega Guest'),
      team2Faction: config.guest.faction,
      team2Color: FACTIONS[config.guest.faction].primaryColor,
      mapId: config.settings.mapId,
      difficulty: 'NORMAL',
      teamSize: config.settings.teamSize,
      privacyHandoff: false,
    });
  };

  // Start a new match
  const setupMatch = (config: {
    mode: GameMode;
    team1Name: string;
    team1Faction: FactionId;
    team1Color: string;
    team2Name: string;
    team2Faction: FactionId;
    team2Color: string;
    mapId: MapId;
    difficulty: AIDifficulty;
    teamSize: number;
    privacyHandoff: boolean;
    campaignMission?: CampaignMission;
  }) => {
    sound.ensureContext();
    sound.playClick();

    setGameMode(config.mode);
    setPrivacyHandoffEnabled(config.privacyHandoff);
    setActiveCampaignMission(config.campaignMission || null);

    const mapDef = MAPS[config.mapId] || MAPS.COSMIC_BOWLING_ALLEY;
    setCurrentMap(mapDef);

    // 1. Generate destructible terrain for the selected map
    terrain.generateMap(config.mapId);

    // 2. Prepare teams
    const defaultWeapons: Record<WeaponId, number> = {} as any;
    Object.values(WEAPONS).forEach((w) => {
      defaultWeapons[w.id] = w.initialAmmo;
    });

    const team1: Team = {
      id: 'team_1',
      name: config.team1Name || 'Alpha Team',
      color: config.team1Color,
      faction: config.team1Faction,
      isAI: false,
      aiDifficulty: config.difficulty,
      score: 0,
      weapons: { ...defaultWeapons },
    };

    const team2: Team = {
      id: 'team_2',
      name: config.team2Name || 'Omega Team',
      color: config.team2Color,
      faction: config.team2Faction,
      isAI: config.mode === 'SINGLE_PLAYER_AI' || config.mode === 'CAMPAIGN',
      aiDifficulty: config.difficulty,
      score: 0,
      weapons: { ...defaultWeapons },
    };

    // 3. Spawn characters
    const totalChars = config.teamSize * 2;
    const spawnPoints = terrain.findSpawnPositions(totalChars);

    const newChars: Character[] = [];
    const t1Names = FACTIONS[config.team1Faction].defaultNames;
    const t2Names = FACTIONS[config.team2Faction].defaultNames;

    for (let i = 0; i < config.teamSize; i++) {
      // Team 1 character
      const sp1 = spawnPoints[i * 2] || { x: 300 + i * 200, y: 300 };
      newChars.push({
        id: `t1_c${i}`,
        teamId: team1.id,
        name: t1Names[i % t1Names.length] || `Alpha ${i + 1}`,
        faction: config.team1Faction,
        x: sp1.x,
        y: sp1.y,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        facing: 1,
        isGrounded: true,
        isDead: false,
        jetpackFuel: 100,
        animFrame: 0,
        walkTimer: 0,
      });

      // Team 2 character
      const sp2 = spawnPoints[i * 2 + 1] || { x: 900 + i * 200, y: 300 };
      newChars.push({
        id: `t2_c${i}`,
        teamId: team2.id,
        name: t2Names[i % t2Names.length] || `Omega ${i + 1}`,
        faction: config.team2Faction,
        x: sp2.x,
        y: sp2.y,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        facing: -1,
        isGrounded: true,
        isDead: false,
        jetpackFuel: 100,
        animFrame: 0,
        walkTimer: 0,
      });
    }

    setTeams([team1, team2]);
    setCharacters(newChars);
    setActiveTeamIdx(0);
    setActiveCharId(newChars[0].id);

    // Reset physics lists
    projectilesRef.current = [];
    particlesRef.current = [];
    damageIndicatorsRef.current = [];
    setActiveProjectiles([]);
    setActiveParticles([]);
    setActiveDamageIndicators([]);

    // Turn parameters
    const initialWind = Math.floor((Math.random() - 0.5) * 160);
    setWind(initialWind);
    setTurnTimer(settings.turnTimeLimit > 0 ? settings.turnTimeLimit : 0);
    setIsRetreating(false);
    setRetreatTimer(0);
    setTurnPhase('AIMING');
    setImpactPoint(null);
    lastExplosionTimeRef.current = 0;
    settlingStartTimeRef.current = 0;
    pendingAirstrikesRef.current = 0;
    hasRetreatedRef.current = false;
    setIsMapPanned(false);
    setRecenterTrigger((c) => c + 1);
    setSelectedWeaponId('COSMIC_ROCKET');
    setAirstrikeTargetX(null);

    // Reset stats
    setTotalTurnsCount(0);
    setTotalDamageCount(0);
    setPinsKnockedCount(0);
    setVoidElimsCount(0);
    setWinningTeam(null);
    setIsGameOverOpen(false);
    setIsPaused(false);

    // Comedic announcement
    triggerRandomAnnouncement();

    // In Local Network mode, Host broadcasts initial character placements and wind to Guest
    if (config.mode === 'LOCAL_NETWORK' && (networkRole === 'HOST' || networkService.getRole() === 'HOST')) {
      setTimeout(() => {
        networkService.syncAuthoritativeState({
          characters: newChars,
          wind: initialWind,
          activeCharId: newChars[0].id,
        });
      }, 250);
    }

    setView('MATCH');
  };

  const triggerRandomAnnouncement = () => {
    const list = translations[settings.language].announcements;
    const item = list[Math.floor(Math.random() * list.length)];
    setAnnouncement(item);
    setTimeout(() => setAnnouncement(null), 4500);
  };

  // Campaign Mission launcher
  const launchCampaignMission = (mission: CampaignMission) => {
    setupMatch({
      mode: 'CAMPAIGN',
      team1Name: 'Player Seekers',
      team1Faction: mission.playerFaction,
      team1Color: FACTIONS[mission.playerFaction].primaryColor,
      team2Name: 'Trial Opponents',
      team2Faction: mission.enemyFaction,
      team2Color: FACTIONS[mission.enemyFaction].primaryColor,
      mapId: mission.mapId,
      difficulty: mission.difficulty,
      teamSize: mission.playerTeamSize,
      privacyHandoff: false,
      campaignMission: mission,
    });
  };

  // Next Turn logic
  const advanceTurn = () => {
    if (isGameOverOpen) return;

    // Check victory condition first
    const livingT1 = characters.filter((c) => c.teamId === teams[0]?.id && !c.isDead);
    const livingT2 = characters.filter((c) => c.teamId === teams[1]?.id && !c.isDead);

    if (livingT1.length === 0 || livingT2.length === 0) {
      handleGameOver(livingT1.length > 0 ? teams[0] : livingT2.length > 0 ? teams[1] : null);
      return;
    }

    const nextTeamIdx = activeTeamIdx === 0 ? 1 : 0;
    const nextTeam = teams[nextTeamIdx];

    // Find next living character in that team
    const nextTeamChars = characters.filter((c) => c.teamId === nextTeam.id && !c.isDead);
    if (nextTeamChars.length === 0) {
      handleGameOver(teams[activeTeamIdx]);
      return;
    }

    const nextChar = nextTeamChars[0];

    setActiveTeamIdx(nextTeamIdx);
    setActiveCharId(nextChar.id);

    // Face towards opposite team average
    const otherTeamChars = characters.filter((c) => c.teamId !== nextTeam.id && !c.isDead);
    if (otherTeamChars.length > 0) {
      const avgEnemyX =
        otherTeamChars.reduce((sum, c) => sum + c.x, 0) / otherTeamChars.length;
      nextChar.facing = avgEnemyX > nextChar.x ? 1 : -1;
      setAimAngle(nextChar.facing === 1 ? 45 : 135);
    }

    // Reroll wind
    const newWind = Math.floor((Math.random() - 0.5) * 160);
    if (gameMode === 'LOCAL_NETWORK' && (networkRole === 'HOST' || networkService.getRole() === 'HOST')) {
      networkService.sendGameAction('ADVANCE_TURN', { wind: newWind });
    }
    setWind(newWind);

    // Reset turn timer
    setTurnTimer(settings.turnTimeLimit > 0 ? settings.turnTimeLimit : 0);
    setIsRetreating(false);
    setRetreatTimer(0);
    setTurnPhase('AIMING');
    setImpactPoint(null);
    lastExplosionTimeRef.current = 0;
    settlingStartTimeRef.current = 0;
    pendingAirstrikesRef.current = 0;
    hasRetreatedRef.current = false;
    setIsMapPanned(false);
    setRecenterTrigger((c) => c + 1);
    setSelectedWeaponId('COSMIC_ROCKET');
    setAirstrikeTargetX(null);
    setTotalTurnsCount((c) => c + 1);

    // Clear any user input state so it never carries over to next team or CPU
    moveInputRef.current = {
      left: false,
      right: false,
      jump: false,
      backflip: false,
      jetpack: false,
    };
    setIsCharging(false);
    setIsJetpackActive(false);

    // If local hot-seat and privacy hand-off enabled, show modal
    if (gameMode === 'HOT_SEAT_LOCAL' && privacyHandoffEnabled && !nextTeam.isAI) {
      setIsHotSeatModalOpen(true);
    }

    triggerRandomAnnouncement();
  };

  // Cycle between living characters of the active team
  const handleCycleCharacter = () => {
    const currentTeam = teams[activeTeamIdx];
    if (!currentTeam || currentTeam.isAI || turnPhase !== 'AIMING' || isRetreating || isRemoteOpponentTurn) return;

    const livingChars = characters.filter((c) => c.teamId === currentTeam.id && !c.isDead);
    if (livingChars.length <= 1) return;

    const currentIdx = livingChars.findIndex((c) => c.id === activeCharId);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % livingChars.length;
    const nextChar = livingChars[nextIdx];

    setActiveCharId(nextChar.id);
    sound.playClick();

    // Face towards enemy team average
    const otherTeamChars = characters.filter((c) => c.teamId !== currentTeam.id && !c.isDead);
    if (otherTeamChars.length > 0) {
      const avgEnemyX =
        otherTeamChars.reduce((sum, c) => sum + c.x, 0) / otherTeamChars.length;
      nextChar.facing = avgEnemyX > nextChar.x ? 1 : -1;
      setAimAngle(nextChar.facing === 1 ? 45 : 135);
    }

    // Reset map pan to focus on newly selected character
    setIsMapPanned(false);
    setRecenterTrigger((c) => c + 1);

    if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
      networkService.sendGameAction('CYCLE_WARRIOR', { charId: nextChar.id });
    }
  };

  // Game Over handling
  const handleGameOver = (victor: Team | null) => {
    setWinningTeam(victor);
    setIsGameOverOpen(true);
    const isPlayerWin = victor?.id === teams[0]?.id;
    sound.playVictory(isPlayerWin);
    recordMatchResult(isPlayerWin, totalDamageCount, pinsKnockedCount, voidElimsCount);

    // Unlock campaign reward and persist progress if completed
    if (activeCampaignMission && isPlayerWin) {
      const updatedMissions = saveCompletedCampaignMission(activeCampaignMission.id);
      setCompletedCampaignMissions(updatedMissions);
      unlockDeity(activeCampaignMission.unlockDeityId);
      setStats(loadStats());

      const rewardDeity = DEITIES.find((d) => d.id === activeCampaignMission.unlockDeityId);
      setAnnouncement(
        settings.language === 'pt'
          ? `★ JULGAMENTO 0${activeCampaignMission.id} CONCLUÍDO! ${rewardDeity ? `Divindade ${rewardDeity.name} Desbloqueada!` : ''}`
          : `★ TRIAL 0${activeCampaignMission.id} CLEARED! ${rewardDeity ? `Deity ${rewardDeity.name} Unlocked!` : ''}`
      );
      setTimeout(() => setAnnouncement(null), 5000);
    }
  };

  // Execute Weapon Fire
  const fireCurrentWeapon = (customAngle?: number, customPower?: number, customX?: number) => {
    const activeChar = characters.find((c) => c.id === activeCharId);
    if (!activeChar || activeChar.isDead || projectilesRef.current.length > 0 || turnPhase !== 'AIMING' || isRetreating) return;

    const activeTeam = teams[activeTeamIdx];
    const weapon = WEAPONS[selectedWeaponId];

    // Check ammo
    const currentAmmo = activeTeam.weapons[selectedWeaponId];
    if (currentAmmo === 0) return;

    if (currentAmmo > 0) {
      activeTeam.weapons[selectedWeaponId] -= 1;
    }

    const angle = customAngle ?? aimAngle;
    const power = customPower ?? aimPower;
    const rad = (angle * Math.PI) / 180;
    const speed = (Math.max(20, power) / 100) * 12;

    if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn && customAngle === undefined) {
      networkService.sendGameAction('FIRE', {
        angle,
        power,
        targetX: customX ?? airstrikeTargetX ?? activeChar.x + (activeChar.facing * 180),
        weaponId: selectedWeaponId,
      });
    }

    sound.ensureContext();

    if (selectedWeaponId === 'SKIP_TURN') {
      sound.playClick();
      advanceTurn();
      return;
    }

    if (selectedWeaponId === 'DIMENSIONAL_TELEPORT') {
      const targetX = customX ?? airstrikeTargetX ?? activeChar.x + (activeChar.facing * 180);
      const groundY = terrain.getGroundY(targetX, 50) || 350;
      activeChar.x = targetX;
      activeChar.y = groundY - 15;
      activeChar.vx = 0;
      activeChar.vy = 0;
      sound.playHolyChime();

      // Teleport particles
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({
          x: targetX,
          y: groundY - 10,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: '#38bdf8',
          size: 3,
          life: 0,
          maxLife: 20,
          type: 'SPARK',
        });
      }
      setImpactPoint({ x: targetX, y: groundY - 15 });
      setTurnPhase('IMPACT_SETTLING');
      settlingStartTimeRef.current = Date.now();
      lastExplosionTimeRef.current = Date.now();
      return;
    }

    setTurnPhase('FIRING');
    lastExplosionTimeRef.current = 0;
    settlingStartTimeRef.current = 0;

    if (weapon.isAirstrike) {
      const dropX = customX ?? airstrikeTargetX ?? activeChar.x + activeChar.facing * 200;
      sound.playShoot('MISSILE');

      if (selectedWeaponId === 'SEVEN_CHAKRA_STRIKE') {
        // Drop 7 sequential rainbow strikes
        pendingAirstrikesRef.current = 7;
        for (let i = 0; i < 7; i++) {
          setTimeout(() => {
            if (view !== 'MATCH') return;
            pendingAirstrikesRef.current = Math.max(0, pendingAirstrikesRef.current - 1);
            sound.playChakraChime(i);
            projectilesRef.current.push({
              id: Math.random().toString(),
              type: 'SEVEN_CHAKRA_STRIKE',
              x: dropX + (i - 3) * 28,
              y: 50,
              vx: 0,
              vy: 7 + i * 0.4,
              rotation: 0,
              vRot: 0,
              timer: 3,
              radius: 4,
              damage: 25,
              blastRadius: 36,
              bounces: 0,
              maxBounces: 0,
              bounciness: 0,
              isWindAffected: false,
              shooterTeamId: activeTeam.id,
            });
          }, i * 160);
        }
      } else {
        // Single celestial crate / pin / meteor
        projectilesRef.current.push({
          id: Math.random().toString(),
          type: selectedWeaponId,
          x: dropX,
          y: 40,
          vx: 0,
          vy: 8,
          rotation: 0,
          vRot: 0.05,
          timer: 4,
          radius: 8,
          damage: weapon.damage,
          blastRadius: weapon.blastRadius,
          bounces: 0,
          maxBounces: 0,
          bounciness: 0,
          isWindAffected: false,
          shooterTeamId: activeTeam.id,
        });
      }
    } else if (selectedWeaponId === 'HOLY_DYNAMITE') {
      sound.playShoot('MISSILE');
      projectilesRef.current.push({
        id: Math.random().toString(),
        type: 'HOLY_DYNAMITE',
        x: activeChar.x + activeChar.facing * 12,
        y: activeChar.y - 4,
        vx: activeChar.facing * 0.5,
        vy: -1,
        rotation: 0,
        vRot: 0.02,
        timer: 4,
        radius: 6,
        damage: weapon.damage,
        blastRadius: weapon.blastRadius,
        bounces: 0,
        maxBounces: 1,
        bounciness: 0.1,
        isWindAffected: false,
        shooterTeamId: activeTeam.id,
      });

      // Dynamite placed at feet grants immediate retreat countdown to get away from fuse
      hasRetreatedRef.current = true;
      setIsRetreating(true);
      setRetreatTimer(4);
      setTurnPhase('RETREAT');
    } else {
      // Standard artillery projectile
      sound.playShoot(selectedWeaponId === 'COSMIC_BOWLING_BALL' ? 'BOWLING' : 'MISSILE');

      projectilesRef.current.push({
        id: Math.random().toString(),
        type: selectedWeaponId,
        x: activeChar.x + Math.cos(rad) * 18,
        y: activeChar.y - Math.sin(rad) * 18,
        vx: Math.cos(rad) * speed,
        vy: -Math.sin(rad) * speed,
        rotation: Math.atan2(-Math.sin(rad) * speed, Math.cos(rad) * speed),
        vRot: selectedWeaponId === 'COSMIC_BOWLING_BALL' ? 0.2 : 0.05,
        timer: weapon.fuseSeconds ?? 10,
        radius: selectedWeaponId === 'COSMIC_BOWLING_BALL' ? 9 : 5,
        damage: weapon.damage,
        blastRadius: weapon.blastRadius,
        bounces: 0,
        maxBounces: weapon.bounciness ? 4 : 0,
        bounciness: weapon.bounciness ?? 0,
        isWindAffected: weapon.isWindAffected,
        shooterTeamId: activeTeam.id,
      });
    }
  };

  // Power charging handlers
  const handleStartCharge = () => {
    const activeTeam = teams[activeTeamIdx];
    if (activeTeam?.isAI || isRetreating || isGameOverOpen || turnPhase !== 'AIMING' || isRemoteOpponentTurn) return;

    sound.ensureContext();
    setIsCharging(true);
    powerRef.current = 20;
    setAimPower(20);

    if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    let direction = 1;

    chargeIntervalRef.current = window.setInterval(() => {
      powerRef.current += direction * 3.5;
      if (powerRef.current >= 100) {
        powerRef.current = 100;
        direction = -1;
      } else if (powerRef.current <= 15) {
        powerRef.current = 15;
        direction = 1;
      }
      setAimPower(Math.round(powerRef.current));
    }, 30);
  };

  const handleReleaseCharge = () => {
    if (!isCharging || isRemoteOpponentTurn) return;
    setIsCharging(false);
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    fireCurrentWeapon(aimAngle, powerRef.current);
  };

  // Main physics & game loop ticker
  useEffect(() => {
    if (view !== 'MATCH' || isPaused) return;

    const interval = window.setInterval(() => {
      // 1. Update active character physics with movement inputs
      const activeChar = characters.find((c) => c.id === activeCharId);
      if (activeChar) {
        const moveRes = updateCharacterPhysics(
          activeChar,
          moveInputRef.current,
          damageIndicatorsRef.current,
          particlesRef.current
        );

        if (moveRes.diedInVoid) {
          setVoidElimsCount((c) => c + 1);
        }
      }

      // Update passive characters' physics (gravity, ground settling)
      characters.forEach((char) => {
        if (char.id !== activeCharId && !char.isDead) {
          updateCharacterPhysics(
            char,
            { left: false, right: false, jump: false, backflip: false, jetpack: false },
            damageIndicatorsRef.current,
            particlesRef.current
          );
        }
      });

      // 2. Update active projectiles & check impacts
      if (projectilesRef.current.length > 0) {
        const tickRes = updateProjectiles(
          projectilesRef.current,
          characters,
          wind,
          0.03,
          particlesRef.current,
          damageIndicatorsRef.current
        );

        // Add any newly spawned submunitions (clusters)
        if (tickRes.newProjectiles.length > 0) {
          projectilesRef.current.push(...tickRes.newProjectiles);
        }

        // Tally damage
        tickRes.damagedCharacters.forEach((item) => {
          setTotalDamageCount((c) => c + item.damage);
          setPinsKnockedCount((c) => c + 1);
        });

        // Track explosion impact point and timestamp
        if (tickRes.explosions.length > 0) {
          const exp = tickRes.explosions[0];
          setImpactPoint({ x: exp.x, y: exp.y });
          lastExplosionTimeRef.current = Date.now();
        }
      }

      // Check transition from FIRING to IMPACT_SETTLING
      if (
        turnPhase === 'FIRING' &&
        projectilesRef.current.length === 0 &&
        pendingAirstrikesRef.current === 0
      ) {
        setTurnPhase('IMPACT_SETTLING');
        settlingStartTimeRef.current = Date.now();
        if (lastExplosionTimeRef.current === 0) {
          lastExplosionTimeRef.current = Date.now();
        }
      }

      // Check if settling is complete during IMPACT_SETTLING
      if (turnPhase === 'IMPACT_SETTLING') {
        const charactersSettled = characters.every(
          (c) => c.isDead || (c.isGrounded && Math.abs(c.vx) < 0.35 && Math.abs(c.vy) < 0.35)
        );
        const timeSinceExplosion = Date.now() - (lastExplosionTimeRef.current || settlingStartTimeRef.current);
        const timeSinceSettlingStart = Date.now() - settlingStartTimeRef.current;

        // Dwell at the impact site for at least 2.2 seconds so players clearly see
        // terrain demolition, debris, damage numbers, and knockback!
        const dwellFinished = timeSinceExplosion >= 2200;
        const safetyTimeout = timeSinceSettlingStart >= 4500;

        if ((charactersSettled && dwellFinished) || safetyTimeout) {
          const livingT1 = characters.filter((c) => c.teamId === teams[0]?.id && !c.isDead);
          const livingT2 = characters.filter((c) => c.teamId === teams[1]?.id && !c.isDead);

          if (livingT1.length === 0 || livingT2.length === 0) {
            handleGameOver(livingT1.length > 0 ? teams[0] : livingT2.length > 0 ? teams[1] : null);
          } else {
            const activeChar = characters.find((c) => c.id === activeCharId);
            if (activeChar && !activeChar.isDead && !hasRetreatedRef.current) {
              hasRetreatedRef.current = true;
              setImpactPoint(null);
              setIsRetreating(true);
              setRetreatTimer(3);
              setTurnPhase('RETREAT');
            } else {
              setImpactPoint(null);
              advanceTurn();
            }
          }
        }
      }

      // Sync state arrays for React canvas rendering
      setActiveProjectiles([...projectilesRef.current]);
      setActiveParticles([...particlesRef.current]);
      setActiveDamageIndicators([...damageIndicatorsRef.current]);
    }, 30);

    return () => clearInterval(interval);
  }, [
    view,
    isPaused,
    activeCharId,
    characters,
    wind,
    isRetreating,
    isGameOverOpen,
    turnPhase,
    teams,
  ]);

  // Turn Timer Countdown (1 second intervals)
  useEffect(() => {
    if (view !== 'MATCH' || isPaused || isGameOverOpen || isHotSeatModalOpen) return;

    const timer = window.setInterval(() => {
      if (turnPhase === 'RETREAT') {
        setRetreatTimer((prev) => {
          if (prev <= 1) {
            setIsRetreating(false);
            setImpactPoint(null);
            advanceTurn();
            return 0;
          }
          return prev - 1;
        });
        return;
      }

      if (turnPhase === 'AIMING' && turnTimer > 0) {
        setTurnTimer((prev) => {
          if (prev <= 5 && prev > 0) {
            sound.playTick();
          }
          if (prev <= 1) {
            // Time expired
            advanceTurn();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    view,
    isPaused,
    turnTimer,
    isRetreating,
    isGameOverOpen,
    isHotSeatModalOpen,
    turnPhase,
  ]);

  // CPU AI decision loop
  useEffect(() => {
    if (view !== 'MATCH' || isPaused || isGameOverOpen || isHotSeatModalOpen) return;

    const activeTeam = teams[activeTeamIdx];
    const activeChar = characters.find((c) => c.id === activeCharId);

    if (
      activeTeam?.isAI &&
      activeChar &&
      !activeChar.isDead &&
      turnPhase === 'AIMING' &&
      projectilesRef.current.length === 0 &&
      !isAITurnActiveRef.current
    ) {
      isAITurnActiveRef.current = true;

      // Believable AI thinking delay (800ms - 1400ms)
      const thinkTimeout = window.setTimeout(() => {
        const decision = computeAITurn(
          activeChar,
          characters,
          activeTeam,
          activeTeam.aiDifficulty,
          wind
        );

        setSelectedWeaponId(decision.weapon);
        setAimAngle(decision.angle);
        setAimPower(decision.power);

        // If reposition move needed
        if (decision.moveDirection) {
          moveInputRef.current[decision.moveDirection] = true;
          setTimeout(() => {
            moveInputRef.current.left = false;
            moveInputRef.current.right = false;
          }, decision.moveDurationMs || 400);
        }

        // Fire after brief aiming adjustment
        setTimeout(() => {
          fireCurrentWeapon(decision.angle, decision.power, decision.targetX);
          isAITurnActiveRef.current = false;
        }, 600);
      }, 1000);

      return () => clearTimeout(thinkTimeout);
    }
  }, [activeTeamIdx, view, isPaused, activeCharId, characters, isGameOverOpen]);

  const activeTeam = teams[activeTeamIdx] || teams[0];
  const activeChar = characters.find((c) => c.id === activeCharId) || null;
  const currentWeaponDef = WEAPONS[selectedWeaponId] || WEAPONS.COSMIC_ROCKET;
  const availableAmmo = activeTeam?.weapons ? activeTeam.weapons[selectedWeaponId] : 0;

  // Keyboard controls for testing / desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        view !== 'MATCH' ||
        isPaused ||
        activeTeam?.isAI ||
        isRemoteOpponentTurn ||
        turnPhase === 'FIRING' ||
        turnPhase === 'IMPACT_SETTLING'
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a') moveInputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') moveInputRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w') moveInputRef.current.jump = true;
      if (e.key === 's') moveInputRef.current.backflip = true;
      if (e.key === 'j') setIsJetpackActive((p) => !p);

      if (e.key === 'q') setAimAngle((a) => Math.max(5, a - 3));
      if (e.key === 'e') setAimAngle((a) => Math.min(175, a + 3));

      if (e.key === ' ' && !isCharging && turnPhase === 'AIMING') {
        handleStartCharge();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (view !== 'MATCH' || isPaused || activeTeam?.isAI || isRemoteOpponentTurn) return;

      if (e.key === 'ArrowLeft' || e.key === 'a') moveInputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') moveInputRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w') moveInputRef.current.jump = false;
      if (e.key === 's') moveInputRef.current.backflip = false;

      if (e.key === ' ' && isCharging) {
        handleReleaseCharge();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [view, isPaused, isCharging, activeTeam?.isAI, isRemoteOpponentTurn, turnPhase]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-outfit select-none">
      {view === 'MENU' ? (
        <TitleMenu
          language={settings.language}
          onSetLanguage={(lang) => handleUpdateSettings({ language: lang })}
          onStartMatch={setupMatch}
          onOpenCampaign={() => {
            setCompletedCampaignMissions(loadCompletedCampaignMissions());
            setIsCampaignOpen(true);
          }}
          onOpenLocalNetwork={() => setIsLocalNetworkModalOpen(true)}
          onOpenDeities={() => {
            setStats(loadStats());
            setIsDeitiesOpen(true);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTutorial={() => setIsTourOpen(true)}
        />
      ) : (
        <div className="relative w-full h-full">
          {/* Main 2D Canvas */}
          <GameCanvas
            mapDef={currentMap}
            characters={characters}
            activeCharacter={activeChar}
            projectiles={activeProjectiles}
            particles={activeParticles}
            damageIndicators={activeDamageIndicators}
            aimAngle={aimAngle}
            aimPower={aimPower}
            isCharging={isCharging}
            activeWeaponId={selectedWeaponId}
            wind={wind}
            airstrikeTargetX={airstrikeTargetX}
            onSetAirstrikeTarget={(x) => setAirstrikeTargetX(x)}
            onAimAngleChange={(ang) => {
              if (isRemoteOpponentTurn) return;
              setAimAngle(ang);
              const activeChar = characters.find((c) => c.id === activeCharId);
              if (activeChar) {
                activeChar.facing = ang <= 90 ? 1 : -1;
              }
              if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                networkService.sendGameAction('AIM', {
                  angle: ang,
                  facing: ang <= 90 ? 1 : -1,
                });
              }
            }}
            isFreeCamera={isFreeCamera}
            cameraOffset={cameraOffset}
            zoom={zoom}
            onZoomChange={(z) => setZoom(z)}
            impactPoint={impactPoint}
            turnPhase={turnPhase}
            recenterKey={recenterTrigger}
            onPanStateChange={handlePanStateChange}
          />

          {/* Interactive Mobile HUD */}
          {activeTeam && (
            <GameHUD
              activeTeam={activeTeam}
              activeCharacter={activeChar}
              turnPhase={turnPhase}
              isRemoteOpponentTurn={isRemoteOpponentTurn}
              isMapPanned={isMapPanned}
              onRecenter={() => {
                setIsMapPanned(false);
                setRecenterTrigger((c) => c + 1);
              }}
              turnTimer={turnTimer}
              maxTurnTime={settings.turnTimeLimit}
              wind={wind}
              selectedWeapon={currentWeaponDef}
              availableAmmo={availableAmmo}
              aimAngle={aimAngle}
              aimPower={aimPower}
              isCharging={isCharging}
              isRetreating={isRetreating}
              retreatTimer={retreatTimer}
              announcement={announcement}
              language={settings.language}
              onAngleChange={(ang) => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                setAimAngle(ang);
                const activeChar = characters.find((c) => c.id === activeCharId);
                if (activeChar) {
                  activeChar.facing = ang <= 90 ? 1 : -1;
                }
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  networkService.sendGameAction('AIM', {
                    angle: ang,
                    facing: ang <= 90 ? 1 : -1,
                  });
                }
              }}
              onStartCharge={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                handleStartCharge();
              }}
              onReleaseCharge={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                handleReleaseCharge();
              }}
              onFireDirect={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                fireCurrentWeapon();
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  const activeChar = characters.find((c) => c.id === activeCharId);
                  networkService.sendGameAction('FIRE', {
                    angle: aimAngle,
                    power: aimPower,
                    targetX: airstrikeTargetX ?? (activeChar ? activeChar.x + activeChar.facing * 180 : 0),
                    weaponId: selectedWeaponId,
                  });
                }
              }}
              onMoveLeftStart={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                moveInputRef.current.left = true;
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  const activeChar = characters.find((c) => c.id === activeCharId);
                  networkService.sendGameAction('MOVE', {
                    left: true,
                    right: false,
                    jump: moveInputRef.current.jump,
                    backflip: moveInputRef.current.backflip,
                    jetpack: moveInputRef.current.jetpack,
                    x: activeChar?.x,
                    y: activeChar?.y,
                    facing: activeChar?.facing,
                  });
                }
              }}
              onMoveLeftEnd={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                moveInputRef.current.left = false;
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  const activeChar = characters.find((c) => c.id === activeCharId);
                  networkService.sendGameAction('MOVE', {
                    left: false,
                    right: moveInputRef.current.right,
                    jump: moveInputRef.current.jump,
                    backflip: moveInputRef.current.backflip,
                    jetpack: moveInputRef.current.jetpack,
                    x: activeChar?.x,
                    y: activeChar?.y,
                    facing: activeChar?.facing,
                  });
                }
              }}
              onMoveRightStart={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                moveInputRef.current.right = true;
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  const activeChar = characters.find((c) => c.id === activeCharId);
                  networkService.sendGameAction('MOVE', {
                    left: false,
                    right: true,
                    jump: moveInputRef.current.jump,
                    backflip: moveInputRef.current.backflip,
                    jetpack: moveInputRef.current.jetpack,
                    x: activeChar?.x,
                    y: activeChar?.y,
                    facing: activeChar?.facing,
                  });
                }
              }}
              onMoveRightEnd={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                moveInputRef.current.right = false;
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  const activeChar = characters.find((c) => c.id === activeCharId);
                  networkService.sendGameAction('MOVE', {
                    left: moveInputRef.current.left,
                    right: false,
                    jump: moveInputRef.current.jump,
                    backflip: moveInputRef.current.backflip,
                    jetpack: moveInputRef.current.jetpack,
                    x: activeChar?.x,
                    y: activeChar?.y,
                    facing: activeChar?.facing,
                  });
                }
              }}
              onJump={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                moveInputRef.current.jump = true;
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  networkService.sendGameAction('MOVE', {
                    left: moveInputRef.current.left,
                    right: moveInputRef.current.right,
                    jump: true,
                    backflip: false,
                    jetpack: moveInputRef.current.jetpack,
                  });
                }
              }}
              onBackflip={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                moveInputRef.current.backflip = true;
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  networkService.sendGameAction('MOVE', {
                    left: moveInputRef.current.left,
                    right: moveInputRef.current.right,
                    jump: false,
                    backflip: true,
                    jetpack: moveInputRef.current.jetpack,
                  });
                }
              }}
              onToggleJetpack={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                const next = !isJetpackActive;
                setIsJetpackActive(next);
                moveInputRef.current.jetpack = next;
                if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                  networkService.sendGameAction('JETPACK', { active: next });
                }
              }}
              isJetpackActive={isJetpackActive}
              onOpenWeaponSheet={() => {
                if (activeTeam.isAI || isRemoteOpponentTurn) return;
                setIsWeaponSheetOpen(true);
              }}
              onPause={() => setIsPaused(true)}
              onZoomIn={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              onZoomOut={() => setZoom((z) => Math.max(0.65, z - 0.15))}
              onToggleFreeCam={() => setIsFreeCamera((f) => !f)}
              isFreeCamera={isFreeCamera}
              canCycleCharacter={
                !activeTeam.isAI &&
                !isRemoteOpponentTurn &&
                turnPhase === 'AIMING' &&
                !isRetreating &&
                characters.filter((c) => c.teamId === activeTeam.id && !c.isDead).length > 1
              }
              onCycleCharacter={handleCycleCharacter}
            />
          )}

          {/* Pause Menu Modal */}
          {isPaused && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
              <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-slate-900 border border-purple-500/40 rounded-3xl p-5 sm:p-6 text-center shadow-2xl flex flex-col gap-3 scrollbar-thin scrollbar-thumb-purple-900">
                <h3 className="text-lg font-bold text-slate-100 font-cinzel break-words">
                  {getTranslation(settings.language, 'paused')}
                </h3>
                <button
                  onClick={() => setIsPaused(false)}
                  className="w-full py-3 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs min-h-[44px] break-words leading-tight"
                >
                  {getTranslation(settings.language, 'resumeGame')}
                </button>
                <button
                  onClick={() => {
                    setIsPaused(false);
                    if (gameMode === 'LOCAL_NETWORK') {
                      networkService.disconnect();
                    }
                    advanceTurn();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs min-h-[44px] break-words leading-tight"
                >
                  {getTranslation(settings.language, 'surrender')}
                </button>
                <button
                  onClick={() => {
                    setIsPaused(false);
                    if (gameMode === 'LOCAL_NETWORK') {
                      networkService.disconnect();
                    }
                    setView('MENU');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-rose-400 hover:bg-rose-950/40 text-xs min-h-[44px] break-words leading-tight"
                >
                  {getTranslation(settings.language, 'backToMenu')}
                </button>
                <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 break-words">
                  {settings.language === 'pt' ? 'Evangelho das Dimenúveis: Armageddon' : 'Gospel of Dimenuous: Armageddon'} · v1.0
                </div>
              </div>
            </div>
          )}

          {/* Weapon Sheet Drawer */}
          <WeaponSheet
            isOpen={isWeaponSheetOpen}
            onClose={() => setIsWeaponSheetOpen(false)}
            selectedWeaponId={selectedWeaponId}
            onSelectWeapon={(id) => {
              setSelectedWeaponId(id);
              if (gameMode === 'LOCAL_NETWORK' && isMyNetworkTurn) {
                networkService.sendGameAction('WEAPON_SELECT', { weaponId: id });
              }
            }}
            availableAmmo={activeTeam?.weapons || ({} as any)}
            language={settings.language}
          />

          {/* Hot-Seat Private Device Transition */}
          <HotSeatTransitionModal
            isOpen={isHotSeatModalOpen}
            nextTeam={activeTeam}
            language={settings.language}
            onProceed={() => setIsHotSeatModalOpen(false)}
          />

          {/* Game Over Summary Modal */}
          <GameOverModal
            isOpen={isGameOverOpen}
            winningTeam={winningTeam}
            totalTurns={totalTurnsCount}
            totalDamage={totalDamageCount}
            pinsKnocked={pinsKnockedCount}
            voidElims={voidElimsCount}
            language={settings.language}
            campaignMission={activeCampaignMission}
            onNextMission={() => {
              setIsGameOverOpen(false);
              if (activeCampaignMission && activeCampaignMission.id < 6) {
                const nextMission = CAMPAIGN_MISSIONS.find((m) => m.id === activeCampaignMission.id + 1);
                if (nextMission) {
                  launchCampaignMission(nextMission);
                }
              }
            }}
            onRematch={() => {
              setIsGameOverOpen(false);
              if (activeCampaignMission) {
                launchCampaignMission(activeCampaignMission);
              } else {
                setupMatch({
                  mode: gameMode,
                  team1Name: teams[0]?.name,
                  team1Faction: teams[0]?.faction,
                  team1Color: teams[0]?.color,
                  team2Name: teams[1]?.name,
                  team2Faction: teams[1]?.faction,
                  team2Color: teams[1]?.color,
                  mapId: currentMap.id,
                  difficulty: teams[1]?.aiDifficulty,
                  teamSize: characters.length / 2,
                  privacyHandoff: privacyHandoffEnabled,
                });
              }
            }}
            onMainMenu={() => {
              setIsGameOverOpen(false);
              setActiveCampaignMission(null);
              if (gameMode === 'LOCAL_NETWORK') {
                networkService.disconnect();
              }
              setView('MENU');
            }}
          />
        </div>
      )}

      {/* Local Wi-Fi Network Multiplayer Modal */}
      <LocalNetworkModal
        isOpen={isLocalNetworkModalOpen}
        onClose={() => setIsLocalNetworkModalOpen(false)}
        language={settings.language}
        onLaunchNetworkMatch={handleLaunchNetworkMatch}
      />

      {/* Campaign Trials Modal */}
      <CampaignModal
        isOpen={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
        language={settings.language}
        completedMissions={completedCampaignMissions}
        onLaunchMission={launchCampaignMission}
      />

      {/* Cosmic Pantheon & Deities Modal */}
      <DeitiesModal
        isOpen={isDeitiesOpen}
        onClose={() => setIsDeitiesOpen(false)}
        language={settings.language}
        stats={stats}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onReplayTour={() => setIsTourOpen(true)}
        onResetProgress={handleResetProgress}
      />

      {/* Interactive First Launch Tour Modal */}
      <FirstLaunchTourModal
        isOpen={isTourOpen}
        language={settings.language}
        onClose={handleCloseTour}
        onSetLanguage={(lang) => handleUpdateSettings({ language: lang })}
      />
    </div>
  );
}
