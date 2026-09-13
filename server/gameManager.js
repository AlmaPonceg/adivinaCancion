// ═══════════════════════════════════════════════════════════════
// GameManager — Single Source of Truth for all game state
// ═══════════════════════════════════════════════════════════════

const TEAM_COLORS = [
  { name: 'Rojo', color: '#ef4444', bg: '#991b1b' },
  { name: 'Azul', color: '#3b82f6', bg: '#1e3a8a' },
  { name: 'Verde', color: '#10b981', bg: '#064e3b' },
  { name: 'Amarillo', color: '#f59e0b', bg: '#78350f' },
  { name: 'Violeta', color: '#8b5cf6', bg: '#4c1d95' },
  { name: 'Naranja', color: '#f97316', bg: '#7c2d12' },
  { name: 'Rosa', color: '#ec4899', bg: '#831843' },
  { name: 'Cian', color: '#06b6d4', bg: '#164e63' },
  { name: 'Lima', color: '#84cc16', bg: '#3f6212' },
  { name: 'Fucsia', color: '#d946ef', bg: '#701a75' },
  { name: 'Índigo', color: '#6366f1', bg: '#312e81' },
  { name: 'Esmeralda', color: '#059669', bg: '#064e3b' },
  { name: 'Ámbar', color: '#d97706', bg: '#78350f' },
  { name: 'Turquesa', color: '#14b8a6', bg: '#134e4a' },
  { name: 'Coral', color: '#f43f5e', bg: '#881337' },
  { name: 'Púrpura', color: '#a855f7', bg: '#581c87' },
];

