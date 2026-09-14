// ═══════════════════════════════════════════════════════════════
// Genre Art & Photographic Cover System for Music Trivia Packs
// ═══════════════════════════════════════════════════════════════

/**
 * Curated pack-specific photography so EVERY single game has a unique, distinct cover
 */
export const PACK_SPECIFIC_COVERS = {
  // Rock Nacional
  'game_1789399149034_19zgu': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', // Purple stadium concert
  'game_1789399016268_mf7zz': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', // Vintage electric guitar & amp
  'pack-rock-nacional': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80', // Rock concert stadium crowd with lights
  
  // Fiesta, Cumbia & Cuarteto
  'pack-cumbias-cuarteto': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', // Golden confetti & festival crowd
  
  // Pop
  'pack-pop-2000s': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', // Disco mirror ball & neon lasers
  
  // Reggaeton
  'pack-reggaeton-old-school': 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&auto=format&fit=crop&q=80', // Red dance club lasers
  
  // Trap & Urbano
  'game_1789397749867_erc4i': 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80', // Studio recording desk & gear
  
  // Animé & Series
  'pack-anime-series': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80', // Neon arcade skyline
  
  // Private / Birthday
  'game_1789397821677_4vsqu': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80', // Intimate party celebration lights
};

export const GENRE_THEMES = {
  'rock': {
    label: 'Rock Nacional',
    tagline: 'Himnos de Estadio & Clásicos',
    accent: '#FF5722',
    color: '#D84315',
    bgBadge: 'bg-[#FF5722]',
    coverPool: [
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80',
    ],
    categoryTileBg: 'bg-[#7C2D12]',
    categoryTileText: 'text-white',
  },
  'cumbia': {
    label: 'Cumbia & Cuarteto',
    tagline: 'Para la Previa, Cumbias & Boliche',
    accent: '#F43F5E',
    color: '#BE123C',
    bgBadge: 'bg-[#F43F5E]',
    coverPool: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
    ],
    categoryTileBg: 'bg-[#831843]',
    categoryTileText: 'text-white',
  },
  'pop': {
    label: 'Hits Pop 2000s',
    tagline: 'Bangerz Globales Inolvidables',
    accent: '#06B6D4',
    color: '#0E7490',
    bgBadge: 'bg-[#06B6D4]',
    coverPool: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
    ],
    categoryTileBg: 'bg-[#0E7490]',
    categoryTileText: 'text-white',
  },
  'trap': {
    label: 'Trap & Urbano',
    tagline: 'Bizarrap Sessions & Flow',
    accent: '#A855F7',
    color: '#7E22CE',
    bgBadge: 'bg-[#A855F7]',
    coverPool: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&auto=format&fit=crop&q=80',
    ],
    categoryTileBg: 'bg-[#4C1D95]',
    categoryTileText: 'text-white',
  },
  'reggaeton': {
    label: 'Reggaeton Old School',
    tagline: 'El Perreo de los 2000s',
    accent: '#EA580C',
    color: '#C2410C',
    bgBadge: 'bg-[#EA580C]',
    coverPool: [
      'https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
    ],
    categoryTileBg: 'bg-[#9A3412]',
    categoryTileText: 'text-white',
  },
  'anime': {
    label: 'Animé & Series TV',
    tagline: 'Nostalgia de Pantalla Chica',
    accent: '#3B82F6',
    color: '#1D4ED8',
    bgBadge: 'bg-[#3B82F6]',
    coverPool: [
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    ],
    categoryTileBg: 'bg-[#1E3A8A]',
    categoryTileText: 'text-white',
  },
  'general': {
    label: 'Grandes Éxitos',
    tagline: 'Música para Todos',
    accent: '#FF5722',
    color: '#FF5722',
    bgBadge: 'bg-[#FF5722]',
    coverPool: [
      'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    ],
    categoryTileBg: 'bg-[#181226]',
    categoryTileText: 'text-white',
  },
};

export function getGenreKey(genre = '') {
  const g = String(genre).toLowerCase().trim();
  if (g.includes('rock')) return 'rock';
  if (g.includes('cumbia') || g.includes('cuarteto')) return 'cumbia';
  if (g.includes('pop')) return 'pop';
  if (g.includes('trap') || g.includes('urbano')) return 'trap';
  if (g.includes('reggaeton') || g.includes('perreo')) return 'reggaeton';
  if (g.includes('anim') || g.includes('serie') || g.includes('tv')) return 'anime';
  return 'general';
}

/**
 * Return theme configuration and cover photograph for a game
 */
export function getGameCoverTheme(genre = '', title = '', gameId = '') {
  const key = getGenreKey(genre || title);
  const theme = GENRE_THEMES[key] || GENRE_THEMES.general;

  let coverImage = PACK_SPECIFIC_COVERS[gameId];

  if (!coverImage) {
    const pool = theme.coverPool || [];
    let hash = 0;
    const str = `${title}_${gameId}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % pool.length;
    coverImage = pool[idx] || pool[0];
  }

  return {
    ...theme,
    key,
    coverImage,
    fallbackImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  };
}

export const MOOD_TILES = [
  {
    id: 'Cumbia',
    title: 'Previa & Fiesta',
    subtitle: 'Cumbias & Cuarteto',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    bgColor: 'bg-[#831843]',
    borderColor: 'border-[#9D174D]',
  },
  {
    id: 'Rock',
    title: 'Rock de Estadio',
    subtitle: 'Nacional & 90s',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    bgColor: 'bg-[#7C2D12]',
    borderColor: 'border-[#9A3412]',
  },
  {
    id: 'Pop',
    title: 'Hits Pop 2000s',
    subtitle: 'Discoteca & Glitter',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80',
    bgColor: 'bg-[#0E7490]',
    borderColor: 'border-[#155E75]',
  },
  {
    id: 'Trap',
    title: 'Trap & Flow',
    subtitle: 'Bizarrap Sessions',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500&auto=format&fit=crop&q=80',
    bgColor: 'bg-[#4C1D95]',
    borderColor: 'border-[#5B21B6]',
  },
  {
    id: 'Reggaeton',
    title: 'Reggaeton Retro',
    subtitle: 'Old School 2000s',
    image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=500&auto=format&fit=crop&q=80',
    bgColor: 'bg-[#9A3412]',
    borderColor: 'border-[#C2410C]',
  },
  {
    id: 'Animé',
    title: 'Animé & Series',
    subtitle: 'Intros de la Infancia',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
    bgColor: 'bg-[#1E3A8A]',
    borderColor: 'border-[#1E40AF]',
  },
];
