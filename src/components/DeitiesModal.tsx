/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, BarChart3, Crown, Lock, Sparkles, X } from 'lucide-react';
import { Language, PlayerStats } from '../types/game';
import { DEITIES, FACTIONS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';

interface DeitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  stats: PlayerStats;
}

export const DeitiesModal: React.FC<DeitiesModalProps> = ({
  isOpen,
  onClose,
  language,
  stats,
}) => {
  if (!isOpen) return null;

  const winRate =
    stats.matchesPlayed > 0
      ? Math.round((stats.wins / stats.matchesPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-purple-500/40 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-300 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-100 font-cinzel break-words leading-tight">
                {getTranslation(language, 'pantheonTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-400 break-words leading-tight">
                {language === 'pt'
                  ? 'Divindades cósmicas coletadas & registros de batalha'
                  : 'Collected celestial deities & dimensional battle statistics'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-5 scrollbar-thin scrollbar-thumb-purple-900">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block uppercase">
                {language === 'pt' ? 'Partidas' : 'Matches'}
              </span>
              <span className="text-xl font-bold font-mono text-purple-400">
                {stats.matchesPlayed}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block uppercase">
                {language === 'pt' ? 'Vitórias' : 'Victories'}
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {stats.wins} <span className="text-xs text-slate-500">({winRate}%)</span>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block uppercase">
                {language === 'pt' ? 'Dano Total' : 'Total Damage'}
              </span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {stats.damageDealt}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block uppercase">
                {language === 'pt' ? 'Quedas no Vazio' : 'Void Kills'}
              </span>
              <span className="text-xl font-bold font-mono text-sky-400">
                {stats.voidDrownings}
              </span>
            </div>
          </div>

          {/* Deity Pantheon Cards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>
                {language === 'pt' ? 'Divindades Desbloqueadas' : 'Unlocked Cosmic Deities'} (
                {stats.unlockedDeityIds.length} / {DEITIES.length})
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {DEITIES.map((deity) => {
                const isUnlocked = stats.unlockedDeityIds.includes(deity.id);
                const faction = FACTIONS[deity.faction];

                return (
                  <div
                    key={deity.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnlocked
                        ? 'bg-slate-800/80 border-purple-500/40 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/60 opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                          isUnlocked
                            ? 'bg-purple-950/90 border border-purple-400/60 shadow-inner'
                            : 'bg-slate-900 border border-slate-800 text-slate-600'
                        }`}
                      >
                        {isUnlocked ? deity.avatarIcon : <Lock className="w-5 h-5 text-slate-600" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-bold text-slate-100 font-cinzel break-words leading-tight">
                            {getTranslation(language, deity.nameKey, deity.name)}
                          </h4>
                          {isUnlocked && (
                            <span className="text-[10px] font-bold text-purple-400 font-cinzel shrink-0">
                              {faction.symbol}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-amber-300 font-medium mt-0.5">
                          {getTranslation(language, deity.titleKey)}
                        </p>

                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          {isUnlocked
                            ? getTranslation(language, deity.loreKey)
                            : language === 'pt'
                            ? 'Conclua os Julgamentos Sagrados para despertar esta divindade.'
                            : 'Complete the Sacred Trials to awaken this cosmic deity.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
