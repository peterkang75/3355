import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import logoImage from '../assets/logo.jpeg';

function Login({ onLogin }) {
  const { courses } = useContext(AppContext);
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

    const mockMembers = [
      { id: '123456', name: '관리자', phone: '0100123456', isAdmin: true, handicap: 18, balance: 0 },
      { id: '111111', name: '회원1', phone: '0100111111', isAdmin: false, handicap: 20, balance: -50000 },
      { id: '222222', name: '회원2', phone: '0100222222', isAdmin: false, handicap: 15, balance: 0 }
    ];

    const foundMember = mockMembers.find(m => m.id === phoneLastSix);

    const mockUser = foundMember || {
      id: phoneLastSix,
      phone: '0100' + phoneLastSix,
      name: '회원',
      isAdmin: false,
      handicap: 18,
      balance: 0
    };

    onLogin(mockUser);
  };

  const handleSignup = () => {
    if (!newMember.name || !newMember.phone) {
      setError('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (newMember.phone.length !== 10 || !/^\d+$/.test(newMember.phone)) {
      setError('전화번호 10자리를 정확히 입력해주세요.');
      return;
    }

    const lastSixDigits = newMember.phone.slice(-6);
    const userData = {
      id: lastSixDigits,
      ...newMember,
      isAdmin: false,
      balance: 0
    };

    alert('회원가입이 완료되었습니다! 전화번호 끝 6자리로 로그인해주세요.');
    setShowSignup(false);
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
    setPhoneLastSix(lastSixDigits);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #2d5f3f 0%, #3a7d54 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px 30px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src={logoImage} 
            alt="3355 골프 클럽 로고" 
            style={{ 
              width: '120px', 
              height: '120px', 
              marginBottom: '16px',
              objectFit: 'contain'
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
          <p style={{ color: '#666', fontSize: '14px' }}>
            전화번호 끝 6자리로 로그인하세요
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-dark)'
            }}>
              전화번호 끝 6자리
            </label>
            <input
              type="text"
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
            border: '2px solid var(--primary-green)',
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
            background: 'var(--bg-green)',
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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                사진 (본인)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setNewMember({ ...newMember, photo: reader.result });
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
                      border: '2px solid var(--border-color)'
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
                  placeholder="Golflink Number (선택)"
                  value={newMember.golflinkNumber}
                  onChange={(e) => setNewMember({ ...newMember, golflinkNumber: e.target.value })}
                  style={{ marginBottom: '12px', width: '100%' }}
                />
                <input
                  type="text"
                  placeholder="클럽 회원번호 (선택)"
                  value={newMember.clubMemberNumber}
                  onChange={(e) => setNewMember({ ...newMember, clubMemberNumber: e.target.value })}
                  style={{ marginBottom: '12px', width: '100%' }}
                />
                <input
                  type="number"
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

        {!showSignup && (
          <div style={{ 
            marginTop: '24px', 
            padding: '16px',
            background: 'var(--bg-green)',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#666'
          }}>
            <p style={{ marginBottom: '8px' }}>💡 테스트 계정:</p>
            <p>관리자: <strong>123456</strong></p>
            <p>일반회원: <strong>아무 6자리 숫자</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
