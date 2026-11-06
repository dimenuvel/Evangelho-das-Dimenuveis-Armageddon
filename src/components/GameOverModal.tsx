/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, ChevronRight, RotateCcw, Sparkles, Trophy, Users, X } from 'lucide-react';
import { CampaignMission, Language, Team } from '../types/game';
import { DEITIES, FACTIONS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';

interface GameOverModalProps {
  isOpen: boolean;
  winningTeam: Team | null;
  totalTurns: number;
  totalDamage: number;
  pinsKnocked: number;
  voidElims: number;
  language: Language;
  onRematch: () => void;
  onMainMenu: () => void;
  campaignMission?: CampaignMission | null;
  onNextMission?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winningTeam,
  totalTurns,
  totalDamage,
  pinsKnocked,
  voidElims,
  language,
  onRematch,
  onMainMenu,
  campaignMission,
  onNextMission,
}) => {
  if (!isOpen) return null;

  const isPlayerWin = winningTeam?.id === 'team_1';
  const faction = winningTeam ? FACTIONS[winningTeam.faction] : null;
  const rewardDeity = campaignMission
    ? DEITIES.find((d) => d.id === campaignMission.unlockDeityId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-slate-900 border border-purple-500/40 rounded-3xl p-4 sm:p-6 text-center shadow-2xl flex flex-col items-center scrollbar-thin scrollbar-thumb-purple-900">
        {/* Trophy Glow */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 to-purple-600/30 border border-amber-400/50 text-amber-300 mb-2 sm:mb-3 shadow-lg shrink-0">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
        </div>

        {campaignMission ? (
          <div className="mb-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/50 text-purple-300">
              TRIAL 0{campaignMission.id} · {getTranslation(language, campaignMission.titleKey)}
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-300 to-pink-300 font-cinzel tracking-wider mt-1.5">
              {isPlayerWin
                ? getTranslation(language, 'missionVictory')
                : getTranslation(language, 'defeatTitle')}
            </h2>
            {isPlayerWin && rewardDeity && (
              <div className="mt-2 p-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {getTranslation(language, 'rewardUnlocked')}: <strong>{rewardDeity.name}</strong>
                </span>
              </div>
            )}
          </div>
        ) : (
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-300 to-pink-300 font-cinzel tracking-wider shrink-0">
            {winningTeam
              ? getTranslation(language, 'victoryTitle')
              : getTranslation(language, 'defeatTitle')}
          </h2>
        )}

        {winningTeam && faction && !campaignMission && (
          <div className="my-2 sm:my-3 shrink-0">
            <span
              className="text-base sm:text-lg font-bold"
              style={{ color: winningTeam.color }}
            >
              {winningTeam.name}
            </span>
            <p className="text-xs text-purple-300 mt-0.5">
              {getTranslation(language, 'victorBanner')}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="w-full my-3 sm:my-4 grid grid-cols-2 gap-2 text-left">
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase leading-snug break-words">
              {getTranslation(language, 'statTotalTurns')}
            </span>
            <span className="text-sm font-bold font-mono text-slate-100">
              {totalTurns}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase leading-snug break-words">
              {getTranslation(language, 'statDamageDealt')}
            </span>
            <span className="text-sm font-bold font-mono text-amber-400">
              {totalDamage}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase leading-snug break-words">
              {getTranslation(language, 'statPinsKnocked')}
            </span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              {pinsKnocked}
            </span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase leading-snug break-words">
              {getTranslation(language, 'statVoidElims')}
            </span>
            <span className="text-sm font-bold font-mono text-sky-400">
              {voidElims}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-2 shrink-0">
          <button
            onClick={onMainMenu}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors min-h-[44px]"
          >
            {getTranslation(language, 'backToMenu')}
          </button>
          
          {campaignMission && isPlayerWin && onNextMission && campaignMission.id < 6 ? (
            <button
              onClick={onNextMission}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-bold text-xs font-cinzel shadow-lg shadow-purple-600/30 transition-all min-h-[44px] flex items-center justify-center gap-1"
            >
              <span>{language === 'pt' ? 'Próximo Julgamento' : 'Next Trial'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onRematch}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs font-cinzel shadow-lg shadow-purple-600/30 transition-all min-h-[44px]"
            >
              {campaignMission
                ? isPlayerWin
                  ? language === 'pt' ? 'Repetir Julgamento' : 'Replay Trial'
                  : language === 'pt' ? 'Tentar Novamente' : 'Try Again'
                : getTranslation(language, 'playAgain')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
