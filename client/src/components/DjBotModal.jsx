import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlaylistLoadingModal from './PlaylistLoadingModal';

const GENRES = [
  { id: 'all', label: 'Variado Fiesta (Mezcla)', desc: 'Un poco de todo lo más conocido y bailable' },
  { id: 'rock_nacional', label: 'Rock Nacional', desc: 'Charly, Soda, Fito, Los Piojos, Redondos, Cerati' },
  { id: 'cumbia_cuarteto', label: 'Cumbia & Cuarteto', desc: 'Rodrigo, Los Palmeras, La K\'onga, Ke Personajes' },
  { id: 'pop_latino', label: 'Pop & Urbano Latino', desc: 'Miranda, Shakira, Duki, Emilia, TINI, Chayanne' },
  { id: 'reggaeton_2000', label: 'Reggaetón 2000s', desc: 'Daddy Yankee, Don Omar, Wisin & Yandel' },
  { id: 'internacional_80_90', label: '80s/90s Internacional', desc: 'Queen, Michael Jackson, ABBA, Madonna' },
];

const DECADES = [
  { id: 'all', label: 'Todas las épocas' },
  { id: '80s', label: '80s' },
  { id: '90s', label: '90s' },
  { id: '2000s', label: '2000s' },
  { id: '2010s', label: '2010s' },
  { id: '2020s', label: 'Actuales (2020+)' },
];

const LANGUAGES = [
  { id: 'all', label: 'Todos los idiomas' },
  { id: 'es', label: 'En Español' },
  { id: 'en', label: 'En Inglés' },
];

export default function DjBotModal({ isOpen, onClose, onPlaylistGenerated, serverUrl }) {
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedDecade, setSelectedDecade] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [songCount, setSongCount] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');

    try {
      const endpoint = serverUrl || window.location.origin;
      const res = await fetch(`${endpoint}/api/dj-bot-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: selectedGenre,
          decade: selectedDecade,
          language: selectedLanguage,
          count: songCount,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.playlist) && data.playlist.length > 0) {
        onPlaylistGenerated(data.playlist);
        onClose();
      } else {
        setError(data.error || 'No se pudieron generar canciones para esos filtros');
      }
    } catch (err) {
      console.error('Error in DJ Bot:', err);
      setError('Error al conectar con el DJ Bot. Verificá la conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          className="party-card bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-5 sm:p-7 border border-[#EAE3D5] shadow-2xl relative"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-5 right-5 text-[#8E869E] hover:text-[#181226] p-2 rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#E11D48] text-white flex items-center justify-center shadow-md shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-black text-[#181226]">
                DJ Bot Automático
              </h3>
              <p className="text-xs text-[#6B6280] leading-tight mt-0.5">
                Elegí el estilo y el bot busca las mejores canciones verificadas sin spoilers.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 1. Género */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#181226] block mb-2">
                1. Género o Estilo Musical
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGenre(g.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedGenre === g.id
                        ? 'bg-[#FFF0EB] border-[#FF5722] text-[#181226] shadow-xs'
                        : 'bg-[#FAF7F2] border-[#EAE3D5] text-[#6B6280] hover:text-[#181226] hover:border-[#DDD5C5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#181226]">{g.label}</span>
                      {selectedGenre === g.id && (
                        <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-[10px] text-[#6B6280] truncate mt-0.5">{g.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Década y Época */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#181226] block mb-2">
                2. Década o Época
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DECADES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDecade(d.id)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedDecade === d.id
                        ? 'bg-[#FF5722] text-white shadow-xs'
                        : 'bg-[#FAF7F2] border border-[#EAE3D5] text-[#6B6280] hover:text-[#181226]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Idioma */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#181226] block mb-2">
                3. Idioma
              </label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedLanguage(l.id)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedLanguage === l.id
                        ? 'bg-[#FF5722] text-white shadow-xs'
                        : 'bg-[#FAF7F2] border border-[#EAE3D5] text-[#6B6280] hover:text-[#181226]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Cantidad de temas */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#181226] block mb-2">
                4. Cantidad de Canciones en la Ronda
              </label>
              <div className="flex gap-2">
                {[10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSongCount(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      songCount === num
                        ? 'bg-[#181226] text-white shadow-xs'
                        : 'bg-[#FAF7F2] border border-[#EAE3D5] text-[#6B6280] hover:text-[#181226]'
                    }`}
                  >
                    {num} canciones
                  </button>
                ))}
              </div>
            </div>

            {/* Anti-spoiler protection note */}
            <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#F59E0B]/30 flex items-start gap-2 text-[#B45309]">
              <span className="shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-[#B45309]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <p className="text-[11px] leading-tight">
                <strong>Protegido con Anti-Spoiler:</strong> Los títulos se cargarán ocultos automáticamente para que nadie pueda verlos de antemano y todos puedan jugar en igualdad de condiciones.
              </p>
            </div>

            {error && (
              <p className="text-xs text-[#E11D48] font-bold bg-[#FFF0F3] p-2.5 rounded-xl border border-[#E11D48]/30">
                {error}
              </p>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full arcade-btn-primary py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>El DJ Bot está armando tu playlist...</span>
                  </>
                ) : (
                  <>
                    <span>Generar Playlist ({songCount} canciones)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <PlaylistLoadingModal
        isOpen={isLoading}
        tag="DJ BOT EN ACCIÓN"
        title="Generando Playlist con DJ Bot"
        subtitle="Buscando las mejores canciones en YouTube y organizando la lista sin spoilers."
      />
    </AnimatePresence>
  );
}
