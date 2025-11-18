import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import { calculateHandicap } from '../utils/handicap';
import adminIcon from '../assets/role-admin.png';
import bangjangIcon from '../assets/role-bangjang.png';
import staffIcon from '../assets/role-staff.png';
import clubStaffIcon from '../assets/role-club-staff.png';

function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshMembers, members, courses } = useApp();
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

  useEffect(() => {
    loadMemberData();
  }, [id, members]);

  useEffect(() => {
    if (member) {
      loadScores();
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
    };

    if (openMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

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
      await apiService.updateMember(id, updateData);
      await refreshMembers();
      setIsEditing(false);
      alert('회원 정보가 수정되었습니다!');
    } catch (error) {
      console.error('회원 정보 수정 실패:', error);
      alert('회원 정보 수정에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 이 회원을 삭제하시겠습니까?')) return;
    
    try {
      await apiService.deleteMember(id);
      await refreshMembers();
      navigate('/admin');
      alert('회원이 삭제되었습니다.');
    } catch (error) {
      console.error('회원 삭제 실패:', error);
      alert('회원 삭제에 실패했습니다.');
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

    try {
      if (editingScoreId) {
        await apiService.updateScore(editingScoreId, {
          ...scoreFormData,
          totalScore: parseInt(scoreFormData.totalScore)
        });
      } else {
        await apiService.createScore({
          userId: id,
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
        <div style={{ width: '24px' }}></div>
      </div>

      <div className="page-content">
        <div className="card" style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block', 
            position: 'relative',
            marginBottom: '16px'
          }}>
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
              핸디: {member.handicap || handicapValue}
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
                회비 정보
              </h3>
              
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: member.balance < 0 ? 'var(--alert-red)' : 'var(--success-green)',
                textAlign: 'center',
                padding: '16px',
                background: member.balance < 0 ? '#fee' : '#efe',
                borderRadius: '8px'
              }}>
                {member.balance < 0 ? '미수금' : '잔액'}: ${Math.abs(member.balance).toLocaleString()}
              </div>
            </div>

            {isAdmin && (
              <>
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    marginBottom: '16px',
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    권한 관리
                  </h3>
                  
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {['관리자', '방장', '운영진', '클럽운영진', '회원'].map((role) => {
                      const isSelected = member.role === role || (!member.role && role === '회원');
                      const icons = {
                        '관리자': adminIcon,
                        '방장': bangjangIcon,
                        '운영진': staffIcon,
                        '클럽운영진': clubStaffIcon
                      };
                      
                      return (
                        <label
                          key={role}
                          onClick={() => handleChangeRole(role)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px 16px',
                            background: isSelected ? 'var(--bg-green)' : '#f8f8f8',
                            border: isSelected ? '2px solid var(--primary-green)' : '2px solid #e0e0e0',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f0f0f0';
                              e.currentTarget.style.borderColor = '#ccc';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f8f8f8';
                              e.currentTarget.style.borderColor = '#e0e0e0';
                            }
                          }}
                        >
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: isSelected ? '7px solid var(--primary-green)' : '2px solid #ccc',
                            background: 'white',
                            flexShrink: 0,
                            transition: 'all 0.2s'
                          }} />
                          
                          {icons[role] && (
                            <img 
                              src={icons[role]} 
                              alt={role} 
                              style={{ 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '50%',
                                flexShrink: 0
                              }} 
                            />
                          )}
                          {!icons[role] && (
                            <div style={{
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              flexShrink: 0
                            }}>
                              ●
                            </div>
                          )}
                          
                          <span style={{
                            fontSize: '16px',
                            fontWeight: isSelected ? '700' : '600',
                            color: isSelected ? 'var(--primary-green)' : 'var(--text-dark)',
                            flex: 1
                          }}>
                            {role}
                          </span>
                        </label>
                      );
                    })}
                  </div>
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
                      onClick={() => setIsEditing(true)}
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
                      <span style={{ fontSize: '24px', width: '30px', textAlign: 'center', color: '#333' }}>✎</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)', flex: 1 }}>
                        정보 수정
                      </span>
                      <span style={{ fontSize: '18px', opacity: 0.5 }}>›</span>
                    </button>

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

                    <button
                      onClick={handleToggleActive}
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
                        e.currentTarget.style.background = '#f0f0f0';
                        e.currentTarget.style.borderColor = '#ccc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8f8f8';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                      }}
                    >
                      <span style={{ fontSize: '24px', width: '30px', textAlign: 'center', color: '#333' }}>
                        {member.isActive === false ? '○' : '●'}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#666', flex: 1 }}>
                        {member.isActive === false ? '활성화' : '비활성화'}
                      </span>
                      <span style={{ fontSize: '18px', opacity: 0.5 }}>›</span>
                    </button>

                    <button
                      onClick={handleDelete}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        background: '#fff5f5',
                        border: '1px solid #ffcccc',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ffe5e5';
                        e.currentTarget.style.borderColor = '#ff9999';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fff5f5';
                        e.currentTarget.style.borderColor = '#ffcccc';
                      }}
                    >
                      <span style={{ fontSize: '24px', width: '30px', textAlign: 'center', color: '#333' }}>×</span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--alert-red)', flex: 1 }}>
                        회원 삭제
                      </span>
                      <span style={{ fontSize: '18px', opacity: 0.5, color: 'var(--alert-red)' }}>›</span>
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
              placeholder="이름"
              value={editData.name}
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
              value={editData.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setEditData({ ...editData, phone: digits });
              }}
              style={{ marginBottom: '12px' }}
            />
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
            <input
              type="text"
              placeholder="사진 URL"
              value={editData.photo || ''}
              onChange={(e) => setEditData({ ...editData, photo: e.target.value })}
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

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData(member);
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
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                저장
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
            <select
              value={scoreFormData.courseName}
              onChange={(e) => setScoreFormData({ ...scoreFormData, courseName: e.target.value })}
              style={{ marginBottom: '12px' }}
            >
              <option value="">골프장 선택</option>
              {courses.map((course, index) => (
                <option key={index} value={course.name}>
                  {course.name} {course.address && `- ${course.address}`}
                </option>
              ))}
            </select>
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
              className="btn-primary"
              style={{ width: '100%' }}
            >
              ◆ 스코어 저장
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

export default MemberDetail;
