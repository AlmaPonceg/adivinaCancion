// ═══════════════════════════════════════════════════════════════
// Analytics & Telemetry Manager — Real-time Server & Game Monitor
// ═══════════════════════════════════════════════════════════════

import os from 'os';

class AnalyticsManager {
  constructor() {
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.requestTimestamps = []; // Rolling buffer of timestamps in the last 60 seconds
    this.events = []; // Capped audit event log
    this.maxEvents = 120;
    
    // Track unique player sessions: playerId -> { id, name, joinsCount, firstSeen, lastSeen }
    this.playerProfiles = new Map();

    // Sockets telemetry
    this.totalSocketConnections = 0;
    this.totalBuzzerHits = 0;
    this.totalRoomsCreated = 0;
  }

  /**
   * Express middleware to log and count incoming HTTP requests
   */
  requestTracker() {
    return (req, res, next) => {
      this.totalRequests++;
      const now = Date.now();
      this.requestTimestamps.push(now);

      // Clean up timestamps older than 60s
      const cutoff = now - 60000;
      while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] < cutoff) {
        this.requestTimestamps.shift();
      }

      next();
    };
  }

  /**
   * Record a system, room, player, or moderation audit event
   */
  recordEvent({ type = 'INFO', category = 'SYSTEM', message = '', meta = null }) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type, // 'INFO' | 'SUCCESS' | 'WARN' | 'DANGER'
      category, // 'SYSTEM' | 'ROOM' | 'PLAYER' | 'GAME' | 'MOD'
      message,
      meta,
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    return event;
  }

  /**
   * Register player activity to track unique player gamer profiles
   */
  registerPlayerJoin(playerId, playerName, roomCode) {
    if (!playerId) return;
    const now = new Date().toISOString();
    const existing = this.playerProfiles.get(playerId);

    if (existing) {
      existing.name = playerName || existing.name;
      existing.joinsCount = (existing.joinsCount || 1) + 1;
      existing.lastSeen = now;
      existing.lastRoom = roomCode;
    } else {
      this.playerProfiles.set(playerId, {
        id: playerId,
        name: playerName || 'Jugador Anónimo',
        joinsCount: 1,
        firstSeen: now,
        lastSeen: now,
        lastRoom: roomCode,
      });
    }

    this.recordEvent({
      type: 'INFO',
      category: 'PLAYER',
      message: `Jugador "${playerName}" ingresó a la sala ${roomCode}`,
      meta: { playerId, roomCode },
    });
  }

  /**
   * Register room creation
   */
  registerRoomCreated(roomCode, hostSocketId) {
    this.totalRoomsCreated++;
    this.recordEvent({
      type: 'SUCCESS',
      category: 'ROOM',
      message: `Sala creada con código [${roomCode}]`,
      meta: { roomCode, hostSocketId },
    });
  }

  /**
   * Register game launch
   */
  registerGamePlay(gameId, gameTitle, playCount) {
    this.recordEvent({
      type: 'SUCCESS',
      category: 'GAME',
      message: `Partida iniciada: "${gameTitle}" (Jugadas reales: ${playCount})`,
      meta: { gameId, playCount },
    });
  }

  /**
   * Register buzzer hit
   */
  registerBuzzerHit(playerName, roomCode, teamName) {
    this.totalBuzzerHits++;
    this.recordEvent({
      type: 'INFO',
      category: 'GAME',
      message: `Pulsador activado por "${playerName}" en sala ${roomCode} (${teamName})`,
      meta: { playerName, roomCode, teamName },
    });
  }

  /**
   * Register moderation action
   */
  registerModAction(action, target, details = '') {
    this.recordEvent({
      type: 'WARN',
      category: 'MOD',
      message: `Acción de moderador: ${action} sobre "${target}" ${details ? `(${details})` : ''}`,
      meta: { action, target, details },
    });
  }

  /**
   * Calculate current requests per minute
   */
  getRequestsPerMinute() {
    const now = Date.now();
    const cutoff = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t >= cutoff);
    return this.requestTimestamps.length;
  }

  /**
   * Generate comprehensive telemetry and statistics for the Moderator Panel
   */
  async getDashboardData(io, gm, gamesRepository) {
    const allGames = await gamesRepository.listAllGames();

    // 1. Live Rooms & Sockets Telemetry
    const activeSocketsCount = io?.engine?.clientsCount || 0;
    const roomsList = [];
    let totalPlayersConnected = 0;

    if (gm && gm.rooms) {
      for (const [code, room] of gm.rooms.entries()) {
        const players = Array.from(room.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          connected: p.connected !== false,
          teamIndex: p.teamIndex,
        }));

        totalPlayersConnected += players.filter((p) => p.connected).length;

        roomsList.push({
          code,
          state: room.state,
          gameMode: room.gameMode || 'teams',
          playersCount: players.length,
          connectedCount: players.filter((p) => p.connected).length,
          players,
          hostConnected: room.hostConnected,
          roundNumber: room.roundNumber || 0,
          playlistLength: room.playlist?.length || 0,
        });
      }
    }

    // 2. Games & Catalog Aggregates
    const totalGames = allGames.length;
    const publicGames = allGames.filter((g) => g.isPublic);
    const privateGames = allGames.filter((g) => !g.isPublic);
    const totalRealPlays = allGames.reduce((acc, g) => acc + (Number(g.playCount) || 0), 0);
    const totalCatalogTracks = allGames.reduce((acc, g) => acc + (Array.isArray(g.tracks) ? g.tracks.length : 0), 0);

    // Genre Distribution
    const genreMap = {};
    for (const g of allGames) {
      const genre = g.genre || 'General';
      genreMap[genre] = (genreMap[genre] || 0) + 1;
    }
    const genres = Object.entries(genreMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Game Mode Distribution
    const modeMap = { auto: 0, manual: 0, individual: 0, autohost: 0 };
    for (const g of allGames) {
      const m = g.gameMode || 'auto';
      modeMap[m] = (modeMap[m] || 0) + 1;
    }

    // 3. Creator Profiles (Grouped from games catalog)
    const creatorMap = new Map();
    for (const g of allGames) {
      const creator = (g.creatorName || 'Anónimo').trim();
      const existing = creatorMap.get(creator) || {
        name: creator,
        totalGames: 0,
        publicGames: 0,
        privateGames: 0,
        totalPlays: 0,
        totalTracks: 0,
        latestCreatedAt: g.createdAt,
      };

      existing.totalGames += 1;
      if (g.isPublic) existing.publicGames += 1;
      else existing.privateGames += 1;
      existing.totalPlays += Number(g.playCount) || 0;
      existing.totalTracks += Array.isArray(g.tracks) ? g.tracks.length : 0;
      if (new Date(g.createdAt) > new Date(existing.latestCreatedAt)) {
        existing.latestCreatedAt = g.createdAt;
      }
      creatorMap.set(creator, existing);
    }
    const creatorProfiles = Array.from(creatorMap.values()).sort((a, b) => b.totalPlays - a.totalPlays || b.totalGames - a.totalGames);

    // 4. Player Profiles
    const playerProfilesList = Array.from(this.playerProfiles.values())
      .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
      .slice(0, 50);

    // 5. System Health & Telemetry
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());

    const systemInfo = {
      uptimeSec,
      uptimeFormatted: this.formatUptime(uptimeSec),
      memoryRssMb: Math.round((memory.rss / (1024 * 1024)) * 10) / 10,
      memoryHeapTotalMb: Math.round((memory.heapTotal / (1024 * 1024)) * 10) / 10,
      memoryHeapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 10) / 10,
      memoryPercent: Math.round((memory.heapUsed / memory.heapTotal) * 100),
      nodeVersion: process.version,
      platform: `${os.type()} ${os.arch()}`,
      cpuCores: os.cpus().length,
      serverStartTime: new Date(this.startTime).toISOString(),
    };

    return {
      success: true,
      timestamp: new Date().toISOString(),
      traffic: {
        activeSockets: activeSocketsCount,
        requestsPerMinute: this.getRequestsPerMinute(),
        totalRequests: this.totalRequests,
        totalSocketConnections: this.totalSocketConnections,
        totalBuzzerHits: this.totalBuzzerHits,
        totalRoomsCreated: this.totalRoomsCreated,
      },
      liveRooms: {
        activeCount: roomsList.length,
        totalPlayersConnected,
        rooms: roomsList,
      },
      catalog: {
        totalGames,
        publicCount: publicGames.length,
        privateCount: privateGames.length,
        totalRealPlays,
        totalCatalogTracks,
        genres,
        modes: modeMap,
        games: allGames.map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          creatorName: g.creatorName,
          genre: g.genre || 'General',
          isPublic: g.isPublic,
          gameMode: g.gameMode || 'auto',
          trackCount: Array.isArray(g.tracks) ? g.tracks.length : 0,
          playCount: g.playCount || 0,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt || g.createdAt,
        })),
      },
      profiles: {
        totalCreators: creatorProfiles.length,
        creators: creatorProfiles,
        totalPlayerSessions: this.playerProfiles.size,
        players: playerProfilesList,
      },
      events: this.events.slice(0, 50),
      system: systemInfo,
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  clearEvents() {
    this.events = [];
    return true;
  }
}

export const analyticsManager = new AnalyticsManager();
export default analyticsManager;
