/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bomb,
  BookOpen,
  Crosshair,
  Footprints,
  Layers,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../services/localization';

interface FirstLaunchTourModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onSetLanguage?: (lang: Language) => void;
}

export const FirstLaunchTourModal: React.FC<FirstLaunchTourModalProps> = ({
  isOpen,
  language,
  onClose,
  onSetLanguage,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      icon: <Sparkles className="w-8 h-8 text-purple-400" />,
      titleKey: 'tourStep1Title',
      descKey: 'tourStep1Desc',
      badge: '01 / 06',
    },
    {
      icon: <Footprints className="w-8 h-8 text-amber-400" />,
      titleKey: 'tourStep2Title',
      descKey: 'tourStep2Desc',
      badge: '02 / 06',
    },
    {
      icon: <Crosshair className="w-8 h-8 text-sky-400" />,
      titleKey: 'tourStep3Title',
      descKey: 'tourStep3Desc',
      badge: '03 / 06',
    },
    {
      icon: <Layers className="w-8 h-8 text-rose-400" />,
      titleKey: 'tourStep4Title',
      descKey: 'tourStep4Desc',
      badge: '04 / 06',
    },
    {
      icon: <Bomb className="w-8 h-8 text-emerald-400" />,
      titleKey: 'tourStep5Title',
      descKey: 'tourStep5Desc',
      badge: '05 / 06',
    },
    {
      icon: <Swords className="w-8 h-8 text-purple-400" />,
      titleKey: 'tourStep6Title',
      descKey: 'tourStep6Desc',
      badge: '06 / 06',
    },
  ];

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900 border border-purple-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between scrollbar-thin scrollbar-thumb-purple-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 font-cinzel break-words leading-tight">
              {getTranslation(language, 'tourTitle')}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onSetLanguage && (
              <button
                type="button"
                onClick={() => onSetLanguage(language === 'pt' ? 'en' : 'pt')}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-slate-950 hover:bg-slate-800 border border-purple-500/40 hover:border-purple-300 active:scale-90 transition-all shadow-sm"
                title={language === 'pt' ? 'Switch to English (US)' : 'Mudar para Português (BR)'}
                aria-label={language === 'pt' ? 'Switch to English' : 'Mudar para Português'}
              >
                <span className="text-base sm:text-lg leading-none select-none" role="img" aria-label={language === 'pt' ? 'Brasil' : 'United States'}>
                  {language === 'pt' ? '🇧🇷' : '🇺🇸'}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/60 transition-colors"
              title={getTranslation(language, 'tourSkip')}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="py-4 sm:py-6 flex flex-col items-center text-center flex-1">
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 mb-3 sm:mb-4 shadow-inner shrink-0">
            {step.icon}
          </div>

          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-purple-400 tracking-wider">
            {step.badge}
          </span>

          <h3 className="text-lg font-bold text-slate-100 font-cinzel mt-1">
            {getTranslation(language, step.titleKey)}
          </h3>

          <p className="text-xs text-slate-300 mt-2.5 leading-relaxed max-w-sm">
            {getTranslation(language, step.descKey)}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep ? 'w-6 bg-purple-500' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 px-3 py-2 min-h-[44px]"
          >
            {getTranslation(language, 'tourSkip')}
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((c) => c - 1)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold min-h-[44px]"
              >
                {getTranslation(language, 'tourPrev')}
              </button>
            )}

            <button
              onClick={() => {
                if (isLast) onClose();
                else setCurrentStep((c) => c + 1);
              }}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-cinzel shadow-lg shadow-purple-600/30 min-h-[44px]"
            >
              {isLast
                ? getTranslation(language, 'tourFinish')
                : getTranslation(language, 'tourNext')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
