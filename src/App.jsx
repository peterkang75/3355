import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import Booking from './pages/Booking';
import ScoreEntry from './pages/ScoreEntry';
import Fees from './pages/Fees';
import MyPage from './pages/MyPage';
import Admin from './pages/Admin';
import RoundingManagement from './pages/RoundingManagement';
import TeamFormation from './pages/TeamFormation';
import ParticipantManagement from './pages/ParticipantManagement';
import MemberScoreEntry from './pages/MemberScoreEntry';
import GradeSettings from './pages/GradeSettings';
import MemberDetail from './pages/MemberDetail';
import Navigation from './components/Navigation';

function AppRoutes({ user, logout }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/');
  }, []);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/board" element={<Board />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/score" element={<ScoreEntry />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/member/:id" element={<MemberDetail />} />
        <Route path="/rounding-management" element={<RoundingManagement />} />
        <Route path="/team-formation" element={<TeamFormation />} />
        <Route path="/participant-management" element={<ParticipantManagement />} />
        <Route path="/member-score-entry" element={<MemberScoreEntry />} />
        <Route path="/grade-settings" element={<GradeSettings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Navigation user={user} onLogout={logout} />
    </div>
  );
}

function App() {
  const { user, loading, login, logout } = useApp();

  if (loading) {
    return <div className="loading">로딩 중...</div>;
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
