/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Maximize2,
  Minimize2,
  Pause,
  Repeat,
  Rocket,
  Sparkles,
  Users,
  Wifi,
  Wind,
  Zap,
} from 'lucide-react';
import { Character, Language, Team, WeaponDef, WeaponId } from '../types/game';
import { FACTIONS, WEAPONS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';

interface GameHUDProps {
  activeTeam: Team;
  activeCharacter: Character | null;
  turnTimer: number;
  maxTurnTime: number;
  wind: number; // -100 to +100
  selectedWeapon: WeaponDef;
  availableAmmo: number;
  aimAngle: number;
  aimPower: number;
  isCharging: boolean;
  isRetreating: boolean;
  retreatTimer: number;
  announcement: string | null;
  language: Language;
  turnPhase?: 'AIMING' | 'FIRING' | 'IMPACT_SETTLING' | 'RETREAT';
  isMapPanned?: boolean;
  onRecenter?: () => void;
  onAngleChange: (angle: number) => void;
  onStartCharge: () => void;
  onReleaseCharge: () => void;
  onFireDirect: () => void;
  onMoveLeftStart: () => void;
  onMoveLeftEnd: () => void;
  onMoveRightStart: () => void;
  onMoveRightEnd: () => void;
  onJump: () => void;
  onBackflip: () => void;
  onToggleJetpack: () => void;
  isJetpackActive: boolean;
  onOpenWeaponSheet: () => void;
  onPause: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFreeCam: () => void;
  isFreeCamera: boolean;
  canCycleCharacter?: boolean;
  onCycleCharacter?: () => void;
  isRemoteOpponentTurn?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  activeTeam,
  activeCharacter,
  turnTimer,
  maxTurnTime,
  wind,
  selectedWeapon,
  availableAmmo,
  aimAngle,
  aimPower,
  isCharging,
  isRetreating,
  retreatTimer,
  announcement,
  language,
  turnPhase = 'AIMING',
  onAngleChange,
  onStartCharge,
  onReleaseCharge,
  onFireDirect,
  onMoveLeftStart,
  onMoveLeftEnd,
  onMoveRightStart,
  onMoveRightEnd,
  onJump,
  onBackflip,
  onToggleJetpack,
  isJetpackActive,
  onOpenWeaponSheet,
  onPause,
  onZoomIn,
  onZoomOut,
  onToggleFreeCam,
  isFreeCamera,
  isMapPanned = false,
  onRecenter,
  canCycleCharacter = false,
  onCycleCharacter,
  isRemoteOpponentTurn = false,
}) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Continuous Angle adjustment (press-and-hold repeating)
  const aimAngleRef = React.useRef(aimAngle);
  aimAngleRef.current = aimAngle;
  const angleHoldTimeoutRef = React.useRef<number | null>(null);
  const angleHoldIntervalRef = React.useRef<number | null>(null);

  const stopAngleHold = () => {
    if (angleHoldTimeoutRef.current) {
      clearTimeout(angleHoldTimeoutRef.current);
      angleHoldTimeoutRef.current = null;
    }
    if (angleHoldIntervalRef.current) {
      clearInterval(angleHoldIntervalRef.current);
      angleHoldIntervalRef.current = null;
    }
  };

  const startAngleHold = (delta: number) => {
    stopAngleHold();
    const next = Math.max(5, Math.min(175, aimAngleRef.current + delta));
    onAngleChange(next);

    angleHoldTimeoutRef.current = window.setTimeout(() => {
      angleHoldIntervalRef.current = window.setInterval(() => {
        const updated = Math.max(5, Math.min(175, aimAngleRef.current + delta));
        onAngleChange(updated);
      }, 35);
    }, 200);
  };

  // Instant 180° Direction Flip
  const handleFlipAim = () => {
    const flipped = Math.max(5, Math.min(175, 180 - aimAngle));
    onAngleChange(flipped);
  };

  const faction = FACTIONS[activeTeam.faction];
  const isAI = Boolean(activeTeam.isAI) || isRemoteOpponentTurn;
  const isAirstrike = !!selectedWeapon.isAirstrike;
  const isUtility = !!selectedWeapon.isUtility;
  const isResolving = turnPhase === 'FIRING' || turnPhase === 'IMPACT_SETTLING';
  const canAct = !isAI && (turnPhase === 'AIMING' || turnPhase === 'RETREAT');
  const canFire = !isAI && turnPhase === 'AIMING';

  const windAbs = Math.abs(wind);
  const windDir = wind >= 0 ? 'right' : 'left';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-3 select-none">
      {/* Top Bar (Adaptive Retro Arcade Marquee) */}
      <div className="flex flex-col gap-1.5 pointer-events-auto">
        {isPortrait ? (
          // PORTRAIT 2-ROW ADAPTIVE TOP BAR (No truncations, full visibility)
          <div className="flex flex-col gap-1.5 w-full">
            {/* Row 1: Team Info (Left) + Cycle Warrior Button + Camera & Pause (Right) */}
            <div className="flex items-center justify-between gap-1.5 w-full">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border-2 border-slate-700 shadow-md flex-1 min-w-0">
                  <div
                    className="w-3 h-3 ring-2 ring-black shrink-0"
                    style={{ backgroundColor: activeTeam.color }}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] font-arcade text-slate-100 flex items-center gap-1 flex-wrap">
                      <span className="break-words leading-tight">{activeTeam.name}</span>
                      <span className="text-[9px] text-purple-400 shrink-0">({faction.symbol})</span>
                    </span>
                    {activeCharacter && (
                      <span className="text-[10px] text-emerald-400 font-pixel break-words leading-tight">
                        {activeCharacter.name} · {activeCharacter.hp} HP
                      </span>
                    )}
                  </div>
                </div>

                {canCycleCharacter && (
                  <button
                    onClick={onCycleCharacter}
                    className="px-2 py-1 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 active:scale-95 border-2 border-purple-400 text-amber-300 font-arcade text-[9px] shadow-md flex items-center gap-1 shrink-0 min-h-[36px] arcade-btn"
                    title={getTranslation(language, 'cycleCharacterHint')}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-300" />
                    <span className="whitespace-nowrap font-bold">
                      {language === 'pt' ? 'TROCAR' : 'CYCLE'}
                    </span>
                  </button>
                )}
              </div>

              {/* Camera Controls & Pause */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center bg-slate-900 border-2 border-slate-700 overflow-hidden shadow-md">
                  <button
                    onClick={onZoomOut}
                    className="p-1.5 text-slate-300 hover:bg-slate-800 min-h-[36px] min-w-[32px] flex items-center justify-center"
                    title={language === 'pt' ? 'Afastar Câmera' : 'Zoom Out'}
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onZoomIn}
                    className="p-1.5 text-slate-300 hover:bg-slate-800 min-h-[36px] min-w-[32px] flex items-center justify-center"
                    title={language === 'pt' ? 'Aproximar Câmera' : 'Zoom In'}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onRecenter || onToggleFreeCam}
                    className={`p-1.5 min-h-[36px] min-w-[32px] flex items-center justify-center gap-1 transition-all ${
                      isMapPanned
                        ? 'bg-amber-500 text-black font-bold animate-pulse px-2'
                        : isFreeCamera
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                    title={getTranslation(language, 'recenter')}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    {isMapPanned && (
                      <span className="text-[8px] font-arcade whitespace-nowrap">
                        {language === 'pt' ? 'FOCALIZAR' : 'RECENTER'}
                      </span>
                    )}
                  </button>
                </div>

                <button
                  onClick={onPause}
                  className="p-2 bg-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md min-h-[36px] min-w-[36px] flex items-center justify-center arcade-btn"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: Status/Timer Banner (Left) + Wind Gauge (Right) */}
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex-1 min-w-0">
                {isResolving ? (
                  <div className="px-2 py-1 bg-amber-950 border-2 border-amber-500 text-amber-300 text-[10px] font-arcade animate-pulse shadow-md text-center break-words leading-tight">
                    ⚡ {getTranslation(language, 'resolvingImpact')}
                  </div>
                ) : isRetreating ? (
                  <div className="px-2 py-1 bg-rose-600 border-2 border-rose-400 text-white text-[10px] font-arcade animate-pulse shadow-lg text-center break-words leading-tight">
                    🏃 {getTranslation(language, 'retreatTime')} {retreatTimer}s
                  </div>
                ) : isRemoteOpponentTurn ? (
                  <div className="px-2 py-1 bg-cyan-950/90 border-2 border-cyan-500 text-cyan-200 text-[10px] font-arcade animate-pulse shadow-md text-center flex items-center justify-center gap-1.5 break-words leading-tight">
                    <Wifi className="w-3 h-3 text-cyan-400 animate-pulse shrink-0" />
                    <span className="break-words">{getTranslation(language, 'opponentTurn')}</span>
                  </div>
                ) : isAI ? (
                  <div className="px-2 py-1 bg-purple-950/90 border-2 border-purple-500 text-purple-200 text-[10px] font-arcade animate-pulse shadow-md text-center flex items-center justify-center gap-1.5 break-words leading-tight">
                    <span className="shrink-0">🤖</span>
                    <span className="break-words">{getTranslation(language, 'cpuThinking')}</span>
                  </div>
                ) : maxTurnTime > 0 ? (
                  <div
                    className={`px-2 py-1 border-2 font-arcade text-[10px] shadow-md text-center break-words leading-tight ${
                      turnTimer <= 5
                        ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                        : 'bg-slate-900 border-slate-700 text-amber-300'
                    }`}
                  >
                    ⏱ {language === 'pt' ? 'TEMPO' : 'TIME'}: {turnTimer}s
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-slate-900 border-2 border-slate-700 text-slate-300 text-[10px] font-arcade text-center">
                    ⏱ {language === 'pt' ? 'TEMPO' : 'TIME'}: ∞
                  </div>
                )}
              </div>

              {/* Wind Gauge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border-2 border-slate-700 text-[10px] font-arcade text-slate-300 shadow-lg shrink-0">
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[9px] text-slate-400">{language === 'pt' ? 'VENTO' : 'WIND'}</span>
                <div className="flex items-center">
                  {windDir === 'left' && <span className="text-sky-400 mr-0.5">◀</span>}
                  <span className="text-sky-300 font-bold">{windAbs}</span>
                  {windDir === 'right' && <span className="text-sky-400 ml-0.5">▶</span>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // LANDSCAPE SINGLE-ROW TOP BAR
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            {/* Team & Character Tag + Cycle Warrior Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-900 border-2 border-slate-700 shadow-md max-w-xs shrink min-w-0 overflow-hidden">
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 ring-2 ring-black shrink-0"
                  style={{ backgroundColor: activeTeam.color }}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[9px] sm:text-[11px] font-arcade text-slate-100 flex items-center gap-1 flex-wrap">
                    <span className="break-words leading-tight">{activeTeam.name}</span>
                    <span className="text-[8px] sm:text-[9px] text-purple-400 shrink-0">({faction.symbol})</span>
                  </span>
                  {activeCharacter && (
                    <span className="text-[9px] sm:text-[11px] text-emerald-400 font-pixel break-words leading-tight">
                      {activeCharacter.name} · {activeCharacter.hp} HP
                    </span>
                  )}
                </div>
              </div>

              {canCycleCharacter && (
                <button
                  onClick={onCycleCharacter}
                  className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 active:scale-95 border-2 border-purple-400 text-amber-300 font-arcade text-[9px] sm:text-[10px] shadow-md flex items-center gap-1.5 shrink-0 min-h-[38px] arcade-btn"
                  title={getTranslation(language, 'cycleCharacterHint')}
                >
                  <Users className="w-3.5 h-3.5 text-amber-300" />
                  <span className="whitespace-nowrap font-bold">
                    {language === 'pt' ? 'TROCAR' : 'CYCLE'}
                  </span>
                </button>
              )}
            </div>

            {/* Turn Timer / Retreat Banner / Resolving Impact Banner */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {isResolving ? (
                <div className="px-2 py-1 bg-amber-950 border-2 border-amber-500 text-amber-300 text-[9px] sm:text-[11px] font-arcade animate-pulse shadow-md whitespace-nowrap">
                  {getTranslation(language, 'resolvingImpact')}
                </div>
              ) : isRetreating ? (
                <div className="px-2 py-1 bg-rose-600 border-2 border-rose-400 text-white text-[9px] sm:text-[10px] font-arcade animate-pulse shadow-lg whitespace-nowrap">
                  {getTranslation(language, 'retreatTime')} {retreatTimer}s
                </div>
              ) : isRemoteOpponentTurn ? (
                <div className="px-2.5 py-1 bg-cyan-950/90 border-2 border-cyan-500 text-cyan-200 text-[9px] sm:text-[11px] font-arcade animate-pulse shadow-md whitespace-nowrap flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>{getTranslation(language, 'opponentTurn')}</span>
                </div>
              ) : isAI ? (
                <div className="px-2.5 py-1 bg-purple-950/90 border-2 border-purple-500 text-purple-200 text-[9px] sm:text-[11px] font-arcade animate-pulse shadow-md whitespace-nowrap flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>{getTranslation(language, 'cpuThinking')}</span>
                </div>
              ) : maxTurnTime > 0 ? (
                <div
                  className={`px-2 py-1 border-2 font-arcade text-[9px] sm:text-[11px] shadow-md whitespace-nowrap ${
                    turnTimer <= 5
                      ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                      : 'bg-slate-900 border-slate-700 text-amber-300'
                  }`}
                >
                  ⏱ {getTranslation(language, 'timeLabel')} {turnTimer}s
                </div>
              ) : (
                <div className="px-2 py-1 bg-slate-900 border-2 border-slate-700 text-slate-300 text-[9px] sm:text-[10px] font-arcade">
                  ⏱ {getTranslation(language, 'timeLabel')} ∞
                </div>
              )}

              {/* Wind Gauge */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 border-2 border-slate-700 text-[9px] sm:text-[10px] font-arcade text-slate-300 shadow-lg shrink-0">
                <Wind className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400" />
                <span className="text-[9px] text-slate-400">{getTranslation(language, 'windLabel')}</span>
                <div className="flex items-center">
                  {windDir === 'left' && <span className="text-sky-400 mr-0.5">◀</span>}
                  <span className="text-sky-300 font-bold">{windAbs}</span>
                  {windDir === 'right' && <span className="text-sky-400 ml-0.5">▶</span>}
                </div>
              </div>
            </div>

            {/* Camera Tools & Pause */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-slate-900 border-2 border-slate-700 overflow-hidden shadow-md">
                <button
                  onClick={onZoomOut}
                  className="p-1.5 sm:p-2 text-slate-300 hover:bg-slate-800 min-h-[38px] min-w-[34px] flex items-center justify-center"
                  title={language === 'pt' ? 'Afastar Câmera' : 'Zoom Out'}
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onZoomIn}
                  className="p-1.5 sm:p-2 text-slate-300 hover:bg-slate-800 min-h-[38px] min-w-[34px] flex items-center justify-center"
                  title={language === 'pt' ? 'Aproximar Câmera' : 'Zoom In'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onRecenter || onToggleFreeCam}
                  className={`p-1.5 sm:p-2 min-h-[38px] min-w-[34px] flex items-center justify-center gap-1 transition-all ${
                    isMapPanned
                      ? 'bg-amber-500 text-black font-bold animate-pulse'
                      : isFreeCamera
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title={getTranslation(language, 'recenter')}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  {isMapPanned && (
                    <span className="text-[8px] font-arcade hidden sm:inline">
                      {getTranslation(language, 'recenter')}
                    </span>
                  )}
                </button>
              </div>

              <button
                onClick={onPause}
                className="p-2 bg-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md min-h-[38px] min-w-[38px] flex items-center justify-center arcade-btn"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Announcement Ticker */}
        {announcement && (
          <div className="self-center px-4 py-2 bg-purple-950/95 border-2 border-purple-500 text-amber-300 text-[10px] sm:text-xs font-arcade max-w-[94vw] sm:max-w-xl text-center shadow-2xl break-words leading-relaxed">
            {announcement}
          </div>
        )}
      </div>

      {/* Bottom Control Deck (Adaptive Portrait / Landscape) */}
      <div className="pointer-events-auto">
        {isPortrait ? (
          // PORTRAIT VERTICAL ORIENTATION CONTROLS (RETRO ARCADE)
          <div className="flex flex-col gap-2 bg-slate-950/90 p-2 sm:p-3 border-2 border-slate-700 shadow-2xl">
            {isRemoteOpponentTurn ? (
              <div className="px-2.5 py-1.5 bg-cyan-950/95 border-2 border-cyan-500 text-cyan-200 text-[10px] font-arcade text-center animate-pulse flex items-center justify-center gap-2 shadow-lg">
                <Wifi className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="font-bold tracking-wide uppercase">{getTranslation(language, 'opponentTurn')} (Wi-Fi)</span>
              </div>
            ) : isAI ? (
              <div className="px-2.5 py-1.5 bg-purple-950/95 border-2 border-purple-500 text-purple-200 text-[10px] font-arcade text-center animate-pulse flex items-center justify-center gap-2 shadow-lg">
                <span className="text-amber-300">🤖</span>
                <span className="font-bold tracking-wide uppercase">{getTranslation(language, 'cpuThinking')}</span>
              </div>
            ) : null}
            {/* Top Tier: Weapon Selector + Aim Angle Slider + Jetpack */}
            <div className="flex items-center justify-between gap-2">
              {/* Weapon Selector */}
              <button
                onClick={onOpenWeaponSheet}
                disabled={!canFire}
                className={`arcade-btn flex-1 h-12 px-2 sm:px-2.5 bg-slate-900 border-2 border-purple-500/60 text-slate-100 flex items-center gap-2 shadow-md active:scale-95 transition-all min-h-[44px] min-w-0 overflow-hidden ${
                  !canFire ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <div className="p-1 bg-purple-700 text-white shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left min-w-0 flex-1">
                  <span className="text-[9px] font-arcade text-white leading-tight break-words block w-full">
                    {getTranslation(language, selectedWeapon.nameKey)}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-arcade text-amber-400 whitespace-nowrap">
                    {selectedWeapon.initialAmmo === -1
                      ? `${getTranslation(language, 'ammoLabel')} ∞`
                      : `${getTranslation(language, 'ammoLabel')} x${availableAmmo}`}
                  </span>
                </div>
              </button>

              {/* Angle Control Group (Hold-repeating buttons + slider + flip) */}
              {!isAirstrike && !isUtility && (
                <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-slate-900 border-2 border-slate-700 shrink-0 ${!canFire ? 'opacity-40 pointer-events-none' : ''}`}>
                  <button
                    onTouchStart={() => startAngleHold(-2)}
                    onTouchEnd={stopAngleHold}
                    onMouseDown={() => startAngleHold(-2)}
                    onMouseUp={stopAngleHold}
                    onMouseLeave={stopAngleHold}
                    disabled={!canFire}
                    className="w-7 sm:w-8 h-8 bg-slate-800 active:bg-purple-600 text-slate-100 text-xs font-arcade flex items-center justify-center arcade-btn select-none"
                    title={language === 'pt' ? 'Baixar Mira (-)' : 'Aim Down (-)'}
                  >
                    -
                  </button>
                  <div className="flex flex-col items-center px-0.5">
                    <span className="text-[8px] font-arcade text-purple-300">{aimAngle}°</span>
                    <input
                      type="range"
                      min="5"
                      max="175"
                      value={aimAngle}
                      disabled={!canFire}
                      onChange={(e) => onAngleChange(Number(e.target.value))}
                      className="w-12 sm:w-16 h-1 bg-slate-700 rounded-none appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <button
                    onTouchStart={() => startAngleHold(2)}
                    onTouchEnd={stopAngleHold}
                    onMouseDown={() => startAngleHold(2)}
                    onMouseUp={stopAngleHold}
                    onMouseLeave={stopAngleHold}
                    disabled={!canFire}
                    className="w-7 sm:w-8 h-8 bg-slate-800 active:bg-purple-600 text-slate-100 text-xs font-arcade flex items-center justify-center arcade-btn select-none"
                    title={language === 'pt' ? 'Subir Mira (+)' : 'Aim Up (+)'}
                  >
                    +
                  </button>
                  <button
                    onClick={handleFlipAim}
                    disabled={!canFire}
                    className="h-8 px-1.5 bg-slate-800 hover:bg-slate-700 active:bg-purple-600 text-amber-300 text-[8px] font-arcade flex items-center justify-center arcade-btn select-none"
                    title={getTranslation(language, 'turnDirection')}
                  >
                    <Repeat className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Jetpack Button */}
              {activeCharacter && activeCharacter.jetpackFuel > 0 && (
                <button
                  onClick={onToggleJetpack}
                  disabled={!canAct}
                  className={`arcade-btn h-12 px-2 border-2 text-[9px] font-arcade transition-all min-h-[44px] shrink-0 flex items-center gap-1 ${
                    !canAct
                      ? 'opacity-40 pointer-events-none'
                      : isJetpackActive
                      ? 'bg-sky-500 text-white border-sky-300 shadow-md'
                      : 'bg-slate-900 text-sky-400 border-sky-500/60'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{Math.round(activeCharacter.jetpackFuel)}%</span>
                </button>
              )}
            </div>

            {/* Bottom Tier: D-Pad Buttons (Left) + Fire & Power Meter (Right) */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2.5">
              {/* Movement Group */}
              <div className={`flex items-center gap-1 sm:gap-1.5 shrink-0 transition-opacity ${!canAct ? 'opacity-40 pointer-events-none' : ''}`}>
                <button
                  onTouchStart={onMoveLeftStart}
                  onTouchEnd={onMoveLeftEnd}
                  onMouseDown={onMoveLeftStart}
                  onMouseUp={onMoveLeftEnd}
                  onMouseLeave={onMoveLeftEnd}
                  disabled={!canAct}
                  className="arcade-btn w-10 sm:w-11 h-11 bg-slate-900 active:bg-purple-600 border-2 border-slate-600 text-slate-100 flex items-center justify-center shrink-0"
                  title={language === 'pt' ? 'Mover para Esquerda' : 'Move Left'}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <button
                  onTouchStart={onMoveRightStart}
                  onTouchEnd={onMoveRightEnd}
                  onMouseDown={onMoveRightStart}
                  onMouseUp={onMoveRightEnd}
                  onMouseLeave={onMoveRightEnd}
                  disabled={!canAct}
                  className="arcade-btn w-10 sm:w-11 h-11 bg-slate-900 active:bg-purple-600 border-2 border-slate-600 text-slate-100 flex items-center justify-center shrink-0"
                  title={language === 'pt' ? 'Mover para Direita' : 'Move Right'}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={onJump}
                  disabled={!canAct}
                  className="arcade-btn px-1.5 sm:px-2 h-11 bg-slate-900 active:bg-amber-600 border-2 border-slate-600 text-slate-100 flex flex-col items-center justify-center text-[9px] font-arcade shrink-0"
                  title={getTranslation(language, 'jump')}
                >
                  <span className="whitespace-nowrap">{language === 'pt' ? 'PULO' : 'JUMP'}</span>
                  <span className="text-[7px] text-amber-300">▲</span>
                </button>

                <button
                  onClick={onBackflip}
                  disabled={!canAct}
                  className="arcade-btn px-1.5 sm:px-2 h-11 bg-slate-900 active:bg-rose-600 border-2 border-slate-600 text-slate-100 flex flex-col items-center justify-center text-[9px] font-arcade shrink-0"
                  title={getTranslation(language, 'backflip')}
                >
                  <span className="whitespace-nowrap">{language === 'pt' ? 'GIRO' : 'FLIP'}</span>
                  <span className="text-[7px] text-rose-300">↺</span>
                </button>
              </div>

              {/* Fire Button & Power Bar */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {!isAirstrike && !isUtility && (
                  <div className="w-12 sm:w-16 h-4 bg-black border-2 border-slate-700 p-0.5 shrink-0">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600"
                      style={{ width: `${aimPower}%` }}
                    />
                  </div>
                )}

                <button
                  onTouchStart={!canFire || isAirstrike || isUtility ? undefined : onStartCharge}
                  onTouchEnd={!canFire || isAirstrike || isUtility ? undefined : onReleaseCharge}
                  onMouseDown={!canFire || isAirstrike || isUtility ? undefined : onStartCharge}
                  onMouseUp={!canFire || isAirstrike || isUtility ? undefined : onReleaseCharge}
                  onClick={canFire && (isAirstrike || isUtility) ? onFireDirect : undefined}
                  disabled={!canFire}
                  className={`arcade-btn min-w-[72px] sm:min-w-[84px] max-w-[100px] px-2 h-11 border-2 flex flex-col items-center justify-center font-arcade shadow-xl transition-all overflow-hidden shrink-0 ${
                    !canFire
                      ? 'bg-slate-800 border-slate-600 text-slate-400 opacity-60 cursor-not-allowed'
                      : isCharging
                      ? 'bg-rose-600 border-rose-300 text-white scale-105'
                      : 'bg-rose-700 border-rose-400 text-white'
                  }`}
                  title={getTranslation(language, 'fire')}
                >
                  <span className="text-[10px] sm:text-[11px] leading-tight tracking-normal max-w-full text-center px-0.5 block select-none break-words">
                    {!canFire ? '...' : getTranslation(language, 'fire')}
                  </span>
                  {!isAirstrike && !isUtility && (
                    <span className="text-[8px] font-pixel text-amber-200">
                      {Math.round(aimPower)}%
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // LANDSCAPE HORIZONTAL ORIENTATION CONTROLS (RETRO ARCADE)
          <div className="flex items-end justify-between gap-4">
            {/* Left Controls: D-Pad & Movement */}
            <div className="flex flex-col gap-2">
              {activeCharacter && activeCharacter.jetpackFuel > 0 && (
                <button
                  onClick={onToggleJetpack}
                  disabled={!canAct}
                  className={`arcade-btn flex items-center gap-1.5 px-3 py-1.5 border-2 text-[10px] font-arcade transition-all min-h-[42px] ${
                    !canAct
                      ? 'opacity-40 pointer-events-none'
                      : isJetpackActive
                      ? 'bg-sky-500 text-white border-sky-300 shadow-lg'
                      : 'bg-slate-900 text-sky-400 border-sky-500/60'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>{getTranslation(language, 'jetpackLabel')}</span>
                  <span>{Math.round(activeCharacter.jetpackFuel)}%</span>
                </button>
              )}

              <div className={`flex items-center gap-2 transition-opacity ${!canAct ? 'opacity-40 pointer-events-none' : ''}`}>
                <button
                  onTouchStart={onMoveLeftStart}
                  onTouchEnd={onMoveLeftEnd}
                  onMouseDown={onMoveLeftStart}
                  onMouseUp={onMoveLeftEnd}
                  onMouseLeave={onMoveLeftEnd}
                  disabled={!canAct}
                  className="arcade-btn w-13 h-13 bg-slate-900 active:bg-purple-600 border-2 border-slate-600 text-slate-100 flex items-center justify-center"
                  title={language === 'pt' ? 'Mover para Esquerda' : 'Move Left'}
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>

                <button
                  onTouchStart={onMoveRightStart}
                  onTouchEnd={onMoveRightEnd}
                  onMouseDown={onMoveRightStart}
                  onMouseUp={onMoveRightEnd}
                  onMouseLeave={onMoveRightEnd}
                  disabled={!canAct}
                  className="arcade-btn w-13 h-13 bg-slate-900 active:bg-purple-600 border-2 border-slate-600 text-slate-100 flex items-center justify-center"
                  title={language === 'pt' ? 'Mover para Direita' : 'Move Right'}
                >
                  <ArrowRight className="w-6 h-6" />
                </button>

                <button
                  onClick={onJump}
                  disabled={!canAct}
                  className="arcade-btn px-3 h-13 bg-slate-900 active:bg-amber-600 border-2 border-slate-600 text-slate-100 flex flex-col items-center justify-center text-[10px] font-arcade shrink-0"
                  title={getTranslation(language, 'jump')}
                >
                  <span className="whitespace-nowrap">{language === 'pt' ? 'PULO' : 'JUMP'}</span>
                  <span className="text-[8px] text-amber-300">▲</span>
                </button>

                <button
                  onClick={onBackflip}
                  disabled={!canAct}
                  className="arcade-btn px-3 h-13 bg-slate-900 active:bg-rose-600 border-2 border-slate-600 text-slate-100 flex flex-col items-center justify-center text-[10px] font-arcade shrink-0"
                  title={getTranslation(language, 'backflip')}
                >
                  <span className="whitespace-nowrap">{language === 'pt' ? 'GIRO' : 'FLIP'}</span>
                  <span className="text-[8px] text-rose-300">↺</span>
                </button>
              </div>
            </div>

            {/* Right Controls: Aim Angle, Power Meter, Weapon Selector, and FIRE */}
            <div className="flex items-end gap-3">
              {!isAirstrike && !isUtility && (
                <div className={`flex flex-col items-center p-2 bg-slate-900 border-2 border-slate-700 shadow-xl ${!canFire ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between w-full gap-2 px-0.5">
                    <span className="text-[9px] font-arcade text-slate-300 uppercase">
                      {getTranslation(language, 'aimAngleLabel')} {aimAngle}°
                    </span>
                    <button
                      onClick={handleFlipAim}
                      disabled={!canFire}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-purple-600 text-amber-300 border border-slate-600 text-[8px] font-arcade flex items-center gap-1 arcade-btn select-none"
                      title={getTranslation(language, 'turnDirection')}
                    >
                      <Repeat className="w-3 h-3" />
                      <span>{getTranslation(language, 'turnDirection')}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      onTouchStart={() => startAngleHold(-2)}
                      onTouchEnd={stopAngleHold}
                      onMouseDown={() => startAngleHold(-2)}
                      onMouseUp={stopAngleHold}
                      onMouseLeave={stopAngleHold}
                      disabled={!canFire}
                      className="arcade-btn w-9 h-9 bg-slate-800 text-slate-100 active:bg-purple-600 flex items-center justify-center font-arcade text-sm select-none"
                      title={language === 'pt' ? 'Baixar Mira (-)' : 'Aim Down (-)'}
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="5"
                      max="175"
                      value={aimAngle}
                      disabled={!canFire}
                      onChange={(e) => onAngleChange(Number(e.target.value))}
                      className="w-24 sm:w-28 h-1.5 bg-slate-700 rounded-none appearance-none cursor-pointer accent-purple-500"
                    />
                    <button
                      onTouchStart={() => startAngleHold(2)}
                      onTouchEnd={stopAngleHold}
                      onMouseDown={() => startAngleHold(2)}
                      onMouseUp={stopAngleHold}
                      onMouseLeave={stopAngleHold}
                      disabled={!canFire}
                      className="arcade-btn w-9 h-9 bg-slate-800 text-slate-100 active:bg-purple-600 flex items-center justify-center font-arcade text-sm select-none"
                      title={language === 'pt' ? 'Subir Mira (+)' : 'Aim Up (+)'}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={onOpenWeaponSheet}
                disabled={!canFire}
                className={`arcade-btn h-15 px-3.5 bg-slate-900 border-2 border-purple-500/60 text-slate-100 flex items-center gap-2.5 min-h-[46px] min-w-0 overflow-hidden ${!canFire ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="p-1.5 bg-purple-700 text-white shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-[10px] font-arcade text-white max-w-[160px] break-words leading-tight block">
                    {getTranslation(language, selectedWeapon.nameKey)}
                  </span>
                  <span className="text-[10px] font-arcade text-amber-400 whitespace-nowrap">
                    {selectedWeapon.initialAmmo === -1
                      ? `${getTranslation(language, 'ammoLabel')} ∞`
                      : `${getTranslation(language, 'ammoLabel')} x${availableAmmo}`}
                  </span>
                </div>
              </button>

              <div className="flex flex-col items-center gap-1.5 shrink-0">
                {!isAirstrike && !isUtility && (
                  <div className="w-24 sm:w-28 h-4 bg-black border-2 border-slate-700 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600"
                      style={{ width: `${aimPower}%` }}
                    />
                  </div>
                )}

                <button
                  onTouchStart={!canFire || isAirstrike || isUtility ? undefined : onStartCharge}
                  onTouchEnd={!canFire || isAirstrike || isUtility ? undefined : onReleaseCharge}
                  onMouseDown={!canFire || isAirstrike || isUtility ? undefined : onStartCharge}
                  onMouseUp={!canFire || isAirstrike || isUtility ? undefined : onReleaseCharge}
                  onClick={canFire && (isAirstrike || isUtility) ? onFireDirect : undefined}
                  disabled={!canFire}
                  className={`arcade-btn w-24 sm:w-28 px-2 h-15 border-2 flex flex-col items-center justify-center font-arcade shadow-2xl transition-all overflow-hidden shrink-0 ${
                    !canFire
                      ? 'bg-slate-800 border-slate-600 text-slate-400 opacity-60 cursor-not-allowed'
                      : isCharging
                      ? 'bg-rose-600 border-rose-300 text-white scale-105'
                      : 'bg-rose-700 border-rose-400 text-white hover:brightness-110'
                  }`}
                  title={getTranslation(language, 'fire')}
                >
                  <span className="text-xs sm:text-sm tracking-normal max-w-full text-center px-1 block select-none break-words leading-tight">
                    {!canFire ? '...' : getTranslation(language, 'fire')}
                  </span>
                  {!isAirstrike && !isUtility && (
                    <span className="text-[9px] font-pixel text-amber-200">
                      {Math.round(aimPower)}%
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
