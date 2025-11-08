import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { user, members, scores, bookings, posts, addPost, updatePost, updateBooking } = useApp();
  const navigate = useNavigate();
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [expandedPost, setExpandedPost] = useState(null);
  const [newComment, setNewComment] = useState('');

  const handleCreatePost = () => {
    if (!newPost.title || !newPost.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    const post = {
      id: Date.now(),
      title: newPost.title,
      content: newPost.content,
      author: user.name,
      date: new Date().toLocaleDateString('ko-KR'),
      comments: []
    };

    addPost(post);
    setNewPost({ title: '', content: '' });
    setShowNewPost(false);
  };

  const handleAddComment = (postId) => {
    if (!newComment.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    const post = posts.find(p => p.id === postId);
    const updatedComments = [...(post.comments || []), {
      id: Date.now(),
      content: newComment,
      author: user.name,
      date: new Date().toLocaleDateString('ko-KR')
    }];

    updatePost(postId, { comments: updatedComments });
    setNewComment('');
  };

  const parseParticipants = (participants) => {
    if (!participants || !Array.isArray(participants)) return [];
    return participants.map(p => {
      try {
        return typeof p === 'string' ? JSON.parse(p) : p;
      } catch {
        return p;
      }
    });
  };

  const handleJoinBooking = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    const participants = parseParticipants(booking.participants);
    const alreadyJoined = participants.some(p => p.phone === user.phone);
    
    if (alreadyJoined) {
      const updatedParticipants = participants
        .filter(p => p.phone !== user.phone)
        .map(p => JSON.stringify(p));
      
      updateBooking(bookingId, {
        participants: updatedParticipants
      });
    } else {
      const updatedParticipants = [
        ...participants,
        { name: user.name, nickname: user.nickname, phone: user.phone }
      ].map(p => JSON.stringify(p));
      
      updateBooking(bookingId, {
        participants: updatedParticipants
      });
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return `$${parseInt(amount).toLocaleString()}`;
  };

  const getParticipantDisplayName = (participant) => {
    if (participant.nickname) return participant.nickname;
    
    const member = members.find(m => m.phone === participant.phone);
    if (member && member.nickname) return member.nickname;
    
    return participant.name;
  };

  const getDaysUntilDeadline = (deadlineDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isRegistrationClosed = (booking) => {
    if (!booking.registrationDeadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(booking.registrationDeadline);
    deadline.setHours(0, 0, 0, 0);
    return today > deadline;
  };

  const announcedBookings = bookings.filter(b => b.isAnnounced);

  return (
    <div>
      <div className="header">
        <h1>대시보드</h1>
        <div style={{ fontSize: '14px' }}>환영합니다 {user.nickname || user.name}님</div>
      </div>

      <div className="page-content">
        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '700',
              color: 'var(--primary-green)'
            }}>
              📋 게시판
            </h3>
            {user.isAdmin && (
              <button 
                onClick={() => setShowNewPost(!showNewPost)}
                style={{
                  background: 'var(--primary-green)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {showNewPost ? '취소' : '작성'}
              </button>
            )}
          </div>

          {showNewPost && user.isAdmin && (
            <div style={{ 
              background: 'var(--bg-green)', 
              padding: '16px', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>
                새 공지사항
              </h4>
              <input
                type="text"
                placeholder="제목"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                style={{ marginBottom: '12px', width: '100%' }}
              />
              <textarea
                placeholder="내용"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                rows={6}
                style={{ marginBottom: '12px', resize: 'vertical', width: '100%' }}
              />
              <button onClick={handleCreatePost} className="btn-primary">
                게시하기
              </button>
            </div>
          )}

          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666', background: 'var(--bg-green)', borderRadius: '8px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p>아직 공지사항이 없습니다</p>
              {user.isAdmin && (
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  상단의 작성 버튼을 눌러 첫 공지를 작성하세요
                </p>
              )}
            </div>
          ) : (
            <div>
              {posts.map(post => (
                <div key={post.id} style={{
                  background: 'var(--bg-green)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', flex: 1 }}>
                      {post.title}
                    </h4>
                    <span style={{
                      background: 'var(--primary-green)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginLeft: '8px'
                    }}>
                      공지
                    </span>
                  </div>
                  <p style={{ 
                    color: '#666', 
                    marginBottom: '12px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {post.content}
                  </p>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#999',
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <span>{post.author}</span>
                    <span>{post.date}</span>
                  </div>

                  <button
                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    style={{
                      background: 'white',
                      color: 'var(--primary-green)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      width: '100%',
                      marginBottom: expandedPost === post.id ? '12px' : '0',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    💬 댓글 {post.comments?.length > 0 ? `(${post.comments.length})` : '달기'}
                  </button>

                  {expandedPost === post.id && (
                    <div style={{ marginTop: '12px' }}>
                      {post.comments?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          {post.comments.map(comment => (
                            <div 
                              key={comment.id}
                              style={{
                                background: 'white',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '8px'
                              }}
                            >
                              <div style={{ 
                                fontSize: '14px',
                                marginBottom: '8px',
                                lineHeight: '1.5'
                              }}>
                                {comment.content}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: '#999',
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}>
                                <span>{comment.author}</span>
                                <span>{comment.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="댓글을 입력하세요"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(post.id);
                            }
                          }}
                          style={{ flex: 1, marginBottom: 0 }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          style={{
                            background: 'var(--primary-green)',
                            color: 'white',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          등록
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              추천핸디
            </div>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: '700',
              color: 'var(--primary-green)'
            }}>
              {user.handicapType || 'HH'}({user.calculatedHandicap ?? user.handicap ?? 18})
            </div>
            {user.handicapExplanation && (
              <div style={{ 
                fontSize: '11px', 
                color: '#999',
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                {user.handicapExplanation}
              </div>
            )}
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              회비 잔액
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700',
              color: user.balance < 0 ? '#e53e3e' : 'var(--primary-green)'
            }}>
              ${user.balance?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              color: 'var(--primary-green)'
            }}>
              📌 공지된 라운딩
            </h3>
            <button 
              onClick={() => navigate('/booking')}
              style={{
                background: 'transparent',
                color: 'var(--primary-green)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              전체 보기
            </button>
          </div>
          {announcedBookings.length === 0 ? (
            <div style={{ 
              padding: '16px',
              background: 'var(--bg-green)',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#666'
            }}>
              공지된 라운딩이 없습니다
            </div>
          ) : (
            announcedBookings.map(booking => {
              const participants = parseParticipants(booking.participants);
              const isJoined = participants.some(p => p.phone === user.phone);
              
              return (
                <div key={booking.id} style={{
                  background: 'var(--bg-green)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
                onClick={() => navigate('/booking')}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {booking.title && (
                    <div style={{ fontSize: '13px', color: '#2d5f3f', fontWeight: '600', marginBottom: '4px' }}>
                      {booking.title}
                    </div>
                  )}
                  <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                    {booking.courseName}
                  </h4>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    📅 {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
                  </div>
                  {booking.gatheringTime && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      🕐 집결시간: {booking.gatheringTime}
                    </div>
                  )}

                  {booking.registrationDeadline && (
                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', color: '#e53e3e' }}>
                        🔔 {new Date(booking.registrationDeadline).toLocaleDateString('ko-KR')} 마감
                      </span>
                      <span style={{ color: '#666', marginLeft: '8px' }}>
                        {getDaysUntilDeadline(booking.registrationDeadline) > 0 
                          ? `(마감까지 ${getDaysUntilDeadline(booking.registrationDeadline)}일 남았습니다)`
                          : '(마감완료)'
                        }
                      </span>
                    </div>
                  )}

                  <div style={{ 
                    fontSize: '13px', 
                    color: '#666',
                    marginBottom: '12px'
                  }}>
                    👥 참가자 {participants.length}명
                  </div>

                  {isRegistrationClosed(booking) ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/score');
                      }}
                      className='btn-primary'
                      style={{ width: '100%' }}
                    >
                      🏌️ 플레이하기
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinBooking(booking.id);
                      }}
                      className={isJoined ? 'btn-outline' : 'btn-primary'}
                      style={{ width: '100%' }}
                    >
                      {isJoined ? '참가 취소' : '참가하기'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            최근 스코어
          </h3>
          <div style={{ 
            padding: '16px',
            background: 'var(--bg-green)',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            기록된 스코어가 없습니다
          </div>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            회비 납부 내역
          </h3>
          <div style={{ 
            padding: '16px',
            background: 'var(--bg-green)',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            납부 내역이 없습니다
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
