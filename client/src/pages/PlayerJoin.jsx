import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import socket from '../socket';
import { lobbyAudioManager } from '../utils/lobbyAudio';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

export default function PlayerJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAlmaTheme } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // ── Auto-Reconnect from localStorage ────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trivia_player_session');
      if (saved) {
        const session = JSON.parse(saved);
        const currentRoomParam = searchParams.get('room');
        const targetRoom = currentRoomParam || session.roomCode;

        if (session.playerId && session.playerName && session.roomCode === targetRoom) {
          setName(session.playerName);
          setRoomCode(session.roomCode);
          setIsJoining(true);

          socket.emit(
            'reconnect-player',
            {
              roomCode: session.roomCode,
              playerId: session.playerId,
              playerName: session.playerName,
            },
            (res) => {
              setIsJoining(false);
              if (res?.success) {
                const sessionData = {
                  roomCode: session.roomCode,
                  playerName: session.playerName,
                  playerId: session.playerId,
                  teamName: res.playerState?.teamName || session.teamName,
                  teamColor: res.playerState?.teamColor,
                };
                localStorage.setItem('trivia_player_session', JSON.stringify(sessionData));
                navigate('/play/buzzer', {
                  state: sessionData,
                  replace: true,
                });
              }
            }
          );
        }
      }
    } catch (err) {
      console.error('Session restore error:', err);
    }
  }, [searchParams, navigate]);

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedCode = roomCode.trim();

    if (!trimmedName || !trimmedCode) {
      setError(t('player.enterNameAndCode', 'Ingresá tu nombre y el código de sala'));
      return;
    }
    if (trimmedCode.length !== 4) {
      setError(t('player.codeLengthError', 'El código debe ser de 4 dígitos'));
      return;
    }

    // Pre-unlock and play Alma's lobby song within direct user click gesture (if theme unlocked)
    if (isAlmaTheme) {
      lobbyAudioManager.unlockAndPlay(0.35);
    }

    let persistentId = localStorage.getItem('trivia_player_id');
    if (!persistentId) {
      persistentId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('trivia_player_id', persistentId);
    }

    setIsJoining(true);
    socket.emit(
      'join-room',
      {
        roomCode: trimmedCode,
        playerName: trimmedName,
        playerId: persistentId,
      },
      (response) => {
        setIsJoining(false);
        if (response.error) {
          setError(response.error);
          lobbyAudioManager.stop();
        } else {
          const sessionData = {
            roomCode: trimmedCode,
            playerName: trimmedName,
            playerId: response.player?.id || persistentId,
            teamName: response.playerState?.teamName || '',
            teamColor: response.playerState?.teamColor || '#FF5722',
          };
          localStorage.setItem('trivia_player_session', JSON.stringify(sessionData));

          navigate('/play/buzzer', {
            state: sessionData,
            replace: true,
          });
        }
      }
    );
  };

  // ── Join Form View (Daytime VIP Pass) ────────────────────────
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--color-text-primary)] relative overflow-hidden">
      <div className="w-full max-w-sm flex justify-end mb-3 z-20">
        <LanguageSelector />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="party-card p-7 sm:p-9 w-full max-w-sm rounded-[2.2rem] relative z-20"
      >
        {/* VIP Pass Header Tag */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F4EE] border border-[#E5DFD5] mb-3">
            <span className="w-2 h-2 rounded-full bg-[#059669] shadow-[0_0_8px_#059669]" />
            <span className="text-xs font-bold text-[#FF5722]">
              Hitpop! · {t('common.online', 'En Vivo')}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#181226] mb-1">
            {t('player.buzzerTitle', 'Activar Pulsador')}
          </h1>
          <p className="text-[#574F6B] text-xs font-semibold">
            {t('player.buzzerSubtitle', 'Completá tus datos para jugar en vivo desde tu celular')}
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="font-tactical text-xs font-bold uppercase tracking-wider text-[#4A425E] block mb-1.5">
              {t('player.nameLabel', 'Tu nombre o apodo')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('player.namePlaceholder', 'Ej. Martín')}
              maxLength={20}
              className="w-full px-4 py-3.5 text-sm font-bold rounded-2xl border-2 border-[#DDD5C5] bg-white text-[#181226] placeholder:text-[#A39DB5]"
              autoFocus
            />
          </div>

          <div>
            <label className="font-tactical text-xs font-bold uppercase tracking-wider text-[#4A425E] block mb-1.5">
              {t('player.roomCodeLabel', 'Código de sala (4 dígitos)')}
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder={t('player.roomCodePlaceholder', '0000')}
              maxLength={4}
              className="mono w-full px-4 py-3.5 text-3xl font-black tracking-[0.25em] text-center rounded-2xl border-2 border-[#DDD5C5] bg-[#F7F4EE] text-[#FF5722] placeholder:text-[#C5BDB0]"
            />
          </div>

          {error && (
            <p className="text-xs text-[#E11D48] font-bold text-center bg-[#FFE4E9] p-2.5 rounded-xl border border-[#FDA4AF]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isJoining}
            className="arcade-btn-primary w-full py-4 rounded-2xl font-black text-sm disabled:opacity-50 shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isJoining ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>{t('player.connecting', 'Conectando al Juego...')}</span>
              </>
            ) : (
              <span>{t('player.enterBuzzer', 'Entrar al Pulsador')}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="arcade-btn w-full py-3 rounded-2xl text-xs font-bold text-[#6B6280] hover:text-[#181226] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <svg className="w-3.5 h-3.5 text-[#FF5722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t('player.backHome', 'Volver al Inicio')}</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
