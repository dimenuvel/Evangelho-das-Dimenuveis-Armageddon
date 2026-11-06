/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Lock, Sparkles, Star, Swords, X } from 'lucide-react';
import { CampaignMission, Language } from '../types/game';
import { CAMPAIGN_MISSIONS, DEITIES, FACTIONS, MAPS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  completedMissions: number[]; // Array of mission IDs cleared
  onLaunchMission: (mission: CampaignMission) => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  language,
  completedMissions,
  onLaunchMission,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-purple-500/40 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-300 shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-100 font-cinzel truncate">
                {getTranslation(language, 'campaignTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-400 truncate">
                {language === 'pt'
                  ? 'Vença os 6 Julgamentos para restaurar a harmonia dimensional'
                  : 'Overthrow the Archons across six cosmic trials'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/80 border border-purple-500/40 rounded-xl text-xs font-mono text-amber-300">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{completedMissions.length} / {CAMPAIGN_MISSIONS.length}</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mission Grid */}
        <div className="p-3 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-purple-900">
          {CAMPAIGN_MISSIONS.map((mission) => {
            const isCompleted = completedMissions.includes(mission.id);
            const isUnlocked = mission.id === 1 || completedMissions.includes(mission.id - 1);
            const rewardDeity = DEITIES.find((d) => d.id === mission.unlockDeityId);
            const playerFaction = FACTIONS[mission.playerFaction];
            const enemyFaction = FACTIONS[mission.enemyFaction];
            const mapDef = MAPS[mission.mapId];

            return (
              <div
                key={mission.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isUnlocked
                    ? isCompleted
                      ? 'bg-slate-800/80 border-emerald-500/40 shadow-lg'
                      : 'bg-slate-800/90 border-purple-500/40 hover:border-purple-300 shadow-xl'
                    : 'bg-slate-950/60 border-slate-800/60 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-purple-400">
                      {isCompleted ? '✓ CLEARED' : `TRIAL 0${mission.id}`}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        mission.difficulty === 'EASY'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                          : mission.difficulty === 'NORMAL'
                          ? 'bg-amber-950 text-amber-400 border border-amber-700/50'
                          : 'bg-rose-950 text-rose-400 border border-rose-700/50'
                      }`}
                    >
                      {mission.difficulty}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 font-cinzel mt-1">
                    {getTranslation(language, mission.titleKey)}
                  </h3>

                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {getTranslation(language, mission.descKey)}
                  </p>

                  <div className="mt-3 p-2 sm:p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400">
                    <div className="truncate">
                      <span className="text-slate-500">Map: </span>
                      <span className="text-slate-300 font-medium">
                        {getTranslation(language, mapDef.nameKey)}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500">Versus: </span>
                      <span className="text-amber-300 font-medium">
                        {getTranslation(language, enemyFaction.nameKey)}
                      </span>
                    </div>
                  </div>

                  {rewardDeity && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-purple-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">
                        Reward: <strong className="text-amber-300">{rewardDeity.name}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                  {isUnlocked ? (
                    <button
                      onClick={() => {
                        onLaunchMission(mission);
                        onClose();
                      }}
                      className="w-full py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-cinzel tracking-wider shadow-md active:scale-98 transition-all min-h-[44px]"
                    >
                      {isCompleted ? 'Replay Trial' : getTranslation(language, 'startMission')}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 py-2">
                      <Lock className="w-4 h-4" />
                      <span>{getTranslation(language, 'locked')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
