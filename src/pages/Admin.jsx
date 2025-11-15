import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';

function Admin() {
  const navigate = useNavigate();
  const { user, addFee, courses, addCourse, refreshMembers, refreshCourses, members: contextMembers } = useApp();
  const [activeTab, setActiveTab] = useState('menu');
  const [members, setMembers] = useState([]);
  const [showPermissionMenu, setShowPermissionMenu] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const menuRefs = useRef({});
  const [newCourse, setNewCourse] = useState({
    name: '',
    address: '',
    holePars: Array(18).fill('')
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
  const [showCourseMenu, setShowCourseMenu] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseData, setEditCourseData] = useState(null);
  const courseMenuRefs = useRef({});
  const [showScoreModal, setShowScoreModal] = useState(null);
  const [scoreFormData, setScoreFormData] = useState({
    roundingName: '',
    date: '',
    courseName: '',
    totalScore: ''
  });
  const [memberScores, setMemberScores] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const features = [
    { id: 'create_rounding', name: '라운딩 생성' },
    { id: 'edit_rounding', name: '라운딩 수정/삭제' },
    { id: 'team_formation', name: '조편성' },
    { id: 'participant_management', name: '참가자 관리' },
    { id: 'score_entry', name: '스코어 입력' },
    { id: 'fee_management', name: '회비 관리' },
    { id: 'course_management', name: '골프장 관리' },
    { id: 'create_post', name: '게시판 작성' }
  ];

  useEffect(() => {
    if (contextMembers) {
      setMembers(contextMembers);
    }
  }, [contextMembers]);

  useEffect(() => {
    if (activeTab === 'settings') {
      loadPermissions();
    }
  }, [activeTab]);

  const loadPermissions = async () => {
    try {
      const settings = await apiService.fetchSettings();
      const permissionsObj = {};
      settings.forEach(setting => {
        permissionsObj[setting.feature] = setting.minRole;
      });
      
      features.forEach(feature => {
        if (!permissionsObj[feature.id]) {
          permissionsObj[feature.id] = '관리자';
        }
      });
      
      setPermissions(permissionsObj);
    } catch (error) {
      console.error('권한 설정 로드 실패:', error);
    }
  };

  const handlePermissionChange = (featureId, role) => {
    setPermissions({
      ...permissions,
      [featureId]: role
    });
    setHasChanges(true);
  };

  const handleSavePermissions = async () => {
    try {
      for (const [feature, minRole] of Object.entries(permissions)) {
        await apiService.updateSetting(feature, minRole);
      }
      setHasChanges(false);
      alert('권한 설정이 저장되었습니다!');
    } catch (error) {
      console.error('권한 설정 저장 실패:', error);
      alert('권한 설정 저장에 실패했습니다.');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPermissionMenu === null && showCourseMenu === null) return;
      
      if (showPermissionMenu !== null) {
        const clickedRef = menuRefs.current[showPermissionMenu];
        if (clickedRef && !clickedRef.contains(event.target)) {
          setShowPermissionMenu(null);
        }
      }

      if (showCourseMenu !== null) {
        const clickedRef = courseMenuRefs.current[showCourseMenu];
        if (clickedRef && !clickedRef.contains(event.target)) {
          setShowCourseMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPermissionMenu, showCourseMenu]);

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

  const handleChangeRole = async (memberId, newRole) => {
    try {
      await apiService.updateMemberRole(memberId, newRole);
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setShowPermissionMenu(null);
      
      const roleNames = {
        '관리자': '관리자',
        '방장': '방장',
        '운영진': '운영진',
        '클럽운영진': '클럽운영진',
        '회원': '회원'
      };
      
      alert(`권한이 "${roleNames[newRole]}"(으)로 변경되었습니다.`);
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
        holePars: Array(18).fill('')
      });
      
      if (refreshCourses) {
        await refreshCourses();
      }
    } catch (error) {
      console.error('❌ 골프장 등록 실패:', error);
      alert('골프장 등록 중 오류가 발생했습니다.');
    }
  };

  const handleHoleParChange = (holeIndex, value) => {
    const newHolePars = [...newCourse.holePars];
    newHolePars[holeIndex] = value === '' ? '' : parseInt(value) || '';
    setNewCourse({ ...newCourse, holePars: newHolePars });
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course.id);
    setEditCourseData({
      name: course.name || '',
      address: course.address || '',
      holePars: course.holePars || Array(18).fill(4)
    });
    setShowCourseMenu(null);
  };

  const handleSaveCourseEdit = async () => {
    if (!editCourseData.name) {
      alert('골프장 이름을 입력해주세요.');
      return;
    }

    try {
      await apiService.updateCourse(editingCourse, editCourseData);
      alert('골프장 정보가 수정되었습니다.');
      
      setEditingCourse(null);
      setEditCourseData(null);
      
      if (refreshCourses) {
        await refreshCourses();
      }
    } catch (error) {
      console.error('❌ 골프장 정보 수정 실패:', error);
      alert('골프장 정보 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelCourseEdit = () => {
    setEditingCourse(null);
    setEditCourseData(null);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('정말로 이 골프장을 삭제하시겠습니까?')) {
      return;
    }
    
    setShowCourseMenu(null);
    
    try {
      await apiService.deleteCourse(courseId);
      
      if (refreshCourses) {
        await refreshCourses();
      }
      
      alert('골프장이 삭제되었습니다.');
    } catch (error) {
      console.error('❌ 골프장 삭제 실패:', error);
      alert('골프장 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditCourseHoleParChange = (holeIndex, value) => {
    const newHolePars = [...editCourseData.holePars];
    newHolePars[holeIndex] = parseInt(value) || 3;
    setEditCourseData({ ...editCourseData, holePars: newHolePars });
  };

  const handleOpenScoreModal = async (member) => {
    setShowScoreModal(member.id);
    setScoreFormData({
      roundingName: '',
      date: '',
      courseName: '',
      totalScore: ''
    });
    
    try {
      const scores = await apiService.fetchScores(member.id);
      setMemberScores(scores);
    } catch (error) {
      console.error('스코어 조회 실패:', error);
      setMemberScores([]);
    }
  };

  const handleCloseScoreModal = () => {
    setShowScoreModal(null);
    setScoreFormData({
      roundingName: '',
      date: '',
      courseName: '',
      totalScore: ''
    });
    setMemberScores([]);
  };

  const handleSaveScore = async () => {
    const member = members.find(m => m.id === showScoreModal);
    
    if (!scoreFormData.date || !scoreFormData.courseName || !scoreFormData.totalScore) {
      alert('날짜, 골프장, 총 타수를 모두 입력해주세요.');
      return;
    }

    const totalScore = parseInt(scoreFormData.totalScore);
    if (isNaN(totalScore) || totalScore <= 0) {
      alert('총 타수는 유효한 숫자여야 합니다.');
      return;
    }

    try {
      const scoreData = {
        userId: member.id,
        date: scoreFormData.date,
        courseName: scoreFormData.courseName,
        totalScore: totalScore,
        coursePar: 72,
        holes: JSON.stringify([])
      };

      await apiService.createScore(scoreData);
      alert(`${member.nickname || member.name}의 스코어가 저장되었습니다!`);
      
      setScoreFormData({
        roundingName: '',
        date: '',
        courseName: '',
        totalScore: ''
      });
      
      const updatedScores = await apiService.fetchScores(member.id);
      setMemberScores(updatedScores);
    } catch (error) {
      console.error('스코어 저장 실패:', error);
      alert('스코어 저장 중 오류가 발생했습니다.');
    }
  };

  const hasAdminAccess = user.role === '관리자' || user.role === '방장' || user.role === '운영진' || user.role === '클럽운영진' || user.isAdmin;
  
  if (!hasAdminAccess) {
    return (
      <div>
        <div className="header">
          <h1>관리자</h1>
        </div>
        <div className="page-content">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>◆</div>
            <p>관리자 또는 운영진 권한이 필요합니다</p>
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
              padding: '8px',
              color: 'var(--text-light)'
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
                transition: 'all 0.2s',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>≡</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    회원 관리
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    회원 정보 조회 및 수정
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
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
                transition: 'all 0.2s',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>$</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    회비 관리
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    회비 등록 및 납부 관리
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
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
                transition: 'all 0.2s',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>⚑</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    골프장 관리
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    골프장 등록 및 관리
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
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
                transition: 'all 0.2s',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>⚙</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    앱 설정
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    앱 기본 설정 관리
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
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
                    background: showInactive ? 'var(--primary-green)' : 'var(--bg-card)',
                    color: showInactive ? 'white' : 'var(--primary-green)',
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
              {members.filter(member => showInactive || member.isActive !== false).map(member => {
                const handicapDisplay = member.golflinkNumber 
                  ? `GA(${member.handicap})` 
                  : `HH(${member.handicap})`;
                
                return (
                  <div 
                    key={member.id}
                    onClick={() => navigate(`/member/${member.id}`)}
                    style={{
                      padding: '12px',
                      background: member.isActive === false ? '#f5f5f5' : 'var(--bg-card)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      opacity: member.isActive === false ? 0.6 : 1,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-green)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = member.isActive === false ? '#f5f5f5' : 'var(--bg-card)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      {member.photo ? (
                        <img 
                          src={member.photo} 
                          alt={member.name}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            border: '2px solid var(--border-color)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '60px',
                          height: '60px',
                          background: '#ddd',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          color: 'var(--text-dark)', opacity: 0.7
                        }}>
                          •
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '700', 
                        fontSize: '16px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{ color: 'var(--primary-green)' }}>{member.nickname || member.name}</span>
                        {member.role === '관리자' && <span style={{ fontSize: '14px' }}>★</span>}
                        {member.role === '방장' && <span style={{ fontSize: '14px' }}>👑</span>}
                        {member.role === '운영진' && <span style={{ fontSize: '14px' }}>⚙</span>}
                        {member.role === '클럽운영진' && <span style={{ fontSize: '14px' }}>🏌</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.7 }}>
                        {member.name}
                      </div>
                    </div>

                    <div style={{
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'var(--primary-green)',
                      textAlign: 'right',
                      flexShrink: 0
                    }}>
                      {handicapDisplay}
                    </div>
                  </div>
                );
              })}
            </div>

            {editingMember && editMemberData && (
              <div className="card" style={{ marginTop: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  ✎ 회원 정보 수정
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
                      background: 'var(--primary-green)',
                      color: 'var(--text-light)',
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
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
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
                color: 'var(--text-dark)', opacity: 0.7
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
                        color: 'var(--primary-green)'
                      }}>
                        {index + 1}번홀
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="PAR"
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
                  color: 'var(--text-light)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  총 PAR: {newCourse.holePars.reduce((sum, par) => sum + (parseInt(par) || 0), 0)}
                </div>
              </div>

              <button className="btn-primary" onClick={handleAddCourse}>
                골프장 등록
              </button>
            </div>

            {editingCourse && editCourseData && (
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  ✎ 골프장 정보 수정
                </h3>
                <input
                  type="text"
                  placeholder="골프장 이름"
                  value={editCourseData.name}
                  onChange={(e) => setEditCourseData({ ...editCourseData, name: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="주소"
                  value={editCourseData.address}
                  onChange={(e) => setEditCourseData({ ...editCourseData, address: e.target.value })}
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
                    {editCourseData.holePars.map((par, index) => (
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
                          color: 'var(--primary-green)'
                        }}>
                          {index + 1}번홀
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={par}
                          onChange={(e) => handleEditCourseHoleParChange(index, e.target.value)}
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
                    color: 'var(--text-light)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    총 PAR: {editCourseData.holePars.reduce((sum, par) => sum + par, 0)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSaveCourseEdit}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    저장
                  </button>
                  <button
                    onClick={handleCancelCourseEdit}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--primary-green)',
                      color: 'var(--text-light)',
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
                  color: 'var(--text-dark)', opacity: 0.7
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
                      marginBottom: '12px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                          {course.name}
                        </div>
                        {course.address && (
                          <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7, marginBottom: '8px' }}>
                            • {course.address}
                          </div>
                        )}
                      </div>
                      
                      <div 
                        ref={(el) => (courseMenuRefs.current[course.id] = el)}
                        style={{ position: 'relative' }}
                      >
                        <button
                          onClick={() => setShowCourseMenu(showCourseMenu === course.id ? null : course.id)}
                          style={{
                            background: 'var(--bg-card)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '18px',
                            fontWeight: '700',
                            color: 'var(--text-dark)', opacity: 0.7,
                            lineHeight: '1'
                          }}
                        >
                          ⋮
                        </button>
                        
                        {showCourseMenu === course.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              marginTop: '4px',
                              background: 'var(--bg-card)',
                              borderRadius: '8px',
                              zIndex: 1000,
                              minWidth: '150px',
                              overflow: 'hidden'
                            }}
                          >
                            <button
                              onClick={() => handleEditCourse(course)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'var(--bg-card)',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                borderBottom: '1px solid var(--border-color)',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = 'var(--bg-green)'}
                              onMouseLeave={(e) => e.target.style.background = 'var(--bg-card)'}
                            >
                              ✎ 편집
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'var(--bg-card)',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: 'var(--alert-red)',
                                fontWeight: '600',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#fee'}
                              onMouseLeave={(e) => e.target.style.background = 'var(--bg-card)'}
                            >
                              × 삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {course.holePars && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--primary-green)' }}>
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
                                background: 'var(--text-light)',
                                borderRadius: '4px',
                                textAlign: 'center',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              <div style={{ fontSize: '10px', color: 'var(--text-dark)', opacity: 0.7 }}>{idx + 1}</div>
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
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  기능별 권한 설정
                </h3>
                <button
                  onClick={handleSavePermissions}
                  disabled={!hasChanges}
                  style={{
                    padding: '10px 20px',
                    background: hasChanges ? 'var(--primary-green)' : '#ccc',
                    color: 'var(--text-light)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: hasChanges ? 'pointer' : 'not-allowed'
                  }}
                >
                  {hasChanges ? '✓ 저장하기' : '✓ 저장됨'}
                </button>
              </div>

              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • 각 기능의 최소 권한을 설정하세요<br/>
                • 클럽운영진은 자신의 클럽 컴페티션만 관리할 수 있습니다
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '140px repeat(5, 1fr)',
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--bg-card)',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                borderBottom: '2px solid var(--primary-green)'
              }}>
                <div style={{ textAlign: 'left' }}>기능</div>
                <div style={{ textAlign: 'center' }}>관리자</div>
                <div style={{ textAlign: 'center' }}>방장</div>
                <div style={{ textAlign: 'center' }}>운영진</div>
                <div style={{ textAlign: 'center' }}>클럽운영진</div>
                <div style={{ textAlign: 'center' }}>회원</div>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {features.map(feature => {
                  const roles = ['관리자', '방장', '운영진', '클럽운영진', '회원'];
                  const selectedRole = permissions[feature.id] || '관리자';
                  const selectedIndex = roles.indexOf(selectedRole);
                  
                  return (
                    <div
                      key={feature.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px repeat(5, 1fr)',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border-color)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--primary-green)'
                      }}>
                        {feature.name}
                      </div>
                      
                      {roles.map((role, index) => {
                        const isActive = index <= selectedIndex;
                        
                        return (
                          <div
                            key={role}
                            onClick={() => handlePermissionChange(feature.id, role)}
                            style={{
                              height: '18px',
                              background: isActive ? 'var(--primary-green)' : '#f0f0f0',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              border: '1px solid var(--border-color)'
                            }}
                            title={`${role}로 설정`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--alert-red)' }}>
                위험 구역
              </h3>
              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-card)',
                  color: 'var(--alert-red)',
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
                × 모든 데이터 초기화
              </button>
            </div>

            <div className="card" style={{ background: 'var(--bg-green)', border: 'none' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7, textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontWeight: '600' }}>3355 골프 클럽</div>
                <div>버전 1.0.0</div>
              </div>
            </div>
          </div>
        )}
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
                onClick={handleCloseScoreModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-dark)', opacity: 0.7
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '15px',
                fontWeight: '700',
                color: 'var(--primary-green)',
                marginBottom: '12px',
                padding: '12px',
                background: 'var(--bg-green)',
                borderRadius: '6px'
              }}>
                {members.find(m => m.id === showScoreModal)?.nickname || 
                 members.find(m => m.id === showScoreModal)?.name}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--primary-green)',
                  marginBottom: '8px'
                }}>
                  라운딩 이름 (선택)
                </label>
                <input
                  type="text"
                  placeholder="예: 1월 정기 라운딩"
                  value={scoreFormData.roundingName}
                  onChange={(e) => setScoreFormData({ ...scoreFormData, roundingName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--primary-green)',
                  marginBottom: '8px'
                }}>
                  날짜 *
                </label>
                <input
                  type="date"
                  value={scoreFormData.date}
                  onChange={(e) => setScoreFormData({ ...scoreFormData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--primary-green)',
                  marginBottom: '8px'
                }}>
                  골프장 *
                </label>
                <select
                  value={scoreFormData.courseName}
                  onChange={(e) => setScoreFormData({ ...scoreFormData, courseName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">골프장 선택</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--primary-green)',
                  marginBottom: '8px'
                }}>
                  총 타수 *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="예: 85"
                  value={scoreFormData.totalScore}
                  onChange={(e) => setScoreFormData({ ...scoreFormData, totalScore: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button
                onClick={handleCloseScoreModal}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--text-light)',
                  color: 'var(--text-dark)', opacity: 0.7,
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSaveScore}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                저장하기
              </button>
            </div>

            {memberScores.length > 0 && (
              <div style={{
                borderTop: '2px solid #e0e0e0',
                paddingTop: '20px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--primary-green)',
                  marginBottom: '16px'
                }}>
                  📊 입력된 스코어 ({memberScores.length}개)
                </h4>
                <div style={{ display: 'grid', gap: '12px', maxHeight: '300px', overflow: 'auto' }}>
                  {memberScores.sort((a, b) => new Date(b.date) - new Date(a.date)).map((score, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-green)',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--primary-green)' }}>
                          {score.courseName}
                        </div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: 'var(--primary-green)'
                        }}>
                          {score.totalScore}타
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.7 }}>
                        📅 {new Date(score.date).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
