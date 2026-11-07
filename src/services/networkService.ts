/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { FactionId, MapId } from '../types/game';

export interface NetworkRoomSettings {
  mapId: MapId;
  turnTimeLimit: number;
  teamSize: number;
}

export interface NetworkPlayerInfo {
  name: string;
  faction: FactionId;
}

export interface NetworkMatchConfig {
  code: string;
  seed: number;
  myRole: 'HOST' | 'GUEST';
  host: NetworkPlayerInfo;
  guest: NetworkPlayerInfo;
  settings: NetworkRoomSettings;
}

export interface NetworkGameAction {
  action: 'MOVE' | 'AIM' | 'WEAPON_SELECT' | 'FIRE' | 'JETPACK' | 'CYCLE_WARRIOR' | 'ADVANCE_TURN';
  data: any;
  sender?: string;
}

type EventCallback<T = any> = (data: T) => void;

export const CLOUD_SERVER_URL =
  'https://ais-dev-ymazscmjg4vmlr3vprgv2q-852308530209.us-east1.run.app';

class NetworkService {
  private ws: WebSocket | null = null;
  private currentRoomCode: string | null = null;
  private myRole: 'HOST' | 'GUEST' | null = null;
  private serverUrl: string = '';
  private pingInterval: any = null;

  // Listeners
  private listeners: { [key: string]: EventCallback[] } = {};

  constructor() {
    this.serverUrl = this.getSavedServerUrl() || this.detectDefaultServerUrl();
  }

  public detectDefaultServerUrl(): string {
    if (typeof window !== 'undefined') {
      // 1. Web browser on hosted domain (Cloud Run / AI Studio preview)
      if (
        window.location &&
        window.location.origin &&
        window.location.protocol.startsWith('http') &&
        !window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('127.0.0.1')
      ) {
        return window.location.origin;
      }
    }
    // 2. Default to the cloud WebSocket server so Android APK can play immediately
    return CLOUD_SERVER_URL;
  }

  public getSavedServerUrl(): string {
    try {
      const saved = localStorage.getItem('gospel_lan_server_url') || '';
      return saved.trim();
    } catch {
      return '';
    }
  }

  public setServerUrl(url: string) {
    let clean = url.trim();
    if (!clean) {
      this.serverUrl = '';
      try {
        localStorage.removeItem('gospel_lan_server_url');
      } catch {}
      return;
    }
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('ws://') && !clean.startsWith('wss://')) {
      clean = 'http://' + clean;
    }
    // Remove trailing slash
    clean = clean.replace(/\/+$/, '');

    // If an IPv4 address was entered without a port, default to port 3000
    try {
      const parsed = new URL(clean);
      if (!parsed.port && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
        parsed.port = '3000';
        clean = parsed.origin;
      }
    } catch {}

    this.serverUrl = clean;
    try {
      localStorage.setItem('gospel_lan_server_url', clean);
    } catch {}
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public getWsUrl(): string {
    const isCap = typeof window !== 'undefined' && (
      typeof (window as any).Capacitor !== 'undefined' ||
      typeof (window as any).AndroidDevice !== 'undefined' ||
      window.location.hostname === 'localhost' ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:'
    );
    const isHttpsBrowser = typeof window !== 'undefined' && window.location.protocol === 'https:' && !isCap;

    let url = (this.serverUrl || '').trim();

    // If running in an HTTPS web browser (e.g. Cloud Run, AI Studio preview):
    // Insecure http:// or ws:// is strictly blocked by modern browser security.
    // Connect directly to the live WebSocket server running on the current HTTPS domain.
    if (isHttpsBrowser) {
      if (!url || url.startsWith('http://') || url.startsWith('ws://') || url.includes('localhost') || url.includes('127.0.0.1')) {
        return `wss://${window.location.host}`;
      }
    }

    if (!url) {
      url = this.detectDefaultServerUrl();
    }

    if (url) {
      if (url.startsWith('https://')) {
        return url.replace(/^https:/, 'wss:');
      }
      if (url.startsWith('http://')) {
        return url.replace(/^http:/, 'ws:');
      }
      if (url.startsWith('wss://') || url.startsWith('ws://')) {
        return url;
      }
      return `ws://${url}`;
    }

    if (isHttpsBrowser) {
      return `wss://${window.location.host}`;
    }
    return `ws://${(typeof window !== 'undefined' && window.location.hostname) || 'localhost'}:3000`;
  }

