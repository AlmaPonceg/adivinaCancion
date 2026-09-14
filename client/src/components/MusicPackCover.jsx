import { useState } from 'react';
import { getGameCoverTheme } from '../utils/genreArt';
import { useTranslation } from '../context/LanguageContext';

export default function MusicPackCover({ genre, title, gameId = '', trackCount = 0, playCount = 0, size = 'normal', isHovered = false }) {
  const { t } = useTranslation();
  const theme = getGameCoverTheme(genre, title, gameId);
  const themeKey = theme.key || 'general';
  const [imgError, setImgError] = useState(false);

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const heightClass = isSmall ? 'h-28' : isLarge ? 'h-52 sm:h-64' : 'h-40 sm:h-44';
  const imgSrc = imgError ? theme.fallbackImage : (theme.coverImage || theme.fallbackImage);

  const localizedGenreLabel = t(`library.genreThemes.${themeKey}.label`, theme.label);
  const localizedTagline = t(`library.genreThemes.${themeKey}.tagline`, theme.tagline);
  const localizedTrackLabel = trackCount === 1 ? t('library.cards.track', 'tema') : t('library.cards.tracks', 'temas');

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden select-none bg-[#181226] border border-[#EAE3D5] shadow-xs group`}>
      {/* Real High-Resolution Photograph with smooth hover zoom */}
      <img
        src={imgSrc}
        alt={title}
        onError={() => setImgError(true)}
        className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
          isHovered ? 'scale-105 brightness-105' : 'scale-100 brightness-95'
        }`}
        loading="lazy"
      />

      {/* Dark Vignette Overlay for maximum readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30 pointer-events-none" />

      {/* Top row: Genre Badge */}
      <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/95 text-[#181226] shadow-sm backdrop-blur-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
          <span>{localizedGenreLabel}</span>
        </span>
      </div>

      {/* Center Tagline (Large hero only) */}
      {isLarge && (
        <div className="absolute bottom-12 left-4 right-4 z-10 pointer-events-none">
          <span className="text-xs font-bold text-white/90 drop-shadow-md tracking-wide">
            {localizedTagline}
          </span>
        </div>
      )}

      {/* Kahoot-Style Bottom Floating Capsule: [Jugadas] & [Canciones] */}
      <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none flex items-center gap-1.5">
        <div className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-black/75 text-white border border-white/20 backdrop-blur-md flex items-center gap-2 shadow-md">
          {/* Real Play Count */}
          <span className="flex items-center gap-1 font-mono">
            <svg className="w-3 h-3 text-[#FF5722]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>{playCount || 0}</span>
          </span>

          <span className="w-1 h-1 rounded-full bg-white/40" />

          {/* Tracks Count */}
          <span className="flex items-center gap-1 text-white/90 font-mono">
            <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span>{trackCount} {localizedTrackLabel}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
