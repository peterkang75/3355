import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

function Board() {
  const { user, posts, addPost, updatePost } = useApp();
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
        <h1>게시판</h1>
        {user.isAdmin && (
          <button 
            onClick={() => setShowNewPost(!showNewPost)}
            style={{
              background: 'white',
              color: 'var(--primary-green)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {showNewPost ? '취소' : '작성'}
          </button>
        )}
      </div>

      <div className="page-content">
        {showNewPost && user.isAdmin && (
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

        {posts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p>아직 공지사항이 없습니다</p>
            {user.isAdmin && (
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                상단의 작성 버튼을 눌러 첫 공지를 작성하세요
              </p>
            )}
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', flex: 1 }}>
                  {post.title}
                </h3>
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
                  background: 'var(--bg-green)',
                  color: 'var(--primary-green)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  width: '100%',
                  marginBottom: expandedPost === post.id ? '12px' : '0'
                }}
              >
                💬 댓글 {post.comments.length > 0 ? `(${post.comments.length})` : '달기'}
              </button>

              {expandedPost === post.id && (
                <div style={{ marginTop: '12px' }}>
                  {post.comments.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {post.comments.map(comment => (
                        <div 
                          key={comment.id}
                          style={{
                            background: 'var(--bg-green)',
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
                        whiteSpace: 'nowrap'
                      }}
                    >
                      등록
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Board;
