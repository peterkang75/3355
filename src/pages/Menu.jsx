import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import PageHeader from '../components/common/PageHeader';

function Menu() {
  const navigate = useNavigate();
  const { featureSettings } = useApp();

  const allMenuItems = [
    {
      icon: '🏆',
      title: '우승자 맞추기',
      description: '라운딩 우승자를 예측하고 투표하세요',
      path: '/games/pick-winner',
      color: '#FFD700',
      featureKey: 'pickWinnerEnabled'
    },
    {
      icon: '🎯',
      title: '빙고 게임',
      description: '멤버들과 함께하는 빙고 게임',
      path: '/bingo',
      color: '#9C27B0'
    },
    {
      icon: 'ℹ️',
      title: 'About',
      description: '앱 정보 및 버전',
      path: '/about',
      color: '#2196F3'
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
      
      <div style={{ padding: '0 16px' }}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            className="card"
            onClick={() => navigate(item.path)}
            style={{
              cursor: 'pointer',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `${item.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                {item.description}
              </div>
            </div>
            <div style={{ color: '#ccc', fontSize: '20px' }}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Menu;
