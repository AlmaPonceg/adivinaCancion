import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BackgroundVideo from './components/BackgroundVideo';
import NeutralBackground from './components/NeutralBackground';
import LoginModal from './components/LoginModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import PlayerJoin from './pages/PlayerJoin';
import PlayerBuzzer from './pages/PlayerBuzzer';
import GameOver from './pages/GameOver';
import Landing from './pages/Landing';
import CommunityLibrary from './pages/CommunityLibrary';
import GameCreator from './pages/GameCreator';
import GameDetail from './pages/GameDetail';
import AdminDashboard from './pages/AdminDashboard';
import PricingPlans from './pages/PricingPlans';

function AppLayout() {
  const { isAlmaTheme } = useTheme();

  return (
    <div className="relative min-h-dvh">
      {isAlmaTheme ? <BackgroundVideo /> : <NeutralBackground />}
      <LoginModal />
      <div className="relative z-10">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/host" element={<HostLobby />} />
            <Route path="/host/game" element={<HostGame />} />
            <Route path="/library" element={<CommunityLibrary />} />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/create" element={<GameCreator />} />
            <Route path="/planes" element={<PricingPlans />} />
            <Route path="/precios" element={<PricingPlans />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admindashboard" element={<AdminDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/moderador" element={<AdminDashboard />} />
            <Route path="/play" element={<PlayerJoin />} />
            <Route path="/play/buzzer" element={<PlayerBuzzer />} />
            <Route path="/gameover" element={<GameOver />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppLayout />
      </ThemeProvider>
    </BrowserRouter>
  );
}
