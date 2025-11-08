import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

function MyPage() {
  const { user, logout, refreshMembers } = useApp();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(user || {});
  const [scores, setScores] = useState([]);

  useEffect(() => {
    console.log('👤 MyPage - user 객체:', user);
    if (user) {
      console.log('📋 User ID:', user.id);
      console.log('📋 User Name:', user.name);
      console.log('📋 User Phone:', user.phone);
      console.log('📋 User 전체:', JSON.stringify(user, null, 2));
      setEditData(user);
      loadScores();
    }
  }, [user]);

  const loadScores = async () => {
    if (!user?.id) return;
    try {
      const response = await apiService.fetchScores(user.id);
      setScores(response || []);
    } catch (error) {
      console.error('스코어 로드 실패:', error);
      setScores([]);
    }
  };

  const handleSave = async () => {
    try {
      const updateData = {
        name: editData.name,
        nickname: editData.nickname,
        phone: editData.phone,
        club: editData.club,
        handicap: editData.handicap,
        golflinkNumber: editData.golflinkNumber,
        clubMemberNumber: editData.clubMemberNumber,
        photo: editData.photo,
        gender: editData.gender,
        birthYear: editData.birthYear,
        region: editData.region
      };
      await apiService.updateMember(user.id, updateData);
      await refreshMembers();
      setIsEditing(false);
      alert('프로필 정보가 수정되었습니다!');
    } catch (error) {
      console.error('프로필 정보 수정 실패:', error);
      alert('프로필 정보 수정에 실패했습니다.');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setEditData({ ...editData, photo: compressedDataUrl });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#666'
      }}>
        로그인 정보를 불러오는 중...
      </div>
    );
  }

  const handicapDisplay = user.golflinkNumber 
    ? `GA(${user.handicap})` 
    : `HH(${user.handicap})`;

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'white',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 100,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            color: 'var(--primary-green)'
          }}
        >
          ←
        </button>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: '700',
          margin: 0,
          flex: 1,
          textAlign: 'center'
        }}>
          마이페이지
        </h1>
        <div style={{ width: '40px' }}></div>
      </div>

      <div style={{ padding: '16px' }}>
        <div className="card" style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            {(isEditing ? editData.photo : user.photo) ? (
              <img 
                src={isEditing ? editData.photo : user.photo} 
                alt={user.name}
                style={{
                  width: '120px',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  border: '3px solid var(--primary-green)',
                  margin: '0 auto'
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                background: '#ddd',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
                color: '#999',
                border: '3px solid var(--primary-green)',
                margin: '0 auto'
              }}>
                👤
              </div>
            )}
          </div>

          {isEditing && (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
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
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}

          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700',
            marginBottom: '8px',
            color: '#2d5f3f'
          }}>
            {user.nickname || user.name}
          </h2>
          
          <div style={{ 
            fontSize: '16px', 
            color: '#666',
            marginBottom: '12px'
          }}>
            {user.name}
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'var(--bg-green)',
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: '700',
            color: 'var(--primary-green)'
          }}>
            핸디캡: {handicapDisplay}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px'
          }}>
            {user.role === 'admin' && (
              <span style={{
                padding: '4px 12px',
                background: '#d4af37',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                👑 관리자
              </span>
            )}
            {user.role === 'operator' && (
              <span style={{
                padding: '4px 12px',
                background: 'var(--primary-green)',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                ⚙️ 운영진
              </span>
            )}
          </div>
        </div>

        {!isEditing ? (
          <>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '700',
                  margin: 0,
                  color: '#2d5f3f'
                }}>
                  기본 정보
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                >
                  ✏️ 수정
                </button>
              </div>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <InfoRow label="전화번호" value={user.phone ? String(user.phone).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : '-'} />
                <InfoRow label="성별" value={user.gender || '-'} />
                <InfoRow label="출생연도" value={user.birthYear || '-'} />
                <InfoRow label="지역" value={user.region || '-'} />
                <InfoRow label="클럽" value={user.club || '-'} />
                <InfoRow label="Golflink 번호" value={user.golflinkNumber || '-'} />
                <InfoRow label="클럽 회원번호" value={user.clubMemberNumber || '-'} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: '#2d5f3f'
              }}>
                회비 정보
              </h3>
              
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: user.balance < 0 ? '#e53e3e' : '#22c55e',
                textAlign: 'center',
                padding: '16px',
                background: user.balance < 0 ? '#fee' : '#efe',
                borderRadius: '8px'
              }}>
                {user.balance < 0 ? '미수금' : '잔액'}: ${Math.abs(user.balance || 0).toLocaleString()}
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              marginBottom: '16px',
              color: '#2d5f3f'
            }}>
              프로필 정보 수정
            </h3>
            
            <input
              type="text"
              placeholder="이름"
              value={editData.name || ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="text"
              placeholder="대화명 (닉네임)"
              value={editData.nickname || ''}
              onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="전화번호"
              value={editData.phone || ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setEditData({ ...editData, phone: digits });
              }}
              style={{ marginBottom: '12px' }}
            />
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                성별
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="남"
                    checked={editData.gender === '남'}
                    onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                  />
                  <span>남</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="여"
                    checked={editData.gender === '여'}
                    onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                  />
                  <span>여</span>
                </label>
              </div>
            </div>

            <input
              type="number"
              inputMode="numeric"
              placeholder="출생연도"
              value={editData.birthYear || ''}
              onChange={(e) => setEditData({ ...editData, birthYear: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="text"
              placeholder="지역"
              value={editData.region || ''}
              onChange={(e) => setEditData({ ...editData, region: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="text"
              placeholder="클럽"
              value={editData.club || ''}
              onChange={(e) => setEditData({ ...editData, club: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="핸디캡"
              value={editData.handicap || ''}
              onChange={(e) => setEditData({ ...editData, handicap: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="text"
              placeholder="Golflink 번호"
              value={editData.golflinkNumber || ''}
              onChange={(e) => setEditData({ ...editData, golflinkNumber: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="text"
              placeholder="클럽 회원번호"
              value={editData.clubMemberNumber || ''}
              onChange={(e) => setEditData({ ...editData, clubMemberNumber: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={handleSave}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                💾 저장
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData(user);
                }}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                ✕ 취소
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              margin: 0,
              color: '#2d5f3f'
            }}>
              스코어 히스토리
            </h3>
            <span style={{
              fontSize: '14px',
              color: '#666',
              fontWeight: '600'
            }}>
              총 {scores.length}라운드
            </span>
          </div>

          {scores.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#999',
              fontSize: '14px'
            }}>
              아직 기록된 스코어가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {scores.map((score, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-green)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#2d5f3f'
                    }}>
                      {score.roundingName}
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'var(--primary-green)'
                    }}>
                      {score.totalScore}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    {score.courseName} · {new Date(score.date).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', paddingBottom: '20px' }}>
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

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 12px',
      background: 'var(--bg-green)',
      borderRadius: '6px'
    }}>
      <span style={{ 
        fontSize: '14px', 
        color: '#666',
        fontWeight: '600'
      }}>
        {label}
      </span>
      <span style={{ 
        fontSize: '14px', 
        fontWeight: '600',
        color: '#2d5f3f'
      }}>
        {value}
      </span>
    </div>
  );
}

export default MyPage;
