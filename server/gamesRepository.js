import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'publicGames.json');

// Curated Initial Community Seed Games
const INITIAL_COMMUNITY_GAMES = [
  {
    id: 'pack-rock-nacional',
    title: 'Rock Nacional Clásico',
    description: 'Los himnos indiscutidos del rock argentino que todo el mundo sabe de memoria.',
    genre: 'Rock Argentino',
    creatorName: 'Comunidad Trivia',
    isPublic: true,
    gameMode: 'auto',
    playCount: 142,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    tracks: [
      { id: 'pre_rn_1', title: 'De Música Ligera', artist: 'Soda Stereo', type: 'youtube', url: 'https://www.youtube.com/watch?v=OX-us7PEfkc' },
      { id: 'pre_rn_2', title: 'El Amor Después del Amor', artist: 'Fito Páez', type: 'youtube', url: 'https://www.youtube.com/watch?v=knvgOdKPaMQ' },
      { id: 'pre_rn_3', title: 'Mil Horas', artist: 'Los Abuelos de la Nada', type: 'youtube', url: 'https://www.youtube.com/watch?v=1To_Wz5RWi0' },
      { id: 'pre_rn_4', title: 'Ji Ji Ji', artist: 'Patricio Rey y sus Redonditos de Ricota', type: 'youtube', url: 'https://www.youtube.com/watch?v=tVvTDVswTxQ' },
      { id: 'pre_rn_5', title: 'Flaca', artist: 'Andrés Calamaro', type: 'youtube', url: 'https://www.youtube.com/watch?v=UCF9oHXhDMU' },
      { id: 'pre_rn_6', title: 'Lamento Boliviano', artist: 'Los Enanitos Verdes', type: 'youtube', url: 'https://www.youtube.com/watch?v=hReAuaAuJOE' },
      { id: 'pre_rn_7', title: 'Rezo por Vos', artist: 'Charly García & Spinetta', type: 'youtube', url: 'https://www.youtube.com/watch?v=cM3C6_Fq3cI' },
      { id: 'pre_rn_8', title: 'Persiana Americana', artist: 'Soda Stereo', type: 'youtube', url: 'https://www.youtube.com/watch?v=kYJ5oV27T2U' },
      { id: 'pre_rn_9', title: 'Costumbres Argentinas', artist: 'Los Abuelos de la Nada', type: 'youtube', url: 'https://www.youtube.com/watch?v=c1vW8s-y5zM' },
      { id: 'pre_rn_10', title: 'Seguir Viviendo Sin Tu Amor', artist: 'Luis Alberto Spinetta', type: 'youtube', url: 'https://www.youtube.com/watch?v=0h65_f4d0mU' }
    ]
  },
  {
    id: 'pack-cumbias-cuarteto',
    title: 'Cumbias & Cuarteto de Fiesta',
    description: 'Gilda, Rodrigo, Los Palmeras y los temas que levantan a todos de la silla.',
    genre: 'Cumbia & Cuarteto',
    creatorName: 'DJ Fiesta',
    isPublic: true,
    gameMode: 'auto',
    playCount: 238,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    tracks: [
      { id: 'pre_cc_1', title: 'No me arrepiento de este amor', artist: 'Gilda', type: 'youtube', url: 'https://www.youtube.com/watch?v=Z216J0k_36o' },
      { id: 'pre_cc_2', title: 'Soy Cordobés', artist: 'Rodrigo', type: 'youtube', url: 'https://www.youtube.com/watch?v=zJg5k6_qHw0' },
      { id: 'pre_cc_3', title: 'El Bombón Asesino', artist: 'Los Palmeras', type: 'youtube', url: 'https://www.youtube.com/watch?v=mY9rL9w2d2A' },
      { id: 'pre_cc_4', title: 'Quién se ha tomado todo el vino', artist: 'La Mona Jiménez', type: 'youtube', url: 'https://www.youtube.com/watch?v=9_d8_v3o3bA' },
      { id: 'pre_cc_5', title: 'Nunca Me Faltes', artist: 'Antonio Ríos', type: 'youtube', url: 'https://www.youtube.com/watch?v=8q2f5_pL8kQ' },
      { id: 'pre_cc_6', title: 'Ocho Cuarenta', artist: 'Rodrigo', type: 'youtube', url: 'https://www.youtube.com/watch?v=v8j5_d2b1nA' },
      { id: 'pre_cc_7', title: 'Corazón Valiente', artist: 'Gilda', type: 'youtube', url: 'https://www.youtube.com/watch?v=b4b2_r9qL8E' },
      { id: 'pre_cc_8', title: 'Mentirosa', artist: 'Ráfaga', type: 'youtube', url: 'https://www.youtube.com/watch?v=1d8o_b4p7kM' },
      { id: 'pre_cc_9', title: 'Amor Clasificado', artist: 'Rodrigo', type: 'youtube', url: 'https://www.youtube.com/watch?v=k5_q8p2f7dA' },
      { id: 'pre_cc_10', title: 'Beso a Beso', artist: 'La Mona Jiménez', type: 'youtube', url: 'https://www.youtube.com/watch?v=0h9_f4m3b1A' }
    ]
  },
  {
    id: 'pack-pop-2000s',
    title: 'Hits Pop 2000s Bangerz',
    description: 'Los himnos de discoteca y radio que marcaron a toda una generación.',
    genre: 'Pop Internacional',
    creatorName: 'RadioHits',
    isPublic: true,
    gameMode: 'individual',
    playCount: 95,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    tracks: [
      { id: 'pre_pop_1', title: '...Baby One More Time', artist: 'Britney Spears', type: 'youtube', url: 'https://www.youtube.com/watch?v=C-u5WLJ9Yk4' },
      { id: 'pre_pop_2', title: "Hips Don't Lie", artist: 'Shakira feat. Wyclef Jean', type: 'youtube', url: 'https://www.youtube.com/watch?v=DUT5rEU6pqM' },
      { id: 'pre_pop_3', title: 'I Gotta Feeling', artist: 'The Black Eyed Peas', type: 'youtube', url: 'https://www.youtube.com/watch?v=uSD4vsh1zDA' },
      { id: 'pre_pop_4', title: 'Without Me', artist: 'Eminem', type: 'youtube', url: 'https://www.youtube.com/watch?v=YVkUvmDQ3HY' },
      { id: 'pre_pop_5', title: 'Crazy in Love', artist: 'Beyoncé feat. Jay-Z', type: 'youtube', url: 'https://www.youtube.com/watch?v=ViwtNLUqkMY' },
      { id: 'pre_pop_6', title: 'Poker Face', artist: 'Lady Gaga', type: 'youtube', url: 'https://www.youtube.com/watch?v=bESGLojNYSo' },
      { id: 'pre_pop_7', title: 'Yeah!', artist: 'Usher feat. Lil Jon, Ludacris', type: 'youtube', url: 'https://www.youtube.com/watch?v=GxBSyx85Kp8' },
      { id: 'pre_pop_8', title: 'Umbrella', artist: 'Rihanna feat. Jay-Z', type: 'youtube', url: 'https://www.youtube.com/watch?v=CvBfHwUxHIk' },
      { id: 'pre_pop_9', title: 'In da Club', artist: '50 Cent', type: 'youtube', url: 'https://www.youtube.com/watch?v=5qm8PH4xAss' },
      { id: 'pre_pop_10', title: 'Toxic', artist: 'Britney Spears', type: 'youtube', url: 'https://www.youtube.com/watch?v=LOZuxwVk7TU' }
    ]
  },
  {
    id: 'pack-anime-series',
    title: 'Intros de Series & Animé',
    description: 'Abrí el baúl de la infancia con las intros de tele más cantadas de la historia.',
    genre: 'Nostalgia TV',
    creatorName: 'OtakuClub',
    isPublic: true,
    gameMode: 'autohost',
    playCount: 184,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tracks: [
      { id: 'pre_ani_1', title: 'Cha-La Head-Cha-La (Dragon Ball Z)', artist: 'Ricardo Silva', type: 'youtube', url: 'https://www.youtube.com/watch?v=GHnfX1RmZX8' },
      { id: 'pre_ani_2', title: 'Atrápalos Ya (Pokémon)', artist: 'Intro Latino', type: 'youtube', url: 'https://www.youtube.com/watch?v=8iU8LPEa4o0' },
      { id: 'pre_ani_3', title: 'Tema de Apertura (Los Simuladores)', artist: 'Astor Piazzolla', type: 'youtube', url: 'https://www.youtube.com/watch?v=o5UuI_aXU7E' },
      { id: 'pre_ani_4', title: 'Pegasus Fantasy (Saint Seiya)', artist: 'Mauren Mendo', type: 'youtube', url: 'https://www.youtube.com/watch?v=mZ5lK2qf5vE' },
      { id: 'pre_ani_5', title: 'Dan Dan Kokoro Hikareteku (Dragon Ball GT)', artist: 'Aarón Montalvo', type: 'youtube', url: 'https://www.youtube.com/watch?v=uK4jXgQG6jU' },
      { id: 'pre_ani_6', title: 'Digimon Adventure (Butterfly)', artist: 'César Franco', type: 'youtube', url: 'https://www.youtube.com/watch?v=9L7w2b3vF4A' },
      { id: 'pre_ani_7', title: 'Apertura (Casados con Hijos)', artist: 'Cumbia Argentina', type: 'youtube', url: 'https://www.youtube.com/watch?v=8q2f5_pL8kQ' },
      { id: 'pre_ani_8', title: 'Haruka Kanata (Naruto)', artist: 'Asian Kung-Fu Generation', type: 'youtube', url: 'https://www.youtube.com/watch?v=1d8o_b4p7kM' }
    ]
  },
  {
    id: 'pack-reggaeton-old-school',
    title: 'Reggaeton Old School',
    description: 'Los temas que inauguraron el perreo en los boliches y fiestas de los 2000.',
    genre: 'Reggaeton Clásico',
    creatorName: 'Perreo2000',
    isPublic: true,
    gameMode: 'auto',
    playCount: 310,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    tracks: [
      { id: 'pre_reg_1', title: 'Gasolina', artist: 'Daddy Yankee', type: 'youtube', url: 'https://www.youtube.com/watch?v=CCF1_jI8Prk' },
      { id: 'pre_reg_2', title: 'Dale Don Dale', artist: 'Don Omar', type: 'youtube', url: 'https://www.youtube.com/watch?v=QZ0c-nS-78U' },
      { id: 'pre_reg_3', title: 'Rakata', artist: 'Wisin & Yandel', type: 'youtube', url: 'https://www.youtube.com/watch?v=E_u70zJ18sM' },
      { id: 'pre_reg_4', title: 'Atrévete-te-te', artist: 'Calle 13', type: 'youtube', url: 'https://www.youtube.com/watch?v=vXtJkDHEAAc' },
      { id: 'pre_reg_5', title: 'Lo Que Pasó, Pasó', artist: 'Daddy Yankee', type: 'youtube', url: 'https://www.youtube.com/watch?v=gT1I7B5kP6k' },
      { id: 'pre_reg_6', title: 'Pobre Diabla', artist: 'Don Omar', type: 'youtube', url: 'https://www.youtube.com/watch?v=0b7_q_u7w8U' },
      { id: 'pre_reg_7', title: 'Mayor Que Yo', artist: 'Luny Tunes, Baby Ranks, Daddy Yankee', type: 'youtube', url: 'https://www.youtube.com/watch?v=8q2f5_pL8kQ' },
      { id: 'pre_reg_8', title: 'Dile', artist: 'Don Omar', type: 'youtube', url: 'https://www.youtube.com/watch?v=1d8o_b4p7kM' }
    ]
  }
];

