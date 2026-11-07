/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bomb,
  CircleDot,
  Clock,
  Compass,
  Disc,
  FileSpreadsheet,
  Flame,
  Move,
  Rocket,
  RotateCcw,
  Sparkles,
  Sun,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { Language, WeaponCategory, WeaponDef, WeaponId } from '../types/game';
import { WEAPONS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';

interface WeaponSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeaponId: WeaponId;
  onSelectWeapon: (weaponId: WeaponId) => void;
  availableAmmo: Record<WeaponId, number>;
  language: Language;
}

const WEAPON_ICONS: Record<string, React.ReactNode> = {
  Rocket: <Rocket className="w-5 h-5" />,
  CircleDot: <CircleDot className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  FileSpreadsheet: <FileSpreadsheet className="w-5 h-5" />,
  Compass: <Compass className="w-5 h-5" />,
  Sun: <Sun className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  RotateCcw: <RotateCcw className="w-5 h-5" />,
  Disc: <Disc className="w-5 h-5" />,
  Bug: <CircleDot className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Bomb: <Bomb className="w-5 h-5" />,
  Move: <Move className="w-5 h-5" />,
  Wind: <Wind className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
};

export const WeaponSheet: React.FC<WeaponSheetProps> = ({
  isOpen,
  onClose,
  selectedWeaponId,
  onSelectWeapon,
  availableAmmo,
  language,
}) => {
  const [activeCategory, setActiveCategory] = useState<WeaponCategory | 'ALL'>('ALL');

  if (!isOpen) return null;

  const allWeapons = Object.values(WEAPONS);
  const filteredWeapons =
    activeCategory === 'ALL'
      ? allWeapons
      : allWeapons.filter((w) => w.category === activeCategory);

  const categories: Array<{ id: WeaponCategory | 'ALL'; label: string }> = [
    { id: 'ALL', label: language === 'pt' ? 'Todas' : 'All' },
    { id: 'ARTILLERY', label: language === 'pt' ? 'Artilharia' : 'Artillery' },
    { id: 'COSMIC_BOWLING', label: language === 'pt' ? 'Boliche' : 'Bowling' },
    { id: 'SACRED_DIVINE', label: language === 'pt' ? 'Divinas' : 'Sacred' },
    { id: 'AIRSTRIKE', label: language === 'pt' ? 'Ataque Aéreo' : 'Airstrike' },
    { id: 'TACTICAL_UTILITY', label: language === 'pt' ? 'Táticas' : 'Tactical' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-purple-500/30 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-cinzel">
                {getTranslation(language, 'weapons')}
              </h2>
              <p className="text-xs text-purple-400">
                {language === 'pt' ? 'Selecione um projétil cósmico' : 'Select your cosmic ordinance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-800 bg-slate-900/90 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors min-h-[38px] ${
                activeCategory === cat.id
                  ? 'bg-purple-600 text-white font-semibold shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Weapon List / Grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-purple-900">
          {filteredWeapons.map((wpn) => {
            const ammo = availableAmmo[wpn.id] ?? 0;
            const isInfinite = wpn.initialAmmo === -1;
            const isAvailable = isInfinite || ammo > 0;
            const isSelected = selectedWeaponId === wpn.id;

            return (
              <button
                key={wpn.id}
                disabled={!isAvailable}
                onClick={() => {
                  onSelectWeapon(wpn.id);
                  onClose();
                }}
                className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-purple-900/40 border-purple-400 ring-2 ring-purple-500/40'
                    : isAvailable
                    ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800 hover:border-purple-500/40'
                    : 'bg-slate-950/40 border-slate-800/50 opacity-40 cursor-not-allowed'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    isSelected ? 'bg-purple-600 text-white' : 'bg-slate-900 text-purple-400'
                  }`}
                >
                  {WEAPON_ICONS[wpn.iconName] || <Rocket className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-100 leading-tight break-words">
                      {getTranslation(language, wpn.nameKey)}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                      {isInfinite ? '∞' : `x${ammo}`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 break-words leading-relaxed">
                    {getTranslation(language, wpn.descKey)}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    {wpn.damage > 0 && (
                      <span className="text-rose-400 font-medium">
                        {language === 'pt' ? 'Dano' : 'DMG'}: {wpn.damage}
                      </span>
                    )}
                    {wpn.fuseSeconds && (
                      <span className="text-amber-300">
                        {wpn.fuseSeconds}s {language === 'pt' ? 'pavio' : 'fuse'}
                      </span>
                    )}
                    {wpn.isWindAffected && (
                      <span className="text-sky-300">
                        {language === 'pt' ? 'Vento' : 'Wind'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-lg transition-colors min-h-[44px]"
          >
            {language === 'pt' ? 'Fechar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
