import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import defaultLogoImage from '../assets/logo-new.png';

function JoinPage() {
  const { courses = [], members = [], refreshMembers, refreshCourses, clubLogo } = useApp();
  const logoImage = clubLogo || defaultLogoImage;

  const [form, setForm] = useState({
    name: '', nickname: '', phone: '', gender: '',
    birthYear: '', region: '', photo: '',
    isClubMember: '', club: '', gaHandy: '', houseHandy: '',
    golflinkNumber: '', clubMemberNumber: '',
  });
  const [clubSearchInput, setClubSearchInput] = useState('');
  const [clubSearchState, setClubSearchState] = useState('idle'); // idle | searching | done | error
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [kakaoUrl, setKakaoUrl] = useState('');

  /* ── 카카오 URL 로드 ── */
  useEffect(() => {
    if (!done) return;
    apiService.fetchSettings().then(settings => {
      const s = settings.find(s => s.feature === 'kakaoOpenChatUrl');
      if (s?.value) setKakaoUrl(s.value);
    }).catch(() => {});
  }, [done]);

  /* ── 스타일 상수 ── */
  const fieldStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 14px', borderRadius: 12,
    border: '1.5px solid #e2e8f0', fontSize: 15,
    color: '#1e293b', background: '#f8fafc',
    outline: 'none', display: 'block', minWidth: 0,
  };
  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: '#64748b', marginBottom: 6, letterSpacing: '0.03em',
  };
  const sectionStyle = { marginBottom: 18 };
  const toggleRowStyle = { display: 'flex', gap: 10, width: '100%' };
  const toggleBtn = (active) => ({
    flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid',
    fontWeight: 700, fontSize: 14, cursor: 'pointer',
    borderColor: active ? '#0047AB' : '#e2e8f0',
    background: active ? '#EFF6FF' : '#f8fafc',
    color: active ? '#0047AB' : '#64748b',
  });

  /* ── 사진 압축 ── */
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert('이미지는 8MB 이하만 가능합니다.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 600;
        let w = img.width, h = img.height;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
        else if (h > max) { w = Math.round(w * max / h); h = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setForm(f => ({ ...f, photo: canvas.toDataURL('image/jpeg', 0.78) }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  /* ── 클럽 스마트 검색 ── */
  const handleClubSearch = async () => {
    const query = clubSearchInput.trim();
    if (!query) return;
    // 1) 기존 목록에서 먼저
    const found = courses.find(c => c.name.toLowerCase().includes(query.toLowerCase()));
    if (found) {
      setForm(f => ({ ...f, club: found.name }));
      setClubSearchInput('');
      setClubSearchState('done');
      return;
    }
    // 2) AI 검색
    setClubSearchState('searching');
    try {
      const result = await apiService.searchCourse(query);
      const malePars = (result.holePars?.male || []).map(p => parseInt(p) || 4);
      const femalePars = (result.holePars?.female || []).map(p => parseInt(p) || 4);
      await apiService.createCourse({
        name: result.name || query,
        address: result.address || '',
        holePars: { male: malePars, female: femalePars },
        nearHoles: Array(18).fill(false),
        isCompetition: false,
      });
      if (refreshCourses) await refreshCourses();
      setForm(f => ({ ...f, club: result.name || query }));
      setClubSearchInput('');
      setClubSearchState('done');
    } catch {
      setClubSearchState('error');
    }
  };

  /* ── 가입 제출 ── */
  const handleSubmit = async () => {
    if (submitting) return;
    setError('');

    if (!form.name || !form.nickname || !form.phone || !form.photo || !form.gender || !form.birthYear || !form.region) {
      setError('이름, 대화명, 전화번호, 사진, 성별, 출생연도, 지역은 필수 항목입니다.');
      return;
    }
    if (form.phone.length !== 10 || !/^\d+$/.test(form.phone)) {
      setError('전화번호 10자리를 정확히 입력해주세요.');
      return;
    }
    if (members.find(m => m.phone === form.phone)) {
      setError('이미 등록된 전화번호입니다. 로그인 화면에서 로그인해주세요.');
      return;
    }
    if (form.isClubMember === 'yes') {
      if (!form.club || !form.gaHandy || !form.golflinkNumber || !form.clubMemberNumber) {
        setError('클럽 회원인 경우 소속 클럽, GA 핸디캡, Golflink 번호, 클럽 회원번호는 필수입니다.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await apiService.createMember({
        ...form,
        handicap: form.isClubMember === 'yes' ? form.gaHandy : form.houseHandy,
        isAdmin: false,
        balance: 0,
      });
      if (refreshMembers) await refreshMembers();
      setDone(true);
    } catch {
      setError('가입 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
    setSubmitting(false);
  };

  /* ── 완료 화면 ── */
  if (done) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        overflowY: 'auto', overflowX: 'hidden',
        background: 'linear-gradient(160deg, #003f9e 0%, #0047AB 40%, #1565c0 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '24px 20px',
        paddingTop: 'max(24px, env(safe-area-inset-top))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}>
        {/* 별 파티클 느낌 — 간단한 원형 장식 */}
        <div style={{ position: 'absolute', top: 60, left: 30, width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
        <div style={{ position: 'absolute', top: 120, right: 40, width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ position: 'absolute', bottom: 140, left: 50, width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ position: 'absolute', bottom: 80, right: 30, width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />

        <div style={{
          background: '#fff',
          borderRadius: 28,
          padding: '36px 28px 32px',
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}>
          {/* 로고 */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            border: '3px solid #EFF6FF',
            overflow: 'hidden',
            margin: '0 auto 20px',
            boxShadow: '0 4px 16px rgba(0,71,171,0.15)',
          }}>
            <img src={logoImage} alt="3355 골프클럽 로고"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* 타이틀 */}
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0047AB', marginBottom: 6, letterSpacing: '-0.03em' }}>
            3355 골프클럽에 오신 것을 환영합니다!
          </h2>
          <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #0047AB, #60A5FA)', borderRadius: 2, margin: '0 auto 20px' }} />

          {/* 본문 */}
          <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.85, textAlign: 'left', background: '#F8FAFC', borderRadius: 14, padding: '16px 18px', marginBottom: 24 }}>
            <p style={{ marginBottom: 10 }}>
              <strong style={{ color: '#1e293b' }}>가입 신청이 완료되었습니다.</strong>
            </p>
            <p style={{ marginBottom: 10 }}>
              운영진 확인 후 승인이 이루어지며, 보통 <strong style={{ color: '#0047AB' }}>1~2일 이내</strong>에 처리됩니다.
            </p>
            <p style={{ marginBottom: 10 }}>
              승인이 완료되면 다시 접속하셔서 모든 기능을 자유롭게 이용하실 수 있습니다.
            </p>
            <p style={{ marginBottom: 0, color: '#0047AB', fontWeight: 600 }}>
              함께 즐거운 라운딩 만들어가요! 🏌️
            </p>
          </div>

          {/* 카카오톡 오픈채팅 버튼 */}
          <a
            href={kakaoUrl || 'https://open.kakao.com/o/g7EaZjRh'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '15px',
              background: '#FEE500', color: '#191919',
              borderRadius: 14, border: 'none',
              fontSize: 15, fontWeight: 800,
              textDecoration: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 4px 12px rgba(254,229,0,0.4)',
            }}
          >
            {/* 카카오톡 로고 SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.748 1.63 5.164 4.1 6.627l-.974 3.64a.3.3 0 0 0 .46.328l4.273-2.827A12.16 12.16 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
            </svg>
            카카오톡 오픈채팅방 바로가기
          </a>

          <p style={{ marginTop: 16, fontSize: 12, color: '#94A3B8' }}>
            전화번호 끝 6자리로 로그인할 수 있습니다
          </p>
        </div>
      </div>
    );
  }

  /* ── 가입 폼 ── */
  return (
    /* 뷰포트 고정 스크롤 컨테이너 — iOS 좌우 스크롤 완전 차단 */
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      overflowY: 'auto', overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y',
      overscrollBehavior: 'contain',
      background: '#F0F4F8',
    }}>

      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #0047AB 0%, #1565c0 100%)',
        padding: '48px 24px 28px',
        paddingTop: 'max(48px, calc(env(safe-area-inset-top) + 24px))',
        textAlign: 'center',
      }}>
        <img src={logoImage} alt="로고" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', marginBottom: 12 }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>3355 골프모임</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>새 회원 가입</p>
      </div>

      {/* 개인정보 안내 */}
      <div style={{ padding: '14px 16px 0', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: '#EFF6FF', borderRadius: 12, padding: '12px 14px',
          border: '1px solid #BFDBFE',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.7, margin: 0 }}>
            3355 골프클럽은 회원님의 개인정보를 소중히 여깁니다.<br />
            모임 운영에 꼭 필요한 정보만 요청드리며, 수집된 정보는 회원님의 동의 없이 외부에 제공하지 않습니다. 안심하고 가입해 주세요.
          </p>
        </div>
      </div>

      {/* 폼 카드 */}
      <div style={{ padding: '14px 16px', paddingBottom: 'max(32px, env(safe-area-inset-bottom))', maxWidth: 480, margin: '0 auto', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

          {/* 이름 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>이름 *</label>
            <input type="text" placeholder="홍길동" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fieldStyle} />
          </div>

          {/* 대화명 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>대화명 (닉네임) *</label>
            <input type="text" placeholder="앱에서 표시될 이름" value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} style={fieldStyle} />
          </div>

          {/* 전화번호 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>전화번호 *</label>
            <input type="tel" inputMode="numeric" placeholder="0400 123 456" maxLength={12}
              value={form.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
              onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 10); setForm(f => ({ ...f, phone: d })); }}
              style={fieldStyle} />
          </div>

          {/* 사진 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>사진 (본인) *</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1.5px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <span style={{ fontSize: 14, color: '#64748b' }}>{form.photo ? '사진 변경하기' : '사진 선택하기'}</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </label>
            {form.photo && (
              <img src={form.photo} alt="미리보기" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '2px solid #e2e8f0', marginTop: 8 }} />
            )}
          </div>

          {/* 성별 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>성별 *</label>
            <div style={toggleRowStyle}>
              {[['남', '🔵 블루티'], ['여', '🔴 레이디티']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, gender: val }))}
                  style={toggleBtn(form.gender === val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 출생연도 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>출생연도 *</label>
            <input type="text" inputMode="numeric" placeholder="예: 1990" maxLength={4} value={form.birthYear}
              onChange={e => setForm(f => ({ ...f, birthYear: e.target.value.replace(/\D/g, '').slice(0, 4) }))} style={fieldStyle} />
          </div>

          {/* 지역 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>사는 지역 *</label>
            <input type="text" placeholder="예: Lidcombe, Ryde" value={form.region}
              onChange={e => setForm(f => ({ ...f, region: e.target.value }))} style={fieldStyle} />
          </div>

          {/* 클럽 멤버 여부 */}
          <div style={sectionStyle}>
            <label style={labelStyle}>골프 클럽 멤버이신가요?</label>
            <div style={toggleRowStyle}>
              {[['yes', '예'], ['no', '아니오']].map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => { setForm(f => ({ ...f, isClubMember: val, club: '', gaHandy: '', houseHandy: '', golflinkNumber: '', clubMemberNumber: '' })); setClubSearchInput(''); setClubSearchState('idle'); }}
                  style={toggleBtn(form.isClubMember === val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 클럽 멤버 추가 필드 */}
          {form.isClubMember === 'yes' && (
            <>
              {/* 소속 클럽 스마트 검색 */}
              <div style={sectionStyle}>
                <label style={labelStyle}>소속 골프 클럽 *</label>

                {/* 선택된 클럽 표시 */}
                {form.club && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, color: '#059669', fontWeight: 600 }}>✓</span>
                      <span style={{ fontSize: 14, color: '#059669', fontWeight: 700 }}>{form.club}</span>
                    </div>
                    <button type="button"
                      onClick={() => { setForm(f => ({ ...f, club: '' })); setClubSearchState('idle'); }}
                      style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
                  </div>
                )}

                {/* 검색 입력 */}
                <div style={{ display: 'flex', gap: 8, width: '100%', boxSizing: 'border-box' }}>
                  <input
                    type="text"
                    placeholder="골프장 이름으로 검색..."
                    value={clubSearchInput}
                    onChange={e => { setClubSearchInput(e.target.value); setClubSearchState('idle'); }}
                    onKeyDown={e => e.key === 'Enter' && handleClubSearch()}
                    style={{ flex: 1, minWidth: 0, padding: '13px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="button"
                    onClick={handleClubSearch}
                    disabled={clubSearchState === 'searching' || !clubSearchInput.trim()}
                    style={{ padding: '13px 16px', background: (clubSearchState === 'searching' || !clubSearchInput.trim()) ? '#93C5FD' : '#0047AB', color: 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: (clubSearchState === 'searching' || !clubSearchInput.trim()) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {clubSearchState === 'searching' ? '검색중...' : '검색'}
                  </button>
                </div>
                {clubSearchState === 'error' && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>검색에 실패했습니다. 직접 클럽명을 입력하세요.</div>
                )}
              </div>

              <div style={sectionStyle}>
                <label style={labelStyle}>Golflink Number *</label>
                <input type="text" inputMode="numeric" placeholder="Golflink 번호" value={form.golflinkNumber}
                  onChange={e => setForm(f => ({ ...f, golflinkNumber: e.target.value }))} style={fieldStyle} />
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>클럽 회원번호 *</label>
                <input type="text" inputMode="numeric" placeholder="클럽 회원번호" value={form.clubMemberNumber}
                  onChange={e => setForm(f => ({ ...f, clubMemberNumber: e.target.value }))} style={fieldStyle} />
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>GA 핸디캡 *</label>
                <input type="text" inputMode="decimal" placeholder="예: 18.4" value={form.gaHandy}
                  onChange={e => setForm(f => ({ ...f, gaHandy: e.target.value.replace(/[^0-9.]/g, '') }))} style={fieldStyle} />
              </div>
            </>
          )}

          {form.isClubMember === 'no' && (
            <div style={sectionStyle}>
              <label style={labelStyle}>핸디캡</label>
              <input type="text" inputMode="decimal" placeholder="예: 18.4" value={form.houseHandy}
                onChange={e => setForm(f => ({ ...f, houseHandy: e.target.value.replace(/[^0-9.]/g, '') }))} style={fieldStyle} />
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* 제출 버튼 */}
          <button type="button" onClick={handleSubmit} disabled={submitting}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: submitting ? '#93C5FD' : '#0047AB', color: '#fff', fontSize: 16, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 4 }}>
            {submitting ? '처리 중...' : '가입 신청하기'}
          </button>

        </div>
      </div>
    </div>
  );
}

export default JoinPage;
