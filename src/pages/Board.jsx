import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsOperator } from '../utils';
import apiService from '../services/api';
import PageHeader from '../components/common/PageHeader';

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const StarIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const ChevronDown = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

function Board() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, posts, addPost, updatePost, refreshPosts } = useApp();
  const canCreatePost = user && checkIsOperator(user);
  const [featuringId, setFeaturingId] = useState(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [expandedPost, setExpandedPost] = useState(location.state?.openPostId || null);
  const [newComment, setNewComment] = useState('');

  const handleCreatePost = () => {
    if (!newPost.title || !newPost.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    addPost({ title: newPost.title, content: newPost.content, authorId: user.id });
    setNewPost({ title: '', content: '' });
    setShowNewPost(false);
  };

  const handleAddComment = (postId) => {
    if (!newComment.trim()) return;
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

  const handleToggleFeatured = async (postId) => {
    setFeaturingId(postId);
    try {
      await apiService.toggleFeaturedPost(postId);
      await refreshPosts();
    } catch (e) {
      alert('처리 중 오류가 발생했습니다.');
    } finally {
      setFeaturingId(null);
    }
  };

  const activePosts = posts.filter(p => p.isActive !== false);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}>
      <PageHeader
        title="공지사항"
        user={user}
        rightContent={canCreatePost ? (
          <button
            onClick={() => setShowNewPost(!showNewPost)}
            style={{ background: showNewPost ? '#f1f5f9' : 'var(--primary)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: showNewPost ? 'var(--text-muted)' : '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {showNewPost ? '취소' : <><PlusIcon /> 작성</>}
          </button>
        ) : null}
      />

      <div style={{ padding: '16px 16px 100px' }}>
        {/* 새 글 작성 폼 */}
        {showNewPost && (
          <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-background)', marginBottom: 16 }}>새 공지사항</div>
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 15, marginBottom: 10, background: '#f8fafc', color: 'var(--on-background)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <textarea
              placeholder="내용을 입력하세요"
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              rows={5}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 14, lineHeight: 1.6, resize: 'vertical', background: '#f8fafc',
                color: 'var(--on-background)', outline: 'none', boxSizing: 'border-box', marginBottom: 14,
              }}
            />
            <button
              onClick={handleCreatePost}
              style={{ width: '100%', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              게시하기
            </button>
          </div>
        )}

        {/* 게시글 목록 */}
        {activePosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>공지사항이 없습니다</div>
            {canCreatePost && <div style={{ fontSize: 13 }}>상단 작성 버튼으로 첫 공지를 작성하세요</div>}
          </div>
        ) : (
          activePosts.map((post) => {
            const isExpanded = expandedPost === post.id;
            const d = new Date(post.createdAt);
            const dateStr = `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
            const commentCount = (post.comments || []).length;

            return (
              <div key={post.id} style={{ background: '#fff', borderRadius: 20, marginBottom: 10, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                {/* 게시글 헤더 */}
                <div
                  onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                  style={{ padding: '18px 20px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ background: '#eff6ff', color: 'var(--primary)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, letterSpacing: '0.02em' }}>
                          공지
                        </span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-background)', lineHeight: 1.4, letterSpacing: '-0.02em' }}>
                        {post.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 8 }}>
                        <span>{post.author?.nickname || post.author?.name || '운영진'}</span>
                        <span>·</span>
                        <span>{dateStr}</span>
                        {commentCount > 0 && <><span>·</span><span>댓글 {commentCount}</span></>}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}>
                      <ChevronDown open={isExpanded} />
                    </div>
                  </div>
                </div>

                {/* 게시글 본문 */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px 20px' }}>
                    <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-sub)', whiteSpace: 'pre-wrap', marginBottom: 20 }}>
                      {post.content}
                    </p>

                    {/* 운영진: 대시보드 공지 등록/해제 */}
                    {canCreatePost && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFeatured(post.id); }}
                        disabled={featuringId === post.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: post.isFeatured ? '1.5px solid var(--primary)' : '1.5px solid #e2e8f0',
                          background: post.isFeatured ? '#eff6ff' : '#f8fafc',
                          color: post.isFeatured ? 'var(--primary)' : 'var(--text-muted)',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: featuringId === post.id ? 'not-allowed' : 'pointer',
                          marginBottom: 16,
                          opacity: featuringId === post.id ? 0.6 : 1,
                        }}
                      >
                        <StarIcon filled={post.isFeatured} />
                        {post.isFeatured ? '대시보드 공지 해제' : '대시보드 공지로 등록'}
                      </button>
                    )}

                    {/* 댓글 목록 */}
                    {(post.comments || []).length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        {(post.comments || []).map((comment, idx) => (
                          <div key={comment.id || idx} style={{
                            background: '#f8fafc', borderRadius: 12, padding: '12px 14px',
                            marginBottom: 8, borderLeft: '3px solid var(--primary)',
                          }}>
                            <div style={{ fontSize: 14, color: 'var(--on-background)', lineHeight: 1.6, marginBottom: 5 }}>
                              {comment.content}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600 }}>{typeof comment.author === 'string' ? comment.author : comment.author?.name || '알 수 없음'}</span>
                              <span>{comment.date || new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 댓글 입력 */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="댓글을 입력하세요"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                          fontSize: 14, background: '#f8fafc', color: 'var(--on-background)', outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}
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
  );
}

export default Board;
