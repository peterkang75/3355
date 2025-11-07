import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';

function Admin() {
  const { user, addFee, courses, addCourse, refreshMembers, members: contextMembers } = useApp();
  const [activeTab, setActiveTab] = useState('menu');
  const [members, setMembers] = useState([]);
  const [showPermissionMenu, setShowPermissionMenu] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const menuRefs = useRef({});
  const [newCourse, setNewCourse] = useState({
    name: '',
    address: '',
    holePars: Array(18).fill(4)
  });
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    nickname: '',
    phone: '',
    club: '',
    handicap: '',
    golflinkNumber: '',
    clubMemberNumber: '',
    photo: '',
    gender: '',
    birthYear: '',
    region: '',
    isClubMember: '',
    isAdmin: false
  });
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberData, setEditMemberData] = useState(null);

  useEffect(() => {
    if (contextMembers) {
      setMembers(contextMembers);
    }
  }, [contextMembers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPermissionMenu === null) return;
      
      const clickedRef = menuRefs.current[showPermissionMenu];
      if (clickedRef && !clickedRef.contains(event.target)) {
        setShowPermissionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPermissionMenu]);

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.phone) {
      alert('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (newMember.phone.length !== 10 || !/^\d+$/.test(newMember.phone)) {
      alert('전화번호 10자리를 정확히 입력해주세요.');
      return;
    }

    const member = {
      ...newMember,
      balance: 0
    };

    console.log('🔵 Admin: 회원 추가 시작');
    console.log('📤 데이터베이스에 저장 시도:', member);
    
    try {
      const createdMember = await apiService.createMember(member);
      console.log('✅ 데이터베이스에 저장 완료, 생성된 ID:', createdMember.id);
      
      if (refreshMembers) {
        await refreshMembers();
        console.log('✅ AppContext 회원 목록 새로고침 완료');
      }
      
      setNewMember({ 
        name: '', 
        nickname: '', 
        phone: '', 
        club: '', 
        handicap: '', 
        golflinkNumber: '', 
        clubMemberNumber: '', 
        photo: '', 
        gender: '', 
        birthYear: '', 
        region: '', 
        isClubMember: '', 
        isAdmin: false 
      });
      setShowNewMemberForm(false);
      alert('회원이 추가되었습니다!');
    } catch (error) {
      console.error('❌ 데이터베이스 저장 실패:', error);
      alert('회원 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleToggleAdmin = async (memberId) => {
    try {
      const updatedMember = await apiService.toggleMemberAdmin(memberId);
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setShowPermissionMenu(null);
      alert(updatedMember.isAdmin ? '관리자 권한이 부여되었습니다.' : '관리자 권한이 해제되었습니다.');
    } catch (error) {
      console.error('❌ 권한 변경 실패:', error);
      alert('권한 변경 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (memberId) => {
    try {
      const updatedMember = await apiService.toggleMemberActive(memberId);
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setShowPermissionMenu(null);
      alert(updatedMember.isActive === false ? '회원이 비활성화되었습니다.' : '회원이 활성화되었습니다.');
    } catch (error) {
      console.error('❌ 상태 변경 실패:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!confirm('정말로 이 회원을 삭제하시겠습니까?')) {
      return;
    }
    
    setShowPermissionMenu(null);
    
    try {
      await apiService.deleteMember(memberId);
      console.log('✅ 데이터베이스에서 회원 삭제 완료');
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      alert('회원이 삭제되었습니다.');
    } catch (error) {
      console.error('❌ 회원 삭제 실패:', error);
      alert('회원 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member.id);
    setEditMemberData({
      name: member.name || '',
      nickname: member.nickname || '',
      phone: member.phone || '',
      club: member.club || '',
      handicap: member.handicap || '',
      golflinkNumber: member.golflinkNumber || '',
      clubMemberNumber: member.clubMemberNumber || '',
      photo: member.photo || '',
      gender: member.gender || '',
      birthYear: member.birthYear || '',
      region: member.region || '',
      balance: member.balance || 0
    });
    setShowPermissionMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editMemberData.name || !editMemberData.phone) {
      alert('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (editMemberData.phone.length !== 10 || !/^\d+$/.test(editMemberData.phone)) {
      alert('전화번호 10자리를 정확히 입력해주세요.');
      return;
    }

    try {
      await apiService.updateMember(editingMember, editMemberData);
      console.log('✅ 회원 정보 업데이트 완료');
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setEditingMember(null);
      setEditMemberData(null);
      alert('회원 정보가 수정되었습니다.');
    } catch (error) {
      console.error('❌ 회원 정보 수정 실패:', error);
      alert('회원 정보 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditMemberData(null);
  };

  const handleAddCourse = async () => {
    if (!newCourse.name) {
      alert('골프장 이름을 입력해주세요.');
      return;
    }

    try {
      const courseData = {
        name: newCourse.name,
        address: newCourse.address,
        holePars: newCourse.holePars
      };
      
      await apiService.createCourse(courseData);
      alert('골프장이 등록되었습니다.');
      
      setNewCourse({ 
        name: '', 
        address: '',
        holePars: Array(18).fill(4)
      });
      
      window.location.reload();
    } catch (error) {
      console.error('❌ 골프장 등록 실패:', error);
      alert('골프장 등록 중 오류가 발생했습니다.');
    }
  };

  const handleHoleParChange = (holeIndex, value) => {
    const newHolePars = [...newCourse.holePars];
    newHolePars[holeIndex] = parseInt(value) || 3;
    setNewCourse({ ...newCourse, holePars: newHolePars });
  };

  if (!user.isAdmin) {
    return (
      <div>
        <div className="header">
          <h1>관리자</h1>
        </div>
        <div className="page-content">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <p>관리자 권한이 필요합니다</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>관리자</h1>
        {activeTab !== 'menu' && (
          <button
            onClick={() => setActiveTab('menu')}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            ←
          </button>
        )}
      </div>

      <div className="page-content">
        {activeTab === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setActiveTab('members')}
              className="card"
              style={{
                padding: '20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                background: 'white',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px' }}>👥</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                    회원 관리
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    회원 정보 조회 및 수정
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: '#999' }}>›</div>
            </button>

            <button
              onClick={() => setActiveTab('fees')}
              className="card"
              style={{
                padding: '20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                background: 'white',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px' }}>💰</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                    회비 관리
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    회비 등록 및 납부 관리
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: '#999' }}>›</div>
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className="card"
              style={{
                padding: '20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                background: 'white',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px' }}>⛳</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                    골프장 관리
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    골프장 등록 및 관리
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: '#999' }}>›</div>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="card"
              style={{
                padding: '20px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                background: 'white',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px' }}>⚙️</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                    앱 설정
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    앱 기본 설정 관리
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: '#999' }}>›</div>
            </button>
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            <div className="card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px' 
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  전체 회원 ({showInactive ? members.length : members.filter(m => m.isActive !== false).length})
                </h3>
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  style={{
                    padding: '8px 16px',
                    background: showInactive ? 'var(--primary-green)' : 'white',
                    color: showInactive ? 'white' : 'var(--primary-green)',
                    border: `2px solid var(--primary-green)`,
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {showInactive ? '✓ 비활성 회원 포함' : '활성 회원만 보기'}
                </button>
              </div>
              {members.filter(member => showInactive || member.isActive !== false).map(member => (
                <div 
                  key={member.id}
                  style={{
                    padding: '16px',
                    background: member.isActive === false ? '#f5f5f5' : 'var(--bg-green)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'flex',
                    gap: '16px',
                    opacity: member.isActive === false ? 0.6 : 1,
                    position: 'relative'
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    {member.photo ? (
                      <img 
                        src={member.photo} 
                        alt={member.name}
                        style={{
                          width: '100px',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid white'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100px',
                        height: '100px',
                        background: '#ddd',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px',
                        color: '#999'
                      }}>
                        👤
                      </div>
                    )}
                    <div 
                      style={{ position: 'relative' }}
                      ref={(el) => menuRefs.current[member.id] = el}
                    >
                      <button 
                        className="btn-secondary" 
                        style={{ fontSize: '13px', padding: '8px', width: '100px', marginTop: '8px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPermissionMenu(showPermissionMenu === member.id ? null : member.id);
                        }}
                      >
                        권한 수정
                      </button>
                      {showPermissionMenu === member.id && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '4px',
                          background: 'white',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          minWidth: '180px',
                          overflow: 'hidden'
                        }}>
                          <button
                            onClick={() => handleEditMember(member)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'white',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              borderBottom: '1px solid var(--border-color)',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-green)'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                          >
                            ✏️ 회원 정보 수정
                          </button>
                          <button
                            onClick={() => handleToggleAdmin(member.id)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'white',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              borderBottom: '1px solid var(--border-color)',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-green)'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                          >
                            {member.isAdmin ? '❌ 관리자 권한 해제' : '✅ 관리자 권한 주기'}
                          </button>
                          <button
                            onClick={() => handleToggleActive(member.id)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'white',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              borderBottom: '1px solid var(--border-color)',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-green)'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                          >
                            {member.isActive === false ? '🔓 회원 활성화' : '🔒 회원 비활성화'}
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'white',
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#e53e3e',
                              fontWeight: '600',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#fee'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                          >
                            🗑️ 회원 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ 
                        fontWeight: '700', 
                        fontSize: '16px',
                        marginBottom: '4px'
                      }}>
                        {member.name}
                        {member.isAdmin && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            background: 'var(--primary-green)',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            관리자
                          </span>
                        )}
                        {member.isActive === false && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            background: '#666',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            비활성
                          </span>
                        )}
                      </div>
                      {member.nickname && (
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                          대화명: {member.nickname}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px', lineHeight: '1.6' }}>
                      <div>핸디: {member.handicap}</div>
                      {member.gender && (
                        <div>성별: {member.gender}</div>
                      )}
                      {member.birthYear && (
                        <div>출생연도: {member.birthYear}</div>
                      )}
                      {member.region && (
                        <div>지역: {member.region}</div>
                      )}
                      {member.golflinkNumber && (
                        <div>Golflink Number: {member.golflinkNumber}</div>
                      )}
                      {member.clubMemberNumber && (
                        <div>클럽 회원번호: {member.clubMemberNumber}</div>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      <div style={{
                        fontWeight: '700',
                        color: member.balance < 0 ? '#e53e3e' : '#22c55e'
                      }}>
                        미수금: {member.balance.toLocaleString()}원
                      </div>
                      <div style={{ color: '#666' }}>
                        전화: {String(member.phone).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editingMember && editMemberData && (
              <div className="card" style={{ marginTop: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  ✏️ 회원 정보 수정
                </h3>
                <input
                  type="text"
                  placeholder="이름"
                  value={editMemberData.name}
                  onChange={(e) => setEditMemberData({ ...editMemberData, name: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="대화명 (닉네임)"
                  value={editMemberData.nickname}
                  onChange={(e) => setEditMemberData({ ...editMemberData, nickname: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="전화번호 (예: 0100 123 456)"
                  value={editMemberData.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEditMemberData({ ...editMemberData, phone: digits });
                  }}
                  maxLength={12}
                  style={{ marginBottom: '12px' }}
                />
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    성별
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="edit-gender"
                        value="남"
                        checked={editMemberData.gender === '남'}
                        onChange={(e) => setEditMemberData({ ...editMemberData, gender: e.target.value })}
                      />
                      <span>남</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="edit-gender"
                        value="여"
                        checked={editMemberData.gender === '여'}
                        onChange={(e) => setEditMemberData({ ...editMemberData, gender: e.target.value })}
                      />
                      <span>여</span>
                    </label>
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="출생연도 (예: 1990)"
                  value={editMemberData.birthYear}
                  onChange={(e) => setEditMemberData({ ...editMemberData, birthYear: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="사는 지역 (예: Lidcombe, Ryde)"
                  value={editMemberData.region}
                  onChange={(e) => setEditMemberData({ ...editMemberData, region: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="소속 클럽"
                  value={editMemberData.club}
                  onChange={(e) => setEditMemberData({ ...editMemberData, club: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="핸디"
                  value={editMemberData.handicap}
                  onChange={(e) => setEditMemberData({ ...editMemberData, handicap: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Golflink Number"
                  value={editMemberData.golflinkNumber}
                  onChange={(e) => setEditMemberData({ ...editMemberData, golflinkNumber: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="클럽 회원번호"
                  value={editMemberData.clubMemberNumber}
                  onChange={(e) => setEditMemberData({ ...editMemberData, clubMemberNumber: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="number"
                  placeholder="미수금"
                  value={editMemberData.balance}
                  onChange={(e) => setEditMemberData({ ...editMemberData, balance: Number(e.target.value) })}
                  style={{ marginBottom: '12px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSaveEdit}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    저장
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {showNewMemberForm && (
              <div className="card">
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                  새 회원 추가
                </h3>
                <input
                  type="text"
                  placeholder="이름"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="대화명 (닉네임)"
                  value={newMember.nickname}
                  onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
                  style={{ marginBottom: '12px' }}
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
                  style={{ marginBottom: '12px' }}
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
                    style={{ marginBottom: '8px' }}
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
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="사는 지역 (예: Lidcombe, Ryde)"
                  value={newMember.region}
                  onChange={(e) => setNewMember({ ...newMember, region: e.target.value })}
                  style={{ marginBottom: '12px' }}
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
                      type="text"
                      placeholder="Golflink Number"
                      value={newMember.golflinkNumber}
                      onChange={(e) => setNewMember({ ...newMember, golflinkNumber: e.target.value })}
                      style={{ marginBottom: '12px' }}
                    />
                    <input
                      type="text"
                      placeholder="클럽 회원번호"
                      value={newMember.clubMemberNumber}
                      onChange={(e) => setNewMember({ ...newMember, clubMemberNumber: e.target.value })}
                      style={{ marginBottom: '12px' }}
                    />
                    <input
                      type="number"
                      placeholder="핸디"
                      value={newMember.handicap}
                      onChange={(e) => setNewMember({ ...newMember, handicap: e.target.value })}
                      style={{ marginBottom: '12px' }}
                    />
                  </>
                )}
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={newMember.isAdmin}
                    onChange={(e) => setNewMember({ ...newMember, isAdmin: e.target.checked })}
                  />
                  <label htmlFor="isAdmin" style={{ fontSize: '14px' }}>관리자 권한 부여</label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button className="btn-outline" onClick={() => setShowNewMemberForm(false)}>
                    취소
                  </button>
                  <button className="btn-primary" onClick={handleAddMember}>
                    추가
                  </button>
                </div>
              </div>
            )}

            <button className="btn-primary" onClick={() => setShowNewMemberForm(!showNewMemberForm)}>
              {showNewMemberForm ? '취소' : '+ 새 회원 추가'}
            </button>
          </div>
        )}

        {activeTab === 'fees' && (
          <div>
            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                회비 생성
              </h3>
              <input
                type="text"
                placeholder="회비 제목 (예: 월회비, 회식비)"
                style={{ marginBottom: '12px' }}
              />
              <input
                type="number"
                placeholder="금액"
                style={{ marginBottom: '12px' }}
              />
              <select style={{ marginBottom: '12px' }}>
                <option value="all">전체 회원</option>
                <option value="select">회원 선택</option>
              </select>
              <button className="btn-primary">
                회비 생성
              </button>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                지출 항목 관리
              </h3>
              <div style={{ 
                padding: '16px',
                background: 'var(--bg-green)',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#666'
              }}>
                등록된 지출 항목이 없습니다
              </div>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div>
            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                골프장 등록
              </h3>
              <input
                type="text"
                placeholder="골프장 이름"
                value={newCourse.name}
                onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                style={{ marginBottom: '12px' }}
              />
              <input
                type="text"
                placeholder="주소"
                value={newCourse.address}
                onChange={(e) => setNewCourse({ ...newCourse, address: e.target.value })}
                style={{ marginBottom: '16px' }}
              />
              
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  각 홀별 PAR 설정
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '12px' 
                }}>
                  {newCourse.holePars.map((par, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        background: 'var(--bg-green)',
                        borderRadius: '6px'
                      }}
                    >
                      <label style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        minWidth: '50px',
                        color: '#2d5f3f'
                      }}>
                        {index + 1}번홀
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={par}
                        onChange={(e) => handleHoleParChange(index, e.target.value)}
                        min="3"
                        max="6"
                        style={{
                          width: '50px',
                          padding: '6px',
                          fontSize: '14px',
                          textAlign: 'center',
                          border: '2px solid var(--border-color)',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  총 PAR: {newCourse.holePars.reduce((sum, par) => sum + par, 0)}
                </div>
              </div>

              <button className="btn-primary" onClick={handleAddCourse}>
                골프장 등록
              </button>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                등록된 골프장 ({courses.length})
              </h3>
              {courses.length === 0 ? (
                <div style={{ 
                  padding: '16px',
                  background: 'var(--bg-green)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  등록된 골프장이 없습니다
                </div>
              ) : (
                courses.map(course => (
                  <div 
                    key={course.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-green)',
                      borderRadius: '8px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                      {course.name}
                    </div>
                    {course.address && (
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        📍 {course.address}
                      </div>
                    )}
                    {course.holePars && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#2d5f3f' }}>
                          홀별 PAR (총: {course.holePars.reduce((sum, par) => sum + par, 0)})
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(9, 1fr)', 
                          gap: '4px',
                          fontSize: '12px'
                        }}>
                          {course.holePars.map((par, idx) => (
                            <div 
                              key={idx}
                              style={{
                                padding: '4px',
                                background: 'white',
                                borderRadius: '4px',
                                textAlign: 'center',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              <div style={{ fontSize: '10px', color: '#666' }}>{idx + 1}</div>
                              <div style={{ fontWeight: '600' }}>{par}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                기본 설정
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  클럽 이름
                </label>
                <input
                  type="text"
                  placeholder="3355 골프 클럽"
                  defaultValue="3355 골프 클럽"
                  style={{ marginBottom: '12px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  기본 PAR
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="72"
                  defaultValue="72"
                  style={{ marginBottom: '12px' }}
                />
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                핸디캡 설정
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                  />
                  <span style={{ fontSize: '14px' }}>자동 핸디캡 계산 활성화</span>
                </label>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  핸디캡 계산 기준 라운드 수
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="10"
                  defaultValue="10"
                  style={{ marginBottom: '12px' }}
                />
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                알림 설정
              </h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                  />
                  <span style={{ fontSize: '14px' }}>새 게시글 알림</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                  />
                  <span style={{ fontSize: '14px' }}>부킹 변경 알림</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                  />
                  <span style={{ fontSize: '14px' }}>회비 납부 알림</span>
                </label>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: '#e53e3e' }}>
                위험 구역
              </h3>
              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'white',
                  color: '#e53e3e',
                  border: '2px solid #e53e3e',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
                onClick={() => {
                  if (confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    alert('데이터 초기화 기능은 준비 중입니다.');
                  }
                }}
              >
                🗑️ 모든 데이터 초기화
              </button>
            </div>

            <div className="card" style={{ background: 'var(--bg-green)', border: 'none' }}>
              <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontWeight: '600' }}>3355 골프 클럽</div>
                <div>버전 1.0.0</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
