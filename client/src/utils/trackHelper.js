export function extractYoutubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export function extractSpotifyEmbed(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  return null;
}

export function isLocalTrack(item) {
  if (!item) return false;
  if (typeof item === 'object' && item.type === 'local') return true;
  if (typeof item === 'string' && (item.startsWith('blob:') || item.startsWith('data:audio'))) return true;
  return false;
}

export function getTrackTitle(item) {
  if (!item) return 'Pista de Audio';
  if (typeof item === 'object') {
    return item.name || item.title || item.url || 'Pista de Audio';
  }
  if (typeof item === 'string') {
    const ytId = extractYoutubeId(item);
    if (ytId) return `YouTube (ID: ${ytId})`;
    if (item.includes('spotify.com')) return 'Pista de Spotify';
    try {
      const u = new URL(item);
      return u.pathname.split('/').pop() || item;
    } catch {
      return item;
    }
  }
  return 'Pista de Audio';
}

export function getTrackSource(item) {
  if (isLocalTrack(item)) return 'local';
  const url = typeof item === 'object' ? item.url : item;
  if (extractYoutubeId(url)) return 'youtube';
  if (extractSpotifyEmbed(url)) return 'spotify';
  return 'url';
}

export function normalizeTrack(item) {
  if (!item) return null;
  if (typeof item === 'object') {
    return {
      id: item.id || `track_${Math.random().toString(36).slice(2, 9)}`,
      type: item.type || (isLocalTrack(item) ? 'local' : 'url'),
      name: item.name || getTrackTitle(item),
      url: item.url || '',
      size: item.size || null,
      fileId: item.fileId || item.id,
    };
  }
  const str = String(item).trim();
  const source = getTrackSource(str);
  return {
    id: `track_${Math.random().toString(36).slice(2, 9)}`,
    type: source,
    name: getTrackTitle(str),
    url: str,
  };
}
