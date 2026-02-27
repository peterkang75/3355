import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import CrownIcon from '../components/CrownIcon';
import adminIcon from '../assets/role-admin.png';
import bangjangIcon from '../assets/role-bangjang.png';
import staffIcon from '../assets/role-staff.png';
import clubStaffIcon from '../assets/role-club-staff.png';
import { Card, Button, PageHeader, ProfileBadge } from '../components/common';

function MyPage() {
  const { user, logout, refreshMembers, courses, bookings } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(user || {});
  const [scores, setScores] = useState([]);

  useEffect(() => {
    if (location.state?.reset) {
      setIsEditing(false);
      if (user) {
        setEditData({ ...user, isMember: user.isClubMember || '' });
      }
      window.history.replaceState({}, document.title);
    }
  }, [location, user]);

  useEffect(() => {
    console.log('👤 MyPage - user 객체:', user);
    if (user) {
      console.log('📋 User ID:', user.id);
      console.log('📋 User Name:', user.name);
      console.log('📋 User Phone:', user.phone);
      console.log('📋 User 전체:', JSON.stringify(user, null, 2));
      setEditData({ ...user, isMember: user.isClubMember || '' });
      loadScores();
    }
  }, [user]);

  const loadScores = async () => {
    if (!user?.id) return;
    try {
      const response = await apiService.fetchScores(user.id);
      const validScores = (response || []).filter(score => score.totalScore >= 1);
      setScores(validScores);
    } catch (error) {
      console.error('스코어 로드 실패:', error);
      setScores([]);
    }
  };

  const handleSave = async () => {
    if (!editData.name || !editData.nickname || !editData.birthYear) {
      alert('이름, 대화명, 출생연도는 필수 입력 항목입니다.');
      return;
    }

    if (editData.club) {
      if (!editData.handicap || !editData.clubMemberNumber || !editData.golflinkNumber) {
        alert('소속 클럽 선택 시 핸디캡, 클럽회원번호, Golflink 번호는 필수 입력 항목입니다.');
        return;
      }
    }

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
        region: editData.region,
        isClubMember: editData.isMember
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
        color: 'var(--text-dark)',
        opacity: 0.7
      }}>
        로그인 정보를 불러오는 중...
      </div>
    );
  }

  const handicapValue = user.calculatedHandicap ?? user.handicap ?? 18;
  const handicapType = user.handicapType || (user.golflinkNumber ? 'GA' : 'HH');
  const handicapExplanation = user.handicapExplanation || '계산 대기 중';

  return (
    <div style={{ paddingBottom: '80px' }}>
      <PageHeader 
        title="마이 페이지" 
        rightContent={<ProfileBadge user={user} showGreeting={true} />}
      />

      <div className="page-content">
        <Card style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block', 
            position: 'relative',
            marginBottom: '16px'
          }}>
            {(isEditing ? editData.photo : user.photo) ? (
              <img 
                src={isEditing ? editData.photo : user.photo} 
                alt={user.name}
                style={{
                  width: '120px',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '50%',
                  border: '3px solid #E5E7EB'
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                background: '#F3F4F6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: '#9CA3AF',
                border: '3px solid #E5E7EB'
              }}>
                👤
              </div>
            )}
            
            {!isEditing && user.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(user.role) && (
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                zIndex: 10
              }}>
                {user.role === '관리자' && <img src={adminIcon} alt="관리자" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                {user.role === '방장' && <img src={bangjangIcon} alt="방장" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                {user.role === '운영진' && <img src={staffIcon} alt="운영진" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                {user.role === '클럽운영진' && <img src={clubStaffIcon} alt="클럽운영진" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
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
                  color: 'var(--text-light)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ○ 사진 변경
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
            color: '#111827'
          }}>
            {user.nickname || user.name}
          </h2>
          
          <div style={{ 
            fontSize: '16px', 
            color: 'var(--text-dark)',
            opacity: 0.7,
            marginBottom: '12px'
          }}>
            {user.name}
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#F3F4F6',
              borderRadius: '20px',
              fontSize: '16px',
              fontWeight: '700',
              color: '#374151'
            }}>
              추천핸디: {handicapType}({handicapValue})
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-dark)',
              opacity: 0.7,
              fontStyle: 'italic',
              maxWidth: '90%',
              lineHeight: '1.4'
            }}>
              {handicapExplanation}
            </div>
          </div>

        </Card>

        {!isEditing ? (
          <>
            <Card style={{ marginBottom: '16px' }}>
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
                  color: '#111827'
                }}>
                  기본 정보
                </h3>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  수정
                </Button>
              </div>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <InfoRow label="전화번호" value={user.phone ? String(user.phone).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : '-'} />
                <InfoRow label="성별" value={user.gender || '-'} />
                <InfoRow label="출생연도" value={user.birthYear || '-'} />
                <InfoRow label="지역" value={user.region || '-'} />
                {(user.club || user.golflinkNumber || user.clubMemberNumber) && (
                  <>
                    <InfoRow label="클럽" value={user.club || '-'} />
                    <InfoRow label="GA Handy" value={user.handicap || '-'} />
                    <InfoRow label="Golflink 번호" value={user.golflinkNumber || '-'} />
                    <InfoRow label="클럽 회원번호" value={user.clubMemberNumber || '-'} />
                  </>
                )}
              </div>
            </Card>
          </>
        ) : (
          <Card style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              marginBottom: '16px',
              color: 'var(--primary-green)'
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
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                클럽 멤버십니까?
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="isMember"
                    value="yes"
                    checked={editData.isMember === 'yes'}
                    onChange={(e) => setEditData({ ...editData, isMember: e.target.value })}
                  />
                  <span>예</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="radio"
                    name="isMember"
                    value="no"
                    checked={editData.isMember === 'no'}
                    onChange={(e) => setEditData({ 
                      ...editData, 
                      isMember: e.target.value,
                      club: '',
                      golflinkNumber: '',
                      clubMemberNumber: ''
                    })}
                  />
                  <span>아니오</span>
                </label>
              </div>
            </div>

            {editData.isMember === 'yes' && (
              <>
                <select
                  value={editData.club || ''}
                  onChange={(e) => setEditData({ ...editData, club: e.target.value })}
                  style={{ marginBottom: '12px' }}
                >
                  <option value="">소속 클럽 선택</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="GA Handy"
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
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditData(user);
                }}
                variant="danger"
                style={{ flex: 1 }}
              >
                취소하기
              </Button>
              <Button
                onClick={handleSave}
                variant="primary"
                style={{ flex: 1 }}
              >
                저장
              </Button>
            </div>
          </Card>
        )}

        <Card style={{ marginBottom: '16px' }}>
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
              color: '#111827'
            }}>
              스코어 히스토리
            </h3>
            <span style={{
              fontSize: '14px',
              color: 'var(--text-dark)',
              opacity: 0.7,
              fontWeight: '600'
            }}>
              총 {scores.length}라운드
            </span>
          </div>

          {scores.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-dark)',
              opacity: 0.7,
              fontSize: '14px'
            }}>
              아직 기록된 스코어가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {scores.map((score, index) => {
                const matchingBooking = bookings.find(b => b.title === score.roundingName);
                const handleScoreClick = () => {
                  if (matchingBooking) {
                    navigate(`/leaderboard?id=${matchingBooking.id}&userId=${user.id}&openScorecard=true`);
                  }
                };
                
                return (
                  <div
                    key={index}
                    onClick={handleScoreClick}
                    style={{
                      padding: '12px',
                      background: '#F9FAFB',
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      cursor: matchingBooking ? 'pointer' : 'default',
                      transition: 'transform 0.1s ease'
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
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {score.roundingName}
                        {matchingBooking && (
                          <span style={{ fontSize: '10px', color: '#9CA3AF' }}>→</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#111827'
                      }}>
                        {score.totalScore}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--text-dark)',
                      opacity: 0.7
                    }}>
                      {score.courseName} · {new Date(score.date).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div style={{ marginTop: '20px', textAlign: 'center', paddingBottom: '20px' }}>
          <Button
            onClick={() => {
              if (window.confirm('로그아웃 하시겠습니까?')) {
                logout();
              }
            }}
            variant="ghost"
            style={{
              color: 'var(--alert-red)',
              textDecoration: 'underline'
            }}
          >
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '14px 12px',
      background: '#F8FAFC',
      borderRadius: '8px',
      gap: '12px'
    }}>
      <span style={{ 
        fontSize: '13px', 
        color: '#666',
        fontWeight: '500',
        minWidth: '90px',
        flexShrink: 0
      }}>
        {label}
      </span>
      <span style={{ 
        fontSize: '15px', 
        fontWeight: '600',
        color: '#333'
      }}>
        {value}
      </span>
    </div>
  );
}

export default MyPage;
