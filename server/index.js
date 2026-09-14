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
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GameManager, GAME_STATES, TEAM_COLORS } from './gameManager.js';
import YouTube from 'youtube-sr';
import { Innertube, Log } from 'youtubei.js';
import { selectDjSongCandidates } from './djCatalog.js';
import gamesRepository from './gamesRepository.js';

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

// Auto-load server/.env if available
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  }
} catch {
  // Ignore if unable to load .env
}

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

// In-memory rate limiting for memory unlock code attempts
const unlockAttempts = new Map(); // ip -> { count, resetAt }

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

// Secure endpoint to unlock private Alma 24th Birthday Memory Theme
app.post('/api/verify-memory-code', (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  // Rate limit: max 5 attempts per 15 minutes per IP
  const userRate = unlockAttempts.get(clientIp);
  if (userRate && now < userRate.resetAt && userRate.count >= 5) {
    const minutesLeft = Math.ceil((userRate.resetAt - now) / 60000);
    return res.status(429).json({
      success: false,
      error: `Demasiados intentos fallidos. Por favor, esperá ${minutesLeft} minuto(s) antes de reintentar.`
    });
  }

  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Código no proporcionado' });
  }

  const normalizedInput = code.trim().toLowerCase();
  const normalizedTarget = (process.env.ALMA_SECRET_CODE || 'cumple24alma').trim().toLowerCase();

  // Constant-time comparison using SHA-256 digests to prevent timing attacks
  const inputHash = crypto.createHash('sha256').update(normalizedInput).digest();
  const targetHash = crypto.createHash('sha256').update(normalizedTarget).digest();

  const isMatch = crypto.timingSafeEqual(inputHash, targetHash);

  if (!isMatch) {
    const attempts = userRate && now < userRate.resetAt ? userRate.count + 1 : 1;
    unlockAttempts.set(clientIp, {
      count: attempts,
      resetAt: userRate && now < userRate.resetAt ? userRate.resetAt : now + 15 * 60 * 1000
    });
    return res.status(401).json({
      success: false,
      error: 'Código incorrecto. Verificá los caracteres e intentá nuevamente.'
    });
  }

  // Clear failed attempt tracking on success
  unlockAttempts.delete(clientIp);

  // Generate a tamper-evident session token
  const token = crypto.createHmac('sha256', normalizedTarget).update(`alma_unlocked_${now}`).digest('hex');

  return res.json({
    success: true,
    theme: 'alma',
    token,
    unlockedAt: now,
    message: 'Modo Recuerdo desbloqueado exitosamente'
  });
});

// ═══════════════════════════════════════════════════════════════
// Community Library & Public Saved Games API
// ═══════════════════════════════════════════════════════════════

// List & search public games
app.get('/api/games/public', async (req, res) => {
  try {
    const { q, genre, mode, sort, limit, offset } = req.query;
    const result = await gamesRepository.listPublicGames({
      query: q,
      genre,
      mode,
      sort,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[API] Error listing public games:', err);
    return res.status(500).json({ success: false, error: 'Error al consultar la biblioteca pública' });
  }
});

// Get game details by ID (including tracks to clone / play)
app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await gamesRepository.getGameById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Partida no encontrada' });
    }
    return res.json({ success: true, game });
  } catch (err) {
    console.error('[API] Error getting game by id:', err);
    return res.status(500).json({ success: false, error: 'Error al obtener la partida' });
  }
});

// Create & publish a game
app.post('/api/games', async (req, res) => {
  try {
    const { title, description, creatorName, isPublic, gameMode, tracks, genre } = req.body || {};
    if (!title || !tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El título y al menos una canción son obligatorios para guardar la partida'
      });
    }

    const newGame = await gamesRepository.createGame({
      title,
      description,
      creatorName,
      isPublic: Boolean(isPublic),
      gameMode,
      tracks,
      genre
    });

    console.log(`[API] Nueva partida creada: "${newGame.title}" (${newGame.isPublic ? 'PÚBLICA' : 'PRIVADA'}) con ${newGame.tracks.length} canciones`);
    return res.status(201).json({ success: true, game: newGame });
  } catch (err) {
    console.error('[API] Error creating game:', err);
    return res.status(400).json({ success: false, error: err.message || 'Error al guardar la partida' });
  }
});

// Record a play / launch of a game
app.post('/api/games/:id/play', async (req, res) => {
  try {
    const count = await gamesRepository.incrementPlayCount(req.params.id);
    return res.json({ success: true, playCount: count });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error actualizando contador' });
  }
});

