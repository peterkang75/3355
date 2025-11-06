import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import Booking from './pages/Booking';
import ScoreEntry from './pages/ScoreEntry';
import Fees from './pages/Fees';
import Admin from './pages/Admin';
import Navigation from './components/Navigation';

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
      <div className="app">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/board" element={<Board />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/score" element={<ScoreEntry />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Navigation user={user} onLogout={logout} />
      </div>
    </Router>
  );
}

export default App;
