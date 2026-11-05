/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { Language, Team } from '../types/game';
import { FACTIONS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';

interface HotSeatTransitionModalProps {
  isOpen: boolean;
  nextTeam: Team;
  language: Language;
  onProceed: () => void;
}

export const HotSeatTransitionModal: React.FC<HotSeatTransitionModalProps> = ({
  isOpen,
  nextTeam,
  language,
  onProceed,
}) => {
  if (!isOpen) return null;

  const faction = FACTIONS[nextTeam.faction];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-slate-900 border border-purple-500/40 text-center shadow-2xl flex flex-col items-center scrollbar-thin scrollbar-thumb-purple-900">
        <div className="p-3 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-purple-300 mb-3 sm:mb-4 animate-bounce shrink-0">
          <Shield className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        <h2 className="text-lg sm:text-xl font-black text-slate-100 font-cinzel tracking-wider shrink-0">
          {getTranslation(language, 'passDeviceTitle')}
        </h2>

        <p className="text-xs text-slate-400 mt-1 shrink-0">
          {getTranslation(language, 'passDevicePrompt')}
        </p>

        {/* Team Card */}
        <div className="w-full my-4 sm:my-5 p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center gap-3 shrink-0">
          <div
            className="w-4 h-4 rounded-full ring-2 ring-white/30 shrink-0"
            style={{ backgroundColor: nextTeam.color }}
          />
          <div className="text-left min-w-0">
            <div className="text-sm sm:text-base font-bold text-slate-100 truncate">{nextTeam.name}</div>
            <div className="text-xs text-purple-400 font-cinzel truncate">
              {getTranslation(language, faction.nameKey)} ({faction.symbol})
            </div>
          </div>
        </div>

        <button
          onClick={onProceed}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm tracking-wide font-cinzel shadow-lg shadow-purple-600/30 active:scale-98 transition-all min-h-[48px] shrink-0"
        >
          {getTranslation(language, 'readyToPlay')}
        </button>
      </div>
    </div>
  );
};
