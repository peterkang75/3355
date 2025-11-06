import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import googleSheetsService from '../services/googleSheets';

function Admin() {
  const { user, addFee, courses, addCourse } = useApp();
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [showPermissionMenu, setShowPermissionMenu] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const menuRefs = useRef({});
  const [newCourse, setNewCourse] = useState({
    name: '',
    address: ''
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

  useEffect(() => {
    const loadMembers = () => {
      const savedMembers = localStorage.getItem('golfMembers');
      if (savedMembers) {
        const parsedMembers = JSON.parse(savedMembers);
        const uniqueMembers = parsedMembers.filter((member, index, self) => 
          index === self.findIndex((m) => m.id === member.id)
        );
        console.log('📥 Admin: localStorage에서 회원 로드:', uniqueMembers.length, '명 (중복 제거 전:', parsedMembers.length, ')');
        setMembers(uniqueMembers);
        
        if (uniqueMembers.length !== parsedMembers.length) {
          localStorage.setItem('golfMembers', JSON.stringify(uniqueMembers));
          console.log('🔧 중복 회원 제거 완료');
        }
      } else {
        console.log('⚠️ Admin: localStorage에 회원 데이터 없음');
        setMembers([
          { id: '123456', name: '관리자', phone: '0100123456', isAdmin: true, handicap: 18, balance: 0 },
          { id: '111111', name: '회원1', phone: '0100111111', isAdmin: false, handicap: 20, balance: -50000 },
          { id: '222222', name: '회원2', phone: '0100222222', isAdmin: false, handicap: 15, balance: 0 }
        ]);
      }
    };

    loadMembers();
  }, []);

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

    const lastSixDigits = newMember.phone.slice(-6);
    const member = {
      id: lastSixDigits,
      ...newMember,
      balance: 0
    };

    console.log('🔵 Admin: 회원 추가 시작');
    console.log('📤 구글 시트에 저장 시도:', member);
    
    try {
      await googleSheetsService.saveMember(member);
      console.log('✅ 구글 시트에 저장 완료');
    } catch (error) {
      console.error('❌ 구글 시트 저장 실패:', error);
    }

    const updatedMembers = [...members, member];
    setMembers(updatedMembers);
    localStorage.setItem('golfMembers', JSON.stringify(updatedMembers));
    console.log('✅ localStorage 업데이트 완료:', updatedMembers.length, '명');
    
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
  };

  const handleToggleAdmin = async (memberId) => {
    const updatedMembers = members.map(m => {
      if (m.id === memberId) {
        return { ...m, isAdmin: !m.isAdmin };
      }
      return m;
    });
    
    setMembers(updatedMembers);
    localStorage.setItem('golfMembers', JSON.stringify(updatedMembers));
    
    const member = updatedMembers.find(m => m.id === memberId);
    if (member) {
      await googleSheetsService.updateMember(member);
    }
    
    setShowPermissionMenu(null);
    alert(member.isAdmin ? '관리자 권한이 부여되었습니다.' : '관리자 권한이 해제되었습니다.');
  };

  const handleToggleActive = async (memberId) => {
    const updatedMembers = members.map(m => {
      if (m.id === memberId) {
        return { ...m, isActive: m.isActive === false ? true : false };
      }
      return m;
    });
    
    setMembers(updatedMembers);
    localStorage.setItem('golfMembers', JSON.stringify(updatedMembers));
    
    const member = updatedMembers.find(m => m.id === memberId);
    if (member) {
      await googleSheetsService.updateMember(member);
    }
    
    setShowPermissionMenu(null);
    alert(member.isActive === false ? '회원이 비활성화되었습니다.' : '회원이 활성화되었습니다.');
  };

  const handleDeleteMember = async (memberId) => {
    if (!confirm('정말로 이 회원을 삭제하시겠습니까?')) {
      return;
    }
    
    setShowPermissionMenu(null);
    
    const updatedMembers = members.filter(m => m.id !== memberId);
    setMembers(updatedMembers);
    localStorage.setItem('golfMembers', JSON.stringify(updatedMembers));
    
    await googleSheetsService.deleteMember(memberId);
    
    alert('회원이 삭제되었습니다.');
  };

  const handleAddCourse = () => {
    if (!newCourse.name) {
      alert('골프장 이름을 입력해주세요.');
      return;
    }

    const course = {
      id: Date.now(),
      ...newCourse
    };

    addCourse(course);
    setNewCourse({ name: '', address: '' });
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
      </div>

      <div style={{ 
        background: 'white',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        position: 'sticky',
        top: '0',
        zIndex: 50
      }}>
        <button
          onClick={() => setActiveTab('members')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'members' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'members' ? 'white' : '#666',
            borderBottom: activeTab === 'members' ? 'none' : '2px solid transparent',
            fontWeight: activeTab === 'members' ? '600' : '400'
          }}
        >
          회원 관리
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'fees' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'fees' ? 'white' : '#666',
            borderBottom: activeTab === 'fees' ? 'none' : '2px solid transparent',
            fontWeight: activeTab === 'fees' ? '600' : '400'
          }}
        >
          회비 관리
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'courses' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'courses' ? 'white' : '#666',
            borderBottom: activeTab === 'courses' ? 'none' : '2px solid transparent',
            fontWeight: activeTab === 'courses' ? '600' : '400'
          }}
        >
          골프장 관리
        </button>
      </div>

      <div className="page-content">
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
                style={{ marginBottom: '12px' }}
              />
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
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        📍 {course.address}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
