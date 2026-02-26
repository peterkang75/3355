import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import logoImage from '../assets/logo-new.png';
import apiService from '../services/api';
import LoadingButton from '../components/LoadingButton';
import SearchableDropdown from '../components/SearchableDropdown';

function MemberInfoForm() {
  const { courses, members, refreshMembers } = useApp();
  const [step, setStep] = useState('login');
  const [phoneLastSix, setPhoneLastSix] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    gender: '',
    birthYear: '',
    region: '',
    isClubMember: '',
    club: '',
    handicap: '',
    gaHandy: '',
    houseHandy: '',
    golflinkNumber: '',
    clubMemberNumber: '',
    photo: ''
  });

  useEffect(() => {
    if (currentMember) {
      setFormData({
        name: currentMember.name || '',
        nickname: currentMember.nickname || '',
        gender: currentMember.gender || '',
        birthYear: currentMember.birthYear || '',
        region: currentMember.region || '',
        isClubMember: currentMember.isClubMember || (currentMember.club ? 'yes' : ''),
        club: currentMember.club || '',
        handicap: currentMember.handicap || '',
        gaHandy: currentMember.gaHandy || currentMember.handicap || '',
        houseHandy: currentMember.houseHandy || currentMember.handicap || '',
        golflinkNumber: currentMember.golflinkNumber || '',
        clubMemberNumber: currentMember.clubMemberNumber || '',
        photo: currentMember.photo || ''
      });
    }
  }, [currentMember]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (phoneLastSix.length !== 6 || !/^\d+$/.test(phoneLastSix)) {
      setError('전화번호 끝 6자리를 정확히 입력해주세요.');
      return;
    }

    setIsLoading(true);

    const foundMember = members.find(m => {
      const memberLastSix = String(m.phone).slice(-6);
      return memberLastSix === phoneLastSix;
    });

    if (!foundMember) {
      setError('등록되지 않은 전화번호입니다.');
      setIsLoading(false);
      return;
    }

    setCurrentMember(foundMember);
    setStep('form');
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.nickname || !formData.photo || 
        !formData.gender || !formData.birthYear || !formData.region) {
      setError('이름, 대화명, 사진, 성별, 출생연도, 지역은 필수 입력 항목입니다.');
      return;
    }

    if (formData.isClubMember === 'yes') {
      if (!formData.club || !formData.handicap || !formData.clubMemberNumber || !formData.golflinkNumber) {
        setError('소속 클럽 선택 시 핸디캡, 클럽회원번호, Golflink 번호는 필수 입력 항목입니다.');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      await apiService.updateMember(currentMember.id, {
        name: formData.name,
        nickname: formData.nickname,
        gender: formData.gender,
        birthYear: formData.birthYear,
        region: formData.region,
        isClubMember: formData.isClubMember,
        club: formData.isClubMember === 'yes' ? formData.club : null,
        handicap: formData.isClubMember === 'yes' ? formData.gaHandy : formData.houseHandy,
        gaHandy: formData.isClubMember === 'yes' ? formData.gaHandy : null,
        houseHandy: formData.isClubMember === 'no' ? formData.houseHandy : null,
        golflinkNumber: formData.isClubMember === 'yes' ? formData.golflinkNumber : null,
        clubMemberNumber: formData.isClubMember === 'yes' ? formData.clubMemberNumber : null,
        photo: formData.photo
      });

      setStep('complete');
    } catch (error) {
      setError('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
    setIsLoading(false);
  };

  if (step === 'complete') {
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
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <img 
            src={logoImage} 
            alt="3355 골프 클럽 로고" 
            style={{ 
              width: '100px', 
              height: '100px', 
              marginBottom: '20px',
              objectFit: 'cover',
              borderRadius: '50%'
            }} 
          />
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ 
            fontSize: '22px', 
            color: 'var(--primary-green)',
            marginBottom: '12px',
            fontWeight: '700'
          }}>
            정보 등록 완료
          </h2>
          <p style={{ 
            color: '#666', 
            fontSize: '15px',
            lineHeight: '1.6'
          }}>
            {formData.name}님의 회원정보가<br/>
            성공적으로 등록되었습니다.<br/><br/>
            감사합니다!
          </p>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        background: '#223B3F',
        padding: '20px',
        paddingTop: '40px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--border-color)',
          borderRadius: '16px',
          padding: '30px 24px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img 
              src={logoImage} 
              alt="3355 골프 클럽 로고" 
              style={{ 
                width: '80px', 
                height: '80px', 
                marginBottom: '12px',
                objectFit: 'cover',
                borderRadius: '50%'
              }} 
            />
            <h2 style={{ 
              fontSize: '20px', 
              color: 'var(--primary-green)',
              marginBottom: '4px',
              fontWeight: '700'
            }}>
              회원정보 입력
            </h2>
            <p style={{ color: '#666', fontSize: '13px' }}>
              전화번호: {currentMember?.phone?.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3')}
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              이름 *
            </label>
            <input
              type="text"
              placeholder="실명을 입력하세요"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              대화명 (닉네임) *
            </label>
            <input
              type="text"
              placeholder="모임에서 사용할 이름"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              사진 (본인) *
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
                      setFormData({ ...formData, photo: compressedDataUrl });
                    };
                    img.src = event.target.result;
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{ width: '100%' }}
            />
            {formData.photo && (
              <div style={{ marginTop: '8px' }}>
                <img 
                  src={formData.photo} 
                  alt="미리보기" 
                  style={{ 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'cover', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }} 
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              클럽 멤버이신가요? *
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="isClubMember"
                  value="yes"
                  checked={formData.isClubMember === 'yes'}
                  onChange={(e) => setFormData({ ...formData, isClubMember: e.target.value })}
                />
                <span>예</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="isClubMember"
                  value="no"
                  checked={formData.isClubMember === 'no'}
                  onChange={(e) => setFormData({ ...formData, isClubMember: e.target.value })}
                />
                <span>아니오</span>
              </label>
            </div>
          </div>

          {formData.isClubMember === 'yes' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                  소속 클럽 *
                </label>
                <SearchableDropdown
                  options={courses}
                  value={formData.club}
                  onChange={(value) => setFormData({ ...formData, club: value })}
                  placeholder="클럽 선택 (검색 가능)"
                  displayKey="name"
                  valueKey="name"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                  Golflink Number *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Golflink 번호"
                  value={formData.golflinkNumber}
                  onChange={(e) => setFormData({ ...formData, golflinkNumber: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                  클럽 회원번호 *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="클럽 회원번호"
                  value={formData.clubMemberNumber}
                  onChange={(e) => setFormData({ ...formData, clubMemberNumber: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                  GA 핸디캡 *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="GA 핸디캡"
                  value={formData.gaHandy}
                  onChange={(e) => setFormData({ ...formData, gaHandy: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </>
          )}

          {formData.isClubMember === 'no' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                핸디캡 *
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="핸디캡을 입력하세요"
                value={formData.houseHandy}
                onChange={(e) => setFormData({ ...formData, houseHandy: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              성별 *
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="gender"
                  value="남"
                  checked={formData.gender === '남'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                />
                <span>남</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="gender"
                  value="여"
                  checked={formData.gender === '여'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                />
                <span>여</span>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              출생연도 *
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="예: 1990"
              value={formData.birthYear}
              onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
              사는 지역 *
            </label>
            <input
              type="text"
              placeholder="예: Lidcombe, Ryde"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div className="error" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <LoadingButton 
            onClick={handleSave}
            className="btn-primary"
            loading={isLoading}
            loadingText="저장 중..."
            style={{ width: '100%' }}
          >
            정보 저장
          </LoadingButton>
        </div>
      </div>
    );
  }

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
            fontStyle: 'italic',
            marginBottom: '16px'
          }}>
            Love golf, Love people
          </p>
          <p style={{ 
            color: '#666', 
            fontSize: '14px',
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '8px'
          }}>
            회원정보 입력을 위해<br/>전화번호 끝 6자리를 입력해주세요
          </p>
        </div>

        <form onSubmit={handleLogin}>
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

          <LoadingButton 
            type="submit" 
            className="btn-primary"
            loading={isLoading}
            loadingText="확인 중..."
            style={{ width: '100%' }}
          >
            확인
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}

export default MemberInfoForm;
