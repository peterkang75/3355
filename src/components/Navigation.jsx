import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import golfIcon from '../assets/golf-icon.png';
import homeIcon from '../assets/home-icon.png';
import mypageIcon from '../assets/mypage-icon.png';
import adminIcon from '../assets/admin-icon.png';
import aboutIcon from '../assets/about-icon.png';

function Navigation({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      onLogout();
      navigate('/');
    }
  };

  const handleNavClick = (e, path) => {
    e.preventDefault();
    navigate(path);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="nav-bottom">
      <a 
        href="/" 
        className={isActive('/') ? 'nav-item active' : 'nav-item'}
        onClick={(e) => handleNavClick(e, '/')}
      >
        <span className="nav-icon">
          <img src={homeIcon} alt="홈" style={{ width: '24px', height: '24px' }} />
        </span>
        <span>홈</span>
      </a>
      <a 
        href="/booking" 
        className={isActive('/booking') ? 'nav-item active' : 'nav-item'}
        onClick={(e) => handleNavClick(e, '/booking')}
      >
        <span className="nav-icon">
          <img src={golfIcon} alt="라운딩" style={{ width: '24px', height: '24px' }} />
        </span>
        <span>라운딩</span>
      </a>
      <a 
        href="/score" 
        className={isActive('/score') ? 'nav-item active' : 'nav-item'}
        onClick={(e) => handleNavClick(e, '/score')}
      >
        <span className="nav-icon">✎</span>
        <span>스코어</span>
      </a>
      <a 
        href="/fees" 
        className={isActive('/fees') ? 'nav-item active' : 'nav-item'}
        onClick={(e) => handleNavClick(e, '/fees')}
      >
        <span className="nav-icon">$</span>
        <span>회비</span>
      </a>
      <a 
        href="/mypage" 
        className={isActive('/mypage') ? 'nav-item active' : 'nav-item'}
        onClick={(e) => handleNavClick(e, '/mypage')}
      >
        <span className="nav-icon">
          <img src={mypageIcon} alt="마이페이지" style={{ width: '24px', height: '24px' }} />
        </span>
        <span>마이페이지</span>
      </a>
      {user?.isAdmin && (
        <a 
          href="/admin" 
          className={isActive('/admin') ? 'nav-item active' : 'nav-item'}
          onClick={(e) => handleNavClick(e, '/admin')}
        >
          <span className="nav-icon">
            <img src={adminIcon} alt="관리" style={{ width: '24px', height: '24px' }} />
          </span>
          <span>관리</span>
        </a>
      )}
      <a 
        href="/about" 
        className={isActive('/about') ? 'nav-item active' : 'nav-item'}
        onClick={(e) => handleNavClick(e, '/about')}
      >
        <span className="nav-icon">
          <img src={aboutIcon} alt="About" style={{ width: '24px', height: '24px' }} />
        </span>
        <span>About</span>
      </a>
    </nav>
  );
}

export default Navigation;
