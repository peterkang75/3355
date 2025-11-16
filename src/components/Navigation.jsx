import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import golfIcon from '../assets/golf-icon.png';

function Navigation({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      onLogout();
      navigate('/');
    }
  };

  return (
    <nav className="nav-bottom">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">⌂</span>
        <span>홈</span>
      </NavLink>
      <NavLink to="/booking" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">
          <img src={golfIcon} alt="라운딩" style={{ width: '24px', height: '24px' }} />
        </span>
        <span>라운딩</span>
      </NavLink>
      {/* TODO: 다음 버전에 활성화
      <NavLink to="/score" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">✎</span>
        <span>스코어</span>
      </NavLink>
      <NavLink to="/fees" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">$</span>
        <span>회비</span>
      </NavLink>
      */}
      <NavLink to="/mypage" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">⚲</span>
        <span>마이</span>
      </NavLink>
      {user?.isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">⚙</span>
          <span>관리</span>
        </NavLink>
      )}
      <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">ⓘ</span>
        <span>About</span>
      </NavLink>
    </nav>
  );
}

export default Navigation;
