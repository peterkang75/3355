import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import ProfileBadge from '../components/common/ProfileBadge';
import { checkIsOperator } from '../utils';

function Board() {
  const navigate = useNavigate();
  const { user, posts, addPost, updatePost } = useApp();
  const canCreatePost = user && checkIsOperator(user);
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
      author: user.name,
      date: new Date().toLocaleDateString('ko-KR')
    }];

    updatePost(postId, { comments: updatedComments });
    setNewComment('');
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginLeft: '12px' }}>
          <h1>게시판</h1>
          {canCreatePost && (
            <button 
              onClick={() => setShowNewPost(!showNewPost)}
              style={{
                background: 'var(--primary-green)',
                color: 'var(--text-light)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {showNewPost ? '취소' : '작성'}
            </button>
          )}
        </div>
        <ProfileBadge user={user} showGreeting={true} />
      </div>

      <div className="page-content">
        {showNewPost && canCreatePost && (
          <div className="card">
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
              새 공지사항
            </h3>
            <input
              type="text"
              placeholder="제목"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              style={{ marginBottom: '12px' }}
            />
            <textarea
              placeholder="내용"
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              rows={6}
              style={{ marginBottom: '12px', resize: 'vertical' }}
            />
            <button onClick={handleCreatePost} className="btn-primary">
              게시하기
            </button>
          </div>
        )}

        <div className="card" style={{ padding: '0' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✎</div>
              <p>아직 공지사항이 없습니다</p>
              {canCreatePost && (
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  상단의 작성 버튼을 눌러 첫 공지를 작성하세요
                </p>
              )}
            </div>
          ) : (
            posts.map((post, index) => {
              const isLast = index === posts.length - 1;
              return (
                <div 
                  key={post.id} 
                  style={{
                    padding: '20px 24px',
                    borderBottom: isLast ? 'none' : '1px solid #E5E7EB',
                    background: 'transparent'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px'
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', flex: 1, margin: 0 }}>
                      {post.title}
                    </h3>
                    <span style={{
                      background: 'var(--primary-green)',
                      color: 'var(--text-light)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      marginLeft: '8px'
                    }}>
                      공지
                    </span>
                  </div>
                  <p style={{ 
                    color: '#6B7280',
                    marginBottom: '10px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px'
                  }}>
                    {post.content}
                  </p>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9CA3AF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <span>{post.author?.name || '알 수 없음'}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>

                  <button
                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    style={{
                      background: expandedPost === post.id ? 'var(--primary-green)' : '#F3F4F6',
                      color: expandedPost === post.id ? 'white' : '#6B7280',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    💬 댓글 {post.comments.length > 0 ? `(${post.comments.length})` : ''}
                  </button>

                  {expandedPost === post.id && (
                    <div style={{ marginTop: '16px' }}>
                      {post.comments.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          {post.comments.map((comment, cIdx) => (
                            <div 
                              key={comment.id}
                              style={{
                                background: '#F9FAFB',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                marginBottom: cIdx === post.comments.length - 1 ? '0' : '8px',
                                borderLeft: '3px solid var(--primary-green)'
                              }}
                            >
                              <div style={{ 
                                fontSize: '14px',
                                marginBottom: '6px',
                                lineHeight: '1.5',
                                color: '#374151'
                              }}>
                                {comment.content}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: '#9CA3AF',
                                display: 'flex',
                                justifyContent: 'space-between'
                              }}>
                                <span style={{ fontWeight: '500' }}>{typeof comment.author === 'string' ? comment.author : comment.author?.name || '알 수 없음'}</span>
                                <span>{comment.date || new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
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
                          style={{ 
                            flex: 1, 
                            marginBottom: 0,
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            fontSize: '14px'
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          style={{
                            background: 'var(--primary-green)',
                            color: 'white',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            fontSize: '13px',
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Board;
