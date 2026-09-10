// ═══════════════════════════════════════════════════════════════
// GameManager — Single Source of Truth for all game state
// ═══════════════════════════════════════════════════════════════

const TEAM_COLORS = [
  { name: 'Rojo', color: '#ef4444', bg: '#991b1b' },
  { name: 'Azul', color: '#3b82f6', bg: '#1e3a8a' },
  { name: 'Verde', color: '#10b981', bg: '#064e3b' },
  { name: 'Amarillo', color: '#f59e0b', bg: '#78350f' },
];

const GAME_STATES = {
  LOBBY: 'LOBBY',
  TEAMS_ASSIGNED: 'TEAMS_ASSIGNED',
  ROUND_ACTIVE: 'ROUND_ACTIVE',
  BUZZER_LOCKED: 'BUZZER_LOCKED',
  JUDGING: 'JUDGING',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER',
};

class GameManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
  }

  // ── Room Management ──────────────────────────────────────────

  createRoom(hostSocketId) {
    let code;
    do {
      code = String(Math.floor(1000 + Math.random() * 9000));
    } while (this.rooms.has(code));

    const room = {
      code,
      hostSocketId,
      state: GAME_STATES.LOBBY,
      players: new Map(),      // socketId -> { id, name, teamIndex }
      teams: [],               // [{ name, color, bg, score, players: [] }]
      buzzQueue: [],           // [{ playerId, playerName, teamIndex, timestamp }]
      blockedTeams: new Set(), // teamIndex of teams blocked this round
      blockedPlayers: new Set(), // playerId of players blocked this round
      currentJudging: null,    // The buzz entry currently being judged
      roundNumber: 0,
    };

    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  deleteRoom(code) {
    this.rooms.delete(code);
  }

  // ── Player Management ────────────────────────────────────────

  addPlayer(roomCode, socketId, playerName) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };
    if (room.state !== GAME_STATES.LOBBY && room.state !== GAME_STATES.TEAMS_ASSIGNED) {
      return { error: 'El juego ya comenzó' };
    }

    // Check for duplicate names
    for (const [, player] of room.players) {
      if (player.name.toLowerCase() === playerName.toLowerCase()) {
        return { error: 'Ese nombre ya está en uso' };
      }
    }

    const player = {
      id: socketId,
      name: playerName,
      teamIndex: -1,
    };

    room.players.set(socketId, player);
    return { success: true, player };
  }

  removePlayer(socketId) {
    for (const [code, room] of this.rooms) {
      if (room.players.has(socketId)) {
        room.players.delete(socketId);

        // Update team rosters
        for (const team of room.teams) {
          team.players = team.players.filter(p => p.id !== socketId);
        }

        // If host disconnects, mark room for cleanup
        if (room.hostSocketId === socketId) {
          return { roomCode: code, wasHost: true };
        }

        return { roomCode: code, wasHost: false };
      }
    }
    return null;
  }

  getPlayerList(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return Array.from(room.players.values());
  }

  // ── Team Management ──────────────────────────────────────────

  shuffleTeams(roomCode, numTeams = 2) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const players = Array.from(room.players.values());

    // Fisher-Yates shuffle
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    // Limit teams to available colors and player count
    const actualTeams = Math.min(numTeams, TEAM_COLORS.length, players.length);

    // Create teams
    room.teams = [];
    for (let t = 0; t < actualTeams; t++) {
      room.teams.push({
        name: `Equipo ${TEAM_COLORS[t].name}`,
        color: TEAM_COLORS[t].color,
        bg: TEAM_COLORS[t].bg,
        score: 0,
        players: [],
      });
    }

    // Distribute players round-robin
    players.forEach((player, idx) => {
      const teamIdx = idx % actualTeams;
      player.teamIndex = teamIdx;
      room.teams[teamIdx].players.push({ id: player.id, name: player.name });
      room.players.set(player.id, player);
    });

    room.state = GAME_STATES.TEAMS_ASSIGNED;
    return room.teams;
  }

  // ── Round Management ─────────────────────────────────────────

  startRound(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    room.state = GAME_STATES.ROUND_ACTIVE;
    room.buzzQueue = [];
    room.blockedTeams.clear();
    room.blockedPlayers.clear();
    room.currentJudging = null;
    room.roundNumber++;

    return true;
  }

  enableBuzzers(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    room.state = GAME_STATES.ROUND_ACTIVE;
    return true;
  }

  // ── Buzzer Logic (Server-authoritative) ──────────────────────

  registerBuzz(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    // Only allow buzzing during active round
    if (room.state !== GAME_STATES.ROUND_ACTIVE) {
      return { error: 'Buzzer no activo' };
    }

    const player = room.players.get(socketId);
    if (!player) return { error: 'Jugador no encontrado' };

    // Check if player already buzzed
    if (room.buzzQueue.some(b => b.playerId === socketId)) {
      return { error: 'Ya tocaste el buzzer' };
    }

    // Check if player's team is blocked
    if (room.blockedTeams.has(player.teamIndex)) {
      return { error: 'Tu equipo está bloqueado esta ronda' };
    }

    // Check if player individually is blocked
    if (room.blockedPlayers.has(socketId)) {
      return { error: 'Estás bloqueado esta ronda' };
    }

    const buzzEntry = {
      playerId: socketId,
      playerName: player.name,
      teamIndex: player.teamIndex,
      teamName: room.teams[player.teamIndex]?.name || 'Sin equipo',
      teamColor: room.teams[player.teamIndex]?.color || '#888',
      timestamp: Date.now(),
      position: room.buzzQueue.length + 1,
    };

    room.buzzQueue.push(buzzEntry);

    // First buzz: lock buzzer and move to judging
    if (room.buzzQueue.length === 1) {
      room.state = GAME_STATES.BUZZER_LOCKED;
      room.currentJudging = buzzEntry;
    }

    return { success: true, buzzEntry, isFirst: room.buzzQueue.length === 1 };
  }

  // ── Judge Actions ────────────────────────────────────────────

  judgeCorrect(roomCode, points = 1) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.currentJudging) return null;

    const { teamIndex, playerName, teamName } = room.currentJudging;

    // Add points
    if (room.teams[teamIndex]) {
      room.teams[teamIndex].score += points;
    }

    room.state = GAME_STATES.ROUND_END;

    return {
      playerName,
      teamName,
      teamIndex,
      teamColor: room.teams[teamIndex]?.color,
      pointsAwarded: points,
      scores: room.teams.map(t => ({ name: t.name, color: t.color, score: t.score })),
    };
  }

  judgeIncorrect(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.currentJudging) return null;

    const blocked = room.currentJudging;

    // Block the entire team for this round
    room.blockedTeams.add(blocked.teamIndex);
    room.blockedPlayers.add(blocked.playerId);

    // Check if there are more buzzes in the queue from non-blocked teams
    const nextBuzz = room.buzzQueue.find(
      b => b.playerId !== blocked.playerId && !room.blockedTeams.has(b.teamIndex)
    );

    if (nextBuzz) {
      // Move to judge the next player
      room.currentJudging = nextBuzz;
      room.state = GAME_STATES.BUZZER_LOCKED;
      return {
        blocked: { playerName: blocked.playerName, teamName: blocked.teamName },
        nextUp: nextBuzz,
        allBlocked: false,
      };
    }

    // Check if ALL teams are blocked
    const allTeamsBlocked = room.teams.every((_, idx) => room.blockedTeams.has(idx));
    if (allTeamsBlocked) {
      room.state = GAME_STATES.ROUND_END;
      room.currentJudging = null;
      return {
        blocked: { playerName: blocked.playerName, teamName: blocked.teamName },
        nextUp: null,
        allBlocked: true,
      };
    }

    // Re-enable buzzers for remaining non-blocked teams
    room.state = GAME_STATES.ROUND_ACTIVE;
    room.currentJudging = null;

    return {
      blocked: { playerName: blocked.playerName, teamName: blocked.teamName },
      nextUp: null,
      allBlocked: false,
      reopened: true,
    };
  }

  // ── Game End ─────────────────────────────────────────────────

  endGame(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.state = GAME_STATES.GAME_OVER;

    const rankings = [...room.teams]
      .sort((a, b) => b.score - a.score)
      .map((team, idx) => ({
        rank: idx + 1,
        name: team.name,
        color: team.color,
        score: team.score,
        players: team.players.map(p => p.name),
        isWinner: idx === 0,
      }));

    return { rankings };
  }

  // ── State Queries ────────────────────────────────────────────

  getRoomState(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return {
      code: room.code,
      state: room.state,
      players: Array.from(room.players.values()),
      teams: room.teams.map(t => ({
        name: t.name,
        color: t.color,
        bg: t.bg,
        score: t.score,
        players: t.players,
      })),
      buzzQueue: room.buzzQueue,
      currentJudging: room.currentJudging,
      blockedTeams: Array.from(room.blockedTeams),
      roundNumber: room.roundNumber,
    };
  }

  getPlayerState(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(socketId);
    if (!player) return null;

    const team = room.teams[player.teamIndex];
    const hasBuzzed = room.buzzQueue.some(b => b.playerId === socketId);
    const isTeamBlocked = room.blockedTeams.has(player.teamIndex);
    const isPlayerBlocked = room.blockedPlayers.has(socketId);

    return {
      name: player.name,
      teamIndex: player.teamIndex,
      teamName: team?.name || null,
      teamColor: team?.color || null,
      teamBg: team?.bg || null,
      gameState: room.state,
      canBuzz: room.state === GAME_STATES.ROUND_ACTIVE && !hasBuzzed && !isTeamBlocked && !isPlayerBlocked,
      hasBuzzed,
      isTeamBlocked,
      isPlayerBlocked,
      currentJudging: room.currentJudging,
      isMyTurn: room.currentJudging?.playerId === socketId,
    };
  }
}

export { GameManager, GAME_STATES };
