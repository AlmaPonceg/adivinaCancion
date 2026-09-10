// ═══════════════════════════════════════════════════════════════
// Socket.io Server — Express + Real-time Game Events
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager, GAME_STATES } from './gameManager.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.use(cors());
app.use(express.json());

const gm = new GameManager();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

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
    callback({ code: room.code });
  });

  // ── PLAYER: Join Room ──────────────────────────────────────

  socket.on('join-room', ({ roomCode, playerName }, callback) => {
    const code = String(roomCode).trim();
    const name = String(playerName).trim();

    if (!code || !name) {
      return callback({ error: 'Código y nombre requeridos' });
    }

    const result = gm.addPlayer(code, socket.id, name);
    if (result.error) {
      return callback({ error: result.error });
    }

    currentRoom = code;
    socket.join(code);

    // Notify host about new player
    const playerList = gm.getPlayerList(code);
    io.to(code).emit('player-list-updated', playerList);

    console.log(`👤 ${name} joined room ${code}`);
    callback({ success: true, player: result.player });
  });

  // ── HOST: Shuffle Teams ────────────────────────────────────

  socket.on('shuffle-teams', ({ roomCode, numTeams = 2 }, callback) => {
    const teams = gm.shuffleTeams(roomCode, numTeams);
    if (!teams) {
      return callback({ error: 'No se pudo sortear equipos' });
    }

    const roomState = gm.getRoomState(roomCode);
    io.to(roomCode).emit('teams-assigned', { teams: roomState.teams });

    // Send individual team assignment to each player
    for (const [socketId, player] of gm.getRoom(roomCode).players) {
      const playerState = gm.getPlayerState(roomCode, socketId);
      io.to(socketId).emit('your-team', playerState);
    }

    console.log(`🎲 Teams shuffled in room ${roomCode}`);
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

    // Send updated player states
    const room = gm.getRoom(roomCode);
    for (const [socketId] of room.players) {
      const playerState = gm.getPlayerState(roomCode, socketId);
      io.to(socketId).emit('player-state-updated', playerState);
    }

    console.log(`▶️ Round started in room ${roomCode}`);
    callback?.({ success: true });
  });

  // ── HOST: Enable Buzzers ───────────────────────────────────

  socket.on('enable-buzzers', ({ roomCode }) => {
    const success = gm.enableBuzzers(roomCode);
    if (!success) return;

    io.to(roomCode).emit('buzzers-enabled');

    // Send updated player states
    const room = gm.getRoom(roomCode);
    if (room) {
      for (const [socketId] of room.players) {
        const playerState = gm.getPlayerState(roomCode, socketId);
        io.to(socketId).emit('player-state-updated', playerState);
      }
    }
  });

  // ── PLAYER: Buzz ───────────────────────────────────────────
  // This is the most critical event — server timestamp is truth

  socket.on('buzz', ({ roomCode }, callback) => {
    const result = gm.registerBuzz(roomCode, socket.id);

    if (result.error) {
      return callback?.({ error: result.error });
    }

    const { buzzEntry, isFirst } = result;

    if (isFirst) {
      // Announce to the entire room who buzzed first
      io.to(roomCode).emit('first-buzz', {
        buzzEntry,
        roomState: gm.getRoomState(roomCode),
      });
    }

    // Send buzz queue update to host
    io.to(roomCode).emit('buzz-queue-updated', {
      buzzQueue: gm.getRoomState(roomCode).buzzQueue,
    });

    // Update all player states (disable buzzers for everyone)
    const room = gm.getRoom(roomCode);
    if (room) {
      for (const [socketId] of room.players) {
        const playerState = gm.getPlayerState(roomCode, socketId);
        io.to(socketId).emit('player-state-updated', playerState);
      }
    }

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

    // Update all player states
    const room = gm.getRoom(roomCode);
    if (room) {
      for (const [socketId] of room.players) {
        const playerState = gm.getPlayerState(roomCode, socketId);
        io.to(socketId).emit('player-state-updated', playerState);
      }
    }

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

    // Update all player states
    const room = gm.getRoom(roomCode);
    if (room) {
      for (const [socketId] of room.players) {
        const playerState = gm.getPlayerState(roomCode, socketId);
        io.to(socketId).emit('player-state-updated', playerState);
      }
    }

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
    // Forward music control events to all clients in the room
    io.to(roomCode).emit('music-control', { action, data });
  });

  // ── Request State ──────────────────────────────────────────

  socket.on('get-room-state', ({ roomCode }, callback) => {
    const state = gm.getRoomState(roomCode);
    callback?.(state || { error: 'Sala no encontrada' });
  });

  socket.on('get-player-state', ({ roomCode }, callback) => {
    const state = gm.getPlayerState(roomCode, socket.id);
    callback?.(state || { error: 'Estado no encontrado' });
  });

  // ── Disconnect ─────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);

    const result = gm.removePlayer(socket.id);
    if (result) {
      if (result.wasHost) {
        // Notify all players in the room that the host left
        io.to(result.roomCode).emit('host-disconnected');
        gm.deleteRoom(result.roomCode);
        console.log(`🗑️ Room ${result.roomCode} deleted (host left)`);
      } else {
        // Update player list
        const playerList = gm.getPlayerList(result.roomCode);
        io.to(result.roomCode).emit('player-list-updated', playerList);
      }
    }
  });
});

// ── Start Server ─────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║  🎵 Trivia Musical Server Running       ║');
  console.log(`  ║  📡 Port: ${PORT}                          ║`);
  console.log('  ║  🔗 http://localhost:' + PORT + '               ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