// Update a saved game
app.put('/api/games/:id', async (req, res) => {
  try {
    const updated = await gamesRepository.updateGame(req.params.id, req.body || {});
    return res.json({ success: true, game: updated });
  } catch (err) {
    console.error('[API] Error updating game:', err);
    return res.status(400).json({ success: false, error: err.message || 'Error al actualizar la partida' });
  }
});

// Delete a saved game
app.delete('/api/games/:id', async (req, res) => {
  try {
    const deleted = await gamesRepository.deleteGame(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Partida no encontrada o ya eliminada' });
    }
    return res.json({ success: true, message: 'Partida eliminada' });
  } catch (err) {
    console.error('[API] Error deleting game:', err);
    return res.status(500).json({ success: false, error: 'Error al eliminar la partida' });
  }
});

// Fetch batch games by IDs (e.g. for "My Games" tab)
app.post('/api/games/batch', async (req, res) => {
  try {
    const { ids } = req.body || {};
    const games = await gamesRepository.getGamesByIds(ids || []);
    return res.json({ success: true, games });
  } catch (err) {
    console.error('[API] Error fetching batch games:', err);
    return res.status(500).json({ success: false, error: 'Error al consultar partidas' });
  }
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

// Interactive song search endpoint (Fast YouTube suggestions with thumbnails, duration, and embeddability check)
app.get('/api/search-songs', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.json({ success: true, results: [] });
    }

    console.log(`[Search] Buscando canciones: "${query}"`);
    const yt = await getInnertube();
    const searchRes = await yt.search(query, { type: 'video' });
    const videos = searchRes.videos || [];

    const candidates = [];
    for (const v of videos.slice(0, 15)) {
      const id = v.id || v.content_id;
      const title = v.title?.text || v.title?.toString() || v.metadata?.title?.text;
      const author = v.author?.name || v.author?.toString() || '';
      const duration = v.duration?.text || '';
      const thumbnail = v.thumbnails?.[0]?.url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);

      if (id && title) {
        candidates.push({
          id: String(id).trim(),
          title: title.trim(),
          author: author.trim(),
          duration: duration.trim(),
          thumbnail,
          url: `https://www.youtube.com/watch?v=${id}`,
        });
      }
    }

    // Pre-verify candidates in parallel (filter out videos where embedding is disabled by copyright owner)
    const verifiedResults = await Promise.all(
      candidates.slice(0, 12).map(async (item) => {
        const check = await checkYoutubeVideoAvailability(item.id);
        if (check && check.available) {
          return {
            ...item,
            verified: true,
          };
        }
        return null;
      })
    );

    const results = verifiedResults.filter(Boolean);
    res.json({ success: true, results, count: results.length });
  } catch (err) {
    console.error('[Search] Error buscando canciones:', err);
    res.status(500).json({ error: 'Error al buscar canciones' });
  }
});

// ═══════════════════════════════════════════════════════════════
// Video Availability & Embeddability Verification
// ═══════════════════════════════════════════════════════════════
async function checkYoutubeVideoAvailability(rawIdOrUrl) {
  if (!rawIdOrUrl) return { available: false, reason: 'EMPTY_INPUT' };
  const str = String(rawIdOrUrl).trim();
  const match = str.match(/(?:v=|youtu\.be\/|embed\/|^)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
  const id = match ? match[1] : (str.length === 11 ? str : null);

  if (!id || id.length !== 11) {
    return { available: false, id, reason: 'INVALID_ID' };
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(4000)
    }).catch(() => null);

    if (!res || !res.ok) {
      return {
        available: false,
        id,
        reason: 'NOT_FOUND_OR_RESTRICTED',
        status: res ? res.status : 0
      };
    }

    const data = await res.json().catch(() => null);

    // Deep embeddability check via Innertube if available
    let isEmbeddable = true;
    try {
      const yt = await getInnertube();
      const info = await yt.getBasicInfo(id).catch(() => null);
      if (info?.playability_status) {
        if (info.playability_status.embeddable === false || (info.playability_status.status && info.playability_status.status !== 'OK')) {
          isEmbeddable = false;
        }
      }
    } catch {
      // If Innertube check fails, fallback to oEmbed response
    }

    if (!isEmbeddable) {
      return {
        available: false,
        id,
        reason: 'EMBEDDING_DISABLED',
        title: data?.title || null
      };
    }

    return {
      available: true,
      id,
      title: data?.title || null,
      author: data?.author_name || null
    };
  } catch (err) {
    return { available: false, id, reason: 'VERIFY_ERROR', error: err.message };
  }
}

