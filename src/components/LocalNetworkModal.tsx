/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  Check,
  Copy,
  FlipHorizontal,
  Info,
  Loader2,
  QrCode,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import jsQR from 'jsqr';
import { FactionId, Language, MapId } from '../types/game';
import { FACTIONS, MAPS } from '../services/gameConstants';
import { getTranslation } from '../services/localization';
import { sound } from '../services/sound';
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
  initialTab?: 'HOST' | 'JOIN';
  initialJoinCode?: string;
  initialHostIp?: string;
  autoConnect?: boolean;
}

export const LocalNetworkModal: React.FC<LocalNetworkModalProps> = ({
  isOpen,
  onClose,
  language,
  onLaunchNetworkMatch,
  initialTab,
  initialJoinCode,
  initialHostIp,
  autoConnect,
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
  const [copiedDeepLink, setCopiedDeepLink] = useState<boolean>(false);
  const [copiedIp, setCopiedIp] = useState<boolean>(false);

  // In-App Camera QR Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedSuccess, setScannedSuccess] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Connected Opponents
  const [connectedGuest, setConnectedGuest] = useState<NetworkPlayerInfo | null>(null);
  const [connectedHost, setConnectedHost] = useState<NetworkPlayerInfo | null>(null);

  const stopScanner = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScannerOpen(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && code.data.trim().length > 0) {
            const parsed = networkService.parseJoinUri(code.data);
            if (parsed && (parsed.code || parsed.host)) {
              setScannedSuccess(true);
              sound.playHolyChime();
              stopScanner();

              if (parsed.host) {
                setServerUrl(parsed.host);
                networkService.setServerUrl(parsed.host);
              }
              if (parsed.code) {
                setJoinCodeInput(parsed.code);
              }

              // Auto-join immediately
              handleJoinRoom(parsed.host, parsed.code);
              return;
            }
          }
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  };

  const startScanner = async (requestedFacing: 'environment' | 'user' = facingMode) => {
    setIsScannerOpen(true);
    setScannerError(null);
    setScannedSuccess(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setScannerError(
          language === 'pt'
            ? 'Câmera não suportada neste dispositivo.'
            : 'Camera is not supported on this device.'
        );
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: requestedFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setScannerError(
        language === 'pt'
          ? 'Não foi possível acessar a câmera. Verifique se a permissão foi concedida nas configurações do dispositivo.'
          : 'Could not access camera. Check device camera permissions.'
      );
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (isScannerOpen) {
      startScanner(nextFacing);
    }
  };

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
    if (!isOpen) {
      stopScanner();
      return;
    }

    if (initialTab) {
      setActiveTab(initialTab);
    }

    if (initialJoinCode) {
      setJoinCodeInput(initialJoinCode.toUpperCase().trim());
      setActiveTab('JOIN');
    }

    if (initialHostIp) {
      const formatted = initialHostIp.startsWith('http') ? initialHostIp : `http://${initialHostIp}`;
      setServerUrl(formatted);
      networkService.setServerUrl(formatted);
    }

    // Check if URL has ?join=XXXX
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('join') || params.get('code');
      const urlHost = params.get('host');
      if (urlCode) {
        setJoinCodeInput(urlCode.toUpperCase().trim());
        setActiveTab('JOIN');
      }
      if (urlHost) {
        const formatted = urlHost.startsWith('http') ? urlHost : `http://${urlHost}`;
        setServerUrl(formatted);
        networkService.setServerUrl(formatted);
      }
    }

    if (autoConnect && (initialJoinCode || joinCodeInput)) {
      const targetCode = initialJoinCode || joinCodeInput;
      const targetHost = initialHostIp || serverUrl;
      setTimeout(() => {
        handleJoinRoom(targetHost, targetCode);
      }, 350);
    }

    // Refresh Local Wi-Fi IP
    refreshNetworkIp();

    // Listeners for networkService
    const unsubCreated = networkService.on('roomCreated', async (payload: any) => {
      setRoomCode(payload.code);
      setIsConnecting(false);
      setStatusMessage(getTranslation(language, 'waitingForPlayer2'));

      // Generate QR Code with join URL pointing to this host device's IP and room code
      const isHttps =
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        !(typeof (window as any).AndroidDevice !== 'undefined');
      const currentHostIp = localDeviceIp || (serverUrl.replace(/https?:\/\//, '').split(':')[0]) || 'localhost';
      const hostBaseUrl = isHttps ? window.location.origin : `http://${currentHostIp}:3000`;
      const fullJoinUrl = `${hostBaseUrl}/?join=${payload.code}&host=${currentHostIp}`;
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

      const role: 'HOST' | 'GUEST' =
        matchPayload?.myRole ||
        networkService.getRole() ||
        (activeTab === 'HOST' ? 'HOST' : 'GUEST');

      const hostName =
        matchPayload?.host?.name ||
        (role === 'HOST' ? playerName : connectedHost?.name || 'Host Seeker');
      const hostFaction: FactionId =
        matchPayload?.host?.faction ||
        (role === 'HOST' ? selectedFaction : connectedHost?.faction || 'COSMIC_BOWLERS');

      const guestName =
        matchPayload?.guest?.name ||
        (role === 'GUEST' ? playerName : connectedGuest?.name || 'Challenger');
      const guestFaction: FactionId =
        matchPayload?.guest?.faction ||
        (role === 'GUEST' ? selectedFaction : connectedGuest?.faction || 'NIHILISTS');

      const safeConfig: NetworkMatchConfig = {
        code: matchPayload?.code || roomCode,
        seed: matchPayload?.seed || Date.now(),
        myRole: role,
        host: {
          name: hostName,
          faction: hostFaction,
        },
        guest: {
          name: guestName,
          faction: guestFaction,
        },
        settings: {
          mapId: matchPayload?.settings?.mapId || selectedMap,
          teamSize: matchPayload?.settings?.teamSize ?? teamSize,
          turnTimeLimit: matchPayload?.settings?.turnTimeLimit ?? turnTimeLimit,
        },
      };

      onLaunchNetworkMatch(safeConfig);
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

  const handleJoinRoom = async (overrideHost?: string, overrideCode?: string) => {
    const codeToUse = (overrideCode || joinCodeInput || '').trim().toUpperCase();
    if (!codeToUse) {
      setErrorMessage(language === 'pt' ? 'Digite o código da sala.' : 'Enter room code.');
      return;
    }

    const hostToUse = (overrideHost || serverUrl || '').trim();
    if (!hostToUse) {
      setErrorMessage(
        language === 'pt'
          ? 'Digite o endereço IP do anfitrião na rede local.'
          : 'Enter the host local IP address.'
      );
      return;
    }

    const cleanHost = hostToUse.startsWith('http') ? hostToUse : `http://${hostToUse}`;

    setIsConnecting(true);
    setErrorMessage(null);
    setStatusMessage(getTranslation(language, 'connectingToHost'));

    networkService.setServerUrl(cleanHost);

    const success = await networkService.joinRoom(
      codeToUse,
      playerName,
      selectedFaction
    );

    if (!success) {
      setIsConnecting(false);
      setErrorMessage(
        language === 'pt'
          ? `Não foi possível alcançar o anfitrião no endereço (${cleanHost}). Verifique se o IP está correto e se ambos estão conectados na mesma rede Wi-Fi.`
          : `Could not reach host at (${cleanHost}). Ensure the IP is correct and both devices are on the same Wi-Fi.`
      );
    }
  };

  const handleStartMatch = () => {
    const startPayload = {
      code: roomCode,
      seed: Date.now(),
      host: {
        name: playerName,
        faction: selectedFaction,
      },
      guest: connectedGuest || {
        name: 'Challenger',
        faction: 'NIHILISTS' as FactionId,
      },
      settings: {
        mapId: selectedMap,
        teamSize,
        turnTimeLimit,
      },
    };
    networkService.startMatch(startPayload);
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
    const fullUrl = `${hostBaseUrl}/?join=${roomCode}&host=${currentHostIp}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleCopyDeepLink = () => {
    const currentHostIp = localDeviceIp || (serverUrl.replace(/https?:\/\//, '').split(':')[0]) || 'localhost';
    const deepLink = `armageddon://join?code=${roomCode}&host=${currentHostIp}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(deepLink);
      setCopiedDeepLink(true);
      setTimeout(() => setCopiedDeepLink(false), 3000);
    }
  };

  const handleLeaveOrClose = () => {
    stopScanner();
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
                    <p className="text-[11px] text-slate-300 mt-2 flex items-center gap-1.5 font-medium">
                      <QrCode className="w-3.5 h-3.5 text-purple-400" />
                      <span>{getTranslation(language, 'scanToJoin')}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 text-center max-w-sm mt-0.5">
                      {language === 'pt'
                        ? 'O Jogador 2 pode escanear com a câmera do app (aba Conectar) ou com a câmera do celular para abrir o app diretamente.'
                        : 'Player 2 can scan with the in-app camera (Join tab) or phone camera to open in app directly.'}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-2.5 py-1 text-[10px] font-mono rounded-lg bg-slate-900 border border-slate-700 hover:border-purple-500 text-slate-300 flex items-center gap-1.5 transition-colors"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-purple-400" />}
                        <span>{language === 'pt' ? 'Copiar Link Web' : 'Copy Web Link'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyDeepLink}
                        className="px-2.5 py-1 text-[10px] font-mono rounded-lg bg-purple-950/80 border border-purple-700 hover:border-purple-400 text-purple-200 flex items-center gap-1.5 transition-colors"
                      >
                        {copiedDeepLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Smartphone className="w-3 h-3 text-amber-400" />}
                        <span>{language === 'pt' ? 'Copiar App Deep Link' : 'Copy App Deep Link'}</span>
                      </button>
                    </div>
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
              {/* External Browser App Launcher Banner (if user opened link in Chrome on Android) */}
              {!isAndroidBridge && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent) && (
                <a
                  href={`intent://join?code=${joinCodeInput || ''}&host=${encodeURIComponent(serverUrl || '')}#Intent;scheme=armageddon;package=com.dimenuveis.armageddon;end`}
                  className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600/30 to-purple-600/30 border border-emerald-500/50 flex items-center justify-between gap-3 text-white text-xs hover:bg-emerald-600/40 transition-colors shadow-lg"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
                    <div>
                      <span className="font-bold block text-emerald-200">
                        {language === 'pt' ? 'Abrir no App Armageddon Instalado' : 'Open in Installed Armageddon App'}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {language === 'pt' ? 'Toque para carregar a sessão no APK nativo' : 'Tap to load session directly inside the APK'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-bold text-[10px] shrink-0">
                    {language === 'pt' ? 'ABRIR' : 'OPEN'}
                  </span>
                </a>
              )}

              {/* In-App Camera QR Code Scanner */}
              {isScannerOpen ? (
                <div className="relative rounded-3xl overflow-hidden border-2 border-purple-500 bg-slate-950 flex flex-col items-center justify-center shadow-2xl">
                  <div className="relative w-full h-64 sm:h-72 bg-black flex items-center justify-center overflow-hidden">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Laser Scanner Reticle Frame */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-purple-400/70 rounded-2xl relative shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                        {/* Glowing corners */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                        {/* Animated Laser Scanning Line */}
                        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_8px_#f59e0b] animate-pulse absolute top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {/* Camera Top Controls */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
                        title={language === 'pt' ? 'Alternar Câmera' : 'Flip Camera'}
                      >
                        <FlipHorizontal className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={stopScanner}
                        className="p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white hover:bg-rose-900/80 transition-colors shadow-lg"
                        title={language === 'pt' ? 'Fechar Câmera' : 'Close Camera'}
                      >
                        <CameraOff className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scanner Instructions & Status Pill */}
                    <div className="absolute bottom-3 inset-x-4 bg-slate-950/85 backdrop-blur-md py-2 px-3 rounded-2xl border border-purple-500/40 text-center shadow-lg">
                      <span className="text-[11px] text-amber-300 font-mono font-medium flex items-center justify-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        <span>
                          {language === 'pt'
                            ? 'Aponte a câmera para o QR Code do anfitrião'
                            : 'Aim camera at the host QR Code'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {scannerError && (
                    <div className="w-full p-3 bg-rose-950 border-t border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-2">
                      <span className="text-[11px]">{scannerError}</span>
                      <button
                        type="button"
                        onClick={() => startScanner()}
                        className="px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold shrink-0"
                      >
                        {language === 'pt' ? 'Tentar de novo' : 'Retry'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Primary Camera Scan CTA Button */
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-purple-800/50 to-pink-900/40 border-2 border-purple-500/60 hover:border-purple-400 text-white transition-all flex items-center justify-between gap-3 shadow-xl active:scale-98 group cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-purple-600 text-slate-950 font-bold group-hover:scale-105 transition-transform shadow-md">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm font-cinzel text-amber-200 group-hover:text-amber-100 block">
                        {language === 'pt' ? 'ESCANEAR QR CODE COM A CÂMERA' : 'SCAN QR CODE WITH CAMERA'}
                      </span>
                      <span className="text-[11px] text-slate-300 block mt-0.5">
                        {language === 'pt'
                          ? 'Conecta instantaneamente à partida sem precisar digitar IP ou código'
                          : 'Instantly joins the match without typing IP or room code'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-600/40 text-purple-300 group-hover:text-white shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                </button>
              )}

              {/* Separator */}
              <div className="flex items-center gap-3 my-1">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {language === 'pt' ? 'OU CONECTE MANUALMENTE' : 'OR CONNECT MANUALLY'}
                </span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

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
                    ? 'Digite o endereço IP exibido na tela do anfitrião (ou use o botão Escanear QR Code acima).'
                    : 'Enter the IP address displayed on the host player’s screen or use Scan QR Code above.'}
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
                type="button"
                onClick={() => handleJoinRoom()}
                disabled={isConnecting || !joinCodeInput.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm font-cinzel tracking-wider shadow-lg shadow-purple-600/30 active:scale-98 transition-all min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
