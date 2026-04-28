import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsOperator, canManagePost, canManageComment } from '../utils';
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
const KebabIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);

function Board() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, posts, addPost, refreshPosts } = useApp();
  const canCreatePost = user && checkIsOperator(user);
  const [featuringId, setFeaturingId] = useState(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [expandedPost, setExpandedPost] = useState(location.state?.openPostId || null);
  const [newComment, setNewComment] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null); // 'post:<id>' | 'comment:<postId>:<cid>'
  const [editingPost, setEditingPost] = useState(null); // {id, title, content} | null
  const [editingComment, setEditingComment] = useState(null); // {postId, commentId, content} | null

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  const handleCreatePost = () => {
    if (!newPost.title || !newPost.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    addPost({ title: newPost.title, content: newPost.content, authorId: user.id });
    setNewPost({ title: '', content: '' });
    setShowNewPost(false);
  };

  const handleAddComment = async (postId) => {
    if (!newComment.trim()) return;
    try {
      await apiService.addComment(postId, newComment);
      await refreshPosts();
      setNewComment('');
    } catch {
      alert('댓글 추가에 실패했습니다.');
    }
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

  const handleStartEditPost = (post) => {
    setEditingPost({ id: post.id, title: post.title, content: post.content });
    setOpenMenuId(null);
  };

  const handleSaveEditPost = async () => {
    if (!editingPost.title.trim() || !editingPost.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    try {
      await apiService.updatePost(editingPost.id, {
        title: editingPost.title,
        content: editingPost.content,
      });
      await refreshPosts();
      setEditingPost(null);
    } catch {
      alert('수정에 실패했습니다.');
    }
  };

  const handleCancelEditPost = () => setEditingPost(null);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await apiService.softDeletePost(postId);
      await refreshPosts();
      setOpenMenuId(null);
      setExpandedPost(null);
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleStartEditComment = (postId, comment) => {
    setEditingComment({ postId, commentId: comment.id, content: comment.content });
    setOpenMenuId(null);
  };

  const handleSaveEditComment = async () => {
    if (!editingComment.content.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }
    try {
      await apiService.updateComment(editingComment.postId, editingComment.commentId, editingComment.content);
      await refreshPosts();
      setEditingComment(null);
    } catch {
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleCancelEditComment = () => setEditingComment(null);

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
      await apiService.deleteComment(postId, commentId);
      await refreshPosts();
      setOpenMenuId(null);
    } catch {
      alert('댓글 삭제에 실패했습니다.');
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

            // 편집 모드면 폼 노출
            if (editingPost && editingPost.id === post.id) {
              return (
                <div key={post.id} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 10, boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-background)', marginBottom: 16 }}>게시글 수정</div>
                  <input
                    type="text"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                      fontSize: 15, marginBottom: 10, background: '#f8fafc', color: 'var(--on-background)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <textarea
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    rows={6}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                      fontSize: 14, lineHeight: 1.6, resize: 'vertical', background: '#f8fafc',
                      color: 'var(--on-background)', outline: 'none', boxSizing: 'border-box', marginBottom: 14,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleSaveEditPost}
                      style={{ flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancelEditPost}
                      style={{ flex: 1, background: '#f1f5f9', color: 'var(--text-muted)', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              );
            }

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 2, position: 'relative', color: 'var(--text-muted)' }}>
                      {canManagePost(user, post) && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === `post:${post.id}` ? null : `post:${post.id}`);
                            }}
                            style={{
                              background: 'transparent', border: 'none', padding: 6, borderRadius: 6,
                              cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                            }}
                            aria-label="게시글 메뉴"
                          >
                            <KebabIcon />
                          </button>
                          {openMenuId === `post:${post.id}` && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute', top: 32, right: 0, background: '#fff',
                                borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden',
                                minWidth: 100, zIndex: 10,
                              }}
                            >
                              <div
                                onClick={(e) => { e.stopPropagation(); handleStartEditPost(post); }}
                                style={{ padding: '10px 14px', fontSize: 14, cursor: 'pointer', color: 'var(--on-background)' }}
                              >
                                수정
                              </div>
                              <div
                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                style={{ padding: '10px 14px', fontSize: 14, cursor: 'pointer', color: '#dc2626', borderTop: '1px solid #f1f5f9' }}
                              >
                                삭제
                              </div>
                            </div>
                          )}
                        </>
                      )}
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
                        {(post.comments || []).map((comment, idx) => {
                          const cKey = `comment:${post.id}:${comment.id}`;
                          const isEditingThis = editingComment && editingComment.postId === post.id && editingComment.commentId === comment.id;
                          const dateLabel = comment.date
                            ? (comment.date.includes('T') ? new Date(comment.date).toLocaleDateString('ko-KR') : comment.date)
                            : (comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('ko-KR') : '');

                          if (isEditingThis) {
                            return (
                              <div key={comment.id || idx} style={{
                                background: '#f8fafc', borderRadius: 12, padding: '12px 14px',
                                marginBottom: 8, borderLeft: '3px solid var(--primary)',
                              }}>
                                <textarea
                                  value={editingComment.content}
                                  onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                                  rows={2}
                                  style={{
                                    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                    fontSize: 14, background: '#fff', color: 'var(--on-background)', outline: 'none',
                                    boxSizing: 'border-box', resize: 'vertical', marginBottom: 8,
                                  }}
                                />
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={handleSaveEditComment}
                                    style={{ flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    저장
                                  </button>
                                  <button
                                    onClick={handleCancelEditComment}
                                    style={{ flex: 1, background: '#e2e8f0', color: 'var(--text-muted)', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={comment.id || idx} style={{
                              background: '#f8fafc', borderRadius: 12, padding: '12px 14px',
                              marginBottom: 8, borderLeft: '3px solid var(--primary)',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, color: 'var(--on-background)', lineHeight: 1.6, marginBottom: 5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {comment.content}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>{typeof comment.author === 'string' ? comment.author : comment.author?.name || '알 수 없음'}</span>
                                    <span>{dateLabel}</span>
                                  </div>
                                </div>
                                {canManageComment(user, comment) && (
                                  <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(openMenuId === cKey ? null : cKey);
                                      }}
                                      style={{
                                        background: 'transparent', border: 'none', padding: 4, borderRadius: 6,
                                        cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                                      }}
                                      aria-label="댓글 메뉴"
                                    >
                                      <KebabIcon />
                                    </button>
                                    {openMenuId === cKey && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                          position: 'absolute', top: 28, right: 0, background: '#fff',
                                          borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden',
                                          minWidth: 90, zIndex: 10,
                                        }}
                                      >
                                        <div
                                          onClick={(e) => { e.stopPropagation(); handleStartEditComment(post.id, comment); }}
                                          style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--on-background)' }}
                                        >
                                          수정
                                        </div>
                                        <div
                                          onClick={(e) => { e.stopPropagation(); handleDeleteComment(post.id, comment.id); }}
                                          style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: '#dc2626', borderTop: '1px solid #f1f5f9' }}
                                        >
                                          삭제
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
