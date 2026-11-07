/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Info,
  Loader2,
  QrCode,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Smartphone,
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

  // Local Network & IP Detection
  const [localDeviceIp, setLocalDeviceIp] = useState<string>('');
  const [isDetectingIp, setIsDetectingIp] = useState<boolean>(false);
  const [isAndroidBridge, setIsAndroidBridge] = useState<boolean>(false);

  // Connection & Room State
  const [serverUrl, setServerUrl] = useState<string>(() => {
    return networkService.getSavedServerUrl() || networkService.detectDefaultServerUrl();
  });
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedIp, setCopiedIp] = useState<boolean>(false);

  // Connected Opponents
  const [connectedGuest, setConnectedGuest] = useState<NetworkPlayerInfo | null>(null);
  const [connectedHost, setConnectedHost] = useState<NetworkPlayerInfo | null>(null);

  const refreshNetworkIp = async () => {
    setIsDetectingIp(true);
    try {
      const hasAndroid =
        typeof window !== 'undefined' &&
        typeof (window as any).AndroidDevice?.getDeviceLocalIp === 'function';
      setIsAndroidBridge(hasAndroid);

      const isHttpsBrowser =
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        !hasAndroid;

      const detectedIp = await networkService.detectDeviceLocalIp();
      if (detectedIp && detectedIp.trim().length > 0) {
        setLocalDeviceIp(detectedIp.trim());
        if (!isHttpsBrowser) {
          const formattedUrl = `http://${detectedIp.trim()}:3000`;
          setServerUrl(formattedUrl);
          networkService.setServerUrl(formattedUrl);
        }
      } else {
        // Fallback check REST endpoint if available
        const info = await networkService.fetchLocalNetworkInfo();
        if (info && info.localIp) {
          setLocalDeviceIp(info.localIp);
          if (!isHttpsBrowser) {
            const formattedUrl = `http://${info.localIp}:3000`;
            setServerUrl(formattedUrl);
            networkService.setServerUrl(formattedUrl);
          }
        } else if (!isHttpsBrowser) {
          const fallback = networkService.getSavedServerUrl() || networkService.detectDefaultServerUrl();
          setServerUrl(fallback);
        }
      }
    } finally {
      setIsDetectingIp(false);
    }
  };

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

    // Refresh Local Wi-Fi IP
    refreshNetworkIp();

    // Listeners for networkService
    const unsubCreated = networkService.on('roomCreated', async (payload: any) => {
      setRoomCode(payload.code);
      setIsConnecting(false);
      setStatusMessage(getTranslation(language, 'waitingForPlayer2'));

      // Generate QR Code with join URL pointing to this host device's IP
      const isHttps =
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        !(typeof (window as any).AndroidDevice !== 'undefined');
      const currentHostIp = localDeviceIp || (serverUrl.replace(/https?:\/\//, '').split(':')[0]) || 'localhost';
      const hostBaseUrl = isHttps ? window.location.origin : `http://${currentHostIp}:3000`;
      const fullJoinUrl = `${hostBaseUrl}/?join=${payload.code}`;
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
            ? 'Sala não encontrada. Verifique o código e o IP do anfitrião.'
            : 'Room not found. Check the room code and host IP.'
          : err.message === 'ROOM_FULL'
          ? language === 'pt'
            ? 'A sala já está cheia (limite de 2 jogadores).'
            : 'Room is already full (2 players max).'
          : language === 'pt'
          ? `Não foi possível conectar ao servidor host (${serverUrl}). Verifique se ambos os aparelhos estão na mesma rede Wi-Fi.`
          : `Could not connect to host (${serverUrl}). Make sure both devices are on the same Wi-Fi network.`
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
    setStatusMessage(
      isAndroidBridge
        ? language === 'pt'
          ? 'Iniciando servidor nativo Android...'
          : 'Starting native Android game server...'
        : getTranslation(language, 'connectingToHost')
    );

    // Ensure the server URL is registered
    const cleanUrl = (serverUrl || '').trim();
    if (cleanUrl) {
      networkService.setServerUrl(cleanUrl);
    }

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
          ? `Falha ao iniciar ou conectar ao servidor local (${cleanUrl}). Verifique a conexão Wi-Fi deste dispositivo.`
          : `Failed to start or connect to local server (${cleanUrl}). Check this device's Wi-Fi network.`
      );
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) {
      setErrorMessage(language === 'pt' ? 'Digite o código da sala.' : 'Enter room code.');
      return;
    }

    const targetUrl = (serverUrl || '').trim();
    if (!targetUrl) {
      setErrorMessage(
        language === 'pt'
          ? 'Digite o endereço IP do anfitrião na rede local.'
          : 'Enter the host local IP address.'
      );
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);
    setStatusMessage(getTranslation(language, 'connectingToHost'));

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
          ? `Não foi possível alcançar o anfitrião no endereço (${targetUrl}). Verifique se o IP está correto e se ambos estão conectados na mesma rede Wi-Fi.`
          : `Could not reach host at (${targetUrl}). Ensure the IP is correct and both devices are on the same Wi-Fi.`
      );
    }
  };

  const handleStartMatch = () => {
    networkService.startMatch();
  };

  const handleCopyHostIp = () => {
    if (navigator.clipboard && serverUrl) {
      navigator.clipboard.writeText(serverUrl);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2500);
    }
  };

  const handleCopyLink = () => {
    const isHttps =
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      !(typeof (window as any).AndroidDevice !== 'undefined');
    const currentHostIp = localDeviceIp || (serverUrl.replace(/https?:\/\//, '').split(':')[0]) || 'localhost';
    const hostBaseUrl = isHttps ? window.location.origin : `http://${currentHostIp}:3000`;
    const fullUrl = `${hostBaseUrl}/?join=${roomCode}`;
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
                  ? 'Batalha direta via Wi-Fi Local (Servidor embarcado no Android)'
                  : 'Direct battle via Local Wi-Fi (Embedded Android Server)'}
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
              <span>{getTranslation(language, 'hostGame')} (Servidor)</span>
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
              <span>{getTranslation(language, 'joinGame')} (Cliente)</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] space-y-4 scrollbar-thin scrollbar-thumb-purple-900 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">{errorMessage}</span>
                <p className="text-[10px] text-rose-300/80">
                  {language === 'pt'
                    ? 'Dica: Conecte ambos os dispositivos ao mesmo roteador Wi-Fi (ou ponto de acesso móvel).'
                    : 'Tip: Connect both devices to the same Wi-Fi router or mobile hotspot.'}
                </p>
              </div>
            </div>
          )}

          {/* Active Room Lobby View */}
          {roomCode ? (
            <div className="space-y-4 text-center">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-purple-500/40 space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                  {language === 'pt' ? 'Sala Local Ativa (Aguardando Jogador 2)' : 'Local Room Live (Waiting for Player 2)'}
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
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300 font-bold">{serverUrl}</span>
                    <button
                      onClick={handleCopyHostIp}
                      className="p-1 hover:text-white transition-colors"
                      title="Copiar IP"
                    >
                      {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
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
                        ? 'Aguardando oponente no mesmo Wi-Fi...'
                        : 'Awaiting opponent on local Wi-Fi...'}
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
              {/* Local Network / Device Server Status Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    {isAndroidBridge ? (
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Server className="w-4 h-4 text-purple-400" />
                    )}
                    <span>
                      {isAndroidBridge
                        ? language === 'pt'
                          ? 'Servidor Android Nativo (Porta 3000)'
                          : 'Native Android Server (Port 3000)'
                        : language === 'pt'
                        ? 'Servidor Local (Porta 3000)'
                        : 'Local Game Server (Port 3000)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={refreshNetworkIp}
                    disabled={isDetectingIp}
                    className="p-1 px-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isDetectingIp ? 'animate-spin' : ''}`} />
                    <span>{language === 'pt' ? 'Detectar IP' : 'Detect IP'}</span>
                  </button>
                </div>

                {/* Auto-filled IP Input */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://192.168.1.100:3000"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-purple-300 font-mono outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleCopyHostIp}
                      className="px-3 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs flex items-center gap-1"
                      title="Copiar IP"
                    >
                      {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {language === 'pt'
                      ? '💡 Este aparelho atuará como o servidor da partida. Outros jogadores na mesma rede Wi-Fi devem digitar este endereço IP ou escanear o QR Code.'
                      : '💡 This device will act as the game server. Other players on the same Wi-Fi must enter this IP or scan the QR Code.'}
                  </p>
                </div>
              </div>

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
                    <span>
                      {language === 'pt' ? 'INICIAR SERVIDOR & CRIAR SALA' : 'START SERVER & HOST GAME'}
                    </span>
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

              {/* Host Server IP Address Input */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-purple-400" />
                    <span>{language === 'pt' ? 'Endereço IP do Anfitrião (Host):' : 'Host Device IP Address:'}</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:3000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-purple-300 font-mono outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  {language === 'pt'
                    ? 'Digite o endereço IP exibido na tela do anfitrião (ou escaneie o QR Code dele com a câmera).'
                    : 'Enter the IP address displayed on the host player’s screen or scan their QR Code.'}
                </p>
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
