// ═══════════════════════════════════════════════════════════════
// Socket.io Server — Express + Real-time Game Events
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GameManager, GAME_STATES, TEAM_COLORS } from './gameManager.js';
import YouTube from 'youtube-sr';
import { Innertube, Log } from 'youtubei.js';

// Silence verbose attachment warnings from Innertube's text parser
Log.setLevel(Log.Level.ERROR);

let innertubeInstance = null;
async function getInnertube() {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create();
  }
  return innertubeInstance;
}

function extractPlaylistId(input) {
  if (!input) return null;
  const str = String(input).trim();
  const match = str.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(str) && !str.includes('/') && !str.includes('.')) return str;
  return null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Robust heartbeat & high-throughput configuration
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 5000,
  pingTimeout: 7000,
  perMessageDeflate: false, // Disables CPU-heavy zlib compression on micro-packets
  maxHttpBufferSize: 1e6,  // 1MB buffer cap protects memory against payload flood
  serveClient: false,      // Do not serve socket.io.js over HTTP (client imports its own)
});

app.use(cors());
app.use(express.json());

const gm = new GameManager();

// Detect local network IP (e.g. 192.168.1.X)
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// YouTube Auto-Karaoke endpoint (Supports Playlist URL or Array of Song Names)
app.post('/api/playlist', async (req, res) => {
  try {
    const { url, queries } = req.body;
    let rawVideos = [];
    let ytApi = YouTube.search ? YouTube : YouTube.default;

    if (queries && Array.isArray(queries)) {
      console.log(`[API] Buscando ${queries.length} canciones por texto...`);
      rawVideos = queries.map(q => ({ title: q, isQuery: true }));
    } else if (url) {
      console.log(`[API] Procesando playlist/URL: ${url}`);
      const playlistId = extractPlaylistId(url);

      if (playlistId) {
        console.log(`[API] ID de playlist detectado: ${playlistId}. Leyendo con Innertube...`);
        try {
          const yt = await getInnertube();
          const playlist = await yt.getPlaylist(playlistId);
          if (playlist && playlist.videos && playlist.videos.length > 0) {
            const results = [];
            for (const v of playlist.videos) {
              const id = v.content_id || v.id || v.videoId || v.renderer_context?.command_context?.on_tap?.payload?.videoId;
              const title = v.metadata?.title?.text || v.title?.text || (typeof v.title === 'string' ? v.title : null) || (v.metadata?.title ? String(v.metadata.title) : null) || v.title?.runs?.[0]?.text;
              const thumbnail = v.content_image?.image?.[0]?.url || v.content_image?.sources?.[0]?.url || v.thumbnails?.[0]?.url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);

              if (id && title) {
                results.push({
                  title: title.trim(),
                  originalTitle: title.trim(),
                  id: String(id).trim(),
                  url: `https://www.youtube.com/watch?v=${id}`,
                  thumbnail
                });
              }
            }
            if (results.length > 0) {
              console.log(`[API] Playlist cargada exitosamente: ${results.length} canciones obtenidas.`);
              return res.json({ success: true, videos: results, count: results.length });
            }
          }
        } catch (ytErr) {
          console.warn('[API] Innertube falló al leer playlist, probando fallback...', ytErr?.message);
        }
      }

      // Fallback: try youtube-sr getPlaylist
      const fallbackPlaylist = await ytApi.getPlaylist(url, { limit: 50 }).catch(() => null);
      if (fallbackPlaylist && fallbackPlaylist.videos && fallbackPlaylist.videos.length > 0) {
        rawVideos = fallbackPlaylist.videos.slice(0, 50);
      } else {
        return res.status(400).json({
          error: 'No se pudo leer la playlist de YouTube. Verificá que la playlist sea PÚBLICA o NO LISTADA (las playlists privadas no se pueden leer sin iniciar sesión en YouTube).'
        });
      }
    } else {
      return res.status(400).json({ error: 'URL o queries requeridas' });
    }

    const results = [];
    
    // Fetch original studio versions
    for (const v of rawVideos) {
      try {
        if (!v.title) continue;

        if (v.isQuery) {
          const cleanTitle = v.title.replace(/\[.*?\]|\(.*?\)/gi, '').trim();
          let searchResults = await ytApi.search(`${cleanTitle} audio`, { limit: 1, type: 'video' }).catch(() => null);
          if (!searchResults || searchResults.length === 0) {
            searchResults = await ytApi.search(cleanTitle, { limit: 1, type: 'video' }).catch(() => null);
          }
          await new Promise(r => setTimeout(r, 600));
          
          if (searchResults && searchResults.length > 0) {
            const k = searchResults[0];
            results.push({
              title: v.title,
              originalTitle: v.title,
              id: k.id,
              url: `https://www.youtube.com/watch?v=${k.id}`,
              thumbnail: k.thumbnail?.url || v.thumbnail?.url
            });
          }
        } else {
          // Direct from playlist, use original video directly
          results.push({
            title: v.title,
            originalTitle: v.title,
            id: v.id,
            url: `https://www.youtube.com/watch?v=${v.id}`,
            thumbnail: v.thumbnail?.url
          });
        }
      } catch (err) {
        if (!v.isQuery && v.id) {
          results.push({
            title: v.title,
            originalTitle: v.title,
            id: v.id,
            url: `https://www.youtube.com/watch?v=${v.id}`,
            thumbnail: v.thumbnail?.url
          });
        }
      }
    }

    res.json({ success: true, videos: results, count: results.length });
  } catch (error) {
    console.error('[API] Error en endpoint de playlist:', error);
    res.status(500).json({ error: 'Error interno al procesar la lista' });
  }
});

