import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardSample from './pages/DashboardSample';
import Board from './pages/Board';
import Booking from './pages/Booking';
import Fees from './pages/Fees';
import MyPage from './pages/MyPage';
import Admin from './pages/Admin';
import About from './pages/About';
import RoundingManagement from './pages/RoundingManagement';
import TeamFormation from './pages/TeamFormation';
import ParticipantManagement from './pages/ParticipantManagement';
import MemberScoreEntry from './pages/MemberScoreEntry';
import GradeSettings from './pages/GradeSettings';
import MemberDetail from './pages/MemberDetail';
import Play from './pages/Play';
import Leaderboard from './pages/Leaderboard';
import BingoGame from './pages/BingoGame';
import Navigation from './components/Navigation';
import InstallPrompt from './components/InstallPrompt';
import logoImage from './assets/logo-transparent.png';

function AppRoutes({ user, logout }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate('/');
  }, []);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard-sample" element={<DashboardSample />} />
        <Route path="/board" element={<Board />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/about" element={<About />} />
        <Route path="/member/:id" element={<MemberDetail />} />
        <Route path="/rounding-management" element={<RoundingManagement />} />
        <Route path="/team-formation" element={<TeamFormation />} />
        <Route path="/participant-management" element={<ParticipantManagement />} />
        <Route path="/member-score-entry" element={<MemberScoreEntry />} />
        <Route path="/grade-settings" element={<GradeSettings />} />
        <Route path="/play" element={<Play />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/bingo" element={<BingoGame />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {location.pathname !== '/play' && <Navigation user={user} onLogout={logout} />}
      <InstallPrompt />
    </div>
  );
}

function App() {
  const { user, loading, login, logout } = useApp();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <img 
            src={logoImage} 
            alt="3355 골프 클럽" 
            className="loading-logo"
          />
          <h1 className="loading-title">3355 골프 클럽</h1>
          <p className="loading-welcome">환영합니다</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <Router>
      <AppRoutes user={user} logout={logout} />
    </Router>
  );
}

export default App;
