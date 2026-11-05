/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BookOpen,
  Globe,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { GameSettings, Language } from '../types/game';
import { getTranslation } from '../services/localization';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onReplayTour: () => void;
  onResetProgress: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onReplayTour,
  onResetProgress,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-slate-900 border border-purple-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between scrollbar-thin scrollbar-thumb-purple-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100 font-cinzel">
              {getTranslation(settings.language, 'settings')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="py-3 space-y-3.5 flex-1">
          {/* Language Switch */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {getTranslation(settings.language, 'language')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ language: 'en' })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                  settings.language === 'en'
                    ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                English (US)
              </button>
              <button
                onClick={() => onUpdateSettings({ language: 'pt' })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                  settings.language === 'pt'
                    ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Português (Brasil)
              </button>
            </div>
          </div>

          {/* Sound FX Toggle & Volume */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">
                {getTranslation(settings.language, 'soundFX')}
              </span>
              <button
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                  settings.soundEnabled
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
            {settings.soundEnabled && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            )}
          </div>

          {/* Cosmic Music Toggle & Volume */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">
                {getTranslation(settings.language, 'music')}
              </span>
              <button
                onClick={() => onUpdateSettings({ musicEnabled: !settings.musicEnabled })}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                  settings.musicEnabled
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.musicEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
            {settings.musicEnabled && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            )}
          </div>

          {/* Action Links */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                onClose();
                onReplayTour();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 min-h-[44px]"
            >
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>{getTranslation(settings.language, 'replayTour')}</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm(settings.language === 'pt' ? 'Redefinir progresso local?' : 'Reset local progression?')) {
                  onResetProgress();
                }
              }}
              className="w-full py-2 px-4 rounded-xl text-rose-400 hover:bg-rose-950/30 text-xs font-medium flex items-center justify-center gap-2 min-h-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{getTranslation(settings.language, 'resetStats')}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-cinzel min-h-[44px]"
          >
            {settings.language === 'pt' ? 'Salvar' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
