import { getGameCoverTheme } from '../utils/genreArt';

export default function MusicPackCover({ genre, title, trackCount = 0, playCount = 0, size = 'normal', isHovered = false }) {
  const theme = getGameCoverTheme(genre, title);

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const heightClass = isSmall ? 'h-24' : isLarge ? 'h-52 sm:h-64' : 'h-36 sm:h-40';

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden select-none bg-gradient-to-br ${theme.gradient} border border-white/10 shadow-inner group-hover:shadow-md transition-all duration-300`}>
      {/* Vinyl Disc that slides out on hover */}
      <div
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#110D1A] border-2 border-white/15 shadow-xl transition-all duration-500 ease-out flex items-center justify-center pointer-events-none ${
          isHovered ? 'translate-x-6 sm:translate-x-8 rotate-45' : 'translate-x-12 opacity-40'
        }`}
        style={{
          backgroundImage: 'repeating-radial-gradient(#1E172E 0, #1E172E 2px, #110D1A 3px, #110D1A 5px)',
        }}
      >
        {/* Center label */}
        <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center p-0.5" style={{ backgroundColor: theme.accent }}>
          <div className="w-full h-full rounded-full bg-[#181226] flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-white/70" />
          </div>
        </div>
      </div>

      {/* Abstract Soundwave Graphic overlay */}
      <div className="absolute inset-0 opacity-20 mix-blend-screen pointer-events-none overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
          <path
            d="M0,50 Q25,20 50,50 T100,50 T150,50 T200,50"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="2,2"
          />
          <path
            d="M0,50 Q25,80 50,50 T100,50 T150,50 T200,50"
            fill="none"
            stroke={theme.accent}
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Stylized Genre Watermark Background */}
      <div className="absolute -bottom-2 -left-2 text-[42px] sm:text-[52px] font-black uppercase text-white/[0.07] tracking-tighter pointer-events-none leading-none select-none font-mono">
        {theme.label.split(' ')[0]}
      </div>

      {/* Floating Badges */}
      <div className="absolute inset-0 p-3 flex flex-col justify-between z-10 pointer-events-none">
        {/* Top row: Genre & Tracks count */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/95 text-[#181226] shadow-sm backdrop-blur-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
            <span>{theme.label}</span>
          </span>

          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white/90 backdrop-blur-xs border border-white/10 font-mono">
            {trackCount} {trackCount === 1 ? 'tema' : 'temas'}
          </span>
        </div>

        {/* Bottom row: Play count badge */}
        <div className="flex items-end justify-between">
          <span className="text-[10px] font-medium text-white/70 italic drop-shadow-xs max-w-[65%] truncate">
            {theme.tagline}
          </span>

          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-[#181226]/85 text-white/95 border border-white/20 backdrop-blur-xs flex items-center gap-1.5 shadow-sm font-mono">
            <span className="text-[#FF5722] text-[10px]">▶</span>
            <span>{playCount || 0}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
