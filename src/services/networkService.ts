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
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      if (
        window.location.protocol.startsWith('http') &&
        !window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('127.0.0.1')
      ) {
        return window.location.origin;
      }
    }
    return '';
  }

  public getSavedServerUrl(): string {
    try {
      const saved = localStorage.getItem('gospel_lan_server_url') || '';
      // Clear out localhost or 127.0.0.1 as a saved server since localhost cannot be accessed across phones
      if (saved.includes('localhost') || saved.includes('127.0.0.1')) {
        localStorage.removeItem('gospel_lan_server_url');
        return '';
      }
      // If running on an HTTPS origin, an insecure http:// saved URL is strictly blocked by browsers
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && saved.startsWith('http://')) {
        localStorage.removeItem('gospel_lan_server_url');
        return '';
      }
      return saved;
    } catch {
      return '';
    }
  }

  public setServerUrl(url: string) {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    // Remove trailing slash
    clean = clean.replace(/\/+$/, '');
    this.serverUrl = clean;
    try {
      localStorage.setItem('gospel_lan_server_url', clean);
    } catch {}
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public getWsUrl(): string {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

    // In an HTTPS context (e.g. cloud applet, deployed web preview):
    if (isHttps) {
      if (this.serverUrl && this.serverUrl.startsWith('https://')) {
        return this.serverUrl.replace(/^https:/, 'wss:');
      }
      // If serverUrl is an unencrypted HTTP or local LAN IP address, the browser will throw SecurityError.
      // We must connect to the current HTTPS host using wss://
      return `wss://${window.location.host}`;
    }

    // Otherwise (HTTP or Capacitor mobile app):
    const url = this.serverUrl || this.detectDefaultServerUrl();
    if (url.startsWith('https://')) {
      return url.replace(/^https:/, 'wss:');
    }
    return url.replace(/^http:/, 'ws:');
  }

  public async fetchLocalNetworkInfo(): Promise<{ localIp: string; port: number; localUrl: string } | null> {
    try {
      const baseUrl =
        typeof window !== 'undefined' && window.location.protocol.startsWith('http')
          ? window.location.origin
          : this.serverUrl || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/network-info`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch LAN network info:', e);
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
