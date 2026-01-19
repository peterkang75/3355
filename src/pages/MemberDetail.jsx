import React, { useState, useEffect, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import { calculateHandicap } from '../utils/handicap';
import adminIcon from '../assets/role-admin.png';
import bangjangIcon from '../assets/role-bangjang.png';
import staffIcon from '../assets/role-staff.png';
import clubStaffIcon from '../assets/role-club-staff.png';
import CrownIcon from '../components/CrownIcon';
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
    totalScore: ''
  });
  const [transactions, setTransactions] = useState([]);
  const [memberBalance, setMemberBalance] = useState(0);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isTogglingFeeExempt, setIsTogglingFeeExempt] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [permissions, setPermissions] = useState({});

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

  // 점 세 개 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
      if (showMemberMenu) {
        setShowMemberMenu(false);
      }
    };

    if (openMenuId !== null || showMemberMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId, showMemberMenu]);

  const loadMemberData = () => {
    const foundMember = members.find(m => m.id === id);
    if (foundMember) {
      setMember(foundMember);
      setEditData(foundMember);
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
    if (!scoreFormData.roundingName || !scoreFormData.date || !scoreFormData.courseName || !scoreFormData.totalScore) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (isSavingScore) return;
    setIsSavingScore(true);
    
    try {
      if (editingScoreId) {
        await apiService.updateScore(editingScoreId, {
          ...scoreFormData,
          totalScore: parseInt(scoreFormData.totalScore)
        });
      } else {
        await apiService.createScore({
          userId: id,
          markerId: user.id,
          ...scoreFormData,
          totalScore: parseInt(scoreFormData.totalScore)
        });
      }
      
      setScoreFormData({
        roundingName: '',
        date: '',
        courseName: '',
        totalScore: ''
      });
      setShowScoreModal(false);
      setEditingScoreId(null);
      
      const updatedScores = await apiService.fetchScores(id);
      setScores(updatedScores || []);
      
      const validScores = (updatedScores || []).filter(s => s.totalScore && s.totalScore > 0);
      const calculatedHandicap = calculateHandicap(member, validScores);
      
      await apiService.updateMember(id, { 
        handicap: String(calculatedHandicap.value) 
      });
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
      totalScore: String(score.totalScore)
    });
    setShowScoreModal(true);
  };

  const handleDeleteScore = async (scoreId) => {
    if (!confirm('정말로 이 스코어를 삭제하시겠습니까?')) return;

    try {
      await apiService.deleteScore(scoreId);
      
      const updatedScores = await apiService.fetchScores(id);
      setScores(updatedScores || []);
      
      const validScores = (updatedScores || []).filter(s => s.totalScore && s.totalScore > 0);
      const calculatedHandicap = calculateHandicap(member, validScores);
      
      await apiService.updateMember(id, { 
        handicap: String(calculatedHandicap.value) 
      });
      await refreshMembers();
      
      alert('스코어가 삭제되고 핸디캡이 업데이트되었습니다!');
    } catch (error) {
      console.error('스코어 삭제 실패:', error);
      alert('스코어 삭제에 실패했습니다.');
    }
  };

  if (!member) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        opacity: 0.7
      }}>
        회원 정보를 불러오는 중...
      </div>
    );
  }

  const handicapValue = handicapData?.value ?? member.handicap ?? 18;
  const handicapType = handicapData?.type || (member.golflinkNumber ? 'GA' : 'HH');
  const handicapExplanation = handicapData?.explanation || '계산 대기 중';

  const isAdmin = user.role === '관리자' || user.role === '방장' || user.role === '운영진' || user.role === '클럽운영진' || user.isAdmin;

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div className="header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-light)',
            minWidth: '24px'
          }}
        >
          ‹
        </button>
        <h1 style={{ flex: 1, marginLeft: '12px' }}>
          회원 상세
        </h1>
        {isAdmin && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMemberMenu(!showMemberMenu);
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                color: 'var(--text-light)'
              }}
            >
              ⋮
            </button>
            {showMemberMenu && (
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  minWidth: '140px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)'
                }}
              >
                <button
                  onClick={() => {
                    setShowMemberMenu(false);
                    setIsEditing(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    textAlign: 'left',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: 'var(--text-dark)'
                  }}
                >
                  수정
                </button>
                <button
                  onClick={() => {
                    setShowMemberMenu(false);
                    handleToggleActive();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    textAlign: 'left',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: 'var(--text-dark)'
                  }}
                >
                  {member.isActive === false ? '활성화' : '비활성화'}
                </button>
                <button
                  onClick={() => {
                    setShowMemberMenu(false);
                    handleDelete();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: 'var(--alert-red)'
                  }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        )}
        {!isAdmin && <div style={{ width: '24px' }}></div>}
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block', 
            position: 'relative',
            marginBottom: '16px'
          }}>
            <input
              type="file"
              id="photoUpload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const img = new Image();
                    img.onload = async () => {
                      try {
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
                        if (!ctx) {
                          alert('이미지 처리 중 오류가 발생했습니다.');
                          return;
                        }
                        ctx.drawImage(img, 0, 0, width, height);

                        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                        
                        await apiService.updateMember(id, { photo: resizedBase64 });
                        await refreshMembers();
                        alert('사진이 변경되었습니다!');
                      } catch (error) {
                        console.error('사진 업로드 실패:', error);
                        alert('사진 업로드에 실패했습니다.');
                      }
                    };
                    img.onerror = () => {
                      alert('이미지를 불러오는 중 오류가 발생했습니다.');
                    };
                    img.src = event.target.result;
                  };
                  reader.onerror = () => {
                    alert('파일을 읽는 중 오류가 발생했습니다.');
                  };
                  reader.readAsDataURL(file);
                }
                e.target.value = '';
              }}
            />
            <label 
              htmlFor={isAdmin ? "photoUpload" : undefined}
              style={{ 
                cursor: isAdmin ? 'pointer' : 'default',
                display: 'block',
                position: 'relative'
              }}
            >
              {member.photo ? (
                <img 
                  src={member.photo} 
                  alt={member.name}
                  style={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '50%'
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
                  color: '#999'
                }}>
                  ●
                </div>
              )}
              {isAdmin && (
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  사진 변경
                </div>
              )}
            </label>
            
            {member.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(member.role) && (
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                zIndex: 10
              }}>
                {member.role === '관리자' && <img src={adminIcon} alt="관리자" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                {member.role === '방장' && <img src={bangjangIcon} alt="방장" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                {member.role === '운영진' && <img src={staffIcon} alt="운영진" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                {member.role === '클럽운영진' && <img src={clubStaffIcon} alt="클럽운영진" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
              </div>
            )}
          </div>

          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700',
            marginBottom: '8px',
            color: 'var(--primary-green)'
          }}>
            {member.nickname || member.name}
          </h2>
          
          <div style={{ 
            fontSize: '16px', 
            opacity: 0.7,
            marginBottom: '16px'
          }}>
            {member.name}
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '16px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            width: '90%',
            margin: '0 auto'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: 'var(--primary-green)',
              textAlign: 'center'
            }}>
              핸디: {member.club ? `GA${member.handicap || handicapValue}` : `HH${member.handicap || handicapValue}`}
            </div>
            <div style={{
              fontSize: '13px',
              opacity: 0.7,
              textAlign: 'center'
            }}>
              추천핸디: {handicapValue}
            </div>
            <div style={{
              fontSize: '13px',
              opacity: 0.7,
              fontStyle: 'italic',
              textAlign: 'center',
              lineHeight: '1.4',
              marginTop: '4px'
            }}>
              {handicapExplanation}
            </div>
          </div>

          {member.isActive === false && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '16px'
            }}>
              <span style={{
                padding: '4px 12px',
                background: '#666',
                color: 'var(--text-light)',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                비활성
              </span>
            </div>
          )}
        </div>

        {!isEditing ? (
          <>
            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--primary-green)'
              }}>
                기본 정보
              </h3>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <InfoRow label="전화번호" value={String(member.phone).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')} />
                <InfoRow label="성별" value={member.gender || '-'} />
                <InfoRow label="출생연도" value={member.birthYear || '-'} />
                <InfoRow label="지역" value={member.region || '-'} />
                <InfoRow label="클럽" value={member.club || '-'} />
                <InfoRow label="Golflink 번호" value={member.golflinkNumber || '-'} />
                <InfoRow label="핸디캡" value={member.handicap ? (member.club ? `GA${member.handicap}` : `HH${member.handicap}`) : '-'} />
                <InfoRow label="클럽 회원번호" value={member.clubMemberNumber || '-'} />
                <InfoRow label="클럽 회원 여부" value={member.isClubMember || '-'} />
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--primary-green)'
              }}>
                참가비 정보
              </h3>
              
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: memberBalance < 0 ? 'var(--alert-red)' : 'var(--success-green)',
                textAlign: 'center',
                padding: '16px',
                background: memberBalance < 0 ? '#fee' : '#efe',
                borderRadius: '8px'
              }}>
                {memberBalance < 0 ? '미수금' : '잔액'}: ${Math.abs(memberBalance).toLocaleString()}
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--primary-green)'
              }}>
                거래 내역
              </h3>
              
              {(() => {
                const filteredTransactions = transactions;
                const chargeTransactions = transactions.filter(t => t.type === 'charge' && t.booking);
                
                if (filteredTransactions.length === 0) {
                  return (
                    <div style={{ 
                      padding: '24px',
                      textAlign: 'center',
                      opacity: 0.7
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>$</div>
                      <p style={{ fontSize: '14px' }}>거래 내역이 없습니다</p>
                    </div>
                  );
                }
                
                return (
                  <div>
                    {filteredTransactions.map(transaction => {
                      let typeLabel = '';
                      if (transaction.type === 'payment') {
                        const paymentDesc = transaction.description || '회비 납부';
                        if (paymentDesc.includes(' - ')) {
                          typeLabel = paymentDesc.split(' - ')[0];
                        } else if (paymentDesc.includes(' (')) {
                          typeLabel = paymentDesc.split(' (')[0];
                        } else {
                          typeLabel = paymentDesc;
                        }
                      } else if (transaction.type === 'donation') {
                        typeLabel = '도네이션';
                      } else if (transaction.type === 'credit') {
                        typeLabel = '크레딧처리';
                      } else if (transaction.type === 'expense') {
                        typeLabel = '환불';
                      } else if (transaction.type === 'charge') {
                        typeLabel = '회비 청구';
                      } else {
                        typeLabel = '';
                      }
                      
                      const typeColor =
                        (transaction.type === 'expense' || transaction.type === 'charge') ? 'var(--alert-red)' : 'var(--success-green)';

                      const sign = (transaction.type === 'payment' || transaction.type === 'donation' || transaction.type === 'credit') ? '+' : '-';
                      
                      let bookingName = '-';
                      if (transaction.booking) {
                        bookingName = transaction.booking.title || transaction.booking.courseName || '-';
                      } else if (transaction.type === 'payment' && chargeTransactions.length > 0) {
                        const recentCharge = chargeTransactions[0];
                        bookingName = recentCharge.booking.title || recentCharge.booking.courseName || '-';
                      }

                      return (
                        <div 
                          key={transaction.id}
                          style={{
                            padding: '12px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                              {typeLabel}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '2px' }}>
                              {bookingName}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.6 }}>
                              {new Date(transaction.date).toLocaleDateString('ko-KR')}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: typeColor
                          }}>
                            {sign}${transaction.amount.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {isAdmin && (
              <>
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    marginBottom: '12px',
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    권한 관리
                  </h3>
                  
                  <div style={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    {[
                      { role: '회원' },
                      { role: '클럽운영진' },
                      { role: '운영진' },
                      { role: '방장' },
                      { role: '관리자' }
                    ].map(({ role }) => {
                      const isSelected = member.role === role || (!member.role && role === '회원');
                      
                      return (
                        <button
                          key={role}
                          onClick={() => handleChangeRole(role)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            background: isSelected ? 'var(--primary-green)' : '#f5f5f5',
                            border: isSelected ? '2px solid var(--primary-green)' : '2px solid #e0e0e0',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '14px',
                            fontWeight: isSelected ? '700' : '500',
                            color: isSelected ? 'white' : 'var(--text-dark)'
                          }}
                        >
                          {role !== '회원' ? (
                            <CrownIcon role={role} size={18} />
                          ) : (
                            <span style={{ fontSize: '16px' }}>👤</span>
                          )}
                          <span>{role}</span>
                        </button>
                      );
                    })}
                  </div>

                  {hasFeaturePermission('fee_exemption') && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: member.isFeeExempt ? 'rgba(45, 95, 63, 0.1)' : '#f8f8f8',
                      borderRadius: '10px',
                      border: member.isFeeExempt ? '1px solid var(--primary-green)' : '1px solid #e0e0e0',
                      opacity: isTogglingFeeExempt ? 0.7 : 1
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>💰</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>회비면제</div>
                          <div style={{ fontSize: '12px', opacity: 0.7 }}>
                            {isTogglingFeeExempt ? '처리중...' : '라운딩 참가 시 참가비 제외'}
                          </div>
                        </div>
                      </div>
                      <div
                        onClick={isTogglingFeeExempt ? undefined : handleFeeExemptChange}
                        style={{
                          width: '50px',
                          height: '28px',
                          borderRadius: '14px',
                          background: member.isFeeExempt ? 'var(--primary-green)' : '#ccc',
                          position: 'relative',
                          cursor: isTogglingFeeExempt ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s',
                          opacity: isTogglingFeeExempt ? 0.6 : 1
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'white',
                          position: 'absolute',
                          top: '2px',
                          left: member.isFeeExempt ? '24px' : '2px',
                          transition: 'left 0.3s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    marginBottom: '16px',
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    관리 기능
                  </h3>
                  
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => {
                        setEditingScoreId(null);
                        setScoreFormData({
                          roundingName: '',
                          date: '',
                          courseName: '',
                          totalScore: ''
                        });
                        setShowScoreModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        background: '#f8f8f8',
                        border: '1px solid #e0e0e0',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-green)';
                        e.currentTarget.style.borderColor = 'var(--primary-green)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8f8f8';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                      }}
                    >
                      <span style={{ fontSize: '24px', width: '30px', textAlign: 'center', color: '#333' }}>📊</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)', flex: 1 }}>
                        스코어 기록
                      </span>
                      <span style={{ fontSize: '18px', opacity: 0.5 }}>›</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              marginBottom: '16px',
              color: 'var(--primary-green)'
            }}>
              회원 정보 수정
            </h3>
            
            <input
              type="text"
              placeholder="이름 *"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              style={{ 
                marginBottom: '12px',
                borderColor: !editData.name?.trim() ? '#e74c3c' : undefined,
                boxShadow: !editData.name?.trim() ? '0 0 0 1px #e74c3c' : undefined
              }}
            />
            <input
              type="text"
              placeholder="대화명 (닉네임) *"
              value={editData.nickname || ''}
              onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
              style={{ 
                marginBottom: '12px',
                borderColor: !editData.nickname?.trim() ? '#e74c3c' : undefined,
                boxShadow: !editData.nickname?.trim() ? '0 0 0 1px #e74c3c' : undefined
              }}
            />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="전화번호 *"
              value={editData.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setEditData({ ...editData, phone: digits });
              }}
              style={{ 
                marginBottom: '12px',
                borderColor: !editData.phone?.trim() ? '#e74c3c' : undefined,
                boxShadow: !editData.phone?.trim() ? '0 0 0 1px #e74c3c' : undefined
              }}
            />
            
            <div style={{ 
              marginBottom: '12px',
              padding: !editData.photo ? '8px' : undefined,
              border: !editData.photo ? '2px solid #e74c3c' : undefined,
              borderRadius: !editData.photo ? '8px' : undefined,
              background: !editData.photo ? '#fff5f5' : undefined
            }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: !editData.photo ? '#e74c3c' : undefined }}>
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
                        setEditData({ ...editData, photo: compressedDataUrl });
                      };
                      img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ marginBottom: '8px', width: '100%' }}
              />
              {editData.photo && (
                <div style={{ marginTop: '8px' }}>
                  <img 
                    src={editData.photo} 
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

            <input
              type="number"
              inputMode="numeric"
              placeholder="핸디캡 *"
              value={editData.handicap || ''}
              onChange={(e) => setEditData({ ...editData, handicap: e.target.value })}
              style={{ 
                marginBottom: '12px',
                borderColor: !editData.handicap?.toString().trim() ? '#e74c3c' : undefined,
                boxShadow: !editData.handicap?.toString().trim() ? '0 0 0 1px #e74c3c' : undefined
              }}
            />

            <div style={{ 
              marginBottom: '12px',
              padding: (!editData.isClubMember || editData.isClubMember === '') ? '8px' : undefined,
              border: (!editData.isClubMember || editData.isClubMember === '') ? '2px solid #e74c3c' : undefined,
              borderRadius: (!editData.isClubMember || editData.isClubMember === '') ? '8px' : undefined,
              background: (!editData.isClubMember || editData.isClubMember === '') ? '#fff5f5' : undefined
            }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: (!editData.isClubMember || editData.isClubMember === '') ? '#e74c3c' : undefined }}>
                클럽 멤버이신가요? *
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="isClubMember"
                    value="yes"
                    checked={editData.isClubMember === 'yes'}
                    onChange={(e) => setEditData({ ...editData, isClubMember: e.target.value })}
                  />
                  <span>예</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="isClubMember"
                    value="no"
                    checked={editData.isClubMember === 'no'}
                    onChange={(e) => setEditData({ ...editData, isClubMember: e.target.value })}
                  />
                  <span>아니오</span>
                </label>
              </div>
            </div>

            {editData.isClubMember === 'yes' && (
              <>
                <div style={{ 
                  marginBottom: '12px',
                  border: !editData.club?.trim() ? '2px solid #e74c3c' : undefined,
                  borderRadius: !editData.club?.trim() ? '8px' : undefined,
                  padding: !editData.club?.trim() ? '4px' : undefined,
                  background: !editData.club?.trim() ? '#fff5f5' : undefined
                }}>
                  <SearchableDropdown
                    options={courses}
                    value={editData.club || ''}
                    onChange={(value) => setEditData({ ...editData, club: value })}
                    placeholder="소속 클럽 선택 * (검색 가능)"
                    displayKey="name"
                    valueKey="name"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Golflink 번호 *"
                  value={editData.golflinkNumber || ''}
                  onChange={(e) => setEditData({ ...editData, golflinkNumber: e.target.value })}
                  style={{ 
                    marginBottom: '12px',
                    borderColor: !editData.golflinkNumber?.trim() ? '#e74c3c' : undefined,
                    boxShadow: !editData.golflinkNumber?.trim() ? '0 0 0 1px #e74c3c' : undefined
                  }}
                />
                <input
                  type="text"
                  placeholder="클럽 회원번호 *"
                  value={editData.clubMemberNumber || ''}
                  onChange={(e) => setEditData({ ...editData, clubMemberNumber: e.target.value })}
                  style={{ 
                    marginBottom: '12px',
                    borderColor: !editData.clubMemberNumber?.trim() ? '#e74c3c' : undefined,
                    boxShadow: !editData.clubMemberNumber?.trim() ? '0 0 0 1px #e74c3c' : undefined
                  }}
                />
                <input
                  type="text"
                  placeholder="GA 핸디캡"
                  value={editData.gaHandy || ''}
                  onChange={(e) => setEditData({ ...editData, gaHandy: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
              </>
            )}

            {editData.isClubMember === 'no' && (
              <input
                type="text"
                placeholder="HH 핸디캡 (하우스 핸디)"
                value={editData.houseHandy || ''}
                onChange={(e) => setEditData({ ...editData, houseHandy: e.target.value })}
                style={{ marginBottom: '12px' }}
              />
            )}
            
            <div style={{ 
              marginBottom: '12px',
              padding: !editData.gender ? '8px' : undefined,
              border: !editData.gender ? '2px solid #e74c3c' : undefined,
              borderRadius: !editData.gender ? '8px' : undefined,
              background: !editData.gender ? '#fff5f5' : undefined
            }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: !editData.gender ? '#e74c3c' : undefined }}>
                성별 *
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
              placeholder="출생연도 *"
              value={editData.birthYear || ''}
              onChange={(e) => setEditData({ ...editData, birthYear: e.target.value })}
              style={{ 
                marginBottom: '12px',
                borderColor: !editData.birthYear?.toString().trim() ? '#e74c3c' : undefined,
                boxShadow: !editData.birthYear?.toString().trim() ? '0 0 0 1px #e74c3c' : undefined
              }}
            />
            <input
              type="text"
              placeholder="사는 지역 *"
              value={editData.region || ''}
              onChange={(e) => setEditData({ ...editData, region: e.target.value })}
              style={{ 
                marginBottom: '12px',
                borderColor: !editData.region?.trim() ? '#e74c3c' : undefined,
                boxShadow: !editData.region?.trim() ? '0 0 0 1px #e74c3c' : undefined
              }}
            />

            {requiresProfileComplete && (
              <div style={{
                padding: '12px 16px',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '14px',
                color: '#856404',
                textAlign: 'center'
              }}>
                필수 정보를 모두 입력해주세요.
              </div>
            )}

            {validationError && (
              <div style={{
                padding: '12px 16px',
                background: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '14px',
                color: '#721c24',
                textAlign: 'center'
              }}>
                {validationError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {!requiresProfileComplete && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(member);
                    setValidationError('');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: '#BD5B43',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  취소하기
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: isSaving ? '#999' : 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1
                }}
              >
                {isSaving ? '처리중...' : '저장'}
              </button>
            </div>
          </div>
        )}

        <div className="card">
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
              color: 'var(--primary-green)'
            }}>
              스코어 히스토리
            </h3>
            <span style={{
              fontSize: '14px',
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
              color: '#999',
              fontSize: '14px'
            }}>
              아직 기록된 스코어가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '2px' }}>
              {scores.map((score, index) => (
                <div
                  key={index}
                  style={{
                    padding: '6px 8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    marginBottom: '2px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: 'var(--primary-green)',
                        marginBottom: '3px'
                      }}>
                        {score.roundingName}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        opacity: 0.7
                      }}>
                        {score.courseName} · {new Date(score.date).toLocaleDateString('ko-KR')}
                      </div>
                      {score.gameMode === 'foursome' && (() => {
                        let metadata = null;
                        try {
                          metadata = score.gameMetadata 
                            ? (typeof score.gameMetadata === 'string' ? JSON.parse(score.gameMetadata) : score.gameMetadata)
                            : null;
                        } catch (e) {}
                        return metadata ? (
                          <div style={{
                            marginTop: '4px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                            alignItems: 'center'
                          }}>
                            <span style={{
                              background: '#9333ea',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>포썸</span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              파트너: {metadata.partner?.name || '?'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#888' }}>
                              vs {metadata.opponents?.map(o => o?.name).filter(Boolean).join(' & ') || '?'}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--primary-green)'
                      }}>
                        {score.totalScore}
                      </div>
                      {user?.isAdmin && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === score.id ? null : score.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '20px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              opacity: 0.7,
                              lineHeight: '1'
                            }}
                          >
                            ⋮
                          </button>
                          {openMenuId === score.id && (
                            <>
                              <div
                                onClick={() => setOpenMenuId(null)}
                                style={{
                                  position: 'fixed',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  zIndex: 99
                                }}
                              />
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  marginTop: '4px',
                                  background: 'var(--bg-card)',
                                  border: '2px solid var(--border-color)',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  zIndex: 100,
                                  minWidth: '120px'
                                }}
                              >
                                <button
                                  onClick={() => {
                                    handleEditScore(score);
                                    setOpenMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    background: 'var(--bg-card)',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--border-color)'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = 'white'}
                                  onMouseLeave={(e) => e.target.style.background = 'var(--bg-card)'}
                                >
                                  ▪ 수정
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDeleteScore(score.id);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    background: 'var(--bg-card)',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    color: 'var(--alert-red)'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#fff5f5'}
                                  onMouseLeave={(e) => e.target.style.background = 'var(--bg-card)'}
                                >
                                  × 삭제
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showScoreModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px' 
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                {editingScoreId ? '스코어 수정' : '스코어 기록'}
              </h3>
              <button
                onClick={() => {
                  setShowScoreModal(false);
                  setEditingScoreId(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  opacity: 0.7
                }}
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="라운딩 이름"
              value={scoreFormData.roundingName}
              onChange={(e) => setScoreFormData({ ...scoreFormData, roundingName: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <input
              type="date"
              placeholder="날짜"
              value={scoreFormData.date}
              onChange={(e) => setScoreFormData({ ...scoreFormData, date: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <div style={{ marginBottom: '12px' }}>
              <SearchableDropdown
                options={courses}
                value={scoreFormData.courseName}
                onChange={(value) => setScoreFormData({ ...scoreFormData, courseName: value })}
                placeholder="골프장 선택 (검색 가능)"
                displayKey="name"
                valueKey="name"
              />
            </div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="총 스코어"
              value={scoreFormData.totalScore}
              onChange={(e) => setScoreFormData({ ...scoreFormData, totalScore: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <button
              onClick={handleAddScore}
              disabled={isSavingScore}
              className="btn-primary"
              style={{ 
                width: '100%',
                background: isSavingScore ? '#999' : undefined,
                cursor: isSavingScore ? 'not-allowed' : 'pointer',
                opacity: isSavingScore ? 0.7 : 1
              }}
            >
              {isSavingScore ? '처리중...' : '◆ 스코어 저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border-color)'
    }}>
      <span style={{ fontSize: '14px', opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

export default memo(MemberDetail);
