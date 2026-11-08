/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('error', (err) => {
  console.warn('[Server] WebSocketServer error:', err);
});

app.use(express.json());

// Helper to determine the local IPv4 address on the home Wi-Fi/LAN
function getLocalIpAddress(req?: express.Request): string {
  // If request came with a forwarded host header from a real domain or proxy, prefer that
  if (req) {
    const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
    if (forwardedHost) {
      return forwardedHost;
    }
    const hostHeader = (req.headers.host || '').split(':')[0];
    if (hostHeader && hostHeader !== 'localhost' && hostHeader !== '127.0.0.1' && !hostHeader.startsWith('169.254.')) {
      return hostHeader;
    }
  }

  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Skip unroutable link-local address
        if (iface.address.startsWith('169.254.')) continue;
        // Prioritize standard home Wi-Fi / LAN address ranges
        if (iface.address.startsWith('192.168.')) {
          return iface.address;
        }
        if (iface.address.startsWith('10.')) {
          candidates.unshift(iface.address);
        } else if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(iface.address)) {
          candidates.unshift(iface.address);
        } else {
          candidates.push(iface.address);
        }
      }
    }
  }

  return candidates[0] || '';
}

interface RoomPlayer {
  ws: WebSocket;
  id: string;
  name: string;
  faction: string;
}

interface GameRoom {
  code: string;
  host: RoomPlayer;
  guest?: RoomPlayer;
  settings: {
    mapId: string;
    turnTimeLimit: number;
    teamSize: number;
  };
  status: 'LOBBY' | 'IN_GAME' | 'FINISHED';
  createdAt: number;
}

const rooms = new Map<string, GameRoom>();

// Clean up old rooms every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 2 * 60 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 15 * 60 * 1000);

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function safeSend(ws: WebSocket | undefined, data: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error('WebSocket send error:', err);
    }
  }
}

// REST Endpoints for network info and room lookup
app.get('/api/network-info', (req, res) => {
  const localIp = getLocalIpAddress(req);
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined) || 'https';
  const hostHeader = req.headers.host || '';

  let resolvedUrl = '';
  if (forwardedHost) {
    resolvedUrl = `${forwardedProto}://${forwardedHost}`;
  } else if (localIp && localIp !== 'localhost' && !localIp.startsWith('169.254.')) {
    resolvedUrl = `http://${localIp}:${PORT}`;
  } else if (hostHeader && !hostHeader.startsWith('localhost') && !hostHeader.startsWith('127.0.0.1')) {
    resolvedUrl = `http://${hostHeader}`;
  } else {
    resolvedUrl = '';
  }

  res.json({
    localIp: localIp && localIp !== 'localhost' && !localIp.startsWith('169.254.') ? localIp : '',
    port: PORT,
    localUrl: resolvedUrl,
    activeRooms: rooms.size,
  });
});

app.get('/api/rooms', (req, res) => {
  const availableRooms: any[] = [];
  for (const [code, room] of rooms.entries()) {
    if (room.status === 'LOBBY' && !room.guest) {
      availableRooms.push({
        code,
        hostName: room.host.name,
        hostFaction: room.host.faction,
        mapId: room.settings.mapId,
        teamSize: room.settings.teamSize,
        turnTimeLimit: room.settings.turnTimeLimit,
        createdAt: room.createdAt,
      });
    }
  }
  res.json({ rooms: availableRooms });
});