function getTeamMeta(index) {
  if (index < TEAM_COLORS.length) {
    return {
      name: `Equipo ${TEAM_COLORS[index].name}`,
      color: TEAM_COLORS[index].color,
      bg: TEAM_COLORS[index].bg,
    };
  }
  // Dynamic color generation using golden ratio hue progression for > 16 teams
  const hue = Math.round((index * 137.508) % 360);
  return {
    name: `Equipo ${index + 1}`,
    color: `hsl(${hue}, 75%, 48%)`,
    bg: `hsl(${hue}, 80%, 25%)`,
  };
}

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
      hostConnected: true,
      hostDisconnectedAt: null,
      state: GAME_STATES.LOBBY,
      players: new Map(),         // playerId -> { id, socketId, name, teamIndex, isManual, connected }
      socketToPlayerId: new Map(),// socketId -> playerId
      teams: [],                  // [{ name, color, bg, score, players: [] }]
      buzzQueue: [],              // [{ playerId, socketId, playerName, teamIndex, timestamp }]
      buzzedTeams: new Set(),    // teamIndex of teams that buzzed this round (max 1 buzz per team)
      blockedTeams: new Set(),    // teamIndex of teams blocked this round
      blockedPlayers: new Set(),  // playerId of players blocked this round
      currentJudging: null,       // The buzz entry currently being judged
      roundNumber: 0,
      playlist: [],               // Preloaded playlist URLs
      gameMode: 'teams',          // 'teams' | 'individual'
      maxPlayersPerTeam: 4,       // Configurable limit: 2, 3, 4, 5, 6, etc.
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

  addPlayer(roomCode, socketId, playerName, clientPlayerId = null) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    const trimmedName = playerName.trim();
    const pid = clientPlayerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Check if player is reconnecting with same playerId
    let existingPlayer = room.players.get(pid);

    // Or check by name if not found by id
    if (!existingPlayer) {
      for (const [, p] of room.players) {
        if (p.name.toLowerCase() === trimmedName.toLowerCase()) {
          existingPlayer = p;
          break;
        }
      }
    }

    if (existingPlayer) {
      // Rebind socket to existing player
      if (existingPlayer.socketId) {
        room.socketToPlayerId.delete(existingPlayer.socketId);
      }
      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;
      existingPlayer.lastSeen = Date.now();
      room.socketToPlayerId.set(socketId, existingPlayer.id);

      return { success: true, player: existingPlayer, reconnected: true };
    }

    // New player: allow joining in lobby or teams_assigned, or assign to smallest team if game active
    if (room.state !== GAME_STATES.LOBBY && room.state !== GAME_STATES.TEAMS_ASSIGNED) {
      if (room.teams && room.teams.length > 0) {
        let minTeam = 0;
        let minCount = Infinity;
        room.teams.forEach((t, idx) => {
          if (t.players.length < minCount) {
            minCount = t.players.length;
            minTeam = idx;
          }
        });
        const latePlayer = {
          id: pid,
          socketId,
          name: trimmedName,
          teamIndex: minTeam,
          isManual: false,
          connected: true,
          lastSeen: Date.now(),
        };
        room.players.set(pid, latePlayer);
        room.socketToPlayerId.set(socketId, pid);
        room.teams[minTeam].players.push(latePlayer);
        return { success: true, player: latePlayer, reconnected: false };
      }
    }

    const player = {
      id: pid,
      socketId,
      name: trimmedName,
      teamIndex: -1,
      isManual: false,
      connected: true,
      lastSeen: Date.now(),
    };

    room.players.set(pid, player);
    room.socketToPlayerId.set(socketId, pid);

    return { success: true, player, reconnected: false };
  }

  addManualPlayer(roomCode, playerName) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    const trimmedName = playerName.trim();
    if (!trimmedName) return { error: 'El nombre no puede estar vacío' };

    for (const [, p] of room.players) {
      if (p.name.toLowerCase() === trimmedName.toLowerCase()) {
        return { error: 'Ese nombre ya está en uso' };
      }
    }

    const manualId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const player = {
      id: manualId,
      socketId: null,
      name: trimmedName,
      teamIndex: -1,
      isManual: true,
      connected: true,
      lastSeen: Date.now(),
    };

    room.players.set(manualId, player);
    return { success: true, player };
  }

  removeManualPlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    const player = room.players.get(playerId);
    if (!player || !player.isManual) {
      return { error: 'Jugador no encontrado o no es manual' };
    }

    room.players.delete(playerId);

    // Remove from team if already assigned
    for (const team of room.teams) {
      team.players = team.players.filter(p => p.id !== playerId);
    }

    return { success: true };
  }

  reconnectPlayer(roomCode, playerId, newSocketId, playerName) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    let player = room.players.get(playerId);
    if (!player && playerName) {
      for (const [, p] of room.players) {
        if (p.name.toLowerCase() === playerName.toLowerCase()) {
          player = p;
          break;
        }
      }
    }

    if (!player) {
      return { error: 'Jugador no registrado en esta sala' };
    }

    // Clean up old socket mapping
    if (player.socketId) {
      room.socketToPlayerId.delete(player.socketId);
    }

    player.socketId = newSocketId;
    player.connected = true;
    player.lastSeen = Date.now();
    room.socketToPlayerId.set(newSocketId, player.id);

    return { success: true, player };
  }

  handleDisconnect(socketId) {
    for (const [code, room] of this.rooms) {
      if (room.hostSocketId === socketId) {
        room.hostConnected = false;
        room.hostDisconnectedAt = Date.now();
        // Give 30 minutes grace period before deleting room
        return { roomCode: code, wasHost: true };
      }

      const playerId = room.socketToPlayerId.get(socketId);
      if (playerId) {
        room.socketToPlayerId.delete(socketId);
        const player = room.players.get(playerId);
        if (player) {
          player.connected = false;
          player.lastSeen = Date.now();
        }
        return { roomCode: code, wasHost: false, playerId };
      }
    }
    return null;
  }

  getPlayerList(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      teamIndex: p.teamIndex,
      isManual: !!p.isManual,
      connected: p.isManual ? true : !!p.connected,
    }));
  }

  // ── Team Management ──────────────────────────────────────────
  // Rule: Strict maximum 4 players per team

  shuffleTeams(roomCode, requestedNumTeams = null) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const players = Array.from(room.players.values());
    if (players.length === 0) return [];

    // Fisher-Yates shuffle
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    // ── Mode 1: Individual (Every player is their own team) ──
    if (room.gameMode === 'individual') {
      room.teams = [];
      players.forEach((player, idx) => {
        const meta = getTeamMeta(idx);
        player.teamIndex = idx;
        room.teams.push({
          name: player.name,
          color: meta.color,
          bg: meta.bg,
          score: 0,
          players: [{
            id: player.id,
            name: player.name,
            isManual: !!player.isManual,
          }],
          isReady: false,
        });
      });

      room.state = GAME_STATES.TEAMS_ASSIGNED;
      return room.teams;
    }

    // ── Mode 2: Teams with configurable max per team ──
    const maxPerTeam = room.maxPlayersPerTeam || 4;
    const minTeamsRequired = Math.max(players.length > 1 ? 2 : 1, Math.ceil(players.length / maxPerTeam));
    let numTeams = requestedNumTeams ? Math.max(requestedNumTeams, minTeamsRequired) : minTeamsRequired;
    numTeams = Math.min(numTeams, players.length);

    // Initialize teams dynamically
    room.teams = [];
    for (let t = 0; t < numTeams; t++) {
      const meta = getTeamMeta(t);
      room.teams.push({
        name: meta.name,
        color: meta.color,
        bg: meta.bg,
        score: 0,
        players: [],
        isReady: false,
      });
    }

    // Distribute players round-robin so they are balanced and <= maxPerTeam per team
    players.forEach((player, idx) => {
      const teamIdx = idx % numTeams;
      player.teamIndex = teamIdx;
      room.teams[teamIdx].players.push({
        id: player.id,
        name: player.name,
        isManual: !!player.isManual,
      });
    });

    room.state = GAME_STATES.TEAMS_ASSIGNED;
    return room.teams;
  }

  setGameMode(roomCode, mode) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };
    room.gameMode = mode === 'individual' ? 'individual' : 'teams';

    // Auto-shuffle if players already exist and teams were initialized
    if (room.players.size > 0 && room.state !== GAME_STATES.LOBBY) {
      this.shuffleTeams(roomCode);
    }
    return { success: true, gameMode: room.gameMode, teams: room.teams };
  }

  setMaxPlayersPerTeam(roomCode, max) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };
    const parsed = parseInt(max, 10);
    room.maxPlayersPerTeam = (!isNaN(parsed) && parsed >= 2) ? parsed : 4;
    return { success: true, maxPlayersPerTeam: room.maxPlayersPerTeam };
  }

  movePlayerToTeam(roomCode, playerId, targetTeamIndex) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    const player = room.players.get(playerId);
    if (!player) return { error: 'Jugador no encontrado' };

    if (targetTeamIndex < 0 || targetTeamIndex >= room.teams.length) {
      return { error: 'Equipo de destino inválido' };
    }

    const targetTeam = room.teams[targetTeamIndex];
    const maxLimit = room.maxPlayersPerTeam || 4;

    if (targetTeam.players.length >= maxLimit) {
      return { error: `El equipo destino ya alcanzó el máximo de ${maxLimit} integrantes` };
    }

    // Remove from previous team
    if (player.teamIndex >= 0 && room.teams[player.teamIndex]) {
      room.teams[player.teamIndex].players = room.teams[player.teamIndex].players.filter(
        p => p.id !== playerId
      );
    }

    // Add to target team
    player.teamIndex = targetTeamIndex;
    targetTeam.players.push({
      id: player.id,
      name: player.name,
      isManual: !!player.isManual,
    });

    return { success: true, teams: room.teams, player };
  }

  renameTeam(roomCode, teamIndex, newName) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    const idx = Number(teamIndex);
    if (isNaN(idx) || idx < 0 || !room.teams || idx >= room.teams.length) {
      return { error: 'Equipo no encontrado' };
    }

    const trimmed = String(newName || '').trim();
    if (!trimmed) return { error: 'El nombre no puede estar vacío' };

    room.teams[idx].name = trimmed;
    const allTeamsReady = room.teams.length > 0 && room.teams.every(t => t.isReady);
    return { success: true, teams: room.teams, allTeamsReady };
  }

  setTeamReady(roomCode, teamIndex, isReady = true) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    const idx = Number(teamIndex);
    if (isNaN(idx) || idx < 0 || !room.teams || idx >= room.teams.length) {
      return { error: 'Equipo no encontrado' };
    }

    room.teams[idx].isReady = !!isReady;
    const allTeamsReady = room.teams.length > 0 && room.teams.every(t => t.isReady);
    return { success: true, teams: room.teams, allTeamsReady, teamIndex: idx };
  }

  setPlayerTeamReady(roomCode, playerIdOrSocketId, isReady = true) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.teams) return { error: 'Sala no encontrada' };

    let player = room.players.get(playerIdOrSocketId);
    if (!player) {
      const pid = room.socketToPlayerId.get(playerIdOrSocketId);
      if (pid) player = room.players.get(pid);
    }
    if (!player || player.teamIndex < 0 || !room.teams[player.teamIndex]) {
      return { error: 'Jugador no tiene equipo asignado' };
    }

    room.teams[player.teamIndex].isReady = !!isReady;
    const allTeamsReady = room.teams.length > 0 && room.teams.every(t => t.isReady);
    return { success: true, teamIndex: player.teamIndex, teams: room.teams, allTeamsReady };
  }

  // ── Round Management ─────────────────────────────────────────

  startRound(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    room.state = GAME_STATES.ROUND_ACTIVE;
    room.buzzQueue = [];
    room.buzzedTeams = new Set();
    room.blockedTeams.clear();
    room.blockedPlayers.clear();
    room.currentJudging = null;
    room.roundNumber++;
    room.roundStartTime = Date.now();

    return true;
  }

  enableBuzzers(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    room.state = GAME_STATES.ROUND_ACTIVE;
    room.roundStartTime = Date.now();
    return true;
  }

  // ── Buzzer Logic (Server-authoritative) ──────────────────────

  registerBuzz(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };

    if (room.state !== GAME_STATES.ROUND_ACTIVE && room.state !== GAME_STATES.BUZZER_LOCKED) {
      return { error: 'Buzzer no activo' };
    }

    const playerId = room.socketToPlayerId.get(socketId);
    const player = playerId ? room.players.get(playerId) : null;
    if (!player) return { error: 'Jugador no encontrado' };

    // Strict rule: Only one player per team can buzz in the round!
    if (room.buzzedTeams && room.buzzedTeams.has(player.teamIndex)) {
      return { error: 'Un compañero de tu equipo ya tocó el botón en esta ronda' };
    }

    // Check if player already buzzed
    if (room.buzzQueue.some(b => b.playerId === player.id)) {
      return { error: 'Ya tocaste el buzzer' };
    }

    // Check if another member of the same team already has a spot in the queue
    if (room.buzzQueue.some(b => b.teamIndex === player.teamIndex)) {
      return { error: 'Tu equipo ya tiene un lugar en la fila' };
    }

    // Check if player's team is blocked
    if (room.blockedTeams.has(player.teamIndex)) {
      return { error: 'Tu equipo está bloqueado esta ronda' };
    }

    // Check if player individually is blocked
    if (room.blockedPlayers.has(player.id)) {
      return { error: 'Estás bloqueado esta ronda' };
    }

    const buzzTime = Date.now();
    const elapsedSeconds = Math.max(
      0.1,
      Number(((buzzTime - (room.roundStartTime || buzzTime)) / 1000).toFixed(1))
    );

    // Continuous decimal speed scoring:
    // Starts at 5.0 pts for instant reaction (0.1s) and scales down smoothly by ~0.33 pts/sec to 1.0 pt at 12s.
    // Minimum 1.0 pt after 12s.
    const rawPoints = Math.max(1.0, 5.0 - (elapsedSeconds / 12.0) * 4.0);
    const suggestedPoints = Number(rawPoints.toFixed(1));

    const buzzEntry = {
      playerId: player.id,
      socketId,
      playerName: player.name,
      teamIndex: player.teamIndex,
      teamName: room.teams[player.teamIndex]?.name || 'Sin equipo',
      teamColor: room.teams[player.teamIndex]?.color || '#888',
      timestamp: buzzTime,
      position: room.buzzQueue.length + 1,
      elapsedSeconds,
      suggestedPoints,
    };

    room.buzzQueue.push(buzzEntry);
    if (!room.buzzedTeams) room.buzzedTeams = new Set();
    room.buzzedTeams.add(player.teamIndex);

    // First buzz: lock buzzer and move to judging
    if (room.buzzQueue.length === 1) {
      room.state = GAME_STATES.BUZZER_LOCKED;
      room.currentJudging = buzzEntry;
    }

    return { success: true, buzzEntry, isFirst: room.buzzQueue.length === 1 };
  }

  // ── Judge Actions ────────────────────────────────────────────

  judgeCorrect(roomCode, points = null) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (!room.currentJudging && room.buzzQueue.length > 0) {
      room.currentJudging = room.buzzQueue[0];
    }
    if (!room.currentJudging) return null;

    const { teamIndex, playerName, teamName, elapsedSeconds, suggestedPoints } = room.currentJudging;
    const finalPoints = Number(Number(points !== null && points !== undefined ? points : (suggestedPoints || 1)).toFixed(1));

    if (room.teams[teamIndex]) {
      room.teams[teamIndex].score = Number(((room.teams[teamIndex].score || 0) + finalPoints).toFixed(1));
    }

    room.state = GAME_STATES.ROUND_END;
    room.currentJudging = null;
    room.buzzQueue = [];

    return {
      playerName,
      teamName,
      teamIndex,
      teamColor: room.teams[teamIndex]?.color,
      pointsAwarded: finalPoints,
      elapsedSeconds: elapsedSeconds || 0,
      scores: room.teams.map(t => ({ name: t.name, color: t.color, score: t.score })),
    };
  }

  renameTeam(roomCode, teamIndex, newName) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Sala no encontrada' };
    const trimmed = (newName || '').trim();
    if (!trimmed) return { error: 'El nombre no puede estar vacío' };
    if (!room.teams[teamIndex]) return { error: 'Equipo no encontrado' };

    room.teams[teamIndex].name = trimmed;
    return { success: true, teams: room.teams };
  }

  judgeIncorrect(roomCode, penaltyPoints = 1) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (!room.currentJudging && room.buzzQueue.length > 0) {
      room.currentJudging = room.buzzQueue[0];
    }
    if (!room.currentJudging) return null;

    const blocked = room.currentJudging;
    const penalty = Number(Number(penaltyPoints !== undefined && penaltyPoints !== null ? penaltyPoints : 1).toFixed(1));

    // Deduct points from team — can go negative if they don't have enough points
    if (room.teams[blocked.teamIndex]) {
      room.teams[blocked.teamIndex].score = Number(
        ((room.teams[blocked.teamIndex].score || 0) - penalty).toFixed(1)
      );
    }

    room.blockedTeams.add(blocked.teamIndex);
    room.blockedPlayers.add(blocked.playerId);

    // Remove blocked player and any other player whose team is now blocked from the queue
    room.buzzQueue = room.buzzQueue.filter(
      b => b.playerId !== blocked.playerId && !room.blockedTeams.has(b.teamIndex)
    );

    // Re-index queue positions
    room.buzzQueue.forEach((b, idx) => {
      b.position = idx + 1;
    });

    const sharedScores = room.teams.map(t => ({ name: t.name, color: t.color, score: t.score }));

    if (room.buzzQueue.length > 0) {
      const nextBuzz = room.buzzQueue[0];
      room.currentJudging = nextBuzz;
      room.state = GAME_STATES.BUZZER_LOCKED;
      return {
        blocked: { playerName: blocked.playerName, teamName: blocked.teamName, teamIndex: blocked.teamIndex },
        pointsDeducted: penalty,
        scores: sharedScores,
        nextUp: nextBuzz,
        buzzQueue: room.buzzQueue,
        allBlocked: false,
      };
    }

    const allTeamsBlocked = room.teams.length > 0 && room.teams.every((_, idx) => room.blockedTeams.has(idx));
    if (allTeamsBlocked) {
      room.state = GAME_STATES.ROUND_END;
      room.currentJudging = null;
      return {
        blocked: { playerName: blocked.playerName, teamName: blocked.teamName, teamIndex: blocked.teamIndex },
        pointsDeducted: penalty,
        scores: sharedScores,
        nextUp: null,
        buzzQueue: [],
        allBlocked: true,
      };
    }

    room.state = GAME_STATES.ROUND_ACTIVE;
    room.currentJudging = null;

    return {
      blocked: { playerName: blocked.playerName, teamName: blocked.teamName, teamIndex: blocked.teamIndex },
      pointsDeducted: penalty,
      scores: sharedScores,
      nextUp: null,
      buzzQueue: [],
      allBlocked: false,
      reopened: true,
    };
  }

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

    const allTeamsReady = room.teams.length > 0 && room.teams.every(t => t.isReady);

    return {
      code: room.code,
      state: room.state,
      players: this.getPlayerList(roomCode),
      teams: room.teams.map(t => ({
        name: t.name,
        color: t.color,
        bg: t.bg,
        score: t.score,
        players: t.players,
        isReady: !!t.isReady,
      })),
      allTeamsReady,
      buzzQueue: room.buzzQueue,
      currentJudging: room.currentJudging,
      blockedTeams: Array.from(room.blockedTeams),
      roundNumber: room.roundNumber,
      gameMode: room.gameMode || 'teams',
      maxPlayersPerTeam: room.maxPlayersPerTeam || 4,
    };
  }

  getPlayerState(roomCode, socketIdOrPlayerId, cachedTeams = null) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    // Check if passed playerId or socketId
    let player = room.players.get(socketIdOrPlayerId);
    if (!player) {
      const pid = room.socketToPlayerId.get(socketIdOrPlayerId);
      if (pid) player = room.players.get(pid);
    }
    if (!player) return null;

    const team = room.teams[player.teamIndex];
    const isTeamInQueue = room.buzzQueue.some(b => b.teamIndex === player.teamIndex);
    const hasTeamBuzzed = (room.buzzedTeams ? room.buzzedTeams.has(player.teamIndex) : false) || isTeamInQueue;
    const hasBuzzed = room.buzzQueue.some(b => b.playerId === player.id);
    const isTeamBlocked = room.blockedTeams.has(player.teamIndex);
    const isPlayerBlocked = room.blockedPlayers.has(player.id);
    const allTeamsReady = room.teams.length > 0 && room.teams.every(t => t.isReady);
    const myQueueEntry = room.buzzQueue.find(b => b.teamIndex === player.teamIndex);

    return {
      id: player.id,
      name: player.name,
      teamIndex: player.teamIndex,
      teamName: team?.name || null,
      teamColor: team?.color || null,
      teamBg: team?.bg || null,
      isTeamReady: team ? !!team.isReady : false,
      allTeamsReady,
      gameMode: room.gameMode || 'teams',
      gameState: room.state,
      canBuzz:
        (room.state === GAME_STATES.ROUND_ACTIVE || room.state === GAME_STATES.BUZZER_LOCKED) &&
        !hasTeamBuzzed &&
        !hasBuzzed &&
        !isTeamBlocked &&
        !isPlayerBlocked,
      hasBuzzed,
      hasTeamBuzzed,
      teamBuzzedPlayerName: myQueueEntry?.playerName || null,
      isTeamBlocked,
      isPlayerBlocked,
      buzzPosition: myQueueEntry?.position || null,
      currentJudging: room.currentJudging,
      isMyTurn: room.currentJudging?.playerId === player.id,
      roundNumber: room.roundNumber,
      teams: cachedTeams || room.teams.map(t => ({
        name: t.name,
        color: t.color,
        bg: t.bg,
        score: t.score,
        isReady: !!t.isReady,
        players: t.players.map(p => ({ name: p.name, id: p.id, isManual: !!p.isManual })),
      })),
    };
  }
}

export { GameManager, GAME_STATES, TEAM_COLORS };
