import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import BackgroundVideo from './components/BackgroundVideo';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import PlayerJoin from './pages/PlayerJoin';
import PlayerBuzzer from './pages/PlayerBuzzer';
import GameOver from './pages/GameOver';
import Landing from './pages/Landing';

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-dvh">
        <BackgroundVideo />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/host" element={<HostLobby />} />
              <Route path="/host/game" element={<HostGame />} />
              <Route path="/play" element={<PlayerJoin />} />
              <Route path="/play/buzzer" element={<PlayerBuzzer />} />
              <Route path="/gameover" element={<GameOver />} />
            </Routes>
          </AnimatePresence>
        </div>
      </div>
    </BrowserRouter>
  );
}
