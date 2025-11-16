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
      title: newPost.title,
      content: newPost.content,
      authorId: user.id
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
      author: user.nickname || user.name,
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

  const hasTeams = (booking) => {
    if (!booking.teams) return false;
    try {
      const teams = typeof booking.teams === 'string' ? JSON.parse(booking.teams) : booking.teams;
      return teams && teams.length > 0;
    } catch {
      return false;
    }
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const canViewBooking = (booking) => {
    if (booking.type === '컴페티션') {
      return user.club === booking.courseName;
    }
    return true;
  };
  
  const announcedBookings = bookings.filter(b => {
    if (!b.isAnnounced) return false;
    if (!canViewBooking(b)) return false;
    const bookingDate = new Date(b.date);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate >= today;
  });

  return (
    <div>
      <div className="header" style={{
        background: 'linear-gradient(135deg, var(--accent-bright-green) 0%, var(--accent-mid-green) 100%)'
      }}>
        <h1>대시보드</h1>
        <div style={{ fontSize: '14px' }}>환영합니다 {user.nickname || user.name}님</div>
      </div>

      <div className="page-content">
        <div className="card" style={{
          borderLeft: '3px solid var(--accent-bright-green)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '700',
              color: 'var(--accent-bright-green)'
            }}>
              ✎ 게시판
            </h3>
            {user.isAdmin && (
              <button 
                onClick={() => setShowNewPost(!showNewPost)}
                style={{
                  background: '#488C16',
                  color: 'var(--text-light)',
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
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7, background: 'var(--bg-green)', borderRadius: '8px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✎</div>
              <p>아직 공지사항이 없습니다</p>
              {user.isAdmin && (
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  상단의 작성 버튼을 눌러 첫 공지를 작성하세요
                </p>
              )}
            </div>
          ) : (
            <div>
              {posts.slice(0, 5).map((post, index) => (
                <div key={post.id}>
                  <div style={{
                    background: expandedPost === post.id ? '#FFD449' : 'var(--bg-green)',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                  >
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      opacity: 0.5,
                      marginTop: '2px'
                    }}>
                      •
                    </span>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        fontSize: '15px', 
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        {post.title}
                      </h4>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        opacity: 0.6,
                        flexWrap: 'wrap'
                      }}>
                        <span>
                          {new Date(post.createdAt).toLocaleDateString('ko-KR', { 
                            month: 'short', 
                            day: 'numeric'
                          })}
                          {' '}
                          {new Date(post.createdAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          by {post.author?.nickname || post.author?.name || '알 수 없음'}
                        </span>
                        {post.comments && post.comments.length > 0 && (
                          <>
                            <span>•</span>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: 'var(--primary-green)',
                              fontWeight: '600',
                              opacity: 1
                            }}>
                              <span>💬</span>
                              <span>{post.comments.length}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedPost === post.id && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0, 0, 0, 0.15)' }}>
                      <p style={{ 
                        opacity: 0.7,
                        marginBottom: '12px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px'
                      }}>
                        {post.content}
                      </p>
                      <div style={{ 
                        fontSize: '12px', 
                        opacity: 0.7,
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                      }}>
                        <span>{post.author?.name || '알 수 없음'}</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>

                      {post.comments?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          {post.comments.map(comment => (
                            <div 
                              key={comment.id}
                              style={{
                                background: 'var(--bg-card)',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '8px',
                                borderBottom: '1px solid var(--border-color)'
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
                                opacity: 0.7
                              }}>
                                <span>
                                  {comment.date || new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                                  {' by '}
                                  {typeof comment.author === 'string' ? comment.author : (comment.author?.nickname || comment.author?.name || '알 수 없음')}
                                </span>
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
                              e.stopPropagation();
                              handleAddComment(post.id);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1, marginBottom: 0 }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddComment(post.id);
                          }}
                          style={{
                            background: 'var(--primary-green)',
                            color: 'var(--text-light)',
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
                  {index < Math.min(posts.length, 5) - 1 && (
                    <div style={{
                      height: '1px',
                      background: 'rgba(0, 0, 0, 0.1)',
                      margin: '8px 0'
                    }} />
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
          <div className="card" style={{ 
            textAlign: 'center',
            padding: '16px 12px',
            borderLeft: '3px solid var(--accent-mid-green)',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(63, 115, 25, 0.05) 100%)'
          }}>
            <div style={{ 
              fontSize: '32px',
              marginBottom: '8px'
            }}>
              ⛳
            </div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700',
              color: 'var(--accent-mid-green)',
              marginBottom: '8px'
            }}>
              핸디: {user?.handicap ?? user?.calculatedHandicap ?? 18}
            </div>
            <div style={{ 
              fontSize: '13px', 
              opacity: 0.7,
              marginBottom: '4px'
            }}>
              추천핸디: {user?.calculatedHandicap ?? user?.handicap ?? 18}
            </div>
            {user?.handicapExplanation && (
              <div style={{ 
                fontSize: '13px', 
                opacity: 0.7,
                fontStyle: 'italic',
                lineHeight: '1.4'
              }}>
                {user.handicapExplanation}
              </div>
            )}
          </div>

          <div className="card" style={{ 
            textAlign: 'center',
            borderLeft: '3px solid var(--accent-gold)',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(242, 163, 65, 0.05) 100%)'
          }}>
            <div style={{ 
              fontSize: '32px',
              marginBottom: '8px'
            }}>
              💰
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>
              회비 잔액
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700',
              color: user.balance < 0 ? 'var(--alert-red)' : 'var(--accent-gold)'
            }}>
              ${user.balance?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        <div className="card" style={{
          borderLeft: '3px solid var(--accent-olive)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              color: 'var(--accent-olive)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>🏌️</span>
              공지된 라운딩
            </h3>
            <button 
              onClick={() => navigate('/booking')}
              style={{
                background: 'transparent',
                color: 'var(--accent-olive)',
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
              background: 'linear-gradient(135deg, var(--bg-green) 0%, rgba(76, 89, 29, 0.05) 100%)',
              borderRadius: '8px',
              textAlign: 'center',
              opacity: 0.7
            }}>
              공지된 라운딩이 없습니다
            </div>
          ) : (
            announcedBookings.map(booking => {
              const participants = parseParticipants(booking.participants);
              const isJoined = participants.some(p => p.phone === user.phone);
              
              return (
                <div key={booking.id} style={{
                  background: 'linear-gradient(135deg, var(--bg-green) 0%, rgba(76, 89, 29, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  position: 'relative',
                  borderBottom: '1px solid var(--accent-olive)'
                }}
                onClick={() => navigate('/booking')}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {booking.title && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: booking.type === '컴페티션' ? 'white' : '#333', 
                      background: booking.type === '컴페티션' ? '#1a3d47' : '#ff8c42',
                      padding: '5px 9px',
                      borderRadius: '4px',
                      fontWeight: '600', 
                      marginBottom: '4px',
                      display: 'inline-block'
                    }}>
                      {booking.title}
                    </div>
                  )}
                  <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
                    {booking.courseName}
                  </h4>
                  <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>
                    ◷ {new Date(booking.date).toLocaleDateString('ko-KR')} {booking.time}
                  </div>
                  {booking.gatheringTime && (
                    <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>
                      ◷ 집결시간: {booking.gatheringTime}
                    </div>
                  )}

                  {booking.registrationDeadline && (
                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--alert-red)' }}>
                        ◈ {new Date(booking.registrationDeadline).toLocaleDateString('ko-KR')} 마감
                      </span>
                      <span style={{ opacity: 0.7, marginLeft: '8px' }}>
                        {getDaysUntilDeadline(booking.registrationDeadline) > 0 
                          ? `(마감까지 ${getDaysUntilDeadline(booking.registrationDeadline)}일 남았습니다)`
                          : '(마감완료)'
                        }
                      </span>
                    </div>
                  )}

                  <div style={{ 
                    fontSize: '13px', 
                    opacity: 0.7,
                    marginBottom: '12px'
                  }}>
                    ◈ 참가자 {participants.length}명
                  </div>

                  {hasTeams(booking) ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/team-formation?id=${booking.id}`);
                      }}
                      className='btn-primary'
                      style={{ 
                        width: '100%',
                        background: '#488C16'
                      }}
                    >
                      📋 조편성 보기
                    </button>
                  ) : isRegistrationClosed(booking) ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        booking.dailyHandicaps 
                          ? navigate(`/member-score-entry?id=${booking.id}`) 
                          : navigate('/score');
                      }}
                      className='btn-primary'
                      style={{ 
                        width: '100%',
                        background: '#488C16'
                      }}
                    >
                      {booking.dailyHandicaps ? '▲ 결과보기' : '⛳ 플레이하기'}
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinBooking(booking.id);
                      }}
                      className={isJoined ? 'btn-outline' : 'btn-primary'}
                      style={{ 
                        width: '100%',
                        background: isJoined ? 'transparent' : '#488C16',
                        borderColor: 'var(--accent-olive)',
                        color: isJoined ? 'var(--accent-olive)' : 'var(--text-light)'
                      }}
                    >
                      {isJoined ? '참가 취소' : '참가하기'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="card" style={{
          borderLeft: '3px solid var(--accent-dark-olive)'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--accent-dark-olive)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            최근 스코어
          </h3>
          <div style={{ 
            padding: '16px',
            background: 'linear-gradient(135deg, var(--bg-green) 0%, rgba(59, 64, 26, 0.05) 100%)',
            borderRadius: '8px',
            textAlign: 'center',
            opacity: 0.7
          }}>
            기록된 스코어가 없습니다
          </div>
        </div>

        <div className="card" style={{
          borderLeft: '3px solid var(--accent-gold)'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--accent-gold)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>💳</span>
            회비 납부 내역
          </h3>
          <div style={{ 
            padding: '16px',
            background: 'linear-gradient(135deg, var(--bg-green) 0%, rgba(242, 163, 65, 0.05) 100%)',
            borderRadius: '8px',
            textAlign: 'center',
            opacity: 0.7
          }}>
            납부 내역이 없습니다
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
