import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

function Dashboard() {
  const { user, scores, bookings, posts, addPost, updatePost } = useApp();
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

  return (
    <div>
      <div className="header">
        <h1>대시보드</h1>
        <div style={{ fontSize: '14px' }}>{user.name}님</div>
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

        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #2d5f3f 0%, #3a7d54 100%)',
          color: 'white',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>환영합니다!</h2>
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            {user.name}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            전화번호: ***{user.phone}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              현재 핸디캡
            </div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '700',
              color: 'var(--primary-green)'
            }}>
              {user.handicap || 0}
            </div>
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
              {user.balance?.toLocaleString() || 0}원
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--primary-green)'
          }}>
            다가오는 부킹
          </h3>
          <div style={{ 
            padding: '16px',
            background: 'var(--bg-green)',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#666'
          }}>
            예정된 부킹이 없습니다
          </div>
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
