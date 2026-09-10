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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Robust heartbeat configuration: 60s timeout prevents mobile disconnects on sleep
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 60000,
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

// Helper: Broadcast updated player states to all connected sockets in a room
function broadcastPlayerStates(roomCode) {
  const room = gm.getRoom(roomCode);
  if (!room) return;
  for (const [, player] of room.players) {
    if (player.socketId) {
      const playerState = gm.getPlayerState(roomCode, player.id);
      io.to(player.socketId).emit('player-state-updated', playerState);
    }
  }
}

// ── Socket.io Connection Handler ───────────────────────────────

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  let currentRoom = null;

  // ── HOST: Create Room ──────────────────────────────────────

  socket.on('create-room', (callback) => {
    const room = gm.createRoom(socket.id);
    currentRoom = room.code;
    socket.join(room.code);
    console.log(`🏠 Room created: ${room.code} by ${socket.id}`);
    socket.emit('room-created', { code: room.code });
    if (typeof callback === 'function') {
      callback({ code: room.code });
    }
  });

  // ── PLAYER: Join Room ──────────────────────────────────────

  socket.on('join-room', ({ roomCode, playerName, playerId }, callback) => {
    const code = String(roomCode).trim();
    const name = String(playerName).trim();

    if (!code || !name) {
      return callback({ error: 'Código y nombre requeridos' });
    }

    const result = gm.addPlayer(code, socket.id, name, playerId);
    if (result.error) {
      return callback({ error: result.error });
    }

    currentRoom = code;
    socket.join(code);

    // Notify host and room about player list
    const playerList = gm.getPlayerList(code);
    io.to(code).emit('player-list-updated', playerList);

    console.log(`👤 ${name} joined room ${code} (reconnected: ${!!result.reconnected})`);
    callback({ success: true, player: result.player, reconnected: result.reconnected });
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
      console.log(`👑 Host reconnected to room ${code}`);
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
    const playerList = gm.getPlayerList(code);
    io.to(code).emit('player-list-updated', playerList);

    console.log(`🔄 ${result.player.name} (${result.player.id}) reconnected to room ${code}`);
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

    const playerList = gm.getPlayerList(code);
    io.to(code).emit('player-list-updated', playerList);

    console.log(`📝 Manual player ${name} added to room ${code}`);
    callback?.({ success: true, player: result.player });
  });

  // ── HOST: Remove Manual Player ─────────────────────────────

  socket.on('remove-manual-player', ({ roomCode, playerId }, callback) => {
    const code = String(roomCode).trim();
    const result = gm.removeManualPlayer(code, playerId);
    if (result.error) {
      return callback?.({ error: result.error });
    }

    const playerList = gm.getPlayerList(code);
    io.to(code).emit('player-list-updated', playerList);

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

    console.log(`🔀 Player ${playerId} moved to team ${targetTeamIndex} in room ${code}`);
    callback?.({ success: true, teams: roomState.teams });
  });

  // ── HOST: Shuffle Teams (Max 4 players per team rule) ───────

  socket.on('shuffle-teams', ({ roomCode, numTeams }, callback) => {
    const teams = gm.shuffleTeams(roomCode, numTeams);
    if (!teams) {
      return callback({ error: 'No se pudo sortear equipos' });
    }

    const roomState = gm.getRoomState(roomCode);
    io.to(roomCode).emit('teams-assigned', { teams: roomState.teams });

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

    console.log(`🎲 Teams shuffled in room ${roomCode} (${teams.length} teams, max 4 per team)`);
    callback({ success: true, teams: roomState.teams });
  });

  // ── HOST: Start Round ──────────────────────────────────────

  socket.on('start-round', ({ roomCode }, callback) => {
    const success = gm.startRound(roomCode);
    if (!success) {
      return callback?.({ error: 'No se pudo iniciar la ronda' });
    }

    io.to(roomCode).emit('round-started', {
      roundNumber: gm.getRoom(roomCode).roundNumber,
    });

    broadcastPlayerStates(roomCode);

    console.log(`▶️ Round started in room ${roomCode}`);
    callback?.({ success: true });
  });

  // ── HOST: Enable Buzzers ───────────────────────────────────

  socket.on('enable-buzzers', ({ roomCode }) => {
    const success = gm.enableBuzzers(roomCode);
    if (!success) return;

    io.to(roomCode).emit('buzzers-enabled');
    broadcastPlayerStates(roomCode);
  });

  // ── PLAYER: Buzz ───────────────────────────────────────────

  socket.on('buzz', ({ roomCode }, callback) => {
    const result = gm.registerBuzz(roomCode, socket.id);

    if (result.error) {
      return callback?.({ error: result.error });
    }

    const { buzzEntry, isFirst } = result;

    if (isFirst) {
      io.to(roomCode).emit('first-buzz', {
        buzzEntry,
        roomState: gm.getRoomState(roomCode),
      });
    }

    io.to(roomCode).emit('buzz-queue-updated', {
      buzzQueue: gm.getRoomState(roomCode).buzzQueue,
    });

    broadcastPlayerStates(roomCode);

    console.log(`🔔 BUZZ from ${buzzEntry.playerName} (${buzzEntry.teamName}) - Position: ${buzzEntry.position}`);
    callback?.({ success: true, position: buzzEntry.position });
  });

  // ── HOST: Judge Correct ────────────────────────────────────

  socket.on('judge-correct', ({ roomCode, points = 1 }, callback) => {
    const result = gm.judgeCorrect(roomCode, points);
    if (!result) {
      return callback?.({ error: 'Error al juzgar' });
    }

    io.to(roomCode).emit('round-result', {
      type: 'correct',
      ...result,
    });

    broadcastPlayerStates(roomCode);

    console.log(`✅ Correct! ${result.playerName} - ${result.teamName} +${points}pts`);
    callback?.({ success: true, result });
  });

  // ── HOST: Judge Incorrect ──────────────────────────────────

  socket.on('judge-incorrect', ({ roomCode }, callback) => {
    const result = gm.judgeIncorrect(roomCode);
    if (!result) {
      return callback?.({ error: 'Error al juzgar' });
    }

    io.to(roomCode).emit('round-judgment', {
      type: 'incorrect',
      ...result,
    });

    broadcastPlayerStates(roomCode);

    console.log(`❌ Incorrect! ${result.blocked.playerName} blocked`);
    callback?.({ success: true, result });
  });

  // ── HOST: End Game ─────────────────────────────────────────

  socket.on('end-game', ({ roomCode }, callback) => {
    const result = gm.endGame(roomCode);
    if (!result) {
      return callback?.({ error: 'Error al finalizar' });
    }

    io.to(roomCode).emit('game-over', result);

    console.log(`🏆 Game over in room ${roomCode}`);
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

  // ── Disconnect ─────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);

    const result = gm.handleDisconnect(socket.id);
    if (result) {
      if (result.wasHost) {
        console.log(`⚠️ Host socket disconnected from room ${result.roomCode} (waiting for reconnect)`);
      } else {
        const playerList = gm.getPlayerList(result.roomCode);
        io.to(result.roomCode).emit('player-list-updated', playerList);
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
  console.log('  ║  🎵 Trivia Musical Server Running                    ║');
  console.log(`  ║  📡 Port: ${PORT}                                       ║`);
  console.log(`  ║  🔗 Local:   http://localhost:${PORT}                   ║`);
  console.log(`  ║  📱 Red:     http://${localIp}:${PORT}               ║`);
  console.log('  ╚═══════════════════════════════════════════════════════╝');
  console.log('');
});
