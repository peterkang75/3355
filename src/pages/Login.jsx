import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import logoImage from '../assets/logo-new.png';
import apiService from '../services/api';

function Login({ onLogin }) {
  const { courses, members, refreshMembers } = useApp();
  const [phoneLastSix, setPhoneLastSix] = useState('');
  const [error, setError] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    nickname: '',
    phone: '',
    gender: '',
    birthYear: '',
    region: '',
    isClubMember: '',
    club: '',
    handicap: '',
    golflinkNumber: '',
    clubMemberNumber: '',
    photo: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (phoneLastSix.length !== 6 || !/^\d+$/.test(phoneLastSix)) {
      setError('전화번호 끝 6자리를 정확히 입력해주세요.');
      return;
    }

    const foundMember = members.find(m => {
      const memberLastSix = String(m.phone).slice(-6);
      return memberLastSix === phoneLastSix;
    });

    if (!foundMember) {
      setError('등록되지 않은 전화번호입니다. 회원가입을 먼저 진행해주세요.');
      return;
    }

    if (foundMember.isActive === false) {
      setError('비활성화된 계정입니다. 관리자에게 문의하세요.');
      return;
    }

    if (foundMember.approvalStatus === 'pending') {
      setError('회원가입 승인 대기 중입니다. 운영진의 승인을 기다려주세요.');
      return;
    }

    if (foundMember.approvalStatus === 'rejected') {
      setError('회원가입이 거부되었습니다. 관리자에게 문의하세요.');
      return;
    }

    console.log('🔐 로그인 시도:', foundMember.name);
    console.log('📋 Member 정보:', JSON.stringify(foundMember, null, 2));
    
    localStorage.clear();
    
    onLogin(foundMember);
  };

  const handleSignup = async () => {
    console.log('🔵 회원가입 시작');
    
    if (!newMember.name || !newMember.phone) {
      setError('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (newMember.phone.length !== 10 || !/^\d+$/.test(newMember.phone)) {
      setError('전화번호 10자리를 정확히 입력해주세요.');
      return;
    }

    const userData = {
      ...newMember,
      isAdmin: false,
      balance: 0
    };

    console.log('📤 데이터베이스에 저장 시도:', userData);
    
    try {
      const result = await apiService.createMember(userData);
      console.log('✅ 저장 결과:', result);
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      if (result.approvalStatus === 'pending') {
        alert('회원가입이 완료되었습니다! 운영진의 승인을 기다려주세요.');
      } else {
        alert('회원가입이 완료되었습니다! 전화번호 끝 6자리로 로그인해주세요.');
      }
      setShowSignup(false);
    } catch (error) {
      console.error('❌ 저장 실패:', error);
      setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
      return;
    }
    setNewMember({
      name: '',
      nickname: '',
      phone: '',
      gender: '',
      birthYear: '',
      region: '',
      isClubMember: '',
      club: '',
      handicap: '',
      golflinkNumber: '',
      clubMemberNumber: '',
      photo: ''
    });
    setPhoneLastSix('');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#223B3F',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '2px solid var(--border-color)',
        borderRadius: '16px',
        padding: '40px 30px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src={logoImage} 
            alt="3355 골프 클럽 로고" 
            style={{ 
              width: '120px', 
              height: '120px', 
              marginBottom: '16px',
              objectFit: 'cover',
              borderRadius: '50%'
            }} 
          />
          <h1 style={{ 
            fontSize: '24px', 
            color: 'var(--primary-green)',
            marginBottom: '8px',
            fontWeight: '700'
          }}>
            3355 골프 클럽
          </h1>
          <p style={{ 
            color: 'var(--primary-green)', 
            fontSize: '20px',
            fontFamily: "'Dancing Script', cursive",
            fontWeight: '600',
            fontStyle: 'italic'
          }}>
            Love golf, Love people
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              전화번호 끝 6자리
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={phoneLastSix}
              onChange={(e) => setPhoneLastSix(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="예: 123456"
              maxLength={6}
              style={{
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '2px'
              }}
            />
          </div>

          {error && (
            <div className="error" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary">
            로그인
          </button>
        </form>

        <button 
          onClick={() => setShowSignup(!showSignup)}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '14px',
            background: 'white',
            color: 'var(--primary-green)',
            borderBottom: '1px solid var(--primary-green)',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {showSignup ? '로그인으로 돌아가기' : '회원가입'}
        </button>

        {showSignup && (
          <div style={{ 
            marginTop: '24px',
            padding: '20px',
            background: 'var(--bg-card)',
            border: '2px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
              새 회원 가입
            </h3>
            <input
              type="text"
              placeholder="이름"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              style={{ marginBottom: '12px', width: '100%' }}
            />
            <input
              type="text"
              placeholder="대화명 (닉네임)"
              value={newMember.nickname}
              onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
              style={{ marginBottom: '12px', width: '100%' }}
            />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="전화번호 (예: 0100 123 456)"
              value={newMember.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setNewMember({ ...newMember, phone: digits });
              }}
              maxLength={12}
              style={{ marginBottom: '12px', width: '100%' }}
            />
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', opacity: 0.7 }}>
                사진 (본인)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
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
                        setNewMember({ ...newMember, photo: compressedDataUrl });
                      };
                      img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ marginBottom: '8px', width: '100%' }}
              />
              {newMember.photo && (
                <div style={{ marginTop: '8px' }}>
                  <img 
                    src={newMember.photo} 
                    alt="미리보기" 
                    style={{ 
                      width: '100px', 
                      height: '100px', 
                      objectFit: 'cover', 
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }} 
                  />
                </div>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                성별
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="남"
                    checked={newMember.gender === '남'}
                    onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })}
                  />
                  <span>남</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="여"
                    checked={newMember.gender === '여'}
                    onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })}
                  />
                  <span>여</span>
                </label>
              </div>
            </div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="출생연도 (예: 1990)"
              value={newMember.birthYear}
              onChange={(e) => setNewMember({ ...newMember, birthYear: e.target.value })}
              style={{ marginBottom: '12px', width: '100%' }}
            />
            <input
              type="text"
              placeholder="사는 지역 (예: Lidcombe, Ryde)"
              value={newMember.region}
              onChange={(e) => setNewMember({ ...newMember, region: e.target.value })}
              style={{ marginBottom: '12px', width: '100%' }}
            />
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                클럽 멤버이신가요?
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="isClubMember"
                    value="yes"
                    checked={newMember.isClubMember === 'yes'}
                    onChange={(e) => setNewMember({ ...newMember, isClubMember: e.target.value })}
                  />
                  <span>예</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="isClubMember"
                    value="no"
                    checked={newMember.isClubMember === 'no'}
                    onChange={(e) => setNewMember({ ...newMember, isClubMember: e.target.value })}
                  />
                  <span>아니오</span>
                </label>
              </div>
            </div>
            {newMember.isClubMember === 'yes' && (
              <>
                <select
                  value={newMember.club}
                  onChange={(e) => setNewMember({ ...newMember, club: e.target.value })}
                  style={{ marginBottom: '12px', width: '100%' }}
                >
                  <option value="">소속 클럽 선택</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Golflink Number (선택)"
                  value={newMember.golflinkNumber}
                  onChange={(e) => setNewMember({ ...newMember, golflinkNumber: e.target.value })}
                  style={{ marginBottom: '12px', width: '100%' }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="클럽 회원번호 (선택)"
                  value={newMember.clubMemberNumber}
                  onChange={(e) => setNewMember({ ...newMember, clubMemberNumber: e.target.value })}
                  style={{ marginBottom: '12px', width: '100%' }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="핸디 (선택)"
                  value={newMember.handicap}
                  onChange={(e) => setNewMember({ ...newMember, handicap: e.target.value })}
                  style={{ marginBottom: '12px', width: '100%' }}
                />
              </>
            )}
            {error && (
              <div className="error" style={{ marginBottom: '12px' }}>
                {error}
              </div>
            )}
            <button 
              onClick={handleSignup}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              가입하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
