import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

function MyPage() {
  const { user, updateUser, scores, logout } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    nickname: user?.nickname || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    birthYear: user?.birthYear || '',
    region: user?.region || '',
    club: user?.club || '',
    handicap: user?.handicap || '',
    golflinkNumber: user?.golflinkNumber || '',
    clubMemberNumber: user?.clubMemberNumber || '',
    photo: user?.photo || ''
  });

  const handleSaveProfile = () => {
    updateUser(profileData);
    setEditMode(false);
    alert('프로필이 저장되었습니다.');
  };

  return (
    <div>
      <div className="header">
        <h1>마이페이지</h1>
      </div>

      <div style={{ 
        background: 'white',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        position: 'sticky',
        top: '0',
        zIndex: 50
      }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'profile' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'profile' ? 'white' : '#666',
            fontWeight: activeTab === 'profile' ? '600' : '400',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          프로필 변경
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'fees' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'fees' ? 'white' : '#666',
            fontWeight: activeTab === 'fees' ? '600' : '400',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          회비내역
        </button>
        <button
          onClick={() => setActiveTab('scores')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'scores' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'scores' ? 'white' : '#666',
            fontWeight: activeTab === 'scores' ? '600' : '400',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          경기기록
        </button>
      </div>

      <div className="page-content">
        {activeTab === 'profile' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>프로필 정보</h3>
              {!editMode ? (
                <button 
                  className="btn-secondary"
                  onClick={() => setEditMode(true)}
                  style={{ padding: '8px 16px' }}
                >
                  수정
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-outline"
                    onClick={() => {
                      setEditMode(false);
                      setProfileData({
                        name: user?.name || '',
                        nickname: user?.nickname || '',
                        phone: user?.phone || '',
                        gender: user?.gender || '',
                        birthYear: user?.birthYear || '',
                        region: user?.region || '',
                        club: user?.club || '',
                        handicap: user?.handicap || '',
                        golflinkNumber: user?.golflinkNumber || '',
                        clubMemberNumber: user?.clubMemberNumber || '',
                        photo: user?.photo || ''
                      });
                    }}
                    style={{ padding: '8px 16px' }}
                  >
                    취소
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleSaveProfile}
                    style={{ padding: '8px 16px', marginTop: '0' }}
                  >
                    저장
                  </button>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {profileData.photo ? (
                  <img 
                    src={profileData.photo} 
                    alt="프로필" 
                    style={{ 
                      width: '140px', 
                      height: '140px', 
                      objectFit: 'cover', 
                      borderRadius: '50%',
                      border: '4px solid var(--primary-green)'
                    }} 
                  />
                ) : (
                  <div style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    border: '4px solid var(--border-color)',
                    background: 'var(--bg-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '60px'
                  }}>
                    👤
                  </div>
                )}
              </div>
              {editMode && (
                <div style={{ marginTop: '16px' }}>
                  <label 
                    htmlFor="photoUpload"
                    style={{ 
                      display: 'inline-block',
                      padding: '8px 16px',
                      background: 'var(--light-green)',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    📷 사진 변경
                  </label>
                  <input
                    id="photoUpload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setProfileData({ ...profileData, photo: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>

            {editMode ? (
              <>
                <input
                  type="text"
                  placeholder="이름"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="대화명"
                  value={profileData.nickname}
                  onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="지역"
                  value={profileData.region}
                  onChange={(e) => setProfileData({ ...profileData, region: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="소속 클럽"
                  value={profileData.club}
                  onChange={(e) => setProfileData({ ...profileData, club: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="number"
                  placeholder="핸디캡"
                  value={profileData.handicap}
                  onChange={(e) => setProfileData({ ...profileData, handicap: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
              </>
            ) : (
              <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                  <strong>이름:</strong> {user?.name || '-'}
                </div>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                  <strong>대화명:</strong> {user?.nickname || '-'}
                </div>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                  <strong>전화번호:</strong> {user?.phone?.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') || '-'}
                </div>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                  <strong>성별:</strong> {user?.gender || '-'}
                </div>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                  <strong>출생연도:</strong> {user?.birthYear || '-'}
                </div>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                  <strong>지역:</strong> {user?.region || '-'}
                </div>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                  <strong>소속 클럽:</strong> {user?.club || '-'}
                </div>
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                  <strong>핸디캡:</strong> {user?.handicap || '-'}
                </div>
                {user?.golflinkNumber && (
                  <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-green)', borderRadius: '8px' }}>
                    <strong>Golflink Number:</strong> {user?.golflinkNumber}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'fees' && (
          <div>
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>회비 내역</h3>
              <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
                회비 내역 기능은 회비 메뉴에서 확인하실 수 있습니다.
              </p>
              <button 
                className="btn-primary"
                onClick={() => navigate('/fees')}
                style={{ width: '100%' }}
              >
                회비 메뉴로 이동
              </button>
            </div>
          </div>
        )}

        {activeTab === 'scores' && (
          <div>
            <div className="card">
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>경기 기록</h3>
              {scores && scores.length > 0 ? (
                <div>
                  {[...scores]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5)
                    .map((score, index) => (
                    <div 
                      key={index}
                      style={{ 
                        padding: '16px',
                        background: 'var(--bg-green)',
                        borderRadius: '8px',
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                        {score.courseName || '골프장'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        <div>날짜: {score.date ? new Date(score.date).toLocaleDateString() : '-'}</div>
                        <div>스코어: {score.score || '-'}</div>
                      </div>
                    </div>
                  ))}
                  <button 
                    className="btn-outline"
                    onClick={() => navigate('/score')}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    전체 기록 보기
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
                    아직 등록된 경기 기록이 없습니다.
                  </p>
                  <button 
                    className="btn-primary"
                    onClick={() => navigate('/score')}
                    style={{ width: '100%' }}
                  >
                    스코어 입력하기
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '20px' }}>
          <button
            onClick={() => {
              if (window.confirm('로그아웃 하시겠습니까?')) {
                logout();
                navigate('/');
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '12px',
              textDecoration: 'underline'
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

export default MyPage;
