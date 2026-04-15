import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import { useActivityTracker } from './hooks/useActivityTracker';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
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
import MemberInfoForm from './pages/MemberInfoForm';
import Menu from './pages/Menu';
import PickWinner from './pages/PickWinner';
import RoundingListV2 from './pages/RoundingListV2';
import Settlement from './pages/Settlement';
import GuestJoin from './pages/GuestJoin';
import JoinPage from './pages/JoinPage';
import Navigation from './components/Navigation';
import InstallPrompt from './components/InstallPrompt';
import KakaoTalkBanner from './components/KakaoTalkBanner';

function AuthenticatedRoutes({ user, logout, requiresProfileComplete }) {
  const navigate = useNavigate();
  const location = useLocation();

  useActivityTracker(user);

  useEffect(() => {
    if (requiresProfileComplete && user?.id && location.pathname !== `/member/${user.id}`) {
      navigate(`/member/${user.id}`);
    }
  }, [requiresProfileComplete, user?.id, location.pathname]);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/board" element={<Board />} />
        <Route path="/booking" element={<RoundingListV2 />} />
        <Route path="/v2/roundings" element={<Navigate to="/booking" replace />} />
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
        <Route path="/menu" element={<Menu />} />
        <Route path="/games/pick-winner" element={<PickWinner />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/member-info" element={<MemberInfoForm />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {location.pathname !== '/play' && <Navigation user={user} onLogout={logout} />}
      <InstallPrompt />
      <KakaoTalkBanner />
    </div>
  );
}

function App() {
  const { user, loading, login, logout, requiresProfileComplete } = useApp();
  useEffect(() => {
    if (!loading) {
      const el = document.getElementById('splash-screen');
      if (el) el.remove();
    }
  }, [loading]);

  if (loading) return null;

  return (
    <Router>
      <Routes>
        {/* 로그인 없이 접근 가능한 공개 라우트 */}
        <Route path="/invite/:token" element={<GuestJoin />} />
        <Route path="/join" element={<JoinPage />} />
        {/* 게스트 or 일반 회원 모두 /play 접근 가능 (Play 내부에서 세션 확인) */}
        <Route path="/play" element={<Play />} />
        {/* 인증 필요 라우트 */}
        <Route
          path="*"
          element={
            !user
              ? <Login onLogin={login} />
              : <AuthenticatedRoutes user={user} logout={logout} requiresProfileComplete={requiresProfileComplete} />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
