import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import { compressImageToBase64 } from '../utils/compressImage';
import adminIcon from '../assets/role-admin.png';
import bangjangIcon from '../assets/role-bangjang.png';
import staffIcon from '../assets/role-staff.png';
import clubStaffIcon from '../assets/role-club-staff.png';
import { checkIsOperator, parseParticipants } from '../utils';
import { getEffectiveHandicap, calculateHandicap } from '../utils/handicap';
import { Button, PageHeader } from '../components/common';
import { getClubMemberStatus, getMissingMemberInfo } from '../utils/memberInfo';

const toEditData = (u) => ({ ...u, isMember: getClubMemberStatus(u) });

function MyPage() {
  const { user, logout, updateUser, courses, bookings, refreshCourses } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(user || {});
  const [scores, setScores] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [showHandicapInfo, setShowHandicapInfo] = useState(false);
  const [applyingHcp, setApplyingHcp] = useState(false);
  const [photoStatus, setPhotoStatus] = useState(null); // 사진 업로드 상태 메시지
  const [clubSearchInput, setClubSearchInput] = useState('');
  const [clubSearchState, setClubSearchState] = useState('idle'); // idle | searching | done | error
  const basicInfoRef = useRef(null);

  // 바로가기 링크(/mypage?edit=1) — 기본 정보를 펼치고 바로 수정 모드로 연다
  useEffect(() => {
    if (new URLSearchParams(location.search).get('edit') !== '1') return;
    setExpandedSection('basicInfo');
    setIsEditing(true);
    navigate('/mypage', { replace: true });
    setTimeout(() => basicInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [location.search]);

  useEffect(() => {
    if (location.state?.reset) {
      setIsEditing(false);
      if (user) {
        setEditData(toEditData(user));
      }
      window.history.replaceState({}, document.title);
    }
  }, [location, user]);

  useEffect(() => {
    if (user) {
      setEditData(toEditData(user));
      loadScores();
    }
  }, [user]);

  const loadScores = async () => {
    if (!user?.id) return;
    try {
      const response = await apiService.fetchScores(user.id);
      const validScores = (response || []).filter(score => score.totalScore >= 1);
      setScores(validScores);
    } catch {
      setScores([]);
    }
  };

  const handleClubSearch = async () => {
    const query = clubSearchInput.trim();
    if (!query) return;
    // 1) 기존 목록에서 먼저
    const found = courses.find(c => c.name.toLowerCase().includes(query.toLowerCase()));
    if (found) {
      setEditData(prev => ({ ...prev, club: found.name }));
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
      setEditData(prev => ({ ...prev, club: result.name || query }));
      setClubSearchInput('');
      setClubSearchState('done');
    } catch {
      setClubSearchState('error');
    }
  };

  const handleSave = async () => {
    // 비회원으로 저장하면 클럽 칸은 비워지므로, 점검도 저장될 모습 기준으로
    const missing = getMissingMemberInfo({ ...editData, isClubMember: editData.isMember, club: editData.isMember === 'yes' ? editData.club : '' });
    if (missing.length > 0) {
      alert(`아직 입력하지 않은 항목이 있어요:\n${missing.map(f => f.label).join(', ')}`);
      return;
    }

    try {
      const isGAMember = editData.isMember === 'yes';
      const updateData = {
        name: editData.name,
        nickname: editData.nickname,
        phone: editData.phone,
        club: isGAMember ? editData.club : null,
        gaHandy: isGAMember ? editData.gaHandy : null,
        houseHandy: isGAMember ? null : editData.houseHandy,
        handicap: isGAMember ? editData.gaHandy : editData.houseHandy,
        golflinkNumber: isGAMember ? editData.golflinkNumber : null,
        gaRegisteredName: isGAMember ? editData.gaRegisteredName : null,
        clubMemberNumber: isGAMember ? editData.clubMemberNumber : null,
        photo: editData.photo,
        gender: editData.gender,
        birthYear: editData.birthYear,
        region: editData.region,
        isClubMember: editData.isMember
      };
      await apiService.updateMember(user.id, updateData);
      updateUser(updateData); // 즉시 UI에 반영 (사진 포함 전체 필드)
      setIsEditing(false);
      alert('프로필 정보가 수정되었습니다!');
    } catch {
      alert('프로필 정보 수정에 실패했습니다.');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      setPhotoStatus('이미지 압축 중...');
      const base64 = await compressImageToBase64(file);
      if (isEditing) {
        setEditData(prev => ({ ...prev, photo: base64 }));
        setPhotoStatus('사진이 선택되었습니다. 저장 버튼을 눌러 적용하세요.');
        setTimeout(() => setPhotoStatus(null), 3000);
      } else {
        setPhotoStatus('서버에 저장 중...');
        await apiService.updateMember(user.id, { photo: base64 });
        updateUser({ photo: base64 }); // 즉시 UI에 반영 (refreshMembers 제거 - 목록 API는 사진 미포함)
        setPhotoStatus('사진이 업데이트되었습니다!');
        setTimeout(() => setPhotoStatus(null), 2500);
      }
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      setPhotoStatus('이미지 처리에 실패했습니다. 다시 시도하세요.');
      setTimeout(() => setPhotoStatus(null), 3000);
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

  // ── 핸디캡 표시 로직 ──
  const isGAMemberDisplay = !!(user.golflinkNumber && user.golflinkNumber.toString().trim() && user.gaHandy);
  const manualHH = parseFloat(user.houseHandy);

  // 추천핸디: FinanceContext 타이밍에 의존하지 않고 로컬 scores로 직접 계산
  // 엠브로스(팀 공동 스코어)는 개인 스코어가 아니므로 핸디캡 계산에서 제외
  const personalScores = scores.filter(s => s.gameMode !== 'ambrose');
  const recommendation = !isGAMemberDisplay ? calculateHandicap(user, personalScores) : null;
  const recommendedHcp = recommendation?.type === 'HH' ? recommendation.value : null;
  const recommendedExplanation = recommendation?.explanation ?? null;

  let displayHcp, displayType, isShowingRecommended;
  if (isGAMemberDisplay) {
    displayHcp = parseFloat(user.gaHandy);
    displayType = 'GA';
    isShowingRecommended = false;
  } else if (!isNaN(manualHH)) {
    // 수동 등록값 우선 표시 (추천과 달라도 수동값 보여줌)
    displayHcp = manualHH;
    displayType = 'HH';
    isShowingRecommended = false;
  } else if (recommendedHcp != null) {
    // 수동값 없을 때만 추천값을 메인에 표시
    displayHcp = recommendedHcp;
    displayType = 'HH';
    isShowingRecommended = true;
  } else {
    displayHcp = null;
    displayType = null;
    isShowingRecommended = false;
  }

  // 수동값 ≠ 추천값일 때만 적용 버튼 노출
  const canApplyRecommended = !isGAMemberDisplay && recommendedHcp != null && recommendedHcp !== manualHH;

  const applyRecommendedHandicap = async () => {
    setApplyingHcp(true);
    try {
      await apiService.updateMember(user.id, {
        houseHandy: String(recommendedHcp),
        handicap: String(recommendedHcp),
      });
      await refreshMembers();
      setShowHandicapInfo(false);
    } catch {
      alert('적용에 실패했습니다.');
    } finally {
      setApplyingHcp(false);
    }
  };

  // 내 라운딩 수: 실제 스코어 기록 기준 (핸디 계산과 동일 소스, 엠브로스 팀 스코어 제외)
  const myRoundCount = personalScores.length;

  const toggleSection = (key) => setExpandedSection(prev => prev === key ? null : key);

  // Chevron icon
  const Chevron = ({ open }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );

  // Menu row
  const MenuRow = ({ icon, label, onClick, open, last }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 18px', cursor: 'pointer', borderBottom: last ? 'none' : '1px solid #F1F5F9' }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#1E293B' }}>{label}</span>
      <Chevron open={open} />
    </div>
  );

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <PageHeader title="마이페이지" user={user} showBackButton={false} />

      <div style={{ padding: '12px 16px 100px' }}>

        {/* ── 프로필 히어로 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 20px' }}>
          <label htmlFor="photoUpload" style={{ position: 'relative', cursor: 'pointer', marginBottom: 16 }}>
            <div style={{ width: 96, height: 96, borderRadius: '50%', border: '3px solid #0047AB', padding: 3 }}>
              {(isEditing ? editData.photo : user.photo) ? (
                <img src={isEditing ? editData.photo : user.photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#E8ECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>👤</div>
              )}
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: '50%', background: '#0047AB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            {checkIsOperator(user) && (
              <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
                {user.role === '관리자' && <img src={adminIcon} alt="관리자" style={{ width: 26, height: 26, borderRadius: '50%' }} />}
                {user.role === '방장' && <img src={bangjangIcon} alt="방장" style={{ width: 26, height: 26, borderRadius: '50%' }} />}
                {user.role === '운영진' && <img src={staffIcon} alt="운영진" style={{ width: 26, height: 26, borderRadius: '50%' }} />}
                {user.role === '클럽운영진' && <img src={clubStaffIcon} alt="클럽운영진" style={{ width: 26, height: 26, borderRadius: '50%' }} />}
              </div>
            )}
          </label>
          <input id="photoUpload" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          {photoStatus && (
            <div style={{
              fontSize: 12, fontWeight: 600,
              color: photoStatus.includes('실패') ? '#DC2626' : photoStatus.includes('완료') || photoStatus.includes('업데이트') ? '#16A34A' : '#0047AB',
              background: photoStatus.includes('실패') ? '#FEF2F2' : photoStatus.includes('완료') || photoStatus.includes('업데이트') ? '#F0FDF4' : '#EFF6FF',
              borderRadius: 8, padding: '6px 14px', marginBottom: 10, textAlign: 'center',
            }}>
              {photoStatus}
            </div>
          )}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{user.nickname || user.name}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0047AB' }}>3355 Golf Club</div>
        </div>

        {/* ── 핸디캡 / 라운딩 통계 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em' }}>MY HANDICAP</div>
              {!isGAMemberDisplay && (
                <button onClick={() => setShowHandicapInfo(true)} style={{ background: '#F1F5F9', border: 'none', borderRadius: 999, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  추천핸디계산
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#0d1b3e' }}>{displayHcp ?? '-'}</span>
              {displayType && (
                <span style={{ fontSize: 10, fontWeight: 700, color: displayType === 'GA' ? '#0047AB' : '#64748B', background: displayType === 'GA' ? '#EBF2FF' : '#F1F5F9', borderRadius: 6, padding: '2px 5px' }}>{displayType}</span>
              )}
            </div>
            {isShowingRecommended && (
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>추천값</div>
            )}
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 8 }}>TOTAL ROUNDS</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#0d1b3e' }}>{myRoundCount}</span>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>Times</span>
            </div>
          </div>
        </div>

        {/* ── ACTIVITY & INFO ── */}
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 10, paddingLeft: 4 }}>ACTIVITY &amp; INFO</div>
        <div style={{ background: '#fff', borderRadius: 16, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <MenuRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#0047AB"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>}
            label="기본 정보" onClick={() => toggleSection('basicInfo')} open={expandedSection === 'basicInfo'} />

          {/* 기본 정보 확장 */}
          {expandedSection === 'basicInfo' && (() => {
            const fieldLabel = { fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 5 };
            const inputStyle = { width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 15, color: '#0F172A', outline: 'none', boxSizing: 'border-box', background: '#fff' };
            const card = { background: '#fff', borderRadius: 14, padding: '14px 14px 2px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' };
            const cardTitle = (title, sub) => (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{title}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{sub}</div>
              </div>
            );
            const req = <span style={{ color: '#DC2626' }}> *</span>;
            const grid2 = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 };
            // 선택된 쪽만 흰색으로 떠오르는 조용한 토글 — 화면에서 "저장"만 진한 파란색으로 남기기 위함
            const segment = (options, value, onPick) => (
              <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, height: 44, boxSizing: 'border-box' }}>
                {options.map(([label, val]) => (
                  <button key={val} type="button" onClick={() => onPick(val)}
                    style={{ flex: 1, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
                      fontWeight: value === val ? 700 : 500,
                      background: value === val ? '#fff' : 'transparent',
                      color: value === val ? '#0047AB' : '#64748B',
                      boxShadow: value === val ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                      transition: 'all 0.15s' }}>
                    {label}
                  </button>
                ))}
              </div>
            );
            const textField = (label, key, { required, placeholder, decimal, tel, number, hint } = {}) => (
              <div style={{ marginBottom: 12 }}>
                <div style={fieldLabel}>{label}{required && req}</div>
                {hint && <div style={{ fontSize: 12, color: '#64748B', margin: '-2px 0 6px', lineHeight: 1.4 }}>{hint}</div>}
                <input type={number ? 'number' : tel ? 'tel' : 'text'} inputMode={decimal ? 'decimal' : undefined}
                  placeholder={placeholder} value={editData[key] || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditData(prev => ({ ...prev, [key]: tel ? v.replace(/\D/g, '').slice(0, 10) : decimal ? v.replace(/[^0-9.]/g, '') : v }));
                  }}
                  style={inputStyle} />
              </div>
            );

            if (!isEditing) {
              const missingKeys = new Set(getMissingMemberInfo(user).map(f => f.key));
              const clubStatus = getClubMemberStatus(user);
              const row = (label, key, value) => {
                const empty = value === undefined || value === null || String(value).trim() === '';
                return (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: empty ? 500 : 700, color: empty ? (missingKeys.has(key) ? '#D97706' : '#CBD5E1') : '#1E293B', textAlign: 'right' }}>{empty ? '미입력' : value}</span>
                  </div>
                );
              };
              return (
                <div ref={basicInfoRef} style={{ background: '#F8FAFC', padding: '14px 14px 16px', borderTop: '1px solid #F1F5F9' }}>
                  {missingKeys.size > 0 && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#92400E', marginBottom: 12 }}>
                      아직 입력하지 않은 정보가 {missingKeys.size}개 있어요.
                    </div>
                  )}
                  <div style={card}>
                    {cardTitle('나의 정보', '회원 명단과 연락에 쓰여요')}
                    {row('한국 이름', 'name', user.name)}
                    {row('카톡 대화명', 'nickname', user.nickname)}
                    {row('전화번호', 'phone', user.phone ? String(user.phone).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : '')}
                    {row('성별', 'gender', user.gender)}
                    {row('출생연도', 'birthYear', user.birthYear)}
                    <div style={{ height: 10 }} />
                    {row('지역', 'region', user.region)}
                  </div>
                  <div style={card}>
                    {cardTitle('골프 정보', '핸디와 대회 신청에 쓰여요')}
                    {row('클럽 회원', 'isClubMember', clubStatus === 'yes' ? '예' : clubStatus === 'no' ? '아니요' : '')}
                    {clubStatus === 'yes' && <>
                      {row('소속 클럽', 'club', user.club)}
                      {row('GA 핸디', 'gaHandy', user.gaHandy)}
                      {row('클럽 회원번호', 'clubMemberNumber', user.clubMemberNumber)}
                      {row('Golflink 번호', 'golflinkNumber', user.golflinkNumber)}
                      {row('골프링크에 등록된 이름', 'gaRegisteredName', user.gaRegisteredName)}
                    </>}
                    {clubStatus === 'no' && row('하우스 핸디', 'houseHandy', user.houseHandy || user.handicap)}
                    <div style={{ height: 10 }} />
                  </div>
                  <button onClick={() => setIsEditing(true)} style={{ width: '100%', height: 46, background: '#0047AB', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>정보 업데이트하기</button>
                </div>
              );
            }

            return (
              <div ref={basicInfoRef} style={{ background: '#F8FAFC', padding: '14px 14px 16px', borderTop: '1px solid #F1F5F9' }}>
                <div style={card}>
                  {cardTitle('나의 정보', '회원 명단과 연락에 쓰여요')}
                  <div style={grid2}>
                    {textField('한국 이름', 'name', { required: true, placeholder: '홍길동' })}
                    {textField('카톡 대화명', 'nickname', { required: true })}
                  </div>
                  <div style={grid2}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={fieldLabel}>성별{req}</div>
                      {segment([['남', '남'], ['여', '여']], editData.gender, (g) => setEditData(prev => ({ ...prev, gender: g })))}
                    </div>
                    {textField('출생연도', 'birthYear', { required: true, number: true, placeholder: '1975' })}
                  </div>
                  <div style={grid2}>
                    {textField('전화번호', 'phone', { tel: true })}
                    {textField('지역', 'region', { placeholder: '예: 스트라스필드' })}
                  </div>
                </div>

                <div style={card}>
                  {cardTitle('골프 정보', '핸디와 대회 신청에 쓰여요')}
                  <div style={{ marginBottom: 12 }}>
                    <div style={fieldLabel}>골프 클럽에 정식 회원으로 가입되어 있나요?{req}</div>
                    {/* 아니요를 눌러도 클럽 칸 값은 지우지 않는다 — 저장할 때만 비회원 기준으로 비워진다 */}
                    {segment([['네, 회원이에요', 'yes'], ['아니요', 'no']], editData.isMember, (val) => {
                      setEditData(prev => ({ ...prev, isMember: val }));
                      setClubSearchInput(''); setClubSearchState('idle');
                    })}
                  </div>

                  {editData.isMember === 'yes' && <>
                    <div style={{ marginBottom: 12 }}>
                      <div style={fieldLabel}>소속 클럽{req}</div>
                      {editData.club ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, padding: '0 6px 0 12px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE', boxSizing: 'border-box' }}>
                          <span style={{ fontSize: 14, color: '#0047AB', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editData.club}</span>
                          <button type="button" aria-label="소속 클럽 지우기"
                            onClick={() => { setEditData(prev => ({ ...prev, club: '' })); setClubSearchState('idle'); }}
                            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 18, cursor: 'pointer', width: 36, height: 36, lineHeight: 1, flexShrink: 0 }}>×</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" placeholder="골프장 이름으로 검색"
                              value={clubSearchInput}
                              onChange={e => { setClubSearchInput(e.target.value); setClubSearchState('idle'); }}
                              onKeyDown={e => e.key === 'Enter' && handleClubSearch()}
                              style={{ ...inputStyle, flex: 1 }} />
                            <button type="button" onClick={handleClubSearch}
                              disabled={clubSearchState === 'searching' || !clubSearchInput.trim()}
                              style={{ height: 44, padding: '0 14px', background: '#fff', color: (clubSearchState === 'searching' || !clubSearchInput.trim()) ? '#94A3B8' : '#0047AB', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {clubSearchState === 'searching' ? '검색중...' : '검색'}
                            </button>
                          </div>
                          {clubSearchState === 'error' && (
                            <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>검색에 실패했어요. 정확한 이름으로 다시 검색해 주세요.</div>
                          )}
                        </>
                      )}
                    </div>
                    <div style={grid2}>
                      {textField('GA 핸디', 'gaHandy', { required: true, decimal: true, placeholder: '18.4' })}
                      {textField('클럽 회원번호', 'clubMemberNumber', { required: true })}
                    </div>
                    {textField('Golflink 번호', 'golflinkNumber', { required: true, placeholder: '10자리 숫자' })}
                    {textField('골프링크에 등록된 이름', 'gaRegisteredName', { required: true, placeholder: 'Jung Hwan Kang', hint: '예약할 때 공식 이름이 필요합니다. GA에 등록된 영문 이름을 적어주세요.' })}
                  </>}

                  {editData.isMember === 'no' && textField('하우스 핸디', 'houseHandy', { decimal: true, placeholder: '18.4' })}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setIsEditing(false); setEditData(toEditData(user)); }} style={{ flex: 1, height: 46, borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>취소</button>
                  <button onClick={handleSave} style={{ flex: 2, height: 46, borderRadius: 12, border: 'none', background: '#0047AB', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>저장</button>
                </div>
              </div>
            );
          })()}

          <MenuRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#0047AB"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9" stroke="white" strokeWidth="1.5"/></svg>}
            label="최근 스코어" onClick={() => toggleSection('scores')} open={expandedSection === 'scores'} />

          {/* 스코어 확장 */}
          {expandedSection === 'scores' && (
            <div style={{ background: '#F8FAFC', padding: '16px 18px', borderTop: '1px solid #F1F5F9' }}>
              {scores.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '20px 0' }}>아직 기록된 스코어가 없습니다.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scores.slice(0, 5).map((score, i) => {
                    const mb = bookings.find(b => b.title === score.roundingName);
                    return (
                      <div key={i} onClick={() => mb && navigate(`/leaderboard?id=${mb.id}&userId=${user.id}&openScorecard=true`)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fff', borderRadius: 10, cursor: mb ? 'pointer' : 'default', border: '1px solid #F1F5F9' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {score.roundingName}
                            {score.gameMode === 'ambrose' && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: '#e0f2fe', padding: '2px 6px', borderRadius: 6 }}>엠브로스(팀)</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{score.courseName} · {new Date(score.date).toLocaleDateString('ko-KR')}</div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0047AB' }}>{score.totalScore}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <MenuRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            label="내 라운딩 일정" onClick={() => toggleSection('myRoundings')} open={expandedSection === 'myRoundings'} last />

          {expandedSection === 'myRoundings' && (() => {
            const today = new Date(); today.setHours(0,0,0,0);
            const myUpcoming = bookings
              .filter(b => parseParticipants(b.participants).some(p => p.phone === user.phone))
              .filter(b => new Date(b.date) >= today)
              .sort((a, b) => new Date(a.date) - new Date(b.date));
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            return (
              <div style={{ background: '#F8FAFC', padding: '16px 18px', borderTop: '1px solid #F1F5F9' }}>
                {myUpcoming.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '16px 0' }}>예정된 라운딩이 없습니다.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {myUpcoming.map(b => {
                      const d = new Date(b.date);
                      return (
                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#fff', borderRadius: 12, border: '1px solid #F1F5F9' }}>
                          <div style={{ minWidth: 36, textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#0047AB', lineHeight: 1 }}>{d.getDate()}</div>
                            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{days[d.getDay()]}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title || b.courseName}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{b.courseName} · {b.time && b.time !== '23:59' ? b.time.slice(0,5) : '시간 미정'}</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: '#EBF2FF', color: '#0047AB', flexShrink: 0 }}>{b.type}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── SETTINGS & MEMBERSHIP ── */}
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 10, paddingLeft: 4 }}>SETTINGS &amp; MEMBERSHIP</div>
        <div style={{ background: '#fff', borderRadius: 16, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <MenuRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>}
            label="앱 설정" onClick={() => toggleSection('appSettings')} open={expandedSection === 'appSettings'} />
          {expandedSection === 'appSettings' && (
            <div style={{ background: '#F8FAFC', padding: '16px 18px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '12px 0' }}>추가 설정 예정</div>
            </div>
          )}

          <MenuRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
            label="알림 설정" onClick={() => toggleSection('notifications')} open={expandedSection === 'notifications'} />
          {expandedSection === 'notifications' && (
            <div style={{ background: '#F8FAFC', padding: '16px 18px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '12px 0' }}>알림 설정 예정</div>
            </div>
          )}

          <MenuRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2"/></svg>}
            label="멤버십 정보" onClick={() => toggleSection('membership')} open={expandedSection === 'membership'} last />
          {expandedSection === 'membership' && (
            <div style={{ background: '#F8FAFC', padding: '16px 18px', borderTop: '1px solid #F1F5F9' }}>
              {[
                ['역할', user.role || '-'],
                ['클럽 멤버', user.isClubMember === 'yes' ? '예' : '아니오'],
                ['클럽', user.club || '-'],
                ['Golflink 번호', user.golflinkNumber || '-'],
                ['GA Official Name', user.gaRegisteredName || '-'],
                ['클럽 회원번호', user.clubMemberNumber || '-'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 다가오는 정기모임 배너 ── */}
        {(() => {
          const upcoming = bookings.filter(b => b.type === '정기모임' && new Date(b.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
          if (!upcoming) return null;
          const d = new Date(upcoming.date);
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          return (
            <div onClick={() => navigate('/booking')} style={{ background: 'linear-gradient(135deg, #0d1b3e 0%, #162d5c 100%)', borderRadius: 20, padding: '24px 20px', marginBottom: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(13,27,62,0.3)' }}>
              <div style={{ position: 'absolute', right: -20, bottom: -20, fontSize: 80, opacity: 0.07 }}>⛳</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(177,197,255,0.7)', letterSpacing: '0.15em', marginBottom: 8 }}>UPCOMING EVENT</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-0.01em' }}>{upcoming.title || upcoming.courseName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{d.getMonth()+1}월 {d.getDate()}일 ({days[d.getDay()]})</span>
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#fff' }}>참가하기</div>
              </div>
            </div>
          );
        })()}

        {/* 로그아웃 */}
        <div style={{ textAlign: 'center', paddingBottom: 20 }}>
          <button onClick={() => { if (window.confirm('로그아웃 하시겠습니까?')) logout(); }}
            style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
            로그아웃
          </button>
        </div>

      </div>

      {/* ── House Handy 정보 바텀시트 ── */}
      {showHandicapInfo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {/* 배경 오버레이 */}
          <div onClick={() => setShowHandicapInfo(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          {/* 시트 */}
          <div style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', zIndex: 1 }}>
            {/* 핸들 */}
            <div style={{ width: 36, height: 4, background: '#E2E8F0', borderRadius: 2, margin: '0 auto 24px' }} />

            <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 20 }}>HOUSE HANDICAP</div>

            {/* 현재값 vs 추천값 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>현재 등록</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: isNaN(manualHH) ? '#CBD5E1' : '#1E293B' }}>
                  {isNaN(manualHH) ? '미등록' : manualHH}
                </div>
              </div>
              <div style={{ flex: 1, background: recommendedHcp != null ? '#EBF2FF' : '#F8FAFC', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0047AB', marginBottom: 6 }}>추천 핸디</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: recommendedHcp != null ? '#0047AB' : '#CBD5E1' }}>
                  {recommendedHcp ?? '-'}
                </div>
              </div>
            </div>

            {/* 수동값과 추천값 다를 때 안내 */}
            {!isNaN(manualHH) && recommendedHcp != null && recommendedHcp !== manualHH && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                현재 <strong>{manualHH}</strong>로 등록되어 있지만, 스코어 기록 기준 추천 핸디는 <strong>{recommendedHcp}</strong>입니다.
              </div>
            )}

            {/* 계산 근거 */}
            {recommendedExplanation ? (
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 6 }}>계산 근거</div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{recommendedExplanation}</div>
              </div>
            ) : (
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>스코어 기록이 없어 추천 핸디를 계산할 수 없습니다.</div>
              </div>
            )}

            {/* 적용 버튼 */}
            {canApplyRecommended && (
              <button onClick={applyRecommendedHandicap} disabled={applyingHcp}
                style={{ width: '100%', padding: '14px', background: '#0047AB', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10, opacity: applyingHcp ? 0.6 : 1 }}>
                {applyingHcp ? '적용 중...' : `추천 핸디 ${recommendedHcp}으로 교체하기`}
              </button>
            )}
            <button onClick={() => setShowHandicapInfo(false)}
              style={{ width: '100%', padding: '14px', background: 'none', color: '#94A3B8', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
}


export default MyPage;
