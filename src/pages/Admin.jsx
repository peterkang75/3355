import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

function Admin() {
  const { user, addFee } = useApp();
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([
    { id: '123456', name: '관리자', phone: '123456', isAdmin: true, handicap: 18, balance: 0 },
    { id: '111111', name: '회원1', phone: '111111', isAdmin: false, handicap: 20, balance: -50000 },
    { id: '222222', name: '회원2', phone: '222222', isAdmin: false, handicap: 15, balance: 0 }
  ]);
  const [courses, setCourses] = useState([]);
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
    handicap: 18,
    memberNumber: '',
    photo: '',
    isAdmin: false
  });

  const handleAddMember = () => {
    if (!newMember.name || !newMember.phone) {
      alert('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (newMember.phone.length !== 6 || !/^\d+$/.test(newMember.phone)) {
      alert('전화번호 끝 6자리를 정확히 입력해주세요.');
      return;
    }

    const member = {
      id: newMember.phone,
      ...newMember,
      balance: 0
    };

    setMembers([...members, member]);
    setNewMember({ 
      name: '', 
      nickname: '', 
      phone: '', 
      club: '', 
      handicap: 18, 
      memberNumber: '', 
      photo: '', 
      isAdmin: false 
    });
    setShowNewMemberForm(false);
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

    setCourses([...courses, course]);
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
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                전체 회원 ({members.length})
              </h3>
              {members.map(member => (
                <div 
                  key={member.id}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-green)',
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div>
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
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        전화: ***{member.phone}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        HC: {member.handicap}
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: member.balance < 0 ? '#e53e3e' : '#22c55e'
                      }}>
                        {member.balance.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px'
                  }}>
                    <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px' }}>
                      권한 수정
                    </button>
                    <button className="btn-outline" style={{ fontSize: '13px', padding: '8px' }}>
                      상세보기
                    </button>
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
                  type="text"
                  placeholder="전화번호 끝 6자리"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  maxLength={6}
                  style={{ marginBottom: '12px' }}
                />
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
                  type="number"
                  placeholder="핸디캡"
                  value={newMember.handicap}
                  onChange={(e) => setNewMember({ ...newMember, handicap: parseInt(e.target.value) || 0 })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="회원번호"
                  value={newMember.memberNumber}
                  onChange={(e) => setNewMember({ ...newMember, memberNumber: e.target.value })}
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
