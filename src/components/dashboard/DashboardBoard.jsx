import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import LoadingButton from '../LoadingButton';
import { Card, Button } from '../common';
import { checkIsOperator } from '../../utils';
import apiService from '../../services/api';

const ChevronIcon = ({ open }) => (
  <svg className={`chevron${open ? ' open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const ThumbUpIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }}>
    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
  </svg>
);

function getRelativeTime(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diff = Math.floor((now - past) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  const d = past;
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function DashboardBoard() {
  const { user, members, posts, addPost, updatePost, deletePost, refreshAllData, hasFeaturePermission } = useApp();
  const canCreatePost = user && checkIsOperator(user);

  const [isOpen, setIsOpen] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [expandedPost, setExpandedPost] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(null);

  useEffect(() => {
    const close = () => setOpenMenuPostId(null);
    if (openMenuPostId !== null) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuPostId]);

  useEffect(() => {
    const close = () => setOpenMenuCommentId(null);
    if (openMenuCommentId !== null) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuCommentId]);

  const handleCreatePost = async () => {
    if (isCreatingPost || !newPost.title || !newPost.content) {
      if (!newPost.title || !newPost.content) alert('제목과 내용을 입력해주세요.');
      return;
    }
    setIsCreatingPost(true);
    try {
      await addPost({ title: newPost.title, content: newPost.content, authorId: user.id });
      setNewPost({ title: '', content: '' });
      setShowNewPost(false);
    } catch { alert('게시글 작성에 실패했습니다.'); }
    finally { setIsCreatingPost(false); }
  };

  const handleAddComment = async (postId) => {
    if (isAddingComment === postId || !newComment.trim()) {
      if (!newComment.trim()) alert('댓글 내용을 입력해주세요.');
      return;
    }
    setIsAddingComment(postId);
    try {
      await apiService.addComment(postId, newComment);
      await refreshAllData();
      setNewComment('');
    } catch { alert('댓글 작성에 실패했습니다.'); }
    finally { setIsAddingComment(null); }
  };

  const handleLikePost = async (postId) => {
    try {
      await apiService.togglePostLike(postId);
      await refreshAllData();
    } catch { alert('좋아요 처리에 실패했습니다.'); }
  };

  const handleLikeComment = async (postId, commentId) => {
    try {
      await apiService.toggleCommentLike(postId, commentId);
      await refreshAllData();
    } catch { alert('좋아요 처리에 실패했습니다.'); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      await deletePost(postId);
      setOpenMenuPostId(null);
      setExpandedPost(null);
    } catch { alert('게시글 삭제에 실패했습니다.'); }
  };

  const handleTogglePostActive = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/toggle-active`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setOpenMenuPostId(null);
      await refreshAllData();
    } catch { alert('상태 변경에 실패했습니다.'); }
  };

  const handleUpdatePost = async () => {
    if (!editingPost.title || !editingPost.content) { alert('제목과 내용을 입력해주세요.'); return; }
    try {
      await updatePost(editingPost.id, { title: editingPost.title, content: editingPost.content });
      setEditingPost(null);
    } catch { alert('게시글 수정에 실패했습니다.'); }
  };

  const handleUpdateComment = async () => {
    if (!editingComment.content.trim()) { alert('댓글 내용을 입력해주세요.'); return; }
    try {
      await apiService.updateComment(editingComment.postId, editingComment.commentId, editingComment.content);
      await refreshAllData();
      setEditingComment(null);
    } catch { alert('댓글 수정에 실패했습니다.'); }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return;
    try {
      await apiService.deleteComment(postId, commentId);
      await refreshAllData();
      setOpenMenuCommentId(null);
    } catch { alert('댓글 삭제에 실패했습니다.'); }
  };

  const visiblePosts = posts
    .filter(p => p.isActive !== false || user.isAdmin || hasFeaturePermission('manage_board'))
    .slice(0, 5);

  return (
    <Card>
      {/* Header */}
      <div
        className="section-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', marginBottom: isOpen ? '13px' : 0 }}
      >
        <h3 className="section-title">게시판</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOpen && canCreatePost && (
            <Button
              onClick={(e) => { e.stopPropagation(); setShowNewPost(!showNewPost); }}
              variant={showNewPost ? 'outline' : 'primary'}
              size="sm"
            >
              {showNewPost ? '취소' : '작성'}
            </Button>
          )}
          <ChevronIcon open={isOpen} />
        </div>
      </div>

      {!isOpen && null}

      {isOpen && (
        <div>
          {/* New post form */}
          {showNewPost && canCreatePost && (
            <div className="post-form">
              <h4 style={{ marginBottom: 10, fontSize: 16, fontWeight: 700 }}>새 공지사항</h4>
              <input type="text" placeholder="제목" value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                style={{ marginBottom: 10, width: '100%' }} />
              <textarea placeholder="내용" value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                rows={6} style={{ marginBottom: 10, resize: 'vertical', width: '100%' }} />
              <LoadingButton onClick={handleCreatePost} className="btn-primary"
                loading={isCreatingPost} loadingText="게시중...">
                게시하기
              </LoadingButton>
            </div>
          )}

          {/* Edit post form */}
          {editingPost && (
            <div className="post-form">
              <h4 style={{ marginBottom: 10, fontSize: 16 }}>게시글 수정</h4>
              <input type="text" placeholder="제목" value={editingPost.title}
                onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                style={{ marginBottom: 10, width: '100%' }} />
              <textarea placeholder="내용" value={editingPost.content}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                rows={6} style={{ marginBottom: 10, resize: 'vertical', width: '100%' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleUpdatePost} className="btn-primary" style={{ flex: 1 }}>수정 완료</button>
                <button onClick={() => setEditingPost(null)} className="btn-outline" style={{ flex: 1 }}>취소</button>
              </div>
            </div>
          )}

          {/* Post list */}
          {visiblePosts.length === 0 ? (
            <div className="empty-state">
              <p>아직 공지사항이 없습니다</p>
              {canCreatePost && <p style={{ marginTop: 6 }}>상단의 작성 버튼을 눌러 첫 공지를 작성하세요</p>}
            </div>
          ) : (
            <div>
              {visiblePosts.map((post) => {
                const isInactive = post.isActive === false;
                const isExpanded = expandedPost === post.id;
                const canManage = user.isAdmin || post.authorId === user.id || hasFeaturePermission('manage_board');

                return (
                  <div
                    key={post.id}
                    className="post-item"
                    style={{ opacity: isInactive ? 0.6 : 1, background: isInactive ? 'var(--surface-container-low)' : 'transparent' }}
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, opacity: 0.4, marginTop: 2 }}>•</span>
                      <div style={{ flex: 1, paddingRight: 30 }}>
                        <div className="post-title">
                          {post.title}
                          {isInactive && (
                            <span style={{ fontSize: 10, background: 'var(--text-muted)', color: 'white', padding: '2px 6px', borderRadius: 4, fontWeight: 500, marginLeft: 6 }}>비활성</span>
                          )}
                        </div>
                        <div className="post-meta">
                          <span>{getRelativeTime(post.createdAt)}</span>
                          <span>·</span>
                          <span>{post.author?.nickname || post.author?.name || '알 수 없음'}</span>
                          {post.comments?.length > 0 && (
                            <><span>·</span><span style={{ color: 'var(--text-sub)', fontWeight: 600 }}>댓글 {post.comments.length}</span></>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <button
                          className="kebab-btn"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuPostId(openMenuPostId === post.id ? null : post.id); }}
                        >
                          ⋮
                          {openMenuPostId === post.id && (
                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); setEditingPost({ id: post.id, title: post.title, content: post.content }); setOpenMenuPostId(null); }}>수정</div>
                              <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); handleTogglePostActive(post.id); }} style={{ color: post.isActive === false ? 'var(--success)' : 'var(--warning)' }}>
                                {post.isActive === false ? '활성화' : '비활성화'}
                              </div>
                              <div className="dropdown-item danger" onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}>삭제</div>
                            </div>
                          )}
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(192,201,195,0.15)' }}>
                        <p className="post-content">{post.content}</p>

                        {/* Post likes */}
                        <div className="post-actions">
                          {(post.likes || []).length > 0 && (
                            <span className="like-names">
                              {(post.likes || []).map(id => {
                                const m = members.find(m => m.id === id);
                                return m?.nickname || m?.name || '알 수 없음';
                              }).join(', ')}
                            </span>
                          )}
                          <button className="like-btn" onClick={(e) => { e.stopPropagation(); handleLikePost(post.id); }}>
                            <ThumbUpIcon filled={(post.likes || []).includes(user.id)} />
                            {(post.likes || []).length > 0 && <span style={{ fontWeight: 600, color: 'var(--text-sub)' }}>{(post.likes || []).length}</span>}
                          </button>
                        </div>

                        {/* Comments */}
                        {post.comments?.length > 0 && (
                          <div className="comment-thread">
                            {post.comments.map((comment) => {
                              const commentAuthor = typeof comment.author === 'string' ? comment.author : (comment.author?.nickname || comment.author?.name);
                              const isCommentOwner = user.isAdmin || commentAuthor === (user.nickname || user.name);
                              const isEditingThis = editingComment?.commentId === comment.id;

                              if (isEditingThis) {
                                return (
                                  <div key={comment.id} className="comment-item" onClick={(e) => e.stopPropagation()}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                      <span className="comment-author">{commentAuthor || '알 수 없음'}</span>
                                    </div>
                                    <textarea
                                      value={editingComment.content}
                                      onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                                      style={{ width: '100%', minHeight: 40, marginBottom: 6, resize: 'vertical', padding: '8px 12px', borderRadius: 12, border: 'none', fontSize: 13, background: 'var(--surface-container-low)' }}
                                    />
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                      <button onClick={handleUpdateComment} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: 'pointer', minHeight: 'auto' }}>수정</button>
                                      <button onClick={() => setEditingComment(null)} style={{ background: 'var(--surface-container-high)', color: 'var(--text-muted)', border: 'none', padding: '5px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: 'pointer', minHeight: 'auto' }}>취소</button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={comment.id} className="comment-item">
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 1 }}>
                                    <span className="comment-author">{commentAuthor || '알 수 없음'}</span>
                                    <span className="comment-time">{getRelativeTime(comment.date || comment.createdAt || new Date())}</span>
                                  </div>
                                  <div className="comment-content">{comment.content}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, fontSize: 12 }}>
                                    {(comment.likes || []).length > 0 && (
                                      <span className="like-names">
                                        {(comment.likes || []).map(id => {
                                          const m = members.find(m => m.id === id);
                                          return m?.nickname || m?.name || '알 수 없음';
                                        }).join(', ')}
                                      </span>
                                    )}
                                    <button className="like-btn" onClick={(e) => { e.stopPropagation(); handleLikeComment(post.id, comment.id); }}>
                                      <ThumbUpIcon filled={(comment.likes || []).includes(user.id)} />
                                      {(comment.likes || []).length > 0 && <span style={{ fontWeight: 600, color: 'var(--text-sub)' }}>{(comment.likes || []).length}</span>}
                                    </button>
                                  </div>
                                  {isCommentOwner && (
                                    <button
                                      className="kebab-btn"
                                      style={{ top: 6, fontSize: 16 }}
                                      onClick={(e) => { e.stopPropagation(); setOpenMenuCommentId(openMenuCommentId === comment.id ? null : comment.id); }}
                                    >
                                      ⋮
                                      {openMenuCommentId === comment.id && (
                                        <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                          <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); setEditingComment({ postId: post.id, commentId: comment.id, content: comment.content }); setOpenMenuCommentId(null); }}>수정</div>
                                          <div className="dropdown-item danger" onClick={(e) => { e.stopPropagation(); handleDeleteComment(post.id, comment.id); }}>삭제</div>
                                        </div>
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Comment input */}
                        <div className="comment-input-row">
                          <input
                            type="text"
                            placeholder="댓글 작성..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleAddComment(post.id); } }}
                            onClick={(e) => e.stopPropagation()}
                            className="comment-input"
                          />
                          <button
                            className="comment-submit"
                            onClick={(e) => { e.stopPropagation(); handleAddComment(post.id); }}
                          >
                            ➤
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