// Config & network info endpoint
app.get('/api/config', (req, res) => {
  const localIp = getLocalIp();
  const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || null;
  res.json({
    status: 'ok',
    localIp,
    port: process.env.PORT || 3001,
    publicUrl,
    isProduction: process.env.NODE_ENV === 'production',
  });
});

// Serve static client files if dist directory exists (for production deployment)
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Helper: Batched broadcast of player states to prevent event-loop choking during stampedes
const pendingBroadcasts = new Set();
function broadcastPlayerStates(roomCode) {
  if (!roomCode || pendingBroadcasts.has(roomCode)) return;
  pendingBroadcasts.add(roomCode);
  setImmediate(() => {
    pendingBroadcasts.delete(roomCode);
    const room = gm.getRoom(roomCode);
    if (!room) return;

    // Precompute shared teams projection once for the whole broadcast (avoids 10,000 array allocations)
    const cachedTeams = room.teams.map((t) => ({
      name: t.name,
      color: t.color,
      bg: t.bg,
      score: t.score,
      isReady: !!t.isReady,
      players: t.players.map((p) => ({ name: p.name, id: p.id, isManual: !!p.isManual })),
    }));

    for (const [, player] of room.players) {
      if (player.socketId) {
        const playerState = gm.getPlayerState(roomCode, player.id, cachedTeams);
        io.to(player.socketId).emit('player-state-updated', playerState);
      }
    }
  });
}

// Helper: Batched broadcast of player list to prevent client UI re-render thrashing during massive joins
const pendingPlayerListBroadcasts = new Map();
function broadcastPlayerList(roomCode) {
  if (!roomCode || pendingPlayerListBroadcasts.has(roomCode)) return;
  const timeout = setTimeout(() => {
    pendingPlayerListBroadcasts.delete(roomCode);
    const playerList = gm.getPlayerList(roomCode);
    io.to(roomCode).emit('player-list-updated', playerList);
  }, 40);
  pendingPlayerListBroadcasts.set(roomCode, timeout);
}

