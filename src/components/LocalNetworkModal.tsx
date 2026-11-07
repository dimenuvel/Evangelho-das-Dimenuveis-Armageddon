/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Globe,
  Loader2,
  QrCode,
  Radio,
  RefreshCw,
  Share2,
  ShieldAlert,
  Sparkles,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { FactionId, Language, MapId } from '../types/game';
import { FACTIONS, MAPS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';
import {
  NetworkMatchConfig,
  NetworkPlayerInfo,
  NetworkRoomSettings,
  networkService,
} from '../services/networkService';

interface LocalNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLaunchNetworkMatch: (config: NetworkMatchConfig) => void;
}

export const LocalNetworkModal: React.FC<LocalNetworkModalProps> = ({
  isOpen,
  onClose,
  language,
  onLaunchNetworkMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'HOST' | 'JOIN'>('HOST');

  // Player Profile
  const [playerName, setPlayerName] = useState<string>(() =>
    language === 'pt' ? 'Guerreiro Alfa' : 'Seeker One'
  );
  const [selectedFaction, setSelectedFaction] = useState<FactionId>('COSMIC_BOWLERS');

  // Host Configuration
  const [selectedMap, setSelectedMap] = useState<MapId>('COSMIC_BOWLING_ALLEY');
  const [teamSize, setTeamSize] = useState<number>(3);
  const [turnTimeLimit, setTurnTimeLimit] = useState<number>(45);

  // Connection & Room State
  const initialNativeIp = (() => {
    if (typeof window !== 'undefined' && (window as any).AndroidDevice?.getDeviceLocalIp) {
      try {
        const ip = (window as any).AndroidDevice.getDeviceLocalIp();
        if (ip && typeof ip === 'string' && ip.trim().length > 0) {
          return ip.trim();
        }
      } catch {}
    }
    return '';
  })();

  const [localNetworkIp, setLocalNetworkIp] = useState<string>(initialNativeIp);
  const [isDetectingIp, setIsDetectingIp] = useState<boolean>(false);

  const [serverUrl, setServerUrl] = useState<string>(() => {
    if (initialNativeIp) {
      return `http://${initialNativeIp}:3000`;
    }
    if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) {
      return window.location.origin;
    }
    const saved = networkService.getSavedServerUrl();
    if (saved && !saved.includes('localhost')) {
      return saved;
    }
    return '';
  });
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Connected Opponent
  const [connectedGuest, setConnectedGuest] = useState<NetworkPlayerInfo | null>(null);
  const [connectedHost, setConnectedHost] = useState<NetworkPlayerInfo | null>(null);

  const refreshNetworkIp = async () => {
    setIsDetectingIp(true);
    try {
      const info = await networkService.fetchLocalNetworkInfo();
      if (info && info.localIp) {
        setLocalNetworkIp(info.localIp);
        setServerUrl((prev) => {
          if (!prev || prev.includes('localhost') || prev.includes('127.0.0.1')) {
            const upgraded = info.localUrl || `http://${info.localIp}:3000`;
            networkService.setServerUrl(upgraded);
            return upgraded;
          }
          return prev;
        });
      }
    } finally {
      setIsDetectingIp(false);
    }
  };

  // Fetch local network info and check query parameters when opened
  useEffect(() => {
    if (!isOpen) return;

    // Check if URL has ?join=XXXX
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('join');
      if (urlCode) {
        setJoinCodeInput(urlCode.toUpperCase().trim());
        setActiveTab('JOIN');
      }
    }

    // Try fetching/detecting local LAN IP
    refreshNetworkIp();

    // Listeners for networkService
    const unsubCreated = networkService.on('roomCreated', async (payload: any) => {
      setRoomCode(payload.code);
      setIsConnecting(false);
      setStatusMessage(getTranslation(language, 'waitingForPlayer2'));

      // Generate QR Code with join URL
      let baseJoinUrl = serverUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      // If baseJoinUrl is still localhost but we detected a real LAN IP, prioritize the real network IP
      if (
        (baseJoinUrl.includes('localhost') || baseJoinUrl.includes('127.0.0.1')) &&
        localNetworkIp &&
        localNetworkIp !== 'localhost' &&
        !localNetworkIp.startsWith('169.254.')
      ) {
        baseJoinUrl = `http://${localNetworkIp}:3000`;
      }
      const fullJoinUrl = `${baseJoinUrl}/?join=${payload.code}`;
      const qr = await networkService.generateJoinQRCode(payload.code, fullJoinUrl);
      setQrCodeDataUrl(qr);
    });

    const unsubGuest = networkService.on('guestConnected', (guest: NetworkPlayerInfo) => {
      setConnectedGuest(guest);
      setStatusMessage(getTranslation(language, 'player2Connected'));
    });

    const unsubJoined = networkService.on('roomJoined', (payload: any) => {
      setRoomCode(payload.code);
      setConnectedHost(payload.host);
      setIsConnecting(false);
      setStatusMessage(getTranslation(language, 'connectedWaitingHost'));
    });

    const unsubStarted = networkService.on('matchStarted', (matchPayload: any) => {
      setIsConnecting(false);
      onLaunchNetworkMatch(matchPayload);
      onClose();
    });

    const unsubDisconn = networkService.on('opponentDisconnected', (payload: any) => {
      setConnectedGuest(null);
      setConnectedHost(null);
      setStatusMessage(payload.message || 'Opponent disconnected');
    });

    const unsubError = networkService.on('error', (err: any) => {
      setIsConnecting(false);
      setErrorMessage(
        err.message === 'ROOM_NOT_FOUND'
          ? language === 'pt'
            ? 'Sala não encontrada. Verifique o código.'
            : 'Room not found. Check the room code.'
          : err.message === 'ROOM_FULL'
          ? language === 'pt'
            ? 'A sala já está cheia.'
            : 'Room is already full.'
          : language === 'pt'
          ? 'Erro de conexão com o servidor local.'
          : 'Could not connect to local host server.'
      );
    });

    return () => {
      unsubCreated();
      unsubGuest();
      unsubJoined();
      unsubStarted();
      unsubDisconn();
      unsubError();
    };
  }, [isOpen, language]);

  if (!isOpen) return null;

  const factionList = Object.values(FACTIONS);
  const mapList = Object.values(MAPS);

  const handleCreateRoom = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setStatusMessage(getTranslation(language, 'connectingToHost'));
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    let targetUrl = serverUrl;
    if (isHttps && targetUrl.startsWith('http://')) {
      targetUrl = window.location.origin;
      setServerUrl(window.location.origin);
    }
    networkService.setServerUrl(targetUrl);

    const settings: NetworkRoomSettings = {
      mapId: selectedMap,
      teamSize,
      turnTimeLimit,
    };

    const success = await networkService.createRoom(playerName, selectedFaction, settings);
    if (!success) {
      setIsConnecting(false);
      setErrorMessage(
        language === 'pt'
          ? 'Falha ao conectar no servidor local.'
          : 'Could not reach local host server.'
      );
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) {
      setErrorMessage(language === 'pt' ? 'Digite o código da sala.' : 'Enter room code.');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);
    setStatusMessage(getTranslation(language, 'connectingToHost'));
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    let targetUrl = serverUrl;
    if (isHttps && targetUrl.startsWith('http://')) {
      targetUrl = window.location.origin;
      setServerUrl(window.location.origin);
    }
    networkService.setServerUrl(targetUrl);

    const success = await networkService.joinRoom(
      joinCodeInput.trim().toUpperCase(),
      playerName,
      selectedFaction
    );

    if (!success) {
      setIsConnecting(false);
      setErrorMessage(
        language === 'pt'
          ? 'Falha ao conectar ao servidor da rede.'
          : 'Failed to connect to host server.'
      );
    }
  };

  const handleStartMatch = () => {
    networkService.startMatch();
  };

  const handleCopyLink = () => {
    let baseJoinUrl = typeof window !== 'undefined' ? window.location.origin : (networkService.getServerUrl() || 'http://localhost:3000');
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      localNetworkIp &&
      localNetworkIp !== 'localhost'
    ) {
      baseJoinUrl = `http://${localNetworkIp}:3000`;
    }
    const fullUrl = `${baseJoinUrl}/?join=${roomCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleLeaveOrClose = () => {
    networkService.disconnect();
    setRoomCode('');
    setConnectedGuest(null);
    setConnectedHost(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[92vh] bg-slate-900 border border-purple-500/40 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-950 border border-purple-500/50 text-purple-300 shrink-0">
              <Wifi className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 font-cinzel break-words leading-tight">
                {getTranslation(language, 'localNetworkMultiplayer')}
              </h2>
              <p className="text-[11px] text-purple-400 break-words leading-tight mt-0.5">
                {language === 'pt'
                  ? 'Batalha direta entre celulares na mesma rede Wi-Fi residencial'
                  : 'Direct battle between phones on the same home Wi-Fi network'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLeaveOrClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Host / Join) */}
        {!roomCode && (
          <div className="flex border-b border-slate-800 bg-slate-950/50 shrink-0">
            <button
              onClick={() => {
                setActiveTab('HOST');
                setErrorMessage(null);
              }}
              className={`flex-1 py-3 px-4 text-xs font-arcade text-center transition-all flex items-center justify-center gap-2 ${
                activeTab === 'HOST'
                  ? 'bg-purple-900/40 text-purple-200 border-b-2 border-purple-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-4 h-4 text-purple-400" />
              <span>{getTranslation(language, 'hostGame')}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('JOIN');
                setErrorMessage(null);
              }}
              className={`flex-1 py-3 px-4 text-xs font-arcade text-center transition-all flex items-center justify-center gap-2 ${
                activeTab === 'JOIN'
                  ? 'bg-purple-900/40 text-purple-200 border-b-2 border-purple-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>{getTranslation(language, 'joinGame')}</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] space-y-4 scrollbar-thin scrollbar-thumb-purple-900 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Active Room Lobby View */}
          {roomCode ? (
            <div className="space-y-4 text-center">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-purple-500/40 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                  {language === 'pt' ? 'Sua Sala Local Está Pronta' : 'Your Local Room Is Live'}
                </span>

                {/* Big Room Code */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-300 to-pink-300 px-4 py-1.5 bg-slate-900 rounded-2xl border-2 border-purple-500/60 shadow-lg">
                    {roomCode}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-3 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title={copiedLink ? getTranslation(language, 'linkCopied') : getTranslation(language, 'copyLink')}
                  >
                    {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                {/* QR Code for Instant Mobile Join */}
                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center justify-center pt-2">
                    <div className="p-2.5 bg-white rounded-2xl shadow-xl border-4 border-purple-900">
                      <img
                        src={qrCodeDataUrl}
                        alt="Local Join QR Code"
                        className="w-40 h-40 sm:w-44 sm:h-44 block"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-purple-400" />
                      <span>{getTranslation(language, 'scanToJoin')}</span>
                    </p>
                  </div>
                )}

                {/* Local Wi-Fi Connection Info */}
                <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-slate-500">{getTranslation(language, 'serverAddress')}:</span>
                  <span className="text-purple-300 font-bold">{serverUrl}</span>
                </div>
              </div>

              {/* Opponent Status */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-left">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      connectedGuest || connectedHost ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      {connectedGuest
                        ? `${connectedGuest.name} (${FACTIONS[connectedGuest.faction]?.symbol || ''})`
                        : connectedHost
                        ? `${connectedHost.name} (Host)`
                        : getTranslation(language, 'waitingForPlayer2')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {connectedGuest || connectedHost
                        ? language === 'pt'
                          ? 'Pronto para o combate!'
                          : 'Ready for battle!'
                        : language === 'pt'
                        ? 'Aguardando no mesmo Wi-Fi...'
                        : 'Awaiting connection on LAN...'}
                    </span>
                  </div>
                </div>

                {connectedGuest && networkService.getRole() === 'HOST' && (
                  <button
                    onClick={handleStartMatch}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-bold text-xs font-cinzel tracking-wider shadow-lg shadow-emerald-600/30 active:scale-98 transition-all min-h-[44px]"
                  >
                    {getTranslation(language, 'startNetworkBattle')}
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'HOST' ? (
            /* Host Configuration Form */
            <div className="space-y-4">
              {/* Host Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {language === 'pt' ? 'Nome do Anfitrião' : 'Your Host Name'}
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {getTranslation(language, 'selectFaction')}
                  </label>
                  <select
                    value={selectedFaction}
                    onChange={(e) => setSelectedFaction(e.target.value as FactionId)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none"
                  >
                    {factionList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.symbol} {getTranslation(language, f.nameKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Match Rules & Map */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {getTranslation(language, 'selectMap')}
                  </label>
                  <select
                    value={selectedMap}
                    onChange={(e) => setSelectedMap(e.target.value as MapId)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none"
                  >
                    {mapList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {getTranslation(language, m.nameKey)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {language === 'pt' ? 'Guerreiros por Equipe' : 'Warriors per Team'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[2, 3, 4].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setTeamSize(sz)}
                        className={`py-2 rounded-xl text-xs font-mono font-bold border transition-colors ${
                          teamSize === sz
                            ? 'bg-purple-600 border-purple-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sz}v{sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Turn Timer */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {language === 'pt' ? 'Tempo por Turno' : 'Turn Time Limit'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTurnTimeLimit(t)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                        turnTimeLimit === t
                          ? 'bg-purple-600 border-purple-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Server Host IP Setting (Collapsible / Advanced) */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-mono text-slate-400 block">
                      {getTranslation(language, 'serverAddress')}
                    </label>
                    <button
                      type="button"
                      onClick={refreshNetworkIp}
                      className="p-1 rounded text-purple-400 hover:text-purple-200 hover:bg-purple-900/40 transition-colors"
                      title={language === 'pt' ? 'Redetectar IP' : 'Re-detect IP'}
                    >
                      <RefreshCw className={`w-3 h-3 ${isDetectingIp ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {localNetworkIp && localNetworkIp !== 'localhost' && !localNetworkIp.startsWith('169.254.') && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      Wi-Fi IP: {localNetworkIp}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.X:3000"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-purple-300 font-mono outline-none focus:border-purple-500"
                />

                {localNetworkIp && localNetworkIp !== 'localhost' && !localNetworkIp.startsWith('169.254.') && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const target = `http://${localNetworkIp}:3000`;
                        setServerUrl(target);
                        networkService.setServerUrl(target);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-500/40 font-mono text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                    >
                      <span>✓ {language === 'pt' ? 'Aplicar IP Local:' : 'Use Local Wi-Fi IP:'}</span>
                      <span className="underline">http://{localNetworkIp}:3000</span>
                    </button>
                  </div>
                )}

                {/* Localhost Warning & Quick-Fix Helper */}
                {(!serverUrl || serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) && (
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-200 space-y-1.5">
                    <p className="leading-tight">
                      {language === 'pt'
                        ? '⚠️ "localhost" só funciona neste aparelho. Para o outro celular se conectar pelo mesmo Wi-Fi, use o IP local da sua rede:'
                        : '⚠️ "localhost" only works on this single device. For the other mobile to join over Wi-Fi, use your local network IP:'}
                    </p>
                    {localNetworkIp && localNetworkIp !== 'localhost' && !localNetworkIp.startsWith('169.254.') ? (
                      <button
                        type="button"
                        onClick={() => {
                          const target = `http://${localNetworkIp}:3000`;
                          setServerUrl(target);
                          networkService.setServerUrl(target);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                      >
                        <span>✓ {language === 'pt' ? 'Preencher com IP Local:' : 'Set Local Wi-Fi IP:'}</span>
                        <span className="underline">http://{localNetworkIp}:3000</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-slate-400 font-mono">
                          {language === 'pt'
                            ? 'Dica: Digite o IP do Wi-Fi do seu aparelho (ex: http://192.168.1.50:3000)'
                            : 'Hint: Enter your device Wi-Fi IP (e.g. http://192.168.1.50:3000)'}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400">{language === 'pt' ? 'Atalhos:' : 'Subnet pre-fill:'}</span>
                          {['192.168.1.', '192.168.0.', '10.0.0.'].map((prefix) => (
                            <button
                              key={prefix}
                              type="button"
                              onClick={() => {
                                const target = `http://${prefix}`;
                                setServerUrl(target);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] border border-slate-700"
                            >
                              http://{prefix}...
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-slate-500 leading-tight">
                  {language === 'pt'
                    ? 'Detectado automaticamente. Se ambos os celulares estiverem no mesmo Wi-Fi, este endereço conecta a sala.'
                    : 'Auto-detected. When both phones share the same Wi-Fi, this address links the match.'}
                </p>
              </div>

              {/* CTA Create Room */}
              <button
                onClick={handleCreateRoom}
                disabled={isConnecting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm font-cinzel tracking-wider shadow-lg shadow-purple-600/30 active:scale-98 transition-all min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{statusMessage || getTranslation(language, 'connectingToHost')}</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>{getTranslation(language, 'hostGame')}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Join Room Form */
            <div className="space-y-4">
              {/* Join Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {language === 'pt' ? 'Seu Nome' : 'Your Player Name'}
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    {getTranslation(language, 'selectFaction')}
                  </label>
                  <select
                    value={selectedFaction}
                    onChange={(e) => setSelectedFaction(e.target.value as FactionId)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none"
                  >
                    {factionList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.symbol} {getTranslation(language, f.nameKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Room Code Input */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/40 text-center space-y-2">
                <label className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider block">
                  {getTranslation(language, 'roomCode')}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 7K9P"
                  className="w-48 mx-auto px-4 py-2.5 rounded-2xl bg-slate-900 border-2 border-purple-500 text-center text-2xl font-mono font-black tracking-widest text-amber-300 outline-none focus:border-amber-400 placeholder:text-slate-700 uppercase"
                />
                <p className="text-[11px] text-slate-400">
                  {language === 'pt'
                    ? 'Digite o código de 4 caracteres exibido na tela do anfitrião'
                    : 'Enter the 4-character code displayed on the host mobile screen'}
                </p>
              </div>

              {/* Host Address Input */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-mono text-slate-400 block">
                      {getTranslation(language, 'serverAddress')}
                    </label>
                    <button
                      type="button"
                      onClick={refreshNetworkIp}
                      className="p-1 rounded text-purple-400 hover:text-purple-200 hover:bg-purple-900/40 transition-colors"
                      title={language === 'pt' ? 'Redetectar IP' : 'Re-detect IP'}
                    >
                      <RefreshCw className={`w-3 h-3 ${isDetectingIp ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {localNetworkIp && localNetworkIp !== 'localhost' && !localNetworkIp.startsWith('169.254.') && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      Detected: {localNetworkIp}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.X:3000"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-purple-300 font-mono outline-none focus:border-purple-500"
                />

                {/* Subnet helper buttons */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-400">
                      {language === 'pt' ? 'Atalhos de rede:' : 'Subnet shortcuts:'}
                    </span>
                    {Array.from(
                      new Set(
                        [
                          localNetworkIp && localNetworkIp.includes('.')
                            ? localNetworkIp.split('.').slice(0, 3).join('.') + '.'
                            : '',
                          '192.168.1.',
                          '192.168.0.',
                          '10.0.0.',
                        ].filter(Boolean)
                      )
                    ).map((prefix) => (
                      <button
                        key={prefix}
                        type="button"
                        onClick={() => {
                          const target = `http://${prefix}`;
                          setServerUrl(target);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] border border-slate-700"
                      >
                        http://{prefix}...
                      </button>
                    ))}
                  </div>
                </div>

                {(!serverUrl || serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) && (
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-200 space-y-1.5">
                    <p className="leading-tight">
                      {language === 'pt'
                        ? '⚠️ Digite o IP do Wi-Fi do celular anfitrião (ex: http://192.168.1.50:3000):'
                        : '⚠️ Enter the host mobile’s Wi-Fi IP (e.g. http://192.168.1.50:3000):'}
                    </p>
                    {localNetworkIp && localNetworkIp !== 'localhost' && !localNetworkIp.startsWith('169.254.') && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = `http://${localNetworkIp}:3000`;
                          setServerUrl(target);
                          networkService.setServerUrl(target);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                      >
                        <span>✓ {language === 'pt' ? 'Usar IP Local:' : 'Use Local IP:'}</span>
                        <span className="underline">http://{localNetworkIp}:3000</span>
                      </button>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-slate-500 leading-tight">
                  {language === 'pt'
                    ? 'O endereço IP local do aparelho anfitrião na rede Wi-Fi'
                    : 'The local IP address of the host device on your home network'}
                </p>
              </div>

              {/* CTA Join */}
              <button
                onClick={handleJoinRoom}
                disabled={isConnecting || !joinCodeInput.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm font-cinzel tracking-wider shadow-lg shadow-purple-600/30 active:scale-98 transition-all min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{statusMessage || getTranslation(language, 'connectingToHost')}</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>{getTranslation(language, 'joinGame')}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
