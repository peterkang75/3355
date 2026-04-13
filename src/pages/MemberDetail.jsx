import React, { useState, useEffect, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import { checkIsOperator } from '../utils';
import { compressImageToBase64 } from '../utils/compressImage';
import { calculateHandicap, getEffectiveHandicap } from '../utils/handicap';
import adminIcon from '../assets/role-admin.png';
import bangjangIcon from '../assets/role-bangjang.png';
import staffIcon from '../assets/role-staff.png';
import clubStaffIcon from '../assets/role-club-staff.png';
import CrownIcon from '../components/CrownIcon';
import PageHeader from '../components/common/PageHeader';
import SearchableDropdown from '../components/SearchableDropdown';

function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshMembers, members, courses, requiresProfileComplete, clearRequiresProfileComplete, checkRequiredFields } = useApp();
  const [member, setMember] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [scores, setScores] = useState([]);
  const [handicapData, setHandicapData] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [scoreFormData, setScoreFormData] = useState({
    roundingName: '',
    date: '',
    courseName: '',
    totalScore: '',
    holes: Array(18).fill(0),
    inputMode: 'total'
  });
  const [transactions, setTransactions] = useState([]);
  const [memberBalance, setMemberBalance] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isTogglingFeeExempt, setIsTogglingFeeExempt] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [permissions, setPermissions] = useState({});
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [showAdminSheet, setShowAdminSheet] = useState(false);
  const [showHandicapSheet, setShowHandicapSheet] = useState(false);
  const [applyingHcp, setApplyingHcp] = useState(false);

  useEffect(() => {
    loadMemberData();
    loadPermissions();
  }, [id, members]);

  const loadPermissions = async () => {
    try {
      const settings = await apiService.fetchSettings();
      const permissionsObj = {};
      settings.forEach(setting => {
        permissionsObj[setting.feature] = setting.minRole;
      });
      setPermissions(permissionsObj);
    } catch (error) {
      console.error('권한 설정 로드 실패:', error);
    }
  };

  const roleHierarchy = ['관리자', '방장', '운영진', '클럽운영진', '회원'];

  const hasFeaturePermission = (featureId) => {
    const minRole = permissions[featureId] || '관리자';
    const userRole = user?.role || '회원';
    const minRoleIndex = roleHierarchy.indexOf(minRole);
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    return userRoleIndex <= minRoleIndex;
  };

  useEffect(() => {
    if (requiresProfileComplete && member && user?.id === member.id) {
      setIsEditing(true);
    }
  }, [requiresProfileComplete, member, user?.id]);

  useEffect(() => {
    if (member) {
      loadScores();
      loadTransactions();
    }
  }, [member]);

  useEffect(() => {
    if (member && scores.length >= 0) {
      const validScores = scores.filter(s => s.totalScore && s.totalScore > 0);
      const calculatedHandicap = calculateHandicap(member, validScores);
      setHandicapData(calculatedHandicap);
    }
  }, [member, scores]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId !== null) setOpenMenuId(null);
    };
    if (openMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const loadMemberData = async () => {
    const foundMember = members.find(m => m.id === id);
    if (foundMember) {
      setMember(foundMember);
      setEditData(foundMember);
      try {
        const fullMember = await apiService.fetchMember(id);
        if (fullMember?.photo) {
          setMember(prev => prev ? { ...prev, photo: fullMember.photo } : prev);
          setEditData(prev => prev ? { ...prev, photo: fullMember.photo } : prev);
        }
      } catch (e) {
        console.error('사진 로드 실패:', e);
      }
    }
  };

  const loadScores = async () => {
    try {
      const response = await apiService.fetchScores(id);
      setScores(response || []);
    } catch (error) {
      console.error('스코어 로드 실패:', error);
      setScores([]);
    }
  };

  const loadTransactions = async () => {
    try {
      const [transactionsData, balanceData] = await Promise.all([
        apiService.fetchMemberTransactions(id),
        apiService.fetchMemberBalance(id)
      ]);
      setTransactions(transactionsData || []);
      setMemberBalance(balanceData.balance || 0);
    } catch (error) {
      console.error('거래 내역 로드 실패:', error);
      setTransactions([]);
      setMemberBalance(0);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setValidationError('');
    if (!checkRequiredFields(editData)) {
      if (requiresProfileComplete) {
        setValidationError('모든 정보를 입력해야 앱 사용이 가능합니다.');
      } else {
        if (editData.isClubMember === 'yes') {
          setValidationError('모든 필수 항목을 입력해주세요. (이름, 대화명, 사진, 전화번호, 핸디캡, 성별, 출생연도, 지역, 소속클럽, Golflink번호, 회원번호)');
        } else {
          setValidationError('모든 필수 항목을 입력해주세요. (이름, 대화명, 사진, 전화번호, 핸디캡, 성별, 출생연도, 지역, 클럽가입 여부)');
        }
      }
      return;
    }
    setIsSaving(true);
    try {
      const updateData = {
        name: editData.name,
        nickname: editData.nickname,
        phone: editData.phone,
        isClubMember: editData.isClubMember,
        club: editData.isClubMember === 'yes' ? editData.club : null,
        handicap: editData.handicap,
        golflinkNumber: editData.isClubMember === 'yes' ? editData.golflinkNumber : null,
        clubMemberNumber: editData.isClubMember === 'yes' ? editData.clubMemberNumber : null,
        gaHandy: editData.isClubMember === 'yes' ? editData.gaHandy : null,
        houseHandy: editData.isClubMember === 'no' ? editData.houseHandy : null,
        photo: editData.photo,
        gender: editData.gender,
        birthYear: editData.birthYear,
        region: editData.region
      };
      await apiService.updateMember(id, updateData);
      await refreshMembers();
      setIsEditing(false);
      if (requiresProfileComplete) {
        clearRequiresProfileComplete();
        navigate('/');
        alert('회원 정보가 저장되었습니다!');
      } else {
        alert('회원 정보가 수정되었습니다!');
      }
    } catch (error) {
      console.error('회원 정보 수정 실패:', error);
      alert('회원 정보 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    if (!confirm('정말로 이 회원을 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    try {
      await apiService.deleteMember(id);
      await refreshMembers();
      navigate('/admin');
      alert('회원이 삭제되었습니다.');
    } catch (error) {
      console.error('회원 삭제 실패:', error);
      alert('회원 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeRole = async (newRole) => {
    try {
      await apiService.updateMember(id, { role: newRole });
      await refreshMembers();
      alert('권한이 변경되었습니다!');
    } catch (error) {
      console.error('권한 변경 실패:', error);
      alert('권한 변경에 실패했습니다.');
    }
  };

  const handleFeeExemptChange = async () => {
    if (isTogglingFeeExempt) return;
    setIsTogglingFeeExempt(true);
    try {
      const newValue = !member.isFeeExempt;
      await apiService.updateMember(id, { isFeeExempt: newValue });
      await refreshMembers();
      alert(newValue ? '회비면제가 활성화되었습니다.' : '회비면제가 해제되었습니다.');
    } catch (error) {
      console.error('회비면제 변경 실패:', error);
      alert('회비면제 변경에 실패했습니다.');
    } finally {
      setIsTogglingFeeExempt(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const newActiveState = member.isActive === false ? true : false;
      await apiService.updateMember(id, { isActive: newActiveState });
      await refreshMembers();
      alert(newActiveState ? '회원이 활성화되었습니다!' : '회원이 비활성화되었습니다!');
    } catch (error) {
      console.error('활성화 상태 변경 실패:', error);
      alert('활성화 상태 변경에 실패했습니다.');
    }
  };

  const handleAddScore = async () => {
    const holesSum = scoreFormData.holes.reduce((a, b) => a + b, 0);
    const finalScore = scoreFormData.inputMode === 'holes'
      ? holesSum
      : parseInt(scoreFormData.totalScore);
    const finalHoles = scoreFormData.inputMode === 'holes'
      ? scoreFormData.holes
      : Array(18).fill(0);

    if (!scoreFormData.roundingName || !scoreFormData.date || !scoreFormData.courseName) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    if (scoreFormData.inputMode === 'total' && !scoreFormData.totalScore) {
      alert('총타수를 입력해주세요.');
      return;
    }
    if (scoreFormData.inputMode === 'holes' && holesSum === 0) {
      alert('홀별 타수를 입력해주세요.');
      return;
    }
    if (isSavingScore) return;
    setIsSavingScore(true);
    try {
      if (editingScoreId) {
        await apiService.updateScore(editingScoreId, {
          roundingName: scoreFormData.roundingName,
          date: scoreFormData.date,
          courseName: scoreFormData.courseName,
          totalScore: finalScore,
          holes: finalHoles
        });
      } else {
        await apiService.createScore({
          userId: id,
          markerId: user.id,
          roundingName: scoreFormData.roundingName,
          date: scoreFormData.date,
          courseName: scoreFormData.courseName,
          totalScore: finalScore,
          holes: finalHoles
        });
      }
      setScoreFormData({ roundingName: '', date: '', courseName: '', totalScore: '', holes: Array(18).fill(0), inputMode: 'total' });
      setShowScoreModal(false);
      setEditingScoreId(null);
      const updatedScores = await apiService.fetchScores(id);
      setScores(updatedScores || []);
      const validScores = (updatedScores || []).filter(s => s.totalScore && s.totalScore > 0);
      const calculatedHandicap = calculateHandicap(member, validScores);
      await apiService.updateMember(id, { handicap: String(calculatedHandicap.value) });
      await refreshMembers();
      alert(editingScoreId ? '스코어가 수정되고 핸디캡이 업데이트되었습니다!' : '스코어가 기록되고 핸디캡이 업데이트되었습니다!');
    } catch (error) {
      console.error('스코어 기록 실패:', error);
      alert('스코어 기록에 실패했습니다.');
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleEditScore = (score) => {
    setEditingScoreId(score.id);
    setScoreFormData({
      roundingName: score.roundingName || '',
      date: score.date,
      courseName: score.courseName,
      totalScore: String(score.totalScore),
      holes: Array.isArray(score.holes) ? score.holes : Array(18).fill(0),
      inputMode: 'total'
    });
    setShowScoreModal(true);
  };

  const handleDeleteScore = async () => {
    alert('스코어는 삭제할 수 없습니다.');
  };

  const handleApplyRecommendedHandicap = async () => {
    if (!handicapData || applyingHcp) return;
    setApplyingHcp(true);
    try {
      await apiService.updateMember(id, {
        houseHandy: String(handicapData.value),
        handicap: String(handicapData.value),
      });
      await refreshMembers();
      setShowHandicapSheet(false);
      alert('추천 핸디캡이 적용되었습니다.');
    } catch (error) {
      console.error('핸디캡 교체 실패:', error);
      alert('핸디캡 교체에 실패했습니다.');
    } finally {
      setApplyingHcp(false);
    }
  };

  if (!member) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', opacity: 0.7 }}>
        회원 정보를 불러오는 중...
      </div>
    );
  }

  const effectiveHcp = getEffectiveHandicap(member);
  const isGAMember = effectiveHcp.type === 'GA';
  const isAdmin = checkIsOperator(user);

  // ── EDIT FORM ──────────────────────────────────────────────
  if (isEditing) {
    const photoErr = !editData.photo && !!validationError;
    const fi = (field) => !!(validationError && !editData[field]?.toString().trim());

    return (
      <div style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="정보 수정"
          onBack={() => { if (!requiresProfileComplete) { setIsEditing(false); setEditData(member); setValidationError(''); } }}
          user={user}
        />

        {/* ── 사진 히어로 ── */}
        <div style={{ background: 'linear-gradient(150deg, #0F766E 0%, #134E4A 100%)', padding: '28px 20px 24px', textAlign: 'center' }}>
          <input
            type="file"
            id="editPhotoInput"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 400;
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
                    else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    setEditData({ ...editData, photo: canvas.toDataURL('image/jpeg', 0.7) });
                  };
                  img.src = event.target.result;
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <label htmlFor="editPhotoInput" style={{ cursor: 'pointer', display: 'inline-block' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {editData.photo ? (
                <img src={editData.photo} alt="프로필" style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '50%', border: photoErr ? '3px solid #FCA5A5' : '3px solid rgba(255,255,255,0.4)' }} />
              ) : (
                <div style={{ width: '88px', height: '88px', background: 'rgba(255,255,255,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: photoErr ? '3px solid #FCA5A5' : '3px dashed rgba(255,255,255,0.35)', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '28px' }}>📷</span>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '26px', height: '26px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.25)', fontSize: '13px' }}>
                ✏️
              </div>
            </div>
            <div style={{ color: photoErr ? '#FCA5A5' : 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>
              {editData.photo ? '사진 변경' : '사진 추가 *'}
            </div>
          </label>
        </div>

        <div className="page-content">

          {/* ── 기본 정보 ── */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>기본 정보</h3>
            <EF label="이름" required error={fi('name')}>
              <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} style={{ borderColor: fi('name') ? '#e74c3c' : undefined }} />
            </EF>
            <EF label="대화명 (닉네임)" required error={fi('nickname')}>
              <input type="text" value={editData.nickname || ''} onChange={(e) => setEditData({ ...editData, nickname: e.target.value })} style={{ borderColor: fi('nickname') ? '#e74c3c' : undefined }} />
            </EF>
            <EF label="전화번호" required error={!editData.phone?.trim() && !!validationError}>
              <input type="tel" inputMode="numeric" value={editData.phone} onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 10); setEditData({ ...editData, phone: d }); }} style={{ borderColor: !editData.phone?.trim() && !!validationError ? '#e74c3c' : undefined }} />
            </EF>
          </div>

          {/* ── 클럽 멤버십 ── */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>클럽 멤버십</h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                클럽 회원이신가요? <span style={{ color: '#e74c3c' }}>*</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[['yes', '예 (GA 회원)'], ['no', '아니오 (HH)']].map(([val, label]) => (
                  <label key={val} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: editData.isClubMember === val ? '2px solid var(--primary-green)' : '2px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer', background: editData.isClubMember === val ? 'rgba(15,118,110,0.06)' : 'white', fontSize: '13px', fontWeight: editData.isClubMember === val ? '700' : '500', color: editData.isClubMember === val ? 'var(--primary-green)' : '#6B7280' }}>
                    <input type="radio" name="isClubMember" value={val} checked={editData.isClubMember === val} onChange={(e) => setEditData({ ...editData, isClubMember: e.target.value })} style={{ display: 'none' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {editData.isClubMember === 'yes' && (
              <>
                <EF label="소속 클럽" required error={!editData.club?.trim() && !!validationError}>
                  <div style={{ borderRadius: '8px', border: !editData.club?.trim() && !!validationError ? '1px solid #e74c3c' : undefined }}>
                    <SearchableDropdown options={courses} value={editData.club || ''} onChange={(value) => setEditData({ ...editData, club: value })} placeholder="클럽 검색..." displayKey="name" valueKey="name" />
                  </div>
                </EF>
                <EF label="Golflink 번호" required error={!editData.golflinkNumber?.trim() && !!validationError}>
                  <input type="text" value={editData.golflinkNumber || ''} onChange={(e) => setEditData({ ...editData, golflinkNumber: e.target.value })} style={{ borderColor: !editData.golflinkNumber?.trim() && !!validationError ? '#e74c3c' : undefined }} />
                </EF>
                <EF label="클럽 회원번호" required error={!editData.clubMemberNumber?.trim() && !!validationError}>
                  <input type="text" value={editData.clubMemberNumber || ''} onChange={(e) => setEditData({ ...editData, clubMemberNumber: e.target.value })} style={{ borderColor: !editData.clubMemberNumber?.trim() && !!validationError ? '#e74c3c' : undefined }} />
                </EF>
                <EF label="GA 핸디캡" required error={!editData.gaHandy?.toString().trim() && !!validationError}>
                  <input type="number" inputMode="numeric" value={editData.gaHandy || ''} onChange={(e) => setEditData({ ...editData, gaHandy: e.target.value, handicap: e.target.value })} style={{ borderColor: !editData.gaHandy?.toString().trim() && !!validationError ? '#e74c3c' : undefined }} />
                </EF>
              </>
            )}

            {editData.isClubMember === 'no' && (
              <EF label="House 핸디캡" required error={!editData.handicap?.toString().trim() && !!validationError}>
                <input type="number" inputMode="numeric" value={editData.handicap || ''} onChange={(e) => setEditData({ ...editData, handicap: e.target.value, houseHandy: e.target.value })} style={{ borderColor: !editData.handicap?.toString().trim() && !!validationError ? '#e74c3c' : undefined }} />
              </EF>
            )}
          </div>

          {/* ── 개인 정보 ── */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>개인 정보</h3>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                성별 <span style={{ color: '#e74c3c' }}>*</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[['남', '남성'], ['여', '여성']].map(([val, label]) => (
                  <label key={val} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: editData.gender === val ? '2px solid var(--primary-green)' : '2px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer', background: editData.gender === val ? 'rgba(15,118,110,0.06)' : 'white', fontSize: '13px', fontWeight: editData.gender === val ? '700' : '500', color: editData.gender === val ? 'var(--primary-green)' : '#6B7280' }}>
                    <input type="radio" name="gender" value={val} checked={editData.gender === val} onChange={(e) => setEditData({ ...editData, gender: e.target.value })} style={{ display: 'none' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <EF label="출생연도" required error={!editData.birthYear?.toString().trim() && !!validationError}>
              <input type="number" inputMode="numeric" value={editData.birthYear || ''} onChange={(e) => setEditData({ ...editData, birthYear: e.target.value })} style={{ borderColor: !editData.birthYear?.toString().trim() && !!validationError ? '#e74c3c' : undefined }} />
            </EF>
            <EF label="사는 지역" required error={fi('region')}>
              <input type="text" value={editData.region || ''} onChange={(e) => setEditData({ ...editData, region: e.target.value })} style={{ borderColor: fi('region') ? '#e74c3c' : undefined }} />
            </EF>
          </div>

          {/* ── 안내 / 에러 ── */}
          {requiresProfileComplete && (
            <div style={{ padding: '12px 16px', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: '10px', marginBottom: '12px', fontSize: '13px', color: '#92400E' }}>
              필수 정보를 모두 입력해야 앱을 사용할 수 있습니다.
            </div>
          )}
          {validationError && (
            <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', marginBottom: '12px', fontSize: '13px', color: '#DC2626' }}>
              {validationError}
            </div>
          )}
        </div>

        {/* ── 고정 하단 버튼 ── */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', paddingBottom: 'max(80px, calc(68px + env(safe-area-inset-bottom)))', background: 'white', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '10px', zIndex: 50, boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }}>
          {!requiresProfileComplete && (
            <button
              onClick={() => { setIsEditing(false); setEditData(member); setValidationError(''); }}
              style={{ flex: 1, padding: '14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
            >
              취소
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{ flex: 2, padding: '14px', background: isSaving ? '#9CA3AF' : 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: isSaving ? 'not-allowed' : 'pointer' }}
          >
            {isSaving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    );
  }

  // ── SCORE 홀별 입력 렌더 헬퍼 ──────────────────────────────
  const renderHolesInput = () => {
    const course = courses.find(c => c.name === scoreFormData.courseName);
    const isFemale = member?.gender === 'F' || member?.gender === '여';
    const parArr = course?.holePars?.[isFemale ? 'female' : 'male'] || Array(18).fill(4);

    const renderRow = (start, end, label) => {
      const holesInRow = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      const rowTotal = holesInRow.reduce((s, h) => s + (scoreFormData.holes[h - 1] || 0), 0);
      const rowPar = holesInRow.reduce((s, h) => s + (parArr[h - 1] || 4), 0);
      return (
        <div key={label} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ color: '#374151', fontWeight: '600', fontSize: '13px' }}>{label}</span>
            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>PAR {rowPar} / 합계: {rowTotal}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px' }}>
            {holesInRow.map(holeNum => (
              <div key={holeNum} style={{ textAlign: 'center' }}>
                <div style={{ color: '#9CA3AF', fontSize: '10px', marginBottom: '2px' }}>{holeNum}</div>
                <input
                  type="number"
                  min="0"
                  max="15"
                  inputMode="numeric"
                  value={scoreFormData.holes[holeNum - 1] || ''}
                  onChange={(e) => {
                    const newHoles = [...scoreFormData.holes];
                    newHoles[holeNum - 1] = parseInt(e.target.value) || 0;
                    setScoreFormData(prev => ({ ...prev, holes: newHoles }));
                  }}
                  style={{ width: '100%', padding: '6px 2px', fontSize: '13px', fontWeight: '600', textAlign: 'center', borderRadius: '6px', border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#111827', marginBottom: 0 }}
                />
                <div style={{ color: '#D1D5DB', fontSize: '9px', marginTop: '2px' }}>P{parArr[holeNum - 1] || 4}</div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const totalHolesScore = scoreFormData.holes.reduce((a, b) => a + b, 0);
    return (
      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
        {renderRow(1, 9, 'OUT')}
        {renderRow(10, 18, 'IN')}
        <div style={{ textAlign: 'center', padding: '10px', background: '#D1FAE5', borderRadius: '8px', marginTop: '10px' }}>
          <span style={{ color: '#065F46', marginRight: '8px', fontSize: '14px', fontWeight: '600' }}>총타수:</span>
          <span style={{ color: '#065F46', fontSize: '22px', fontWeight: '700' }}>{totalHolesScore}</span>
        </div>
      </div>
    );
  };

  // ── MAIN VIEW ──────────────────────────────────────────────
  // 스탯 계산
  const sortedMembers = [...members].filter(m => m.isActive !== false).sort((a, b) => parseFloat(a.handicap) - parseFloat(b.handicap));
  const ranking = sortedMembers.findIndex(m => m.id === id) + 1;
  const bestScore = scores.length > 0 ? Math.min(...scores.map(s => s.totalScore).filter(Boolean)) : null;

  return (
    <div style={{ paddingBottom: '80px', background: '#F1F5F9', minHeight: '100vh' }}>

      {/* ── HERO (헤더 통합) ── */}
      <div style={{ background: 'linear-gradient(160deg, #0A2158 0%, #0047AB 100%)', padding: '0 20px 28px', textAlign: 'center' }}>
        {/* 커스텀 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '8px' }}>
          <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 6px', display: 'flex', alignItems: 'center', color: 'white', minHeight: '44px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span style={{ fontSize: '17px', fontWeight: '700', color: 'white' }}>멤버 프로필</span>
          {isAdmin ? (
            <button onClick={() => setShowAdminSheet(true)} style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-2px', color: 'white' }}>···</button>
          ) : (
            <div style={{ width: '36px' }} />
          )}
        </div>
        {/* Photo */}
        <div style={{ display: 'inline-block', position: 'relative', marginBottom: '16px' }}>
          <input type="file" id="photoUpload" accept="image/*" style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const resizedBase64 = await compressImageToBase64(file);
                await apiService.updateMember(id, { photo: resizedBase64 });
                await refreshMembers();
                alert('사진이 변경되었습니다!');
              } catch (error) { alert('사진 업로드에 실패했습니다.'); }
              e.target.value = '';
            }}
          />
          <label htmlFor={isAdmin ? 'photoUpload' : undefined}
            style={{ cursor: isAdmin ? 'pointer' : (member.photo ? 'zoom-in' : 'default'), display: 'block', position: 'relative' }}
            onClick={!isAdmin && member.photo ? (e) => { e.preventDefault(); setShowPhotoLightbox(true); } : undefined}
          >
            {member.photo ? (
              <img src={member.photo} alt={member.name} style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }} />
            ) : (
              <div style={{ width: '96px', height: '96px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: 'rgba(255,255,255,0.6)', border: '3px solid rgba(255,255,255,0.3)' }}>●</div>
            )}
            {isAdmin && (
              <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.55)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                사진 변경
              </div>
            )}
          </label>
          {/* Role icon */}
          {checkIsOperator(member) && (
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', zIndex: 10 }}>
              {member.role === '관리자' && <img src={adminIcon} alt="관리자" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />}
              {member.role === '방장' && <img src={bangjangIcon} alt="방장" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />}
              {member.role === '운영진' && <img src={staffIcon} alt="운영진" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />}
              {member.role === '클럽운영진' && <img src={clubStaffIcon} alt="클럽운영진" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />}
            </div>
          )}
        </div>

        {/* Name */}
        <h2 style={{ color: 'white', fontWeight: '800', fontSize: '24px', marginBottom: '2px', lineHeight: 1.2 }}>
          {member.nickname || member.name}
        </h2>
        {member.nickname && member.nickname !== member.name && (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '10px' }}>{member.name}</div>
        )}

        {/* Member badge */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', margin: '10px 0 20px' }}>
          <span style={{ background: 'rgba(255,255,255,0.18)', color: 'white', padding: '5px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.25)' }}>
            {effectiveHcp.display}
          </span>
          {member.role && member.role !== '회원' && (
            <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(255,255,255,0.2)' }}>
              {member.role}
            </span>
          )}
          {member.isActive === false && (
            <span style={{ background: '#4B5563', color: 'white', padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '600' }}>비활성</span>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
          {[
            { label: 'RANKING', value: ranking > 0 ? `#${ranking}` : '-' },
            { label: 'ROUNDS', value: scores.length },
            { label: 'BEST', value: bestScore ?? '-' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ padding: '14px 8px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.8px', marginBottom: '6px' }}>{stat.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', lineHeight: 1 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {showPhotoLightbox && member.photo && (
        <div onClick={() => setShowPhotoLightbox(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <button onClick={() => setShowPhotoLightbox(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <img src={member.photo} alt={member.name} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ padding: '14px 16px 0', background: '#F1F5F9', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ background: '#E2E8F0', borderRadius: '12px', padding: '3px', display: 'flex', gap: '2px' }}>
          {[['info', '정보'], ['transactions', '거래'], ['scores', `스코어 (${scores.length})`]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, padding: '9px 4px',
                background: activeTab === key ? 'white' : 'transparent',
                borderRadius: '9px', border: 'none',
                fontSize: '13px', fontWeight: activeTab === key ? '700' : '500',
                color: activeTab === key ? '#0A2158' : '#6B7280',
                cursor: 'pointer',
                boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ padding: '16px 16px 0' }}>

        {/* ── 정보 TAB ── */}
        {activeTab === 'info' && (
          <>
            {/* 권한관리 + 회비면제 (admin only) */}
            {isAdmin && (
              <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>권한 관리</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: hasFeaturePermission('fee_exemption') ? '14px' : '0' }}>
                  {[{ role: '회원' }, { role: '클럽운영진' }, { role: '운영진' }, { role: '방장' }, { role: '관리자' }].map(({ role }) => {
                    const isSelected = member.role === role || (!member.role && role === '회원');
                    return (
                      <button key={role} onClick={() => handleChangeRole(role)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: isSelected ? '#0047AB' : '#F1F5F9', border: isSelected ? '2px solid #0047AB' : '2px solid #E2E8F0', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: isSelected ? '700' : '500', color: isSelected ? 'white' : '#374151' }}
                      >
                        {role !== '회원' ? <CrownIcon role={role} size={15} /> : <span style={{ fontSize: '13px' }}>👤</span>}
                        <span>{role}</span>
                      </button>
                    );
                  })}
                </div>

                {hasFeaturePermission('fee_exemption') && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', opacity: isTogglingFeeExempt ? 0.7 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>💰</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>회비면제</div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{isTogglingFeeExempt ? '처리중...' : '라운딩 참가 시 참가비 제외'}</div>
                      </div>
                    </div>
                    <div onClick={isTogglingFeeExempt ? undefined : handleFeeExemptChange}
                      style={{ width: '50px', height: '28px', borderRadius: '14px', background: member.isFeeExempt ? '#0047AB' : '#D1D5DB', position: 'relative', cursor: isTogglingFeeExempt ? 'not-allowed' : 'pointer', transition: 'all 0.3s', flexShrink: 0 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: member.isFeeExempt ? '24px' : '2px', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 정보 수정 버튼 */}
            {isAdmin && (
              <button onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '14px', background: '#0047AB', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,71,171,0.3)' }}>
                ✏️ 정보 수정
              </button>
            )}

            {/* 기본 정보 */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>기본 정보</div>
              {member.phone && <InfoRow label="전화번호" value={String(member.phone).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')} />}
              {member.gender && <InfoRow label="성별" value={member.gender} />}
              {member.birthYear && <InfoRow label="출생연도" value={member.birthYear} />}
              {member.region && <InfoRow label="지역" value={member.region} />}
              <InfoRow label="클럽 회원" value={member.isClubMember === 'yes' ? '예' : (member.isClubMember === 'no' ? '아니오' : '-')} last />
            </div>

            {/* GA / 클럽 정보 */}
            {member.isClubMember === 'yes' && (
              <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>클럽 / GA</div>
                {member.club && <InfoRow label="소속 클럽" value={member.club} />}
                {member.golflinkNumber && <InfoRow label="Golflink 번호" value={member.golflinkNumber} />}
                {member.clubMemberNumber && <InfoRow label="클럽 회원번호" value={member.clubMemberNumber} />}
                {member.gaHandy != null && <InfoRow label="GA 핸디캡" value={`GA ${member.gaHandy}`} last />}
              </div>
            )}
          </>
        )}

        {/* ── 거래 TAB ── */}
        {activeTab === 'transactions' && (
          <>
            {/* Balance 카드 */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                현재 잔액
              </div>
              <div>
                <span style={{ fontSize: '44px', fontWeight: '800', color: memberBalance < 0 ? '#DC2626' : '#0047AB', lineHeight: 1 }}>
                  {memberBalance < 0 ? '-' : ''}${Math.abs(memberBalance).toLocaleString()}
                </span>
                <span style={{ fontSize: '14px', color: '#9CA3AF', marginLeft: '6px', fontWeight: '600' }}>AUD</span>
              </div>
            </div>

            {/* Transaction list */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>최근 거래 내역</span>
              </div>
              {transactions.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>거래 내역이 없습니다</div>
              ) : (
                <div>
                  {transactions.map((transaction, index) => {
                    let typeLabel = '';
                    let bgColor = '#F1F5F9';
                    let iconText = '';
                    if (transaction.type === 'payment') {
                      const desc = transaction.description || '회비 납부';
                      typeLabel = desc.includes(' - ') ? desc.split(' - ')[0] : (desc.includes(' (') ? desc.split(' (')[0] : desc);
                      bgColor = '#EFF6FF'; iconText = '💳';
                    } else if (transaction.type === 'donation') { typeLabel = '도네이션'; bgColor = '#FFF7ED'; iconText = '🎁'; }
                    else if (transaction.type === 'credit') { typeLabel = '크레딧처리'; bgColor = '#F0FDF4'; iconText = '✅'; }
                    else if (transaction.type === 'expense') { typeLabel = '환불'; bgColor = '#FEF2F2'; iconText = '↩️'; }
                    else if (transaction.type === 'charge') { typeLabel = '회비 청구'; bgColor = '#FEF2F2'; iconText = '📋'; }
                    const isPositive = ['payment', 'donation', 'credit'].includes(transaction.type);
                    const amtColor = isPositive ? '#059669' : '#DC2626';
                    const sign = isPositive ? '+' : '-';
                    const dateStr = transaction.date ? new Date(transaction.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : '';
                    return (
                      <div key={transaction.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: index < transactions.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{iconText}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeLabel}</div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{dateStr}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: amtColor }}>{sign}${transaction.amount.toLocaleString()}</div>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: isPositive ? '#059669' : '#DC2626', opacity: 0.6, letterSpacing: '0.5px' }}>{isPositive ? 'COMPLETED' : 'BILLED'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 스코어 TAB ── */}
        {activeTab === 'scores' && (
          <>
            {/* 핸디캡 카드 */}
            {(() => {
              const manualHH = parseFloat(member.houseHandy);
              const recommendedVal = (!isGAMember && handicapData) ? handicapData.value : null;
              const isDifferent = !isGAMember && recommendedVal != null && !isNaN(manualHH) && manualHH !== recommendedVal;
              return (
                <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {isGAMember ? 'GA HANDICAP INDEX' : 'HANDICAP INDEX'}
                    </div>
                    {!isGAMember && (
                      <button onClick={() => setShowHandicapSheet(true)}
                        style={{ fontSize: '11px', fontWeight: '700', color: '#0047AB', background: '#EFF6FF', border: 'none', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer' }}>
                        추천핸디계산
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '32px', fontWeight: '800', color: '#0047AB', lineHeight: 1 }}>
                        {isGAMember ? 'GA' : 'HH'} {effectiveHcp.value ?? '-'}
                      </div>
                    </div>
                    {!isGAMember && recommendedVal != null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600', marginBottom: '2px' }}>추천</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: isDifferent ? '#F59E0B' : '#374151', lineHeight: 1 }}>{recommendedVal}</div>
                      </div>
                    )}
                  </div>
                  {isDifferent && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: '#FFFBEB', borderRadius: '8px', fontSize: '12px', color: '#92400E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>수동값({manualHH}) ≠ 추천값({recommendedVal})</span>
                      {isAdmin && <button onClick={() => setShowHandicapSheet(true)} style={{ fontSize: '12px', fontWeight: '700', color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>교체 ›</button>}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 스코어 기록 버튼 */}
            {isAdmin && (
              <button
                onClick={() => { setEditingScoreId(null); setScoreFormData({ roundingName: '', date: '', courseName: '', totalScore: '', holes: Array(18).fill(0), inputMode: 'total' }); setShowScoreModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '13px 16px', background: 'white', border: '2px dashed #CBD5E1', borderRadius: '14px', cursor: 'pointer', marginBottom: '12px', color: '#64748B', fontWeight: '600', fontSize: '14px', justifyContent: 'center', boxSizing: 'border-box' }}>
                <span style={{ fontSize: '18px' }}>+</span> 스코어 기록
              </button>
            )}

            {/* 스코어 리스트 */}
            {scores.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                아직 기록된 스코어가 없습니다.
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '16px', padding: '4px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>최근 라운딩</span>
                </div>
                {scores.map((score, index) => {
                  const d = score.date ? new Date(score.date) : null;
                  const course = courses.find(c => c.name === score.courseName);
                  const parArr = course?.holePars?.['male'] || Array(18).fill(4);
                  const coursePar = parArr.reduce((a, b) => a + b, 0);
                  const diff = score.totalScore - coursePar;
                  const diffStr = diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`;
                  const diffColor = diff < 0 ? '#059669' : diff === 0 ? '#0047AB' : '#6B7280';
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderTop: '1px solid #F1F5F9' }}>
                      {/* 날짜 */}
                      {d && (
                        <div style={{ textAlign: 'center', minWidth: '34px' }}>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0A2158', lineHeight: 1 }}>{d.getDate()}</div>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' }}>{d.toLocaleString('en', { month: 'short' })}</div>
                        </div>
                      )}
                      {/* 라운딩 정보 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{score.roundingName}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📍</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{score.courseName || '-'}</span>
                        </div>
                      </div>
                      {/* 스코어 */}
                      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#0A2158', lineHeight: 1 }}>{score.totalScore}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: diffColor }}>{diffStr}</div>
                        {user?.isAdmin && (
                          <div style={{ position: 'relative' }}>
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === score.id ? null : score.id); }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px', opacity: 0.4, lineHeight: 1 }}>⋮</button>
                            {openMenuId === score.id && (
                              <>
                                <div onClick={() => setOpenMenuId(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
                                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', zIndex: 100, minWidth: '110px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                                  <button onClick={() => { handleEditScore(score); setOpenMenuId(null); }} style={{ width: '100%', padding: '10px 14px', background: 'white', border: 'none', textAlign: 'left', fontSize: '14px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}>▪ 수정</button>
                                  <button onClick={() => { setOpenMenuId(null); handleDeleteScore(score.id); }} style={{ width: '100%', padding: '10px 14px', background: 'white', border: 'none', textAlign: 'left', fontSize: '14px', cursor: 'pointer', color: '#DC2626' }}>× 삭제</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── SCORE MODAL ── */}
      {showScoreModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ background: 'var(--bg-card)', border: '2px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{editingScoreId ? '스코어 수정' : '스코어 기록'}</h3>
              <button onClick={() => { setShowScoreModal(false); setEditingScoreId(null); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '0', opacity: 0.7 }}>✕</button>
            </div>

            <input type="text" placeholder="라운딩 이름" value={scoreFormData.roundingName} onChange={(e) => setScoreFormData({ ...scoreFormData, roundingName: e.target.value })} style={{ marginBottom: '12px' }} />
            <input type="date" value={scoreFormData.date} onChange={(e) => setScoreFormData({ ...scoreFormData, date: e.target.value })} style={{ marginBottom: '12px' }} />
            <div style={{ marginBottom: '12px' }}>
              <SearchableDropdown options={courses} value={scoreFormData.courseName} onChange={(value) => setScoreFormData({ ...scoreFormData, courseName: value })} placeholder="골프장 선택 (검색 가능)" displayKey="name" valueKey="name" />
            </div>

            {/* 입력 모드 토글 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => setScoreFormData(prev => ({ ...prev, inputMode: 'total' }))}
                style={{ flex: 1, padding: '10px', background: scoreFormData.inputMode === 'total' ? 'var(--primary-green)' : '#F3F4F6', color: scoreFormData.inputMode === 'total' ? 'white' : '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                총타수 입력
              </button>
              <button
                onClick={() => setScoreFormData(prev => ({ ...prev, inputMode: 'holes' }))}
                style={{ flex: 1, padding: '10px', background: scoreFormData.inputMode === 'holes' ? 'var(--primary-green)' : '#F3F4F6', color: scoreFormData.inputMode === 'holes' ? 'white' : '#374151', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                홀별 입력
              </button>
            </div>

            {scoreFormData.inputMode === 'total' ? (
              <input type="number" inputMode="numeric" placeholder="총 스코어" value={scoreFormData.totalScore} onChange={(e) => setScoreFormData({ ...scoreFormData, totalScore: e.target.value })} style={{ marginBottom: '12px' }} />
            ) : (
              renderHolesInput()
            )}

            <button onClick={handleAddScore} disabled={isSavingScore} className="btn-primary" style={{ width: '100%', background: isSavingScore ? '#999' : undefined, cursor: isSavingScore ? 'not-allowed' : 'pointer', opacity: isSavingScore ? 0.7 : 1 }}>
              {isSavingScore ? '처리중...' : '◆ 스코어 저장'}
            </button>
          </div>
        </div>
      )}

      {/* ── ADMIN BOTTOM SHEET ── */}
      {showAdminSheet && (
        <>
          <div onClick={() => setShowAdminSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', padding: '12px 20px', paddingBottom: 'max(80px, calc(68px + env(safe-area-inset-bottom)))', zIndex: 301, boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
            <div style={{ width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
              {member.nickname || member.name} 관리
            </div>
            <button
              onClick={() => { setShowAdminSheet(false); handleToggleActive(); }}
              style={{ display: 'block', width: '100%', padding: '14px 16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', textAlign: 'left', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px', color: '#374151' }}
            >
              {member.isActive === false ? '✓ 활성화하기' : '⏸ 비활성화하기'}
            </button>
            <button
              onClick={() => { setShowAdminSheet(false); handleDelete(); }}
              style={{ display: 'block', width: '100%', padding: '14px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', textAlign: 'left', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px', color: '#DC2626' }}
            >
              🗑 회원 삭제
            </button>
            <button
              onClick={() => setShowAdminSheet(false)}
              style={{ display: 'block', width: '100%', padding: '14px 16px', background: 'none', border: 'none', textAlign: 'center', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: '#6B7280' }}
            >
              취소
            </button>
          </div>
        </>
      )}
      {/* ── 핸디캡 바텀시트 ── */}
      {showHandicapSheet && !isGAMember && handicapData && (
        <>
          <div onClick={() => setShowHandicapSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', padding: '12px 20px', paddingBottom: 'max(80px, calc(68px + env(safe-area-inset-bottom)))', zIndex: 301, boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
            <div style={{ width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>추천 핸디캡 계산</div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>{member.nickname || member.name}</div>

            {/* 현재 vs 추천 비교 */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1, padding: '16px', background: '#F9FAFB', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>현재 등록</div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary-green)', lineHeight: 1 }}>
                  {effectiveHcp.value ?? '-'}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', fontWeight: '600' }}>HH</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#D1D5DB', fontSize: '20px' }}>→</div>
              <div style={{ flex: 1, padding: '16px', background: handicapData.value !== effectiveHcp.value ? '#FFFBEB' : '#F0FDF4', borderRadius: '12px', textAlign: 'center', border: handicapData.value !== effectiveHcp.value ? '1px solid #FDE68A' : '1px solid #BBF7D0' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>추천값</div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: handicapData.value !== effectiveHcp.value ? '#D97706' : '#059669', lineHeight: 1 }}>
                  {handicapData.value}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', fontWeight: '600' }}>HH</div>
              </div>
            </div>

            {/* 계산 근거 */}
            <div style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: '#6B7280', lineHeight: '1.6', fontStyle: 'italic' }}>
              {handicapData.explanation}
            </div>

            {/* 교체 버튼 (admin + 값이 다를 때) */}
            {isAdmin && handicapData.value !== effectiveHcp.value && (
              <button
                onClick={handleApplyRecommendedHandicap}
                disabled={applyingHcp}
                style={{ display: 'block', width: '100%', padding: '14px', background: applyingHcp ? '#9CA3AF' : 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: applyingHcp ? 'not-allowed' : 'pointer', marginBottom: '8px' }}
              >
                {applyingHcp ? '적용 중...' : `추천값(${handicapData.value})으로 교체하기`}
              </button>
            )}
            <button
              onClick={() => setShowHandicapSheet(false)}
              style={{ display: 'block', width: '100%', padding: '14px', background: 'none', border: 'none', textAlign: 'center', fontSize: '15px', fontWeight: '500', cursor: 'pointer', color: '#6B7280' }}
            >
              닫기
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '14px', color: '#9CA3AF' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{value}</span>
    </div>
  );
}

function EF({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: error ? '#DC2626' : '#374151', marginBottom: '6px' }}>
        {label}{required && <span style={{ color: '#e74c3c', marginLeft: '2px' }}>*</span>}
      </div>
      {children}
    </div>
  );
}

export default memo(MemberDetail);