  /**
   * Discovers the device's real local IPv4 address across APK and Web.
   * Priority:
   * 1. Native Android WebView Bridge (window.AndroidDevice.getDeviceLocalIp())
   * 2. WebRTC ICE host candidate inspection (Chromium WebView & mobile browsers)
   */
  public async detectDeviceLocalIp(): Promise<string> {
    // 1. Native Android interface (Capacitor Bridge)
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidDevice?.getDeviceLocalIp) {
        const nativeIp = (window as any).AndroidDevice.getDeviceLocalIp();
        if (nativeIp && typeof nativeIp === 'string' && nativeIp.trim().length > 0) {
          return nativeIp.trim();
        }
      }
    } catch (e) {
      console.warn('Native AndroidDevice check failed:', e);
    }

    // 2. WebRTC ICE Candidate gathering
    try {
      if (typeof window !== 'undefined') {
        const RTCPC =
          window.RTCPeerConnection ||
          (window as any).webkitRTCPeerConnection ||
          (window as any).mozRTCPeerConnection;
        if (RTCPC) {
          const ipFromRtc = await new Promise<string>((resolve) => {
            let settled = false;
            let pc: RTCPeerConnection | null = null;
            const done = (ip: string) => {
              if (!settled) {
                settled = true;
                if (pc) {
                  try {
                    pc.close();
                  } catch {}
                }
                resolve(ip);
              }
            };

            const timeoutId = setTimeout(() => done(''), 1500);

            try {
              pc = new RTCPC({ iceServers: [] });
              pc.onicecandidate = (event) => {
                if (!event || !event.candidate || !event.candidate.candidate) return;
                const cand = event.candidate.candidate;
                const match = cand.match(
                  /\b(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/
                );
                if (match && match[1]) {
                  clearTimeout(timeoutId);
                  done(match[1]);
                }
              };
              pc.createDataChannel('lan_detect');
              pc.createOffer()
                .then((offer) => pc?.setLocalDescription(offer))
                .catch(() => done(''));
            } catch {
              done('');
            }
          });

          if (ipFromRtc) {
            return ipFromRtc;
          }
        }
      }
    } catch (e) {
      console.warn('WebRTC IP detection failed:', e);
    }

    return '';
  }

  public async fetchLocalNetworkInfo(): Promise<{ localIp: string; port: number; localUrl: string } | null> {
    // 1. First check device local IP directly (instant in Android APK & WebRTC)
    const deviceIp = await this.detectDeviceLocalIp();
    if (deviceIp) {
      return {
        localIp: deviceIp,
        port: 3000,
        localUrl: `http://${deviceIp}:3000`,
      };
    }

    // 2. Query server REST endpoint
    const candidates: string[] = [];
    if (this.serverUrl && !this.serverUrl.includes('localhost') && !this.serverUrl.includes('127.0.0.1')) {
      candidates.push(this.serverUrl);
    }
    if (typeof window !== 'undefined' && window.location.origin) {
      candidates.push(window.location.origin);
      if (window.location.origin.includes('localhost')) {
        candidates.push('http://localhost:3000');
        candidates.push('http://10.0.2.2:3000');
      }
    } else {
      candidates.push('http://localhost:3000');
    }

    for (const baseUrl of candidates) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/network-info`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data && data.localIp) {
            return data;
          }
        }
      } catch {
        // try next candidate
      }
    }
    return null;
  }

  public async generateJoinQRCode(roomCode: string, directUrl?: string): Promise<string> {
    const targetUrl = directUrl || `${this.serverUrl}?join=${roomCode}`;
    try {
      return await QRCode.toDataURL(targetUrl, {
        margin: 1,
        width: 256,
        color: {
          dark: '#0f0c29',
          light: '#f8fafc',
        },
      });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      return '';
    }
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }

      const wsUrl = this.getWsUrl();
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.emit('connected', { url: wsUrl });
          this.startHeartbeat();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleIncomingMessage(message);
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        };

        this.ws.onerror = (err) => {
          console.warn('WebSocket error:', err);
          this.emit('error', { message: 'CONNECTION_FAILED' });
          resolve(false);
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          this.emit('disconnected', {});
        };
      } catch (err) {
        console.error('Could not connect to WebSocket:', err);
        resolve(false);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send('PING', {});
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  private handleIncomingMessage(msg: { type: string; payload: any }) {
    const { type, payload } = msg;

    switch (type) {
      case 'ROOM_CREATED':
        this.currentRoomCode = payload.code;
        this.myRole = 'HOST';
        this.emit('roomCreated', payload);
        break;

      case 'ROOM_JOINED':
        this.currentRoomCode = payload.code;
        this.myRole = 'GUEST';
        this.emit('roomJoined', payload);
        break;

      case 'GUEST_CONNECTED':
        this.emit('guestConnected', payload.guest);
        break;

      case 'SETTINGS_UPDATED':
        this.emit('settingsUpdated', payload);
        break;

      case 'MATCH_STARTED':
        this.emit('matchStarted', payload);
        break;

      case 'GAME_ACTION':
        this.emit('gameAction', payload);
        break;

      case 'SYNC_STATE':
        this.emit('syncState', payload);
        break;

      case 'OPPONENT_DISCONNECTED':
        this.emit('opponentDisconnected', payload);
        break;

      case 'ERROR':
        this.emit('error', payload);
        break;
    }
  }

  public async createRoom(
    hostName: string,
    hostFaction: FactionId,
    settings: NetworkRoomSettings
  ): Promise<boolean> {
    const connected = await this.connect();
    if (!connected) return false;

    this.send('CREATE_ROOM', {
      name: hostName,
      faction: hostFaction,
      mapId: settings.mapId,
      turnTimeLimit: settings.turnTimeLimit,
      teamSize: settings.teamSize,
    });
    return true;
  }

  public async joinRoom(
    code: string,
    playerName: string,
    playerFaction: FactionId
  ): Promise<boolean> {
    const connected = await this.connect();
    if (!connected) return false;

    this.send('JOIN_ROOM', {
      code,
      name: playerName,
      faction: playerFaction,
    });
    return true;
  }

  public updateRoomSettings(settings: Partial<NetworkRoomSettings>) {
    this.send('UPDATE_SETTINGS', settings);
  }

  public startMatch() {
    this.send('START_MATCH', {});
  }

  public sendGameAction(action: NetworkGameAction['action'], data: any) {
    this.send('GAME_ACTION', { action, data });
  }

  public syncAuthoritativeState(state: any) {
    this.send('SYNC_STATE', state);
  }

  public disconnect() {
    this.send('LEAVE_ROOM', {});
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentRoomCode = null;
    this.myRole = null;
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }

  public getRoomCode(): string | null {
    return this.currentRoomCode;
  }

  public getRole(): 'HOST' | 'GUEST' | null {
    return this.myRole;
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const networkService = new NetworkService();
