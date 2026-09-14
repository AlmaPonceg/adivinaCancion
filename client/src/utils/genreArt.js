// ═══════════════════════════════════════════════════════════════
// Genre Art & Cover Generator for Music Trivia Packs
// ═══════════════════════════════════════════════════════════════

/**
 * Curated color themes and visual styles per musical genre
 */
export const GENRE_THEMES = {
  'rock': {
    label: 'Rock Nacional',
    gradient: 'from-[#2E1A47] via-[#1E1435] to-[#0D0818]',
    accent: '#FF5722',
    pillBg: 'bg-[#FFEDE7] text-[#D84315] border-[#FFCCBC]',
    badgeBg: 'bg-[#FF5722]',
    icon: 'guitar',
    pattern: 'radial-lines',
    tagline: 'Himnos de Estadio & Clásicos',
  },
  'cumbia': {
    label: 'Cumbia & Cuarteto',
    gradient: 'from-[#831843] via-[#701A75] to-[#2E1065]',
    accent: '#F43F5E',
    pillBg: 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]',
    badgeBg: 'bg-[#F43F5E]',
    icon: 'sparkles',
    pattern: 'confetti',
    tagline: 'Para la Previa & Boliche',
  },
  'pop': {
    label: 'Hits Pop 2000s',
    gradient: 'from-[#0369A1] via-[#0E7490] to-[#1E293B]',
    accent: '#06B6D4',
    pillBg: 'bg-[#CFFAFE] text-[#0E7490] border-[#A5F3FC]',
    badgeBg: 'bg-[#06B6D4]',
    icon: 'disc',
    pattern: 'disc-grooves',
    tagline: 'Bangerz Globales Inolvidables',
  },
  'trap': {
    label: 'Trap & Urbano',
    gradient: 'from-[#3B0764] via-[#1E1B4B] to-[#09090B]',
    accent: '#A855F7',
    pillBg: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]',
    badgeBg: 'bg-[#A855F7]',
    icon: 'waveform',
    pattern: 'equalizer-bars',
    tagline: 'Bizarrap Sessions & Flow',
  },
  'reggaeton': {
    label: 'Reggaeton Old School',
    gradient: 'from-[#9A3412] via-[#7C2D12] to-[#181226]',
    accent: '#EA580C',
    pillBg: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]',
    badgeBg: 'bg-[#EA580C]',
    icon: 'flame',
    pattern: 'sunburst',
    tagline: 'El Perreo de los 2000s',
  },
  'anime': {
    label: 'Animé & Series TV',
    gradient: 'from-[#1E3A8A] via-[#1E1B4B] to-[#0F172A]',
    accent: '#3B82F6',
    pillBg: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]',
    badgeBg: 'bg-[#3B82F6]',
    icon: 'tv',
    pattern: 'retro-grid',
    tagline: 'Nostalgia de Pantalla Chica',
  },
  'general': {
    label: 'Variado & Éxitos',
    gradient: 'from-[#181226] via-[#2A233D] to-[#110D1A]',
    accent: '#FF5722',
    pillBg: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
    badgeBg: 'bg-[#FF5722]',
    icon: 'music',
    pattern: 'vinyl',
    tagline: 'Grandes Éxitos para Todos',
  },
};

/**
 * Resolve genre key from string
 */
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
 * Return theme configuration for a game
 */
export function getGameCoverTheme(genre = '', title = '') {
  const key = getGenreKey(genre || title);
  return GENRE_THEMES[key] || GENRE_THEMES.general;
}
