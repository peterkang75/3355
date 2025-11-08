import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import { calculateHandicap } from '../utils/handicap';

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
      await apiService.createScore({
        memberId: id,
        ...scoreFormData,
        totalScore: parseInt(scoreFormData.totalScore)
      });
      
      setScoreFormData({
        roundingName: '',
        date: '',
        courseName: '',
        totalScore: ''
      });
      setShowScoreModal(false);
      
      const updatedScores = await apiService.fetchScores(id);
      setScores(updatedScores || []);
      
      const validScores = (updatedScores || []).filter(s => s.totalScore && s.totalScore > 0);
      const calculatedHandicap = calculateHandicap(member, validScores);
      
      await apiService.updateMember(id, { 
        handicap: String(calculatedHandicap.value) 
      });
      await refreshMembers();
      
      alert('스코어가 기록되고 핸디캡이 업데이트되었습니다!');
    } catch (error) {
      console.error('스코어 기록 실패:', error);
      alert('스코어 기록에 실패했습니다.');
    }
  };

  if (!member) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#666'
      }}>
        회원 정보를 불러오는 중...
      </div>
    );
  }

  const handicapValue = handicapData?.value ?? member.handicap ?? 18;
  const handicapType = handicapData?.type || (member.golflinkNumber ? 'GA' : 'HH');
  const handicapExplanation = handicapData?.explanation || '계산 대기 중';

  const isAdmin = user.role === 'admin' || user.isAdmin;

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
          onClick={() => navigate('/admin')}
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
          회원 상세
        </h1>
        <div style={{ width: '40px' }}></div>
      </div>

      <div style={{ padding: '16px' }}>
        <div className="card" style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            {member.photo ? (
              <img 
                src={member.photo} 
                alt={member.name}
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

          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700',
            marginBottom: '8px',
            color: '#2d5f3f'
          }}>
            {member.nickname || member.name}
          </h2>
          
          <div style={{ 
            fontSize: '16px', 
            color: '#666',
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
            background: '#f8f9fa',
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
              color: '#666',
              textAlign: 'center'
            }}>
              추천핸디: {handicapValue}
            </div>
            <div style={{
              fontSize: '13px',
              color: '#888',
              fontStyle: 'italic',
              textAlign: 'center',
              lineHeight: '1.4',
              marginTop: '4px'
            }}>
              {handicapExplanation}
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px'
          }}>
            {member.role === 'admin' && (
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
            {member.role === 'operator' && (
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
            {member.isActive === false && (
              <span style={{
                padding: '4px 12px',
                background: '#666',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                비활성
              </span>
            )}
          </div>
        </div>

        {!isEditing ? (
          <>
            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: '#2d5f3f'
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
                color: '#2d5f3f'
              }}>
                회비 정보
              </h3>
              
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: member.balance < 0 ? '#e53e3e' : '#22c55e',
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
                    marginBottom: '12px',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    권한 관리
                  </h3>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    justifyContent: 'space-between'
                  }}>
                    <button
                      onClick={() => handleChangeRole('admin')}
                      disabled={member.role === 'admin'}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        background: member.role === 'admin' ? 'var(--primary-green)' : '#f5f5f5',
                        color: member.role === 'admin' ? 'white' : '#666',
                        border: member.role === 'admin' ? 'none' : '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: member.role === 'admin' ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>👑</span>
                      <span>관리자</span>
                    </button>
                    <button
                      onClick={() => handleChangeRole('operator')}
                      disabled={member.role === 'operator'}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        background: member.role === 'operator' ? 'var(--primary-green)' : '#f5f5f5',
                        color: member.role === 'operator' ? 'white' : '#666',
                        border: member.role === 'operator' ? 'none' : '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: member.role === 'operator' ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>⚙️</span>
                      <span>운영진</span>
                    </button>
                    <button
                      onClick={() => handleChangeRole('member')}
                      disabled={member.role === 'member' || !member.role}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        background: (member.role === 'member' || !member.role) ? 'var(--primary-green)' : '#f5f5f5',
                        color: (member.role === 'member' || !member.role) ? 'white' : '#666',
                        border: (member.role === 'member' || !member.role) ? 'none' : '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: (member.role === 'member' || !member.role) ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>👤</span>
                      <span>일반</span>
                    </button>
                  </div>
                </div>

                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    관리 기능
                  </h3>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        padding: '12px',
                        background: 'var(--primary-green)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>✏️</span>
                      <span>정보 수정</span>
                    </button>
                    <button
                      onClick={() => setShowScoreModal(true)}
                      style={{
                        padding: '12px',
                        background: 'var(--primary-green)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>📊</span>
                      <span>스코어 기록</span>
                    </button>
                    <button
                      onClick={handleToggleActive}
                      style={{
                        padding: '12px',
                        background: '#f5f5f5',
                        color: '#666',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{member.isActive === false ? '🔓' : '🔒'}</span>
                      <span>{member.isActive === false ? '활성화' : '비활성화'}</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      style={{
                        padding: '12px',
                        background: '#fff5f5',
                        color: '#e53e3e',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>🗑️</span>
                      <span>회원 삭제</span>
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
              color: '#2d5f3f'
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
                onClick={handleSave}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                💾 저장
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData(member);
                }}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                ✕ 취소
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
            background: 'white',
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
                스코어 기록
              </h3>
              <button
                onClick={() => setShowScoreModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#999'
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
              📊 스코어 저장
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
      <span style={{ fontSize: '14px', color: '#666' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

export default MemberDetail;
