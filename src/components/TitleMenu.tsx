/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Bot,
  Crown,
  Globe,
  Mail,
  Play,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Users,
  Wifi,
} from 'lucide-react';
import {
  AIDifficulty,
  FactionId,
  GameMode,
  Language,
  MapId,
} from '../types/game';
import { FACTIONS, MAPS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';
import titleArtwork from '../assets/images/title_retro_arcade_1793718499922.jpg';

interface TitleMenuProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onStartMatch: (config: {
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
  }) => void;
  onOpenCampaign: () => void;
  onOpenLocalNetwork: () => void;
  onOpenDeities: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
}

export const TitleMenu: React.FC<TitleMenuProps> = ({
  language,
  onSetLanguage,
  onStartMatch,
  onOpenCampaign,
  onOpenLocalNetwork,
  onOpenDeities,
  onOpenSettings,
  onOpenTutorial,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  // Match setup form state
  const [team1Name, setTeam1Name] = useState(() => language === 'pt' ? 'Buscadores Alfa' : 'Alpha Seekers');
  const [team1Faction, setTeam1Faction] = useState<FactionId>('COSMIC_BOWLERS');
  const [team1Color, setTeam1Color] = useState('#34d399');

  const [team2Name, setTeam2Name] = useState(() => language === 'pt' ? 'Arcontes Ômega' : 'Omega Archons');
  const [team2Faction, setTeam2Faction] = useState<FactionId>('ARCHONS');
  const [team2Color, setTeam2Color] = useState('#fbbf24');

  const [mapId, setMapId] = useState<MapId>('COSMIC_BOWLING_ALLEY');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('NORMAL');
  const [teamSize, setTeamSize] = useState<number>(3);
  const [privacyHandoff, setPrivacyHandoff] = useState<boolean>(true);

  const factionList = Object.values(FACTIONS);
  const mapList = Object.values(MAPS);

  const handleLaunch = () => {
    if (!selectedMode) return;
    onStartMatch({
      mode: selectedMode,
      team1Name,
      team1Faction,
      team1Color,
      team2Name,
      team2Faction,
      team2Color,
      mapId,
      difficulty,
      teamSize,
      privacyHandoff,
    });
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 flex flex-col justify-between overflow-y-auto select-none p-4 sm:p-6 font-outfit scanlines">
      {/* Background Graphic (16-bit Retro Arcade) */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <img
          src={titleArtwork}
          alt="Retro Arcade Title Artwork"
          className="w-full h-full object-cover pixelated"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/50" />
      </div>

      {/* Top Header / Language Switcher / Arcade Coin Counter */}
      <header className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-arcade tracking-wider text-emerald-400 font-bold uppercase drop-shadow">
            CREDIT 02
          </span>
          <span className="hidden sm:inline text-[9px] font-arcade text-amber-400 animate-pulse ml-2">
            ★ INSERT COIN ★
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-900 border-2 border-slate-700 p-0.5 shadow-md">
            <button
              onClick={() => onSetLanguage('en')}
              className={`px-2.5 py-1 text-[10px] font-arcade transition-all min-h-[32px] ${
                language === 'en'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onSetLanguage('pt')}
              className={`px-2.5 py-1 text-[10px] font-arcade transition-all min-h-[32px] ${
                language === 'pt'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PT
            </button>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 bg-slate-900 border-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shadow-md arcade-btn"
            title={getTranslation(language, 'settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 my-auto py-6 max-w-4xl mx-auto w-full flex flex-col items-center">
        {selectedMode === null ? (
          // Mode Selection View
          <div className="w-full flex flex-col items-center text-center">
            {/* Retro Arcade Title Glow Lockup */}
            <div className="inline-block px-4 py-1 mb-2 bg-purple-950/80 border border-purple-500/60 rounded text-[9px] font-arcade text-purple-300 tracking-widest uppercase">
              1999 COSMIC ARTILLERY ARCADE
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-arcade text-amber-300 tracking-wider drop-shadow-[0_4px_0_#7c2d12] leading-tight">
              {getTranslation(language, 'gameTitle')}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-0.5 w-6 bg-pink-500" />
              <span className="text-[11px] sm:text-xs font-arcade tracking-widest text-pink-400">
                {getTranslation(language, 'gameSubtitle')}
              </span>
              <span className="h-0.5 w-6 bg-pink-500" />
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mt-3 max-w-md font-mono bg-slate-950/80 px-3 py-1 border border-slate-800">
              {getTranslation(language, 'tagline')}
            </p>

            {/* Mode Action Buttons (Arcade Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-7 w-full max-w-xl">
              {/* Single Player vs CPU */}
              <button
                onClick={() => setSelectedMode('SINGLE_PLAYER_AI')}
                className="arcade-btn group relative p-3.5 sm:p-4 bg-slate-900/90 hover:bg-purple-950/70 border-2 border-purple-500/50 hover:border-purple-300 text-left flex items-center gap-3"
              >
                <div className="p-2 sm:p-2.5 bg-purple-900/80 border border-purple-400 text-purple-200 shrink-0">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-arcade px-1.5 py-0.5 bg-purple-700 text-white shrink-0">
                      1P
                    </span>
                    <h3 className="text-[10px] sm:text-xs font-arcade text-slate-100 leading-snug break-words">
                      {getTranslation(language, 'singlePlayerAI')}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-mono leading-tight">
                    {language === 'pt'
                      ? 'Desafie a CPU em 3 níveis de IA'
                      : 'Battle tactical CPU on 3 difficulties'}
                  </p>
                </div>
              </button>

              {/* Local Hot-Seat 2P */}
              <button
                onClick={() => setSelectedMode('HOT_SEAT_LOCAL')}
                className="arcade-btn group relative p-3.5 sm:p-4 bg-slate-900/90 hover:bg-amber-950/70 border-2 border-amber-500/50 hover:border-amber-300 text-left flex items-center gap-3"
              >
                <div className="p-2 sm:p-2.5 bg-amber-900/80 border border-amber-400 text-amber-200 shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-arcade px-1.5 py-0.5 bg-amber-600 text-white shrink-0">
                      2P
                    </span>
                    <h3 className="text-[10px] sm:text-xs font-arcade text-slate-100 leading-snug break-words">
                      {getTranslation(language, 'hotSeatMultiplayer')}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-mono leading-tight">
                    {language === 'pt'
                      ? 'Passe o aparelho com tela secreta'
                      : 'Pass the device with privacy shield'}
                  </p>
                </div>
              </button>

              {/* Local Wi-Fi Network (2 Mobiles) */}
              <button
                onClick={onOpenLocalNetwork}
                className="arcade-btn group relative p-3.5 sm:p-4 bg-slate-900/90 hover:bg-cyan-950/70 border-2 border-cyan-500/50 hover:border-cyan-300 text-left flex items-center gap-3 sm:col-span-2"
              >
                <div className="p-2 sm:p-2.5 bg-cyan-900/80 border border-cyan-400 text-cyan-200 shrink-0">
                  <Wifi className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-arcade px-1.5 py-0.5 bg-cyan-600 text-white shrink-0">
                      WI-FI LAN
                    </span>
                    <h3 className="text-[10px] sm:text-xs font-arcade text-slate-100 leading-snug break-words">
                      {getTranslation(language, 'localNetworkMultiplayer')}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-mono leading-tight">
                    {language === 'pt'
                      ? 'Crie uma sala ou conecte 2 celulares pelo Wi-Fi de casa (QR Code / Código)'
                      : 'Host or join across 2 phones on your home Wi-Fi network (QR Code / Code)'}
                  </p>
                </div>
              </button>

              {/* Campaign Trials */}
              <button
                onClick={onOpenCampaign}
                className="arcade-btn group relative p-3.5 sm:p-4 bg-slate-900/90 hover:bg-sky-950/70 border-2 border-sky-500/50 hover:border-sky-300 text-left flex items-center gap-3"
              >
                <div className="p-2 sm:p-2.5 bg-sky-900/80 border border-sky-400 text-sky-200 shrink-0">
                  <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-arcade px-1.5 py-0.5 bg-sky-600 text-white shrink-0">
                      QUEST
                    </span>
                    <h3 className="text-[10px] sm:text-xs font-arcade text-slate-100 leading-snug break-words">
                      {getTranslation(language, 'campaignMode')}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-mono leading-tight">
                    {language === 'pt'
                      ? '6 Julgamentos com divindades'
                      : '6 Sacred Trials with deity rewards'}
                  </p>
                </div>
              </button>

              {/* Cosmic Pantheon & Stats */}
              <button
                onClick={onOpenDeities}
                className="arcade-btn group relative p-3.5 sm:p-4 bg-slate-900/90 hover:bg-emerald-950/70 border-2 border-emerald-500/50 hover:border-emerald-300 text-left flex items-center gap-3"
              >
                <div className="p-2 sm:p-2.5 bg-emerald-900/80 border border-emerald-400 text-emerald-200 shrink-0">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-arcade px-1.5 py-0.5 bg-emerald-600 text-white shrink-0">
                      VAULT
                    </span>
                    <h3 className="text-[10px] sm:text-xs font-arcade text-slate-100 leading-snug break-words">
                      {getTranslation(language, 'deityGallery')}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-mono leading-tight">
                    {language === 'pt'
                      ? 'Divindades desbloqueadas & registros'
                      : 'Pantheon unlocks & battle ledger'}
                  </p>
                </div>
              </button>
            </div>

            {/* Tutorial Button */}
            <button
              onClick={onOpenTutorial}
              className="mt-6 flex items-center gap-2 text-xs font-arcade text-purple-300 hover:text-purple-100 py-2 px-4 border border-purple-800 bg-slate-900/60 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>{getTranslation(language, 'howToPlay')}</span>
            </button>
          </div>
        ) : (
          // Match Setup Configuration View
          <div className="w-full max-w-2xl max-h-[88vh] bg-slate-900/95 border border-purple-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 shrink-0">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 font-cinzel break-words leading-tight">
                  {selectedMode === 'SINGLE_PLAYER_AI'
                    ? getTranslation(language, 'singlePlayerAI')
                    : getTranslation(language, 'hotSeatMultiplayer')}
                </h2>
                <p className="text-xs text-purple-400 mt-0.5 break-words leading-tight">
                  {getTranslation(language, 'setupMatch')}
                </p>
              </div>

              <button
                onClick={() => setSelectedMode(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 shrink-0 min-h-[36px]"
              >
                {getTranslation(language, 'backToMenu')}
              </button>
            </div>

            {/* Setup Form */}
            <div className="py-3 sm:py-4 space-y-3.5 max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-900 flex-1">
              {/* Teams Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Team 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {getTranslation(language, 'team1Name')}
                  </label>
                  <input
                    type="text"
                    value={team1Name}
                    onChange={(e) => setTeam1Name(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:border-purple-500 outline-none mb-3"
                  />

                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {getTranslation(language, 'selectFaction')}
                  </label>
                  <select
                    value={team1Faction}
                    onChange={(e) => {
                      const f = e.target.value as FactionId;
                      setTeam1Faction(f);
                      setTeam1Color(FACTIONS[f].primaryColor);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none"
                  >
                    {factionList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.symbol} {getTranslation(language, f.nameKey)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {selectedMode === 'SINGLE_PLAYER_AI' ? getTranslation(language, 'cpuOpponent') : getTranslation(language, 'team2Name')}
                  </label>
                  <input
                    type="text"
                    value={team2Name}
                    onChange={(e) => setTeam2Name(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:border-purple-500 outline-none mb-3"
                  />

                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {getTranslation(language, 'selectFaction')}
                  </label>
                  <select
                    value={team2Faction}
                    onChange={(e) => {
                      const f = e.target.value as FactionId;
                      setTeam2Faction(f);
                      setTeam2Color(FACTIONS[f].primaryColor);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none"
                  >
                    {factionList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.symbol} {getTranslation(language, f.nameKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Battlefield & Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Map selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {getTranslation(language, 'selectMap')}
                  </label>
                  <select
                    value={mapId}
                    onChange={(e) => setMapId(e.target.value as MapId)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none"
                  >
                    {mapList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {getTranslation(language, m.nameKey)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AI Difficulty (if CPU mode) */}
                {selectedMode === 'SINGLE_PLAYER_AI' ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      {getTranslation(language, 'selectDifficulty')}
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as AIDifficulty)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none"
                    >
                      <option value="EASY">{getTranslation(language, 'diffEasy')}</option>
                      <option value="NORMAL">{getTranslation(language, 'diffNormal')}</option>
                      <option value="ARCHON_NIGHTMARE">{getTranslation(language, 'diffNightmare')}</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      {getTranslation(language, 'privacyScreen')}
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyHandoff}
                        onChange={(e) => setPrivacyHandoff(e.target.checked)}
                        className="rounded accent-purple-600 shrink-0"
                      />
                      <span className="break-words">{language === 'pt' ? 'Ativar tela secreta no Hot-Seat' : 'Enable privacy shield in Hot-Seat'}</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Team Size */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {getTranslation(language, 'teamSize')}
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setTeamSize(sz)}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                        teamSize === sz
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sz} vs {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-3 sm:pt-4 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={handleLaunch}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm tracking-wider font-cinzel shadow-xl shadow-purple-600/30 active:scale-98 transition-all min-h-[48px]"
              >
                {getTranslation(language, 'startBattle')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Retro Arcade Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] text-slate-400 border-t-2 border-slate-800/80 pt-3 text-center font-arcade">
        <div className="flex items-center justify-center gap-2 flex-wrap text-center">
          <span className="text-amber-400">★</span>
          <a
            href="https://github.com/dimenuvel/Evangelho-das-Dimenuveis-Armageddon"
            target="_blank"
            rel="noopener noreferrer"
            className="tracking-wider text-slate-200 hover:text-amber-300 underline decoration-purple-500/50 hover:decoration-amber-300 transition-colors"
            title="GitHub Repository"
          >
            {language === 'pt' ? 'Evangelho das Dimenúveis: Armageddon' : 'Gospel of Dimenuous: Armageddon'}
          </a>
          <span className="px-1.5 py-0.5 bg-purple-900 border border-purple-400 text-[9px] font-bold text-purple-200">
            v1.0
          </span>
          <span className="text-slate-600">·</span>
          <a
            href={`mailto:samuel.tiem@proton.me?subject=${encodeURIComponent(
              language === 'pt' ? 'Evangelho das Dimenúveis: Armageddon' : 'Gospel of Dimenuous: Armageddon'
            )}`}
            className="text-purple-400 hover:text-purple-200 underline decoration-purple-600/50 hover:decoration-purple-200 transition-colors flex items-center gap-1"
            title="E-mail"
          >
            <Mail className="w-3 h-3 text-purple-400" />
            <span>{getTranslation(language, 'contact')}</span>
          </a>
          <span className="text-slate-600 hidden md:inline">·</span>
          <span className="text-slate-500 hidden md:inline">16-BIT COSMIC ARTILLERY</span>
        </div>
      </footer>
    </div>
  );
};