// WebSocket Protocol for Real-time LAN Multiplayer
wss.on('connection', (ws: WebSocket) => {
  let currentRoomCode: string | null = null;
  let playerId: string | null = null;

  ws.on('message', (message: string) => {
    try {
      const msg = JSON.parse(message.toString());
      const { type, payload } = msg;

      switch (type) {
        case 'CREATE_ROOM': {
          const code = generateRoomCode();
          playerId = 'player_host';
          const room: GameRoom = {
            code,
            host: {
              ws,
              id: playerId,
              name: payload.name || 'Host Seeker',
              faction: payload.faction || 'COSMIC_BOWLERS',
            },
            settings: {
              mapId: payload.mapId || 'COSMIC_BOWLING_ALLEY',
              turnTimeLimit: payload.turnTimeLimit ?? 45,
              teamSize: payload.teamSize ?? 3,
            },
            status: 'LOBBY',
            createdAt: Date.now(),
          };
          rooms.set(code, room);
          currentRoomCode = code;

          safeSend(ws, {
            type: 'ROOM_CREATED',
            payload: {
              code,
              role: 'HOST',
              roomInfo: {
                hostName: room.host.name,
                hostFaction: room.host.faction,
                settings: room.settings,
              },
            },
          });
          break;
        }

        case 'JOIN_ROOM': {
          const reqCode = (payload.code || '').trim().toUpperCase();
          const room = rooms.get(reqCode);

          if (!room) {
            safeSend(ws, {
              type: 'ERROR',
              payload: { message: 'ROOM_NOT_FOUND', code: reqCode },
            });
            return;
          }

          if (room.guest && room.guest.ws.readyState === WebSocket.OPEN) {
            safeSend(ws, {
              type: 'ERROR',
              payload: { message: 'ROOM_FULL', code: reqCode },
            });
            return;
          }

          playerId = 'player_guest';
          room.guest = {
            ws,
            id: playerId,
            name: payload.name || 'Challenger',
            faction: payload.faction || 'NIHILISTS',
          };
          currentRoomCode = reqCode;

          // Notify guest they joined
          safeSend(ws, {
            type: 'ROOM_JOINED',
            payload: {
              code: reqCode,
              role: 'GUEST',
              host: {
                name: room.host.name,
                faction: room.host.faction,
              },
              guest: {
                name: room.guest.name,
                faction: room.guest.faction,
              },
              settings: room.settings,
            },
          });

          // Notify host that guest joined
          safeSend(room.host.ws, {
            type: 'GUEST_CONNECTED',
            payload: {
              guest: {
                name: room.guest.name,
                faction: room.guest.faction,
              },
            },
          });
          break;
        }

        case 'UPDATE_SETTINGS': {
          if (!currentRoomCode) return;
          const room = rooms.get(currentRoomCode);
          if (room && room.host.ws === ws) {
            room.settings = { ...room.settings, ...payload };
            if (room.guest) {
              safeSend(room.guest.ws, {
                type: 'SETTINGS_UPDATED',
                payload: room.settings,
              });
            }
          }
          break;
        }

        case 'START_MATCH': {
          if (!currentRoomCode) return;
          const room = rooms.get(currentRoomCode);
          if (room && (room.host.ws === ws || !room.host.ws)) {
            room.status = 'IN_GAME';

            if (payload && payload.settings) {
              room.settings = { ...room.settings, ...payload.settings };
            }

            // Generate a shared random seed so both clients have exact identical terrain
            const matchSeed = Date.now();
            const startPayload = {
              code: room.code,
              seed: matchSeed,
              host: {
                name: room.host.name,
                faction: room.host.faction,
              },
              guest: {
                name: room.guest ? room.guest.name : (payload?.guest?.name || 'Challenger'),
                faction: room.guest ? room.guest.faction : (payload?.guest?.faction || 'NIHILISTS'),
              },
              settings: room.settings,
            };

            safeSend(room.host.ws, {
              type: 'MATCH_STARTED',
              payload: { ...startPayload, myRole: 'HOST' },
            });
            if (room.guest) {
              safeSend(room.guest.ws, {
                type: 'MATCH_STARTED',
                payload: { ...startPayload, myRole: 'GUEST' },
              });
            }
          }
          break;
        }

        case 'GAME_ACTION': {
          if (!currentRoomCode) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          // Relay gameplay actions (MOVE, AIM, WEAPON_SELECT, FIRE, JETPACK, ADVANCE_TURN)
          // To the other player
          const targetWs = room.host.ws === ws ? room.guest?.ws : room.host.ws;
          if (targetWs) {
            safeSend(targetWs, {
              type: 'GAME_ACTION',
              payload: {
                action: payload.action,
                data: payload.data,
                sender: playerId,
              },
            });
          }
          break;
        }

        case 'SYNC_STATE': {
          if (!currentRoomCode) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          // Host authoritative sync to guest
          if (room.host.ws === ws && room.guest?.ws) {
            safeSend(room.guest.ws, {
              type: 'SYNC_STATE',
              payload: payload,
            });
          }
          break;
        }

        case 'LEAVE_ROOM': {
          handleDisconnection();
          break;
        }

        case 'PING': {
          safeSend(ws, { type: 'PONG', timestamp: Date.now() });
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  const handleDisconnection = () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        if (room.host.ws === ws) {
          // Host left
          if (room.guest?.ws) {
            safeSend(room.guest.ws, {
              type: 'OPPONENT_DISCONNECTED',
              payload: { message: 'Host disconnected from room.' },
            });
          }
          rooms.delete(currentRoomCode);
        } else if (room.guest?.ws === ws) {
          // Guest left
          room.guest = undefined;
          room.status = 'LOBBY';
          safeSend(room.host.ws, {
            type: 'OPPONENT_DISCONNECTED',
            payload: { message: 'Guest left the room.' },
          });
        }
      }
      currentRoomCode = null;
    }
  };

  ws.on('close', handleDisconnection);
  ws.on('error', handleDisconnection);
});

// Setup Vite in development or static serving in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.on('error', (err: any) => {
    console.error('[Server] HTTP server error:', err);
  });

  server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIpAddress();
    console.log(`> Evangelho das Dimenúveis: Armageddon Server running`);
    console.log(`> Local:   http://localhost:${PORT}`);
    console.log(`> Network: http://${localIp}:${PORT}`);
  });
}

startServer();
