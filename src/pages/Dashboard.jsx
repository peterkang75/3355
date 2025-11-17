import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

function Dashboard() {
  const { user, members, scores, bookings, posts, addPost, updatePost, deletePost, updateBooking, refreshBookings } = useApp();
  const navigate = useNavigate();
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [expandedPost, setExpandedPost] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [isRentalLoading, setIsRentalLoading] = useState(null);

  // 점 세 개 메뉴 외부 클릭 시 닫기 (게시글)
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuPostId !== null) {
        setOpenMenuPostId(null);
      }
    };

    if (openMenuPostId !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuPostId]);

  // 점 세 개 메뉴 외부 클릭 시 닫기 (댓글)
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuCommentId !== null) {
        setOpenMenuCommentId(null);
      }
    };

    if (openMenuCommentId !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuCommentId]);

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

  const handleDeletePost = async (postId) => {
    if (window.confirm('이 게시글을 삭제하시겠습니까?')) {
      try {
        await deletePost(postId);
        setOpenMenuPostId(null);
        setExpandedPost(null);
      } catch (error) {
        alert('게시글 삭제에 실패했습니다.');
      }
    }
  };

  const handleEditPost = (post) => {
    setEditingPost({ id: post.id, title: post.title, content: post.content });
    setOpenMenuPostId(null);
  };

  const handleUpdatePost = async () => {
    if (!editingPost.title || !editingPost.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      await updatePost(editingPost.id, {
        title: editingPost.title,
        content: editingPost.content
      });
      setEditingPost(null);
    } catch (error) {
      alert('게시글 수정에 실패했습니다.');
    }
  };

  const handleEditComment = (postId, comment) => {
    setEditingComment({ postId, commentId: comment.id, content: comment.content });
    setOpenMenuCommentId(null);
  };

  const handleUpdateComment = async () => {
    if (!editingComment.content.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const post = posts.find(p => p.id === editingComment.postId);
      const updatedComments = post.comments.map(c => 
        c.id === editingComment.commentId 
          ? { ...c, content: editingComment.content }
          : c
      );
      
      await updatePost(editingComment.postId, { comments: updatedComments });
      setEditingComment(null);
    } catch (error) {
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (window.confirm('이 댓글을 삭제하시겠습니까?')) {
      try {
        const post = posts.find(p => p.id === postId);
        const updatedComments = post.comments.filter(c => c.id !== commentId);
        
        await updatePost(postId, { comments: updatedComments });
        setOpenMenuCommentId(null);
      } catch (error) {
        alert('댓글 삭제에 실패했습니다.');
      }
    }
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

  const handleToggleNumberRental = async (bookingId) => {
    if (isRentalLoading === bookingId) return;
    
    try {
      setIsRentalLoading(bookingId);
      const booking = bookings.find(b => b.id === bookingId);
      const isCurrentlyRenting = booking.numberRentals && booking.numberRentals.includes(user.phone);
      
      await apiService.toggleNumberRental(bookingId, user.phone);
      await refreshBookings();
      
      setIsRentalLoading(null);
    } catch (error) {
      console.error('번호 대여 상태 변경 실패:', error);
      alert('번호 대여 상태 변경에 실패했습니다.');
      setIsRentalLoading(null);
    }
  };

  const hasUserScore = (booking) => {
    if (!scores || scores.length === 0) return false;
    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
    return scores.some(score => {
      const scoreDate = new Date(score.date).toISOString().split('T')[0];
      return scoreDate === bookingDate && score.courseName === booking.courseName;
    });
  };

  const getUserScore = (booking) => {
    if (!scores || scores.length === 0) return null;
    const bookingDate = new Date(booking.date).toISOString().split('T')[0];
    return scores.find(score => {
      const scoreDate = new Date(score.date).toISOString().split('T')[0];
      return scoreDate === bookingDate && score.courseName === booking.courseName;
    });
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

  const isPastRoundingDate = (booking) => {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    bookingDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today > bookingDate;
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
      <div className="header">
        <button
          onClick={() => navigate(-1)}
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
        <h1 style={{ flex: 1, marginLeft: '12px' }}>대시보드</h1>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/mypage')}
        >
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-light)' }}>
            환영합니다 {user.nickname || user.name}님
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            border: '2px solid var(--border-color)'
          }}>
            {user.photo ? (
              <img 
                src={user.photo} 
                alt="프로필" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }} 
              />
            ) : (
              <span>{(user.nickname || user.name).charAt(0)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{
          borderLeft: '3px solid var(--accent-bright-green)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '13px'
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
                  background: '#214001',
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
              padding: '13px', 
              borderRadius: '8px',
              marginBottom: '13px'
            }}>
              <h4 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: '700' }}>
                새 공지사항
              </h4>
              <input
                type="text"
                placeholder="제목"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                style={{ marginBottom: '10px', width: '100%' }}
              />
              <textarea
                placeholder="내용"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                rows={6}
                style={{ marginBottom: '10px', resize: 'vertical', width: '100%' }}
              />
              <button onClick={handleCreatePost} className="btn-primary">
                게시하기
              </button>
            </div>
          )}

          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', opacity: 0.7, background: 'var(--bg-green)', borderRadius: '8px' }}>
              <div style={{ fontSize: '48px', marginBottom: '13px' }}>✎</div>
              <p>아직 공지사항이 없습니다</p>
              {user.isAdmin && (
                <p style={{ fontSize: '14px', marginTop: '6px' }}>
                  상단의 작성 버튼을 눌러 첫 공지를 작성하세요
                </p>
              )}
            </div>
          ) : (
            <div>
              {editingPost && (
                <div style={{
                  background: 'var(--bg-green)',
                  padding: '13px',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>게시글 수정</h3>
                  <input
                    type="text"
                    placeholder="제목"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                    style={{ marginBottom: '10px', width: '100%' }}
                  />
                  <textarea
                    placeholder="내용"
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    rows={6}
                    style={{ marginBottom: '10px', resize: 'vertical', width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleUpdatePost} className="btn-primary">
                      수정 완료
                    </button>
                    <button onClick={() => setEditingPost(null)} style={{
                      background: '#ccc',
                      color: '#333',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}>
                      취소
                    </button>
                  </div>
                </div>
              )}
              {posts.slice(0, 5).map((post, index) => (
                <div key={post.id}>
                  <div style={{
                    background: expandedPost === post.id ? '#FFD449' : 'var(--bg-green)',
                    padding: '10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative'
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
                    <div style={{ flex: 1, paddingRight: '30px' }}>
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
                    {(user.isAdmin || post.authorId === user.id) && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          lineHeight: '1',
                          userSelect: 'none'
                        }}
                      >
                        ⋮
                        {openMenuPostId === post.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              background: 'white',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              marginTop: '4px',
                              minWidth: '100px',
                              zIndex: 10,
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPost(post);
                              }}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: 'white',
                                borderBottom: '1px solid #eee',
                                fontSize: '14px',
                                color: '#333'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                              수정
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePost(post.id);
                              }}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: 'white',
                                fontSize: '14px',
                                color: '#d9534f'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                              삭제
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {expandedPost === post.id && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0, 0, 0, 0.15)' }}>
                      <p style={{ 
                        opacity: 0.7,
                        marginBottom: '10px',
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
                        marginBottom: '10px'
                      }}>
                        <span>{post.author?.name || '알 수 없음'}</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>

                      {post.comments?.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          {post.comments.map(comment => {
                            const commentAuthor = typeof comment.author === 'string' ? comment.author : (comment.author?.nickname || comment.author?.name);
                            const isCommentOwner = user.isAdmin || commentAuthor === (user.nickname || user.name);
                            const isEditingThisComment = editingComment?.commentId === comment.id;

                            if (isEditingThisComment) {
                              return (
                                <div 
                                  key={comment.id}
                                  style={{
                                    background: '#FFF9E6',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    marginBottom: '6px',
                                    borderBottom: '1px solid var(--border-color)'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <textarea
                                    value={editingComment.content}
                                    onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                                    style={{ 
                                      width: '100%', 
                                      minHeight: '60px',
                                      marginBottom: '6px',
                                      resize: 'vertical',
                                      padding: '8px',
                                      borderRadius: '4px',
                                      border: '1px solid #ddd'
                                    }}
                                  />
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={handleUpdateComment}
                                      style={{
                                        background: 'var(--primary-green)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      수정
                                    </button>
                                    <button
                                      onClick={() => setEditingComment(null)}
                                      style={{
                                        background: '#ccc',
                                        color: '#333',
                                        border: 'none',
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={comment.id}
                                style={{
                                  background: '#FFF9E6',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  marginBottom: '6px',
                                  borderBottom: '1px solid var(--border-color)',
                                  position: 'relative'
                                }}
                              >
                                <div style={{ 
                                  fontSize: '14px',
                                  marginBottom: '6px',
                                  lineHeight: '1.5',
                                  paddingRight: isCommentOwner ? '30px' : '0'
                                }}>
                                  {comment.content}
                                </div>
                                <div style={{
                                  fontSize: '12px',
                                  opacity: 0.7,
                                  textAlign: 'right'
                                }}>
                                  <span>
                                    {comment.date || new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                                    {' by '}
                                    {commentAuthor || '알 수 없음'}
                                  </span>
                                </div>
                                {isCommentOwner && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuCommentId(openMenuCommentId === comment.id ? null : comment.id);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      cursor: 'pointer',
                                      padding: '4px 6px',
                                      fontSize: '16px',
                                      fontWeight: 'bold',
                                      lineHeight: '1',
                                      userSelect: 'none'
                                    }}
                                  >
                                    ⋮
                                    {openMenuCommentId === comment.id && (
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: '100%',
                                          right: 0,
                                          background: 'white',
                                          border: '1px solid #ddd',
                                          borderRadius: '8px',
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                          marginTop: '4px',
                                          minWidth: '80px',
                                          zIndex: 10,
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditComment(post.id, comment);
                                          }}
                                          style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            background: 'white',
                                            borderBottom: '1px solid #eee',
                                            fontSize: '13px',
                                            color: '#333'
                                          }}
                                          onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                                          onMouseLeave={(e) => e.target.style.background = 'white'}
                                        >
                                          수정
                                        </div>
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteComment(post.id, comment.id);
                                          }}
                                          style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            background: 'white',
                                            fontSize: '13px',
                                            color: '#d9534f'
                                          }}
                                          onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                                          onMouseLeave={(e) => e.target.style.background = 'white'}
                                        >
                                          삭제
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                      margin: '5px 0'
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
            padding: '8px',
            borderLeft: '3px solid var(--accent-mid-green)',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(63, 115, 25, 0.05) 100%)'
          }}>
            <div style={{ 
              fontSize: '20px',
              marginBottom: '4px'
            }}>
              ⛳
            </div>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              color: 'var(--accent-mid-green)',
              marginBottom: '4px'
            }}>
              핸디: {user?.handicap ?? user?.calculatedHandicap ?? 18}
            </div>
            <div style={{ 
              fontSize: '11px', 
              opacity: 0.7,
              marginBottom: '2px'
            }}>
              추천핸디: {user?.calculatedHandicap ?? user?.handicap ?? 18}
            </div>
            {user?.handicapExplanation && (
              <div style={{ 
                fontSize: '10px', 
                opacity: 0.7,
                fontStyle: 'italic',
                lineHeight: '1.3'
              }}>
                {user.handicapExplanation}
              </div>
            )}
          </div>

          <div className="card" style={{ 
            textAlign: 'center',
            padding: '8px',
            borderLeft: '3px solid var(--accent-gold)',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(242, 163, 65, 0.05) 100%)'
          }}>
            <div style={{ 
              fontSize: '20px',
              marginBottom: '4px'
            }}>
              💰
            </div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>
              회비 잔액
            </div>
            <div style={{ 
              fontSize: '20px', 
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

                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      flexWrap: 'wrap' 
                    }}
                  >
                    {isPastRoundingDate(booking) && (booking.dailyHandicaps || hasUserScore(booking)) ? (
                      <>
                        <button
                          onClick={() => {
                            if (booking.dailyHandicaps) {
                              navigate(`/member-score-entry?id=${booking.id}`);
                            } else if (hasUserScore(booking)) {
                              const userScore = getUserScore(booking);
                              navigate('/score', { state: { scoreId: userScore.id, readonly: true } });
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: '#214001',
                            color: 'var(--text-light)',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {booking.dailyHandicaps ? '▲ 결과보기' : '📊 스코어보기'}
                        </button>
                        {user.isAdmin && (
                          <button
                            onClick={() => navigate(`/rounding-management?id=${booking.id}`)}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: '#214001',
                              color: 'var(--text-light)',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            ◉ 라운딩 관리
                          </button>
                        )}
                      </>
                    ) : isRegistrationClosed(booking) && !isPastRoundingDate(booking) ? (
                      <>
                        <button
                          onClick={() => navigate(`/team-formation?id=${booking.id}`)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: '#214001',
                            color: 'var(--text-light)',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          📋 조편성 보기
                        </button>
                        {user.isAdmin && (
                          <button
                            onClick={() => navigate(`/rounding-management?id=${booking.id}`)}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: '#214001',
                              color: 'var(--text-light)',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            ◉ 라운딩 관리
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(isJoined || (booking.numberRentals && booking.numberRentals.includes(user.phone))) ? null : () => handleJoinBooking(booking.id)}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: (isJoined || (booking.numberRentals && booking.numberRentals.includes(user.phone))) ? '#e0e0e0' : '#214001',
                            color: (isJoined || (booking.numberRentals && booking.numberRentals.includes(user.phone))) ? '#999' : 'var(--text-light)',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: (isJoined || (booking.numberRentals && booking.numberRentals.includes(user.phone))) ? 'default' : 'pointer',
                            opacity: (isJoined || (booking.numberRentals && booking.numberRentals.includes(user.phone))) ? 0.6 : 1
                          }}
                        >
                          {isJoined ? '참가중' : '참가하기'}
                        </button>
                        <button
                          onClick={(isJoined && !(booking.numberRentals && booking.numberRentals.includes(user.phone))) ? () => handleJoinBooking(booking.id) : null}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: (isJoined && !(booking.numberRentals && booking.numberRentals.includes(user.phone))) ? 'var(--alert-red)' : '#e0e0e0',
                            color: (isJoined && !(booking.numberRentals && booking.numberRentals.includes(user.phone))) ? 'var(--text-light)' : '#999',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: (isJoined && !(booking.numberRentals && booking.numberRentals.includes(user.phone))) ? 'pointer' : 'default',
                            opacity: (isJoined && !(booking.numberRentals && booking.numberRentals.includes(user.phone))) ? 1 : 0.6
                          }}
                        >
                          취소하기
                        </button>
                        {booking.type === '컴페티션' && (
                          <button
                            onClick={() => handleToggleNumberRental(booking.id)}
                            disabled={isRentalLoading === booking.id}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: isRentalLoading === booking.id ? '#ccc' : '#E6AA68',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: isRentalLoading === booking.id ? 'wait' : 'pointer',
                              opacity: isRentalLoading === booking.id ? 0.7 : 1
                            }}
                          >
                            {isRentalLoading === booking.id ? '처리중...' : ((booking.numberRentals && booking.numberRentals.includes(user.phone)) ? '✓ 번호대여중' : '번호대여')}
                          </button>
                        )}
                        {user.isAdmin && (
                          <button
                            onClick={() => navigate(`/rounding-management?id=${booking.id}`)}
                            style={{
                              flex: 1,
                              padding: '12px',
                              background: '#214001',
                              color: 'var(--text-light)',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            ◉ 라운딩 관리
                          </button>
                        )}
                      </>
                    )}
                  </div>
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
          {(() => {
            const userScores = scores
              .filter(score => score.userId === user.id)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 3);

            if (userScores.length === 0) {
              return (
                <div style={{ 
                  padding: '16px',
                  background: 'linear-gradient(135deg, var(--bg-green) 0%, rgba(59, 64, 26, 0.05) 100%)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  opacity: 0.7
                }}>
                  기록된 스코어가 없습니다
                </div>
              );
            }

            return (
              <div>
                {userScores.map((score, index) => {
                  const overPar = score.totalScore - score.coursePar;
                  const displayScore = overPar > 0 ? `+${overPar}` : overPar === 0 ? 'E' : overPar;
                  
                  return (
                    <div key={score.id}>
                      <div style={{
                        padding: '12px',
                        background: 'linear-gradient(135deg, var(--bg-green) 0%, rgba(59, 64, 26, 0.05) 100%)',
                        borderRadius: '8px'
                      }}>
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px'
                        }}>
                          <div style={{ 
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            {score.courseName}
                          </div>
                          <div style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: overPar > 0 ? '#d9534f' : overPar === 0 ? 'var(--accent-gold)' : 'var(--primary-green)'
                          }}>
                            {displayScore}
                          </div>
                        </div>
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          opacity: 0.7
                        }}>
                          <span>{new Date(score.date).toLocaleDateString('ko-KR')}</span>
                          <span>{score.totalScore} ({score.coursePar})</span>
                        </div>
                      </div>
                      {index < userScores.length - 1 && (
                        <div style={{ height: '8px' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