app.get('/api/check-video', async (req, res) => {
  try {
    const target = req.query.id || req.query.url;
    const result = await checkYoutubeVideoAvailability(target);
    res.json(result);
  } catch (err) {
    console.error('[CheckVideo] Error:', err);
    res.status(500).json({ available: false, error: 'Error verificando video' });
  }
});

app.post('/api/check-videos', async (req, res) => {
  try {
    const { items = [] } = req.body;
    const list = Array.isArray(items) ? items.slice(0, 50) : [];
    const results = {};

    await Promise.all(
      list.map(async (item) => {
        const idOrUrl = typeof item === 'object' ? item.id || item.url : item;
        const resCheck = await checkYoutubeVideoAvailability(idOrUrl);
        const key = resCheck.id || String(idOrUrl);
        results[key] = resCheck;
      })
    );

    res.json({ success: true, results });
  } catch (err) {
    console.error('[CheckVideos] Error:', err);
    res.status(500).json({ error: 'Error verificando videos' });
  }
});


// DJ Bot automatic playlist generator
app.post('/api/dj-bot-generate', async (req, res) => {
  try {
    const { genre = 'all', decade = 'all', language = 'all', count = 15, excludeTitles = [] } = req.body;
    const requestedCount = Math.min(30, Math.max(1, parseInt(count, 10) || 15));
    console.log(
      `[DJ Bot] Generando playlist: género=${genre}, década=${decade}, idioma=${language}, cantidad=${requestedCount}, excluidas=${Array.isArray(excludeTitles) ? excludeTitles.length : 0}`
    );

    const candidates = selectDjSongCandidates({
      genre,
      decade,
      language,
      count: requestedCount,
      excludeTitles,
    });
    const yt = await getInnertube();

    const playlist = [];
    const chunkSize = 4;
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (c) => {
          const searchRes = await yt.search(c.q, { type: 'video' });
          const first = searchRes.videos?.[0];
          if (first) {
            const id = first.id || first.content_id;
            const title = first.title?.text || first.title?.toString() || c.title;
            const author = first.author?.name || first.author?.toString() || c.artist;
            const duration = first.duration?.text || '';
            const thumbnail = first.thumbnails?.[0]?.url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);
            return {
              type: 'youtube',
              id,
              name: `${c.artist} - ${c.title}`,
              displayTitle: title,
              author,
              duration,
              thumbnail,
              url: `https://www.youtube.com/watch?v=${id}`,
            };
          }
          return null;
        })
      );

      for (const r of chunkResults) {
        if (r.status === 'fulfilled' && r.value) {
          playlist.push(r.value);
        }
      }
    }

    console.log(`[DJ Bot] Playlist generada con éxito: ${playlist.length} canciones.`);
    res.json({ success: true, count: playlist.length, playlist });
  } catch (err) {
    console.error('[DJ Bot] Error generando playlist:', err);
    res.status(500).json({ error: 'Error al generar playlist con DJ Bot' });
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

    console.log(`[Teams] Shuffled in room ${roomCode} (${teams.length} teams)`);
    callback?.({ success: true, teams: roomState.teams });
  });

  // ── HOST: Set Game Mode ('teams' vs 'individual') ──────────
  socket.on('set-game-mode', ({ roomCode, gameMode, mode }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const targetMode = gameMode || mode;
    const res = gm.setGameMode(code, targetMode);
    if (res.error) return callback?.({ error: res.error });

    const roomState = gm.getRoomState(code);
    io.to(code).emit('room-mode-updated', {
      gameMode: roomState.gameMode,
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });

    // Notify each player of their updated status/mode
    const room = gm.getRoom(code);
    if (room) {
      for (const [, player] of room.players) {
        if (player.socketId) {
          const playerState = gm.getPlayerState(code, player.id);
          io.to(player.socketId).emit('your-team', playerState);
        }
      }
    }

    broadcastPlayerStates(code);
    console.log(`[Mode] Room ${code} switched to ${roomState.gameMode} mode`);
    callback?.({ success: true, gameMode: roomState.gameMode, teams: roomState.teams });
  });

  // ── HOST: Set Team Size Limit (e.g. 1, 2, 3, 4, 5, 6, 8, 10... or 0 for unlimited) ──
  socket.on('set-team-size', ({ roomCode, maxPlayersPerTeam }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const res = gm.setMaxPlayersPerTeam(code, maxPlayersPerTeam);
    if (res.error) return callback?.({ error: res.error });

    const room = gm.getRoom(code);
    if (room && room.state === 'TEAMS_ASSIGNED' && room.gameMode === 'teams' && room.teamSelectionMode === 'auto') {
      gm.shuffleTeams(code);
    }

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    io.to(code).emit('team-size-updated', { maxPlayersPerTeam: res.maxPlayersPerTeam });
    broadcastPlayerStates(code);
    console.log(`[TeamSize] Room ${code} limit set to ${res.maxPlayersPerTeam} per team`);
    callback?.({ success: true, maxPlayersPerTeam: res.maxPlayersPerTeam, teams: roomState.teams });
  });

  // ── HOST: Set Team Selection Mode ('auto' vs 'manual') ──────
  socket.on('set-team-selection-mode', ({ roomCode, mode }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const res = gm.setTeamSelectionMode(code, mode);
    if (res.error) return callback?.({ error: res.error });

    const roomState = gm.getRoomState(code);
    io.to(code).emit('team-selection-mode-updated', {
      teamSelectionMode: roomState.teamSelectionMode,
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    io.to(code).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    broadcastPlayerStates(code);
    console.log(`[Mode] Room ${code} team selection mode set to ${roomState.teamSelectionMode}`);
    callback?.({ success: true, teamSelectionMode: roomState.teamSelectionMode, teams: roomState.teams });
  });

  // ── HOST: Initialize Manual Teams ───────────────────────────
  socket.on('init-manual-teams', ({ roomCode, count }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const res = gm.initManualTeams(code, count);
    if (res.error) return callback?.({ error: res.error });

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    broadcastPlayerStates(code);
    console.log(`[Teams] Initialized ${count} manual teams in room ${code}`);
    callback?.({ success: true, teams: roomState.teams });
  });

  // ── HOST: Add a Single Manual Team ───────────────────────────
  socket.on('add-manual-team', ({ roomCode, teamName }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const res = gm.addManualTeam(code, teamName);
    if (res.error) return callback?.({ error: res.error });

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    broadcastPlayerStates(code);
    console.log(`[Teams] Added team "${res.newTeam?.name}" in room ${code} (total: ${roomState.teams.length})`);
    callback?.({ success: true, teams: roomState.teams, newTeam: res.newTeam });
  });

  // ── HOST: Remove a Manual Team ───────────────────────────────
  socket.on('remove-manual-team', ({ roomCode, teamIndex }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const res = gm.removeManualTeam(code, teamIndex);
    if (res.error) return callback?.({ error: res.error });

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    broadcastPlayerStates(code);
    console.log(`[Teams] Removed team ${teamIndex} in room ${code} (remaining: ${roomState.teams.length})`);
    callback?.({ success: true, teams: roomState.teams });
  });

  // ── PLAYER / HOST: Choose Team Directly (Manual Mode) ───────
  socket.on('player-choose-team', ({ roomCode, playerId, teamIndex }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const room = gm.getRoom(code);
    if (!room) return callback?.({ error: 'Sala no encontrada' });

    let pid = playerId;
    if (!pid) {
      pid = room.socketToPlayerId.get(socket.id);
    }
    if (!pid) return callback?.({ error: 'Jugador no identificado' });

    const res = gm.movePlayerToTeam(code, pid, teamIndex);
    if (res.error) return callback?.({ error: res.error });

    const roomState = gm.getRoomState(code);
    io.to(code).emit('teams-assigned', {
      teams: roomState.teams,
      allTeamsReady: roomState.allTeamsReady,
    });
    broadcastPlayerStates(code);
    console.log(`[Teams] Player ${pid} chose team ${teamIndex} in room ${code}`);
    callback?.({ success: true, teams: roomState.teams });
  });

  // ── HOST: Set Auto-Host (Todos Juegan) ───────────────────────
  socket.on('set-auto-host', ({ roomCode, enabled }, callback) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const res = gm.setAutoHost(code, enabled);
    if (res.error) return callback?.({ error: res.error });

    io.to(code).emit('auto-host-updated', { autoHostEnabled: res.autoHostEnabled });
    broadcastPlayerStates(code);
    console.log(`[AutoHost] Room ${code} auto-host set to ${res.autoHostEnabled}`);
    callback?.({ success: true, autoHostEnabled: res.autoHostEnabled });
  });

  // ── HOST: Start Game (Transition from Lobby to Game) ────────
  const handleStartGame = ({ roomCode }, callback) => {
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
  };
  socket.on('host-start-game', handleStartGame);
  socket.on('start-game', handleStartGame);

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
