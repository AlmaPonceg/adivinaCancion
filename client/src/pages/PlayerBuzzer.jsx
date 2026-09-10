import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { useSocketEvent } from '../hooks/useSocket';
import BuzzerButton from '../components/BuzzerButton';

export default function PlayerBuzzer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, playerName } = location.state || {};

  const [playerState, setPlayerState] = useState({
    teamName: '',
    teamColor: '#D4A853',
    teamBg: '#19191d',
    canBuzz: false,
    hasBuzzed: false,
    isTeamBlocked: false,
    isPlayerBlocked: false,
    isMyTurn: false,
    gameState: 'ROUND_ACTIVE',
  });

  const [statusMessage, setStatusMessage] = useState('Esperando...');
  const [buzzPosition, setBuzzPosition] = useState(null);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (!roomCode) navigate('/play');
  }, [roomCode, navigate]);

  useEffect(() => {
    if (roomCode) {
      socket.emit('get-player-state', { roomCode }, (state) => {
        if (state && !state.error) setPlayerState(state);
      });
    }
  }, [roomCode]);

  useSocketEvent('player-state-updated', (state) => {
    setPlayerState(state);

    if (state.canBuzz) {
      setStatusMessage('Pulsá');
      setBuzzPosition(null);
    } else if (state.isMyTurn) {
      setStatusMessage('Es tu turno');
    } else if (state.hasBuzzed) {
      setStatusMessage('Esperando resultado...');
    } else if (state.isTeamBlocked) {
      setStatusMessage('Tu equipo está bloqueado');
    } else if (state.isPlayerBlocked) {
      setStatusMessage('Bloqueado esta ronda');
    } else if (state.gameState === 'BUZZER_LOCKED') {
      setStatusMessage('Alguien fue más rápido');
    } else if (state.gameState === 'ROUND_END') {
      setStatusMessage('Ronda terminada');
    } else if (state.gameState === 'TEAMS_ASSIGNED') {
      setStatusMessage('Esperando inicio...');
    } else {
      setStatusMessage('Esperando...');
    }
  });

  useSocketEvent('round-started', () => {
    setStatusMessage('Pulsá');
    setBuzzPosition(null);
  });

  useSocketEvent('round-result', () => {
    setStatusMessage('Ronda terminada');
  });

  useSocketEvent('game-over', (data) => {
    navigate('/gameover', { state: { rankings: data.rankings } });
  });

  useSocketEvent('host-disconnected', () => {
    navigate('/play', { state: { error: 'El host se desconectó' } });
  });

  const handleBuzz = useCallback(() => {
    if (!playerState.canBuzz) return;

    if (navigator.vibrate) navigator.vibrate(50);

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 250);

    socket.emit('buzz', { roomCode }, (response) => {
      if (response?.success) {
        setBuzzPosition(response.position);
        setStatusMessage(response.position === 1 ? 'Primero' : `#${response.position} en la cola`);
      }
    });
  }, [playerState.canBuzz, roomCode]);

  // Derive bg gradient from team color
  const teamBgColor = playerState.teamBg || '#19191d';

  if (!roomCode) return null;

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-6 relative overflow-hidden select-none"
      style={{
        background: `linear-gradient(160deg, ${lighten(teamBgColor, 12)} 0%, ${teamBgColor} 40%, #0d0d10 100%)`,
      }}
    >
      {/* Flash on buzz */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ backgroundColor: playerState.teamColor || '#D4A853' }}
          />
        )}
      </AnimatePresence>

      {/* Subtle glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15"
          style={{ backgroundColor: playerState.teamColor || '#D4A853' }}
        />
      </div>

      {/* Top info */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-10"
      >
        <p className="label text-white/40 mb-1">{playerState.teamName || 'Sin equipo'}</p>
        <h2 className="text-xl font-bold text-white/90">{playerName}</h2>
      </motion.div>

      {/* Buzzer */}
      <div className="relative z-10">
        <BuzzerButton
          onBuzz={handleBuzz}
          canBuzz={playerState.canBuzz}
          hasBuzzed={playerState.hasBuzzed}
          isBlocked={playerState.isTeamBlocked || playerState.isPlayerBlocked}
          teamColor={playerState.teamColor}
          isMyTurn={playerState.isMyTurn}
        />
      </div>

      {/* Status */}
      <motion.div
        key={statusMessage}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mt-10 text-center"
      >
        <p className="text-lg font-semibold text-white/80">{statusMessage}</p>
        {buzzPosition && (
          <p className="mono text-white/35 text-sm mt-1">
            Posición #{buzzPosition}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function lighten(hex, amount) {
  const clamp = (v) => Math.min(255, Math.max(0, v));
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = clamp(parseInt(c.substring(0, 2), 16) + amount);
  const g = clamp(parseInt(c.substring(2, 4), 16) + amount);
  const b = clamp(parseInt(c.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
