import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/common/PageHeader';

function Menu() {
  const navigate = useNavigate();
  const { featureSettings } = useApp();

  const allMenuItems = [
    {
      symbol: '🏆',
      title: '우승자 맞추기',
      description: '라운딩 우승자를 예측하고 투표하세요',
      path: '/games/pick-winner',
      featureKey: 'pickWinnerEnabled'
    },
    {
      symbol: '◉',
      title: '빙고 게임',
      description: '멤버들과 함께하는 빙고 게임',
      path: '/bingo'
    },
    {
      symbol: 'i',
      title: 'About',
      description: '앱 정보 및 버전',
      path: '/about'
    }
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.featureKey && featureSettings[item.featureKey] === false) {
      return false;
    }
    return true;
  });

  return (
    <div className="page-content">
      <PageHeader title="메뉴" showBackButton={false} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={() => navigate(item.path)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              background: '#FFFFFF',
              borderBottom: index < menuItems.length - 1 ? '1px solid #F3F4F6' : 'none',
              borderTop: index === 0 ? '1px solid #F3F4F6' : 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '11px',
              background: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
              color: '#374151',
              fontWeight: '700',
            }}>
              {item.symbol}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '3px', color: '#111827' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
                {item.description}
              </div>
            </div>
            <div style={{ color: '#D1D5DB', fontSize: '20px', fontWeight: '300' }}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Menu;