// ── Socket.io Connection Handler ───────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Connect] ${socket.id}`);

  let currentRoom = null;

  // ── HOST: Create Room ──────────────────────────────────────

  socket.on('create-room', (callback) => {
    const room = gm.createRoom(socket.id);
    currentRoom = room.code;
    socket.join(room.code);
    console.log(`[Room] Created: ${room.code} by ${socket.id}`);
    socket.emit('room-created', { code: room.code });
    if (typeof callback === 'function') {
      callback({ code: room.code });
    }
  });

  socket.on('host-join', ({ roomCode }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const room = gm.getRoom(code);
    if (!room) {
      return callback?.({ error: 'Sala no encontrada' });
    }
    room.hostSocketId = socket.id;
    room.hostConnected = true;
    socket.join(code);
    currentRoom = code;
    console.log(`[Host] Joined room: ${code} by ${socket.id}`);
    callback?.({ success: true, roomState: gm.getRoomState(code) });
  });

  // ── PLAYER: Join Room ──────────────────────────────────────

  socket.on('join-room', ({ roomCode, playerName, playerId }, callback) => {
    const code = String(roomCode).trim();
    const name = String(playerName).trim();

    if (!code || !name) {
      return callback?.({ error: 'Código y nombre requeridos' });
    }

    const result = gm.addPlayer(code, socket.id, name, playerId);
    if (result.error) {
      return callback?.({ error: result.error });
    }

    currentRoom = code;
    socket.join(code);

    // Notify host and room about player list (batched for smooth rendering)
    broadcastPlayerList(code);

    const playerState = gm.getPlayerState(code, result.player.id);
    const roomState = gm.getRoomState(code);

    console.log(`[Player] ${name} joined room ${code} (reconnected: ${!!result.reconnected})`);
    callback?.({
      success: true,
      player: result.player,
      reconnected: result.reconnected,
      playerState,
      roomState,
    });
  });

  // ── PLAYER / HOST: Reconnect Session ───────────────────────

  socket.on('reconnect-player', ({ roomCode, playerId, playerName }, callback) => {
    const code = String(roomCode).trim();
    if (!code || !playerId) {
      return callback?.({ error: 'Código de sala e ID requeridos' });
    }

    const room = gm.getRoom(code);
    if (!room) {
      return callback?.({ error: 'La sala ya no está activa' });
    }

    // If reconnecting as host
    if (room.hostSocketId && !room.hostConnected) {
      room.hostSocketId = socket.id;
      room.hostConnected = true;
      room.hostDisconnectedAt = null;
      socket.join(code);
      currentRoom = code;
      console.log(`[Host] Reconnected to room ${code}`);
      return callback?.({ success: true, isHost: true, roomState: gm.getRoomState(code) });
    }

    const result = gm.reconnectPlayer(code, playerId, socket.id, playerName);
    if (result.error) {
      return callback?.({ error: result.error });
    }

    currentRoom = code;
    socket.join(code);

    const playerState = gm.getPlayerState(code, result.player.id);
    const roomState = gm.getRoomState(code);

    // Notify others
    broadcastPlayerList(code);

    console.log(`[Reconnect] ${result.player.name} (${result.player.id}) reconnected to room ${code}`);
    callback?.({ success: true, player: result.player, playerState, roomState });
  });

  // ── HOST: Add Manual Player ────────────────────────────────

  socket.on('add-manual-player', ({ roomCode, playerName }, callback) => {
    const code = String(roomCode).trim();
    const name = String(playerName).trim();
    if (!code || !name) {
      return callback?.({ error: 'Nombre requerido' });
    }

    const result = gm.addManualPlayer(code, name);
    if (result.error) {
      return callback?.({ error: result.error });
    }

    broadcastPlayerList(code);

    console.log(`[Manual] Player ${name} added to room ${code}`);
    callback?.({ success: true, player: result.player });
  });

  // ── HOST: Remove Manual Player ─────────────────────────────

  socket.on('remove-manual-player', ({ roomCode, playerId }, callback) => {
    const code = String(roomCode).trim();
    const result = gm.removeManualPlayer(code, playerId);
    if (result.error) {
      return callback?.({ error: result.error });
    }

    broadcastPlayerList(code);

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', { teams: roomState.teams });

    callback?.({ success: true });
  });

  // ── HOST: Move Player to Team (Manual Team Editing) ─────────

  socket.on('move-player-team', ({ roomCode, playerId, targetTeamIndex }, callback) => {
    const code = String(roomCode).trim();
    const result = gm.movePlayerToTeam(code, playerId, targetTeamIndex);
    if (result.error) {
      return callback?.({ error: result.error });
    }

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', { teams: roomState.teams });
    broadcastPlayerStates(code);

    console.log(`[Move] Player ${playerId} moved to team ${targetTeamIndex} in room ${code}`);
    callback?.({ success: true, teams: roomState.teams });
  });

  // ── HOST & PLAYER: Rename Team ─────────────────────────────
  socket.on('rename-team', ({ roomCode, teamIndex, newName, playerId }, callback) => {
    const code = String(roomCode).trim();
    let idx = teamIndex;
    if (idx === undefined || idx === null) {
      const room = gm.getRoom(code);
      if (room) {
        const pid = playerId || room.socketToPlayerId.get(socket.id);
        const p = pid ? room.players.get(pid) : null;
        if (p) idx = p.teamIndex;
      }
    }

    const result = gm.renameTeam(code, idx, newName);
    if (result.error) {
      return callback?.({ error: result.error });
    }

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    broadcastPlayerStates(code);

    console.log(`[Teams] Team ${idx} renamed to "${newName}" in room ${code}`);
    callback?.({ success: true, teams: roomState.teams, allTeamsReady: roomState.allTeamsReady });
  });

  // ── PLAYER & HOST: Set Team Ready ───────────────────────────
  socket.on('team-ready', ({ roomCode, teamIndex, isReady, playerId }, callback) => {
    const code = String(roomCode).trim();
    let result;
    if (teamIndex !== undefined && teamIndex !== null) {
      result = gm.setTeamReady(code, teamIndex, isReady !== false);
    } else {
      const pid = playerId || socket.id;
      result = gm.setPlayerTeamReady(code, pid, isReady !== false);
    }

    if (result.error) {
      return callback?.({ error: result.error });
    }

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    broadcastPlayerStates(code);

    console.log(`[Ready] Team ready toggled in room ${code}. All ready: ${roomState.allTeamsReady}`);
    callback?.({ success: true, teams: roomState.teams, allTeamsReady: roomState.allTeamsReady });
  });

  // ── HOST: Shuffle Teams (Max 4 players per team rule) ───────

  socket.on('shuffle-teams', ({ roomCode, numTeams }, callback) => {
    const teams = gm.shuffleTeams(roomCode, numTeams);
    if (!teams) {
      return callback?.({ error: 'No se pudo sortear equipos' });
    }

    const roomState = gm.getRoomState(roomCode);
    io.to(roomCode).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });

    // Send individual team assignment to each player
    const room = gm.getRoom(roomCode);
    if (room) {
      for (const [, player] of room.players) {
        if (player.socketId) {
          const playerState = gm.getPlayerState(roomCode, player.id);
          io.to(player.socketId).emit('your-team', playerState);
        }
      }
    }

    broadcastPlayerStates(roomCode);

    console.log(`[Teams] Shuffled in room ${roomCode} (${teams.length} teams, max 4 per team)`);
    callback?.({ success: true, teams: roomState.teams });
  });

  // ── HOST: Start Game (Transition from Lobby to Game) ────────
  socket.on('host-start-game', ({ roomCode }, callback) => {
    const room = gm.getRoom(roomCode);
    if (!room) return callback?.({ error: 'Sala no encontrada' });

    console.log(`[Game] Host started game in room ${roomCode}`);
    room.state = 'ROUND_WAITING';
    io.to(roomCode).emit('game-started', {
      roundNumber: room.roundNumber || 0,
      teams: room.teams,
    });
    broadcastPlayerStates(roomCode);
    callback?.({ success: true });
  });

  // ── HOST: Start Round ──────────────────────────────────────

  socket.on('start-round', ({ roomCode }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const success = gm.startRound(code);
    if (!success) {
      return callback?.({ error: 'No se pudo iniciar la ronda' });
    }

    io.to(code).emit('round-started', {
      roundNumber: gm.getRoom(code).roundNumber,
    });

    broadcastPlayerStates(code);

    console.log(`[Round] Started in room ${code}`);
    callback?.({ success: true });
  });

  // ── HOST: Enable Buzzers ───────────────────────────────────

  socket.on('enable-buzzers', ({ roomCode }) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const success = gm.enableBuzzers(code);
    if (!success) return;

    io.to(code).emit('buzzers-enabled');
    broadcastPlayerStates(code);
  });

  // ── PLAYER: Buzz ───────────────────────────────────────────

  socket.on('buzz', ({ roomCode }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const result = gm.registerBuzz(code, socket.id);

    if (result.error) {
      return callback?.({ error: result.error });
    }

    const { buzzEntry, isFirst } = result;

    if (isFirst) {
      io.to(code).emit('first-buzz', {
        buzzEntry,
        roomState: gm.getRoomState(code),
      });
    }

    // Instant team-wide notification so teammates' buzzers lock immediately
    io.to(code).emit('team-buzzed', {
      teamIndex: buzzEntry.teamIndex,
      teamName: buzzEntry.teamName,
      playerId: buzzEntry.playerId,
      playerName: buzzEntry.playerName,
      position: buzzEntry.position,
    });

    io.to(code).emit('buzz-queue-updated', {
      buzzQueue: gm.getRoomState(code).buzzQueue,
    });

    broadcastPlayerStates(code);

    console.log(`[Buzz] ${buzzEntry.playerName} (${buzzEntry.teamName}) - Position: ${buzzEntry.position}`);
    callback?.({ success: true, position: buzzEntry.position });
  });

  // ── HOST: Judge Correct ────────────────────────────────────

  socket.on('judge-correct', ({ roomCode, points }, callback) => {
    const result = gm.judgeCorrect(roomCode, points);
    if (!result) {
      return callback?.({ error: 'Error al juzgar' });
    }

    io.to(roomCode).emit('round-result', {
      type: 'correct',
      ...result,
    });

    broadcastPlayerStates(roomCode);

    console.log(`[Correct] ${result.playerName} - ${result.teamName} +${result.pointsAwarded}pts (${result.elapsedSeconds}s)`);
    callback?.({ success: true, result });
  });

  // ── HOST: Judge Incorrect ──────────────────────────────────

  socket.on('judge-incorrect', ({ roomCode, penaltyPoints }, callback) => {
    const result = gm.judgeIncorrect(roomCode, penaltyPoints);
    if (!result) {
      return callback?.({ error: 'Error al juzgar' });
    }

    io.to(roomCode).emit('round-judgment', {
      type: 'incorrect',
      ...result,
    });

    io.to(roomCode).emit('buzz-queue-updated', {
      buzzQueue: result.buzzQueue || [],
    });

    broadcastPlayerStates(roomCode);

    console.log(`[Incorrect] ${result.blocked.playerName} (${result.blocked.teamName}) -${result.pointsDeducted}pt. Next up: ${result.nextUp?.playerName || 'None'}`);
    callback?.({ success: true, result });
  });

  // ── HOST: End Game ─────────────────────────────────────────

  socket.on('end-game', ({ roomCode }, callback) => {
    const result = gm.endGame(roomCode);
    if (!result) {
      return callback?.({ error: 'Error al finalizar' });
    }

    io.to(roomCode).emit('game-over', result);

    console.log(`[GameOver] Room ${roomCode}`);
    callback?.({ success: true, result });
  });

  // ── HOST: Music Control ────────────────────────────────────

  socket.on('music-control', ({ roomCode, action, data }) => {
    io.to(roomCode).emit('music-control', { action, data });
  });

  // ── Request State ──────────────────────────────────────────

  socket.on('get-room-state', ({ roomCode }, callback) => {
    const state = gm.getRoomState(roomCode);
    callback?.(state || { error: 'Sala no encontrada' });
  });

  socket.on('get-player-state', ({ roomCode, playerId }, callback) => {
    const state = gm.getPlayerState(roomCode, playerId || socket.id);
    callback?.(state || { error: 'Estado no encontrado' });
  });

  // ── DEV / STRESS: Spawn 100 Live Bot Sockets ────────────────
  socket.on('spawn-bots', async ({ roomCode, count = 100 }, callback) => {
    const code = roomCode?.toUpperCase();
    if (!code) return callback?.({ error: 'Falta roomCode' });

    try {
      const { io: clientIo } = await import('socket.io-client');
      const serverTarget = `http://localhost:${PORT}`;

      console.log(`[Stress] Spawning ${count} bot sockets into room ${code}...`);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const botSocket = clientIo(serverTarget, {
            transports: ['websocket'],
            reconnection: false,
          });

          const botId = `bot_${i + 1}_${Math.random().toString(36).slice(2, 6)}`;
          const botName = `Bot_${String(i + 1).padStart(3, '0')}`;

          botSocket.on('connect', () => {
            botSocket.emit('join-room', { roomCode: code, playerName: botName, playerId: botId }, () => {});
          });

          let buzzTimer = null;

          botSocket.on('round-started', () => {
            if (buzzTimer) clearTimeout(buzzTimer);

            // 15% chance this bot doesn't recognize or buzz this song
            if (Math.random() < 0.15) return;

            // Distribution across speed scoring tiers:
            // Tier 1: 0.3s - 2.5s (< 3s -> 5 pts) ~25%
            // Tier 2: 3.2s - 5.5s (< 6s -> 4 pts) ~25%
            // Tier 3: 6.2s - 8.5s (< 9s -> 3 pts) ~20%
            // Tier 4: 9.2s - 12.2s (< 13s -> 2 pts) ~15%
            // Tier 5: 13.5s - 16.5s (>= 13s -> 1 pt) ~15%
            const roll = Math.random();
            let delay;

            if (roll < 0.25) {
              delay = Math.floor(300 + Math.random() * 2200);
            } else if (roll < 0.50) {
              delay = Math.floor(3200 + Math.random() * 2300);
            } else if (roll < 0.70) {
              delay = Math.floor(6200 + Math.random() * 2300);
            } else if (roll < 0.85) {
              delay = Math.floor(9200 + Math.random() * 3000);
            } else {
              delay = Math.floor(13500 + Math.random() * 3000);
            }

            buzzTimer = setTimeout(() => {
              botSocket.emit('buzz', { roomCode: code }, () => {});
            }, delay);
          });

          botSocket.on('round-result', () => {
            if (buzzTimer) clearTimeout(buzzTimer);
          });

          botSocket.on('round-ended', () => {
            if (buzzTimer) clearTimeout(buzzTimer);
          });

          botSocket.on('game-over', () => {
            if (buzzTimer) clearTimeout(buzzTimer);
            botSocket.disconnect();
          });
        }, (i / count) * 2000);
      }

      callback?.({ success: true, count });
    } catch (err) {
      console.error('[Stress] Error spawning bots:', err);
      callback?.({ error: err.message });
    }
  });

  // ── Disconnect ─────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[Disconnect] ${socket.id}`);

    const result = gm.handleDisconnect(socket.id);
    if (result) {
      if (result.wasHost) {
        console.log(`[Host] Disconnected from room ${result.roomCode} (waiting for reconnect)`);
      } else {
        broadcastPlayerList(result.roomCode);
      }
    }
  });
});

// ── Start Server ─────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  const localIp = getLocalIp();
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════╗');
  console.log('  ║   Trivia Musical Server Running                      ║');
  console.log(`  ║   Port: ${PORT}                                         ║`);
  console.log(`  ║   Local:   http://localhost:${PORT}                     ║`);
  console.log(`  ║   Red:     http://${localIp}:${PORT}                 ║`);
  console.log('  ╚═══════════════════════════════════════════════════════╝');
  console.log('');
});