class GamesRepository {
  constructor() {
    this._ensureFile();
  }

  _ensureFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(GAMES_FILE)) {
        fs.writeFileSync(GAMES_FILE, JSON.stringify(INITIAL_COMMUNITY_GAMES, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('[GamesRepository] Error initializing storage:', err);
    }
  }

  _readAll() {
    this._ensureFile();
    try {
      const data = fs.readFileSync(GAMES_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('[GamesRepository] Read error:', err);
      return [];
    }
  }

  _writeAll(games) {
    this._ensureFile();
    try {
      fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[GamesRepository] Write error:', err);
      return false;
    }
  }

  /**
   * List public games with search query and filters
   */
  async listPublicGames({ query = '', genre = '', mode = '', sort = 'popular', limit = 50, offset = 0 } = {}) {
    const all = this._readAll();
    let filtered = all.filter((g) => g.isPublic === true);

    const q = (query || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((g) => {
        const titleMatch = (g.title || '').toLowerCase().includes(q);
        const descMatch = (g.description || '').toLowerCase().includes(q);
        const creatorMatch = (g.creatorName || '').toLowerCase().includes(q);
        const genreMatch = (g.genre || '').toLowerCase().includes(q);
        const trackMatch = Array.isArray(g.tracks) && g.tracks.some((t) =>
          (t.title || '').toLowerCase().includes(q) || (t.artist || '').toLowerCase().includes(q)
        );
        return titleMatch || descMatch || creatorMatch || genreMatch || trackMatch;
      });
    }

    if (genre && genre !== 'all') {
      const gLower = genre.toLowerCase();
      filtered = filtered.filter((g) => (g.genre || '').toLowerCase().includes(gLower));
    }

    if (mode && mode !== 'all') {
      filtered = filtered.filter((g) => g.gameMode === mode);
    }

    // Sorting
    if (sort === 'popular') {
      filtered.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    } else if (sort === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sort === 'tracks') {
      filtered.sort((a, b) => (b.tracks?.length || 0) - (a.tracks?.length || 0));
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      games: paginated.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        genre: g.genre || 'General',
        creatorName: g.creatorName || 'Comunidad',
        isPublic: g.isPublic,
        gameMode: g.gameMode || 'auto',
        trackCount: Array.isArray(g.tracks) ? g.tracks.length : 0,
        playCount: g.playCount || 0,
        createdAt: g.createdAt,
        sampleTracks: Array.isArray(g.tracks) ? g.tracks.slice(0, 4).map((t) => ({ title: t.title, artist: t.artist })) : []
      })),
      total,
      limit,
      offset
    };
  }

  /**
   * Get single game by ID (including full track list)
   */
  async getGameById(id) {
    const all = this._readAll();
    return all.find((g) => g.id === id) || null;
  }

  /**
   * Create a new saved game
   */
  async createGame({ title, description = '', creatorName = 'Anónimo', isPublic = false, gameMode = 'auto', tracks = [], genre = 'General' }) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('El título de la partida es obligatorio');
    }
    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new Error('La partida debe contener al menos una canción');
    }

    const id = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newGame = {
      id,
      title: title.trim(),
      description: description.trim(),
      creatorName: creatorName.trim() || 'Anónimo',
      isPublic: Boolean(isPublic),
      gameMode: gameMode || 'auto',
      genre: genre.trim() || 'General',
      tracks: tracks.map((t, idx) => ({
        id: t.id || `t_${idx}_${Date.now()}`,
        title: t.title || 'Canción sin título',
        artist: t.artist || 'Artista desconocido',
        type: t.type || 'youtube',
        url: t.url || ''
      })),
      playCount: 0,
      createdAt: new Date().toISOString()
    };

    const all = this._readAll();
    all.unshift(newGame);
    this._writeAll(all);

    return newGame;
  }

  /**
   * Increment play count when a host launches the game
   */
  async incrementPlayCount(id) {
    const all = this._readAll();
    const game = all.find((g) => g.id === id);
    if (game) {
      game.playCount = (game.playCount || 0) + 1;
      this._writeAll(all);
      return game.playCount;
    }
    return 0;
  }
}

export const gamesRepository = new GamesRepository();
export default gamesRepository;
