# 공지사항 수정/삭제 기능 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공지사항 페이지(Board.jsx)에 게시글/댓글 수정·삭제 UI를 추가하고, 백엔드 권한 검사를 보강한다.

**Architecture:** 기존 대시보드 위젯의 ⋮ 메뉴 패턴을 Board.jsx에 적용. Soft delete는 기존 `toggle-active` 엔드포인트 재사용. 댓글 변경은 전용 엔드포인트로 분리하여 권한 검사를 깔끔하게 처리. 권한 모델은 작성자 본인 + 관리자(`관리자`/`방장` 역할 또는 `isAdmin=true`).

**Tech Stack:** React 19, Express 4, Prisma 6 + PostgreSQL, Socket.IO 4

**Spec:** `docs/superpowers/specs/2026-04-28-post-edit-delete-design.md`

**검증 도구:**
- Frontend 빌드: `npx vite build`
- Backend 검증: 서버 재시작 후 curl로 엔드포인트 호출
- 프로젝트에 자동 테스트 인프라 없음 → 매 태스크 종료 시 빌드 + 수동 검증

---

## 파일 구조 (변경 대상)

**백엔드:**
- 수정: `server/middleware/auth.js` — `canManagePost` / `canManageComment` 헬퍼 추가
- 수정: `server/routes/posts.js` — 권한 검사 추가, 댓글 전용 엔드포인트 신설

**프론트엔드:**
- 수정: `src/services/api.js` — `softDeletePost`, `updateComment`, `deleteComment`, `toggleCommentLike` 추가, `deletePost`에 auth 헤더 보강
- 수정: `src/utils/index.js` — `canManagePost`, `canManageComment` 헬퍼 추가
- 수정: `src/pages/Board.jsx` — ⋮ 메뉴 UI, 인라인 편집 폼, 핸들러
- 수정: `src/components/dashboard/DashboardBoard.jsx` — 댓글 핸들러를 신규 엔드포인트로 마이그레이션

---

## Task 1: 백엔드 권한 헬퍼 추가

**Files:**
- Modify: `server/middleware/auth.js`

- [ ] **Step 1.1: 권한 헬퍼 함수 추가**

`server/middleware/auth.js`의 끝부분(`module.exports` 직전)에 다음 함수들을 추가한다:

```javascript
// 게시글 관리 권한: 작성자 본인 + 관리자(관리자/방장 역할) + isAdmin=true
function canManagePost(member, post) {
  if (!member || !post) return false;
  if (member.id === post.authorId) return true;
  if (member.isAdmin) return true;
  return isAdmin(member); // role 기반 (관리자/방장)
}

// 댓글 관리 권한: 댓글 작성자 본인 + 관리자
// 기존 댓글(authorId 없음)은 관리자만 관리 가능
function canManageComment(member, comment) {
  if (!member || !comment) return false;
  if (comment.authorId && member.id === comment.authorId) return true;
  if (member.isAdmin) return true;
  return isAdmin(member);
}
```

`module.exports`도 업데이트:

```javascript
module.exports = { requireAuth, requireAuthOrGuest, requireOperator, requireAdmin, canManagePost, canManageComment };
```

- [ ] **Step 1.2: 빌드 확인**

Run: `cd /Users/peter/Projects/golf-club-app/3355 && npx vite build 2>&1 | tail -20`
Expected: 빌드 성공 (서버 코드는 vite 대상이 아니지만, syntax 오류 시 import 통해 영향 가능 — 안전 확인용).

서버 syntax 직접 확인:
Run: `node -c server/middleware/auth.js`
Expected: 출력 없음 (syntax OK).

- [ ] **Step 1.3: 커밋**

```bash
git add server/middleware/auth.js
git commit -m "feat(auth): canManagePost/canManageComment 권한 헬퍼 추가"
```

---

## Task 2: 백엔드 게시글 라우트 권한 보강

**Files:**
- Modify: `server/routes/posts.js`

- [ ] **Step 2.1: import 추가**

`server/routes/posts.js` 상단의 require 문을 다음과 같이 수정:

```javascript
const { requireAuth, canManagePost, canManageComment } = require('../middleware/auth');
```

- [ ] **Step 2.2: PUT /:id 라우트 — 권한 검사 + 화이트리스트 필드만 업데이트**

`server/routes/posts.js`의 `router.put("/:id", requireAuth, ...)` 핸들러 전체를 다음으로 교체:

```javascript
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!canManagePost(req.member, post)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    // 변경 가능 필드만 추출 (comments, authorId, id, createdAt 등은 제거)
    const allowed = ['title', 'content', 'isFeatured', 'isActive'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data,
      include: { author: true },
    });

    req.io.emit("posts:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});
```

- [ ] **Step 2.3: DELETE /:id 라우트 — 권한 검사 추가 (hard delete 동작 유지)**

`router.delete("/:id", requireAuth, ...)` 핸들러 전체를 다음으로 교체:

```javascript
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!canManagePost(req.member, post)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    await prisma.post.delete({ where: { id: req.params.id } });
    req.io.emit("posts:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});
```

- [ ] **Step 2.4: PATCH /:id/toggle-active — 권한 검사 추가**

`router.patch("/:id/toggle-active", requireAuth, ...)` 핸들러 시작 부분에 권한 검사를 추가. 핸들러 전체를 다음으로 교체:

```javascript
router.patch("/:id/toggle-active", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (!canManagePost(req.member, post)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }
    const updatedPost = await prisma.post.update({
      where: { id: req.params.id },
      data: { isActive: !post.isActive },
      include: { author: true },
    });
    req.io.emit("posts:updated");
    res.json(updatedPost);
  } catch (error) {
    console.error("Error toggling post active status:", error);
    res.status(500).json({ error: "Failed to toggle post status" });
  }
});
```

- [ ] **Step 2.5: PATCH /:id/toggle-featured — 권한 검사 추가**

같은 패턴으로 `toggle-featured` 핸들러에도 권한 검사 추가. 핸들러 전체를 다음으로 교체:

```javascript
router.patch("/:id/toggle-featured", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!canManagePost(req.member, post)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    if (post.isFeatured) {
      const updated = await prisma.post.update({
        where: { id: req.params.id },
        data: { isFeatured: false },
        include: { author: true },
      });
      req.io.emit("posts:updated");
      return res.json(updated);
    } else {
      await prisma.post.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } });
      const updated = await prisma.post.update({
        where: { id: req.params.id },
        data: { isFeatured: true },
        include: { author: true },
      });
      req.io.emit("posts:updated");
      return res.json(updated);
    }
  } catch (error) {
    console.error("Error toggling post featured status:", error);
    res.status(500).json({ error: "Failed to toggle featured status" });
  }
});
```

- [ ] **Step 2.6: 서버 syntax 확인**

Run: `node -c server/routes/posts.js`
Expected: 출력 없음.

- [ ] **Step 2.7: 커밋**

```bash
git add server/routes/posts.js
git commit -m "feat(posts): PUT/DELETE/toggle 라우트에 canManagePost 권한 검사 추가

- PUT은 화이트리스트 필드(title/content/isFeatured/isActive)만 업데이트
- comments 필드는 거부 — 댓글 변경은 신규 전용 엔드포인트로 분리 예정"
```

---

## Task 3: 백엔드 댓글 전용 엔드포인트 추가

**Files:**
- Modify: `server/routes/posts.js`

- [ ] **Step 3.1: 댓글 수정 엔드포인트 추가**

`server/routes/posts.js`의 `module.exports = router;` 직전에 다음 라우트들을 추가:

```javascript
// 댓글 수정: 댓글 작성자 본인 + 관리자
router.patch("/:id/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: "content가 비어있습니다." });
    }

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const idx = comments.findIndex(c => String(c.id) === String(req.params.commentId));
    if (idx === -1) return res.status(404).json({ error: "Comment not found" });

    if (!canManageComment(req.member, comments[idx])) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    const updatedComments = [...comments];
    updatedComments[idx] = { ...comments[idx], content };

    await prisma.post.update({
      where: { id: req.params.id },
      data: { comments: updatedComments },
    });

    req.io.emit("posts:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});
```

- [ ] **Step 3.2: 댓글 삭제 엔드포인트 추가**

위 라우트 바로 아래에 추가:

```javascript
// 댓글 삭제 (hard): 댓글 작성자 본인 + 관리자
router.delete("/:id/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const target = comments.find(c => String(c.id) === String(req.params.commentId));
    if (!target) return res.status(404).json({ error: "Comment not found" });

    if (!canManageComment(req.member, target)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    const updatedComments = comments.filter(c => String(c.id) !== String(req.params.commentId));

    await prisma.post.update({
      where: { id: req.params.id },
      data: { comments: updatedComments },
    });

    req.io.emit("posts:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});
```

- [ ] **Step 3.3: 댓글 좋아요 토글 엔드포인트 추가**

기존 대시보드 위젯이 PUT으로 comments 통째로 보내며 좋아요를 갱신하는 방식이었음. PUT이 comments 필드를 거부하므로 전용 엔드포인트 필요. 위 두 라우트 아래에 추가:

```javascript
// 댓글 좋아요 토글: 로그인한 회원이면 누구나 (권한 검사 불필요)
router.patch("/:id/comments/:commentId/like", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const idx = comments.findIndex(c => String(c.id) === String(req.params.commentId));
    if (idx === -1) return res.status(404).json({ error: "Comment not found" });

    const memberId = req.member.id;
    const likes = Array.isArray(comments[idx].likes) ? comments[idx].likes : [];
    const hasLiked = likes.includes(memberId);
    const updatedLikes = hasLiked ? likes.filter(id => id !== memberId) : [...likes, memberId];

    const updatedComments = [...comments];
    updatedComments[idx] = { ...comments[idx], likes: updatedLikes };

    await prisma.post.update({
      where: { id: req.params.id },
      data: { comments: updatedComments },
    });

    req.io.emit("posts:updated");
    res.json({ success: true, liked: !hasLiked });
  } catch (error) {
    console.error("Error toggling comment like:", error);
    res.status(500).json({ error: "Failed to toggle comment like" });
  }
});
```

- [ ] **Step 3.4: syntax 확인**

Run: `node -c server/routes/posts.js`
Expected: 출력 없음.

- [ ] **Step 3.5: 서버 재시작 후 수동 curl 검증**

서버를 띄운 상태(이미 실행 중이라면 자동 재시작)에서 curl로 다음 시나리오 확인:

1. 인증 없이 호출 시 401:
```bash
curl -i -X PATCH http://localhost:3000/api/posts/SOMEID/comments/SOMECID \
  -H "Content-Type: application/json" -d '{"content":"x"}'
```
Expected: `HTTP/1.1 401 Unauthorized`

2. 존재하지 않는 post id로 호출 시 404 (X-Member-Id는 실제 회원 ID로 교체):
```bash
curl -i -X PATCH http://localhost:3000/api/posts/nonexistent/comments/SOMECID \
  -H "Content-Type: application/json" -H "X-Member-Id: <실제 회원 ID>" \
  -d '{"content":"x"}'
```
Expected: `HTTP/1.1 404` with `Post not found`

> 실제 글/댓글 ID로 권한 검사 케이스는 프론트 작업 후 통합 테스트에서 확인.

- [ ] **Step 3.6: 커밋**

```bash
git add server/routes/posts.js
git commit -m "feat(posts): 댓글 수정/삭제/좋아요 전용 엔드포인트 추가

- PATCH /:id/comments/:commentId — 댓글 작성자 또는 관리자만 수정
- DELETE /:id/comments/:commentId — 동일 권한, hard delete
- PATCH /:id/comments/:commentId/like — 좋아요 토글
- 모두 posts:updated 소켓 이벤트 emit"
```

---

## Task 4: 프론트엔드 API 서비스 메서드 추가

**Files:**
- Modify: `src/services/api.js`

- [ ] **Step 4.1: deletePost에 auth 헤더 추가 (기존 버그 수정)**

`src/services/api.js`의 `async deletePost(id)` 메서드를 다음으로 교체:

```javascript
  async deletePost(id) {
    const response = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete post');
    this.invalidateCache('posts');
    return response.json();
  }
```

> 이유: 기존 코드에 auth 헤더가 누락되어 있었음. 백엔드에 권한 검사가 추가되면서 헤더 없이는 401 응답을 받게 됨.

- [ ] **Step 4.2: softDeletePost / 댓글 메서드 추가**

`toggleFeaturedPost` 메서드 바로 아래에 다음 메서드들을 추가:

```javascript
  async softDeletePost(id) {
    const response = await fetch(`${API_BASE}/posts/${id}/toggle-active`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to soft-delete post');
    this.invalidateCache('posts');
    return response.json();
  }

  async updateComment(postId, commentId, content) {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to update comment');
    this.invalidateCache('posts');
    return response.json();
  }

  async deleteComment(postId, commentId) {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete comment');
    this.invalidateCache('posts');
    return response.json();
  }

  async toggleCommentLike(postId, commentId) {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments/${commentId}/like`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to toggle comment like');
    this.invalidateCache('posts');
    return response.json();
  }
```

- [ ] **Step 4.3: 빌드 확인**

Run: `cd /Users/peter/Projects/golf-club-app/3355 && npx vite build 2>&1 | tail -10`
Expected: `built in ...ms` 메시지 (빌드 성공).

- [ ] **Step 4.4: 커밋**

```bash
git add src/services/api.js
git commit -m "feat(api): softDeletePost + 댓글 수정/삭제/좋아요 메서드 추가

- deletePost에 auth 헤더 누락 수정
- softDeletePost: PATCH /toggle-active 호출
- updateComment / deleteComment / toggleCommentLike: 신규 댓글 엔드포인트 호출"
```

---

## Task 5: 프론트엔드 권한 헬퍼 추가

**Files:**
- Modify: `src/utils/index.js`

- [ ] **Step 5.1: 헬퍼 함수 추가**

`src/utils/index.js`의 끝부분에 다음 함수들을 추가 (기존 `checkIsOperator` 근처):

```javascript
// 게시글 관리 권한: 작성자 본인 + 관리자(관리자/방장 역할 또는 isAdmin=true)
export function canManagePost(user, post) {
  if (!user || !post) return false;
  if (post.authorId && user.id === post.authorId) return true;
  if (user.isAdmin) return true;
  return ['관리자', '방장'].includes(user.role);
}

// 댓글 관리 권한: 댓글 작성자 본인 + 관리자
// authorId가 없는 기존 댓글은 관리자만 관리 가능
export function canManageComment(user, comment) {
  if (!user || !comment) return false;
  if (comment.authorId && user.id === comment.authorId) return true;
  if (user.isAdmin) return true;
  return ['관리자', '방장'].includes(user.role);
}
```

> `checkIsOperator`는 이미 export 되어 있으므로 동일한 export 스타일 따름.

- [ ] **Step 5.2: 빌드 확인**

Run: `cd /Users/peter/Projects/golf-club-app/3355 && npx vite build 2>&1 | tail -10`
Expected: 빌드 성공.

- [ ] **Step 5.3: 커밋**

```bash
git add src/utils/index.js
git commit -m "feat(utils): canManagePost/canManageComment 권한 헬퍼 추가"
```

---

## Task 6: 새 댓글에 authorId 추가

**Files:**
- Modify: `src/pages/Board.jsx` (line ~51-62)
- Modify: `src/components/dashboard/DashboardBoard.jsx` (해당 핸들러 위치)

- [ ] **Step 6.1: Board.jsx의 handleAddComment 수정**

`src/pages/Board.jsx`의 `handleAddComment` 함수를 다음으로 교체:

```javascript
  const handleAddComment = (postId) => {
    if (!newComment.trim()) return;
    const post = posts.find(p => p.id === postId);
    const updatedComments = [...(post.comments || []), {
      id: Date.now(),
      content: newComment,
      authorId: user.id,
      author: user.name,
      date: new Date().toLocaleDateString('ko-KR')
    }];
    updatePost(postId, { comments: updatedComments });
    setNewComment('');
  };
```

> **주의:** 이 시점에서 `updatePost`는 아직 PUT으로 `comments`를 보내고 있다. 백엔드 PUT은 이미 comments 필드를 무시하도록 변경됐으므로(Task 2), **이 코드는 일시적으로 작동하지 않는다**. Task 8에서 댓글 추가도 신규 엔드포인트로 마이그레이션하면 정상화됨. 일단 authorId 필드만 추가해둔다.

> 만약 댓글 작성 기능이 깨진 채 배포되는 게 우려되면, Task 6→Task 8 순서를 바꾸지 말고 둘을 한 번에 묶어 작업해도 무방. 다만 본 계획서는 단계별 검증을 위해 분리.

- [ ] **Step 6.2: DashboardBoard.jsx의 handleAddComment 확인**

`src/components/dashboard/DashboardBoard.jsx`에서 댓글 추가 핸들러를 찾아 동일하게 `authorId: user.id`를 추가. (정확한 라인은 코드 inspection 필요 — 보통 `handleAddComment` 또는 `handleSubmitComment` 같은 이름.)

찾는 패턴:
```javascript
{
  id: Date.now(),
  content: ...,
  author: user.name,
  ...
}
```

이 객체 리터럴에 `authorId: user.id` 추가.

- [ ] **Step 6.3: 빌드 확인**

Run: `cd /Users/peter/Projects/golf-club-app/3355 && npx vite build 2>&1 | tail -10`
Expected: 빌드 성공.

- [ ] **Step 6.4: 커밋**

```bash
git add src/pages/Board.jsx src/components/dashboard/DashboardBoard.jsx
git commit -m "feat(comments): 새 댓글에 authorId 필드 저장

향후 댓글 작성자 식별 및 권한 검사용. 기존 댓글은 호환성을 위해 author 이름 유지."
```

---

## Task 7: Board.jsx에 게시글 ⋮ 메뉴 + 인라인 편집 폼

**Files:**
- Modify: `src/pages/Board.jsx`

- [ ] **Step 7.1: 아이콘 컴포넌트 + 권한 import 추가**

`src/pages/Board.jsx` 상단의 import 문 수정:

```javascript
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIsOperator, canManagePost, canManageComment } from '../utils';
import apiService from '../services/api';
import PageHeader from '../components/common/PageHeader';
```

기존 SVG 아이콘 정의 영역(`ChevronDown` 정의 바로 아래)에 점 세 개 아이콘 추가:

```javascript
const KebabIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);
```

- [ ] **Step 7.2: 새로운 상태 변수 추가**

`Board()` 함수 내부, 기존 `useState` 호출들 아래에 다음을 추가:

```javascript
  const [openMenuId, setOpenMenuId] = useState(null); // 'post:<id>' | 'comment:<postId>:<cid>'
  const [editingPost, setEditingPost] = useState(null); // {id, title, content} | null
  const [editingComment, setEditingComment] = useState(null); // {postId, commentId, content} | null
```

- [ ] **Step 7.3: 외부 클릭 시 메뉴 닫기 useEffect 추가**

`useState` 블록 바로 아래에 추가:

```javascript
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);
```

- [ ] **Step 7.4: 게시글 수정/삭제 핸들러 추가**

`handleToggleFeatured` 함수 아래에 다음 핸들러들을 추가:

```javascript
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
```

- [ ] **Step 7.5: 게시글 헤더에 ⋮ 버튼 + 드롭다운 추가**

`src/pages/Board.jsx`에서 게시글 헤더의 chevron 영역(현재 `<ChevronDown open={isExpanded} />`이 들어있는 div)을 다음으로 교체:

```javascript
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 2, position: 'relative' }}>
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
                                style={{ padding: '10px 14px', fontSize: 14, cursor: 'pointer', color: 'var(--danger, #dc2626)', borderTop: '1px solid #f1f5f9' }}
                              >
                                삭제
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <ChevronDown open={isExpanded} />
                    </div>
```

> 변경 부분: `<ChevronDown />`만 들어있던 영역에 ⋮ 버튼과 드롭다운을 추가. `position: relative`를 부모 div에 부여하여 드롭다운이 우측 정렬되도록 함.

- [ ] **Step 7.6: 인라인 편집 폼 렌더링**

게시글 카드 렌더링 부분에서, 현재 편집 중인 게시글이면 카드 대신 편집 폼을 표시. `activePosts.map((post) => { ... })` 내부 return의 시작 부분(첫 줄 `<div key={post.id} ...>` 직전)에 다음 분기 추가:

```javascript
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
```

이 분기는 기존 `<div key={post.id} ...>` 카드 렌더링 직전에 위치해야 함.

- [ ] **Step 7.7: 빌드 확인**

Run: `cd /Users/peter/Projects/golf-club-app/3355 && npx vite build 2>&1 | tail -10`
Expected: 빌드 성공.

- [ ] **Step 7.8: 브라우저 수동 검증**

서버 실행 후 (`npm run dev`):
1. 사장님 계정으로 로그인 → 공지사항 페이지 → 글마다 ⋮ 보이는지
2. ⋮ 클릭 → "수정 / 삭제" 드롭다운 노출
3. "수정" → 폼 노출 → 저장 → 글 갱신, 다른 디바이스에서도 자동 갱신
4. "삭제" → confirm → 글 사라짐 → DB에 `isActive=false` 인지 (Prisma Studio로 확인 가능)
5. 일반 회원 계정 → ⋮ 안 보이는지

- [ ] **Step 7.9: 커밋**

```bash
git add src/pages/Board.jsx
git commit -m "feat(board): 공지사항 게시글 ⋮ 메뉴 + 인라인 수정/소프트 삭제 추가

- canManagePost 검사로 본인+관리자에게만 ⋮ 노출
- 수정: 인라인 폼 (제목/내용)
- 삭제: confirm 후 PATCH toggle-active로 isActive=false"
```

---

## Task 8: Board.jsx에 댓글 ⋮ 메뉴 + 신규 엔드포인트 사용

**Files:**
- Modify: `src/pages/Board.jsx`

- [ ] **Step 8.1: 댓글 핸들러 추가**

`Board()` 함수 내부의 `handleDeletePost` 함수 아래에 다음을 추가:

```javascript
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
```

- [ ] **Step 8.2: 댓글 추가 핸들러 마이그레이션 (PUT comments → 신규 endpoint 없음 → 임시 처리)**

현재 `handleAddComment`는 PUT updatePost로 comments 배열 통째 업데이트. PUT이 comments를 거부하므로 작동 불가.

해결: 댓글 추가용 신규 엔드포인트를 백엔드에 추가하거나, 이번 범위 한도에서 임시 우회로 PUT 보강 — `comments` 배열 통째 보내기는 권한 검사를 우회하므로 NG.

**결론:** 백엔드에 댓글 추가 엔드포인트 `POST /api/posts/:id/comments`를 추가한다. (Task 3에서 빠진 케이스 — 본 단계에서 보강.)

먼저 `server/routes/posts.js`의 `module.exports = router;` 직전에 추가:

```javascript
// 댓글 추가: 로그인한 회원이면 누구나
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: "content가 비어있습니다." });
    }

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const newComment = {
      id: Date.now(),
      content: content.trim(),
      authorId: req.member.id,
      author: req.member.name || '회원',
      date: new Date().toLocaleDateString('ko-KR'),
      likes: [],
    };

    await prisma.post.update({
      where: { id: req.params.id },
      data: { comments: [...comments, newComment] },
    });

    req.io.emit("posts:updated");
    res.json({ success: true, comment: newComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});
```

> **주의:** `req.member`에서 `name`이 select 되지 않을 수 있음. `requireAuth` 미들웨어의 select 절을 확인하여 `name`이 빠져있으면 추가하거나, `name`을 별도 fetch한다. `server/middleware/auth.js` 라인 15: `select: { id: true, isAdmin: true, role: true, isActive: true, approvalStatus: true }` — `name` 누락. 수정 필요:

`server/middleware/auth.js`의 `requireAuth` 함수 내 `select` 객체에 `name: true,` 추가:

```javascript
      select: { id: true, name: true, isAdmin: true, role: true, isActive: true, approvalStatus: true },
```

`requireAuthOrGuest`도 동일하게 수정.

- [ ] **Step 8.3: api.js에 addComment 추가**

`src/services/api.js`의 `softDeletePost` 메서드 위 또는 아래에 다음 추가:

```javascript
  async addComment(postId, content) {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to add comment');
    this.invalidateCache('posts');
    return response.json();
  }
```

- [ ] **Step 8.4: Board.jsx의 handleAddComment 마이그레이션**

`src/pages/Board.jsx`의 `handleAddComment` 함수를 다음으로 교체:

```javascript
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
```

`updatePost`는 더 이상 사용 안 함 — 임포트는 그대로 두되 (수정에 사용), 댓글 라인은 제거.

- [ ] **Step 8.5: 댓글 영역 UI에 ⋮ 메뉴 + 편집 폼 추가**

`src/pages/Board.jsx`의 댓글 렌더링 부분(현재 `(post.comments || []).map((comment, idx) => ...)`)을 다음으로 교체:

```javascript
                    {/* 댓글 목록 */}
                    {(post.comments || []).length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        {(post.comments || []).map((comment, idx) => {
                          const cKey = `comment:${post.id}:${comment.id}`;
                          const isEditingThis = editingComment && editingComment.postId === post.id && editingComment.commentId === comment.id;

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
                              marginBottom: 8, borderLeft: '3px solid var(--primary)', position: 'relative',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, color: 'var(--on-background)', lineHeight: 1.6, marginBottom: 5 }}>
                                    {comment.content}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>{typeof comment.author === 'string' ? comment.author : comment.author?.name || '알 수 없음'}</span>
                                    <span>{comment.date || new Date(comment.createdAt).toLocaleDateString('ko-KR')}</span>
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
                                          style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--danger, #dc2626)', borderTop: '1px solid #f1f5f9' }}
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
```

- [ ] **Step 8.6: 빌드 확인**

Run: `cd /Users/peter/Projects/golf-club-app/3355 && npx vite build 2>&1 | tail -10`
Expected: 빌드 성공.

- [ ] **Step 8.7: 서버 syntax 확인**

Run: `node -c server/routes/posts.js && node -c server/middleware/auth.js`
Expected: 출력 없음.

- [ ] **Step 8.8: 브라우저 수동 검증**

`npm run dev` 실행 후:
1. 새 댓글 작성 → DB(Prisma Studio)에서 `authorId` 들어있는지 확인
2. 본인 댓글에 ⋮ 보이는지, 다른 사람 댓글엔 안 보이는지
3. 사장님 계정 → 모든 댓글에 ⋮ 보이는지 (기존 authorId 없는 댓글 포함)
4. 댓글 수정 → 폼 → 저장 → 갱신
5. 댓글 삭제 → confirm → 사라짐
6. 다른 디바이스에서 실시간 반영 확인

- [ ] **Step 8.9: 커밋**

```bash
git add server/routes/posts.js server/middleware/auth.js src/services/api.js src/pages/Board.jsx
git commit -m "feat(comments): 공지사항 댓글 ⋮ 메뉴 + 추가/수정/삭제 신규 엔드포인트

- POST /:id/comments — 신규 (로그인 회원이면 누구나)
- requireAuth select에 name 필드 추가
- Board.jsx의 handleAddComment를 신규 엔드포인트로 마이그레이션
- canManageComment로 ⋮ 노출 여부 결정 + 인라인 댓글 편집 폼"
```

---

## Task 9: DashboardBoard.jsx 댓글 핸들러 마이그레이션

**Files:**
- Modify: `src/components/dashboard/DashboardBoard.jsx`

- [ ] **Step 9.1: 핸들러 마이그레이션**

`src/components/dashboard/DashboardBoard.jsx`의 `handleUpdateComment`, `handleDeleteComment`, `handleToggleCommentLike` 함수를 다음으로 교체:

```javascript
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

  const handleToggleCommentLike = async (postId, commentId) => {
    try {
      await apiService.toggleCommentLike(postId, commentId);
      await refreshAllData();
    } catch { alert('좋아요 처리에 실패했습니다.'); }
  };
```

> 만약 `apiService` import가 없다면 import 추가:
> ```javascript
> import apiService from '../../services/api';
> ```
> (정확한 경로는 파일 위치 기준으로 확인.)

- [ ] **Step 9.2: handleAddComment도 마이그레이션 (있으면)**

`DashboardBoard.jsx`의 댓글 추가 핸들러도 신규 `apiService.addComment(postId, content)` 사용으로 교체. 코드 inspection으로 정확한 함수명/위치 확인 후 동일 패턴 적용.

예시 (실제 코드는 inspection 후 결정):

```javascript
  const handleAddComment = async (postId) => {
    if (!newComment.trim()) return;
    try {
      await apiService.addComment(postId, newComment);
      await refreshAllData();
      setNewComment('');
    } catch { alert('댓글 추가에 실패했습니다.'); }
  };
```

- [ ] **Step 9.3: 빌드 확인**

Run: `cd /Users/peter/Projects/golf-club-app/3355 && npx vite build 2>&1 | tail -10`
Expected: 빌드 성공.

- [ ] **Step 9.4: 브라우저 수동 검증 (회귀 확인)**

`npm run dev` 후 대시보드 위젯에서:
1. 댓글 작성 → 정상 등록
2. 댓글 좋아요 → 카운트 변경
3. 본인 댓글 수정 → 정상 갱신
4. 본인 댓글 삭제 → 정상 사라짐
5. 다른 사람 댓글에 메뉴 안 보이는지

- [ ] **Step 9.5: 커밋**

```bash
git add src/components/dashboard/DashboardBoard.jsx
git commit -m "refactor(dashboard): 댓글 핸들러를 신규 댓글 엔드포인트로 마이그레이션

PUT comments 통째 보내기 패턴 → 댓글 전용 엔드포인트 사용.
백엔드 PUT이 comments 필드를 무시하면서 깨진 동작을 복구."
```

---

## Task 10: 통합 수동 테스트 + Plan.md 업데이트 + 푸시

- [ ] **Step 10.1: 전체 시나리오 테스트**

`npm run dev` 후 다음 시나리오 모두 확인:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 일반 회원 로그인 → 공지사항 페이지 | 글마다 ⋮ 안 보임 (작성 권한도 없음) |
| 2 | 본인이 쓴 댓글 → ⋮ 보임 | 수정/삭제 메뉴 작동 |
| 3 | 다른 사람 댓글 → ⋮ 안 보임 | 메뉴 자체 노출 안 됨 |
| 4 | 사장님(관리자) 로그인 | 모든 글/모든 댓글에 ⋮ 보임 |
| 5 | 글 수정 → 저장 | 즉시 반영, 다른 디바이스에서도 자동 갱신 (Socket.IO) |
| 6 | 글 삭제 → 확인 | 화면에서 사라짐, Prisma Studio에서 `isActive=false` 확인 |
| 7 | 댓글 추가 | DB에 `authorId` 들어있음 |
| 8 | 댓글 수정/삭제 | 정상 작동, 실시간 갱신 |
| 9 | 대시보드 위젯에서 댓글 작성/수정/삭제/좋아요 | 모두 정상 (회귀 없음) |
| 10 | 일반 회원 토큰으로 직접 PUT 호출 (curl) | 403 Forbidden |

- [ ] **Step 10.2: Plan.md 업데이트 (CLAUDE.md 규칙)**

`PLAN.md`의 적절한 섹션에 다음 항목 추가:

```markdown
- [x] (2026-04-28) 공지사항 게시글/댓글 수정·삭제 기능 추가
  - Board.jsx에 ⋮ 메뉴 + 인라인 편집 폼
  - 백엔드 권한 검사(canManagePost/canManageComment) 추가
  - 댓글 전용 엔드포인트(POST/PATCH/DELETE/like) 신설
  - DashboardBoard.jsx 댓글 핸들러 신규 엔드포인트로 마이그레이션
  - Soft delete (isActive=false), 댓글 hard delete
  - 설계서: docs/superpowers/specs/2026-04-28-post-edit-delete-design.md
  - 구현 계획: docs/superpowers/plans/2026-04-28-post-edit-delete.md
```

- [ ] **Step 10.3: 사장님께 텔레그램 보고**

기능 동작 확인 완료 메시지를 사장님께 전송. 새 기능 사용법 1-2문장 설명 포함.

- [ ] **Step 10.4: 푸시**

```bash
git add PLAN.md
git commit -m "docs(plan): 공지사항 수정/삭제 기능 완료 표시"
git push origin main
```

→ Railway 자동 배포 시작.

- [ ] **Step 10.5: Railway 배포 후 프로덕션 확인**

배포 완료(약 2-3분) 후 PWA에서 동일 시나리오 재확인. 특히:
- 사장님 계정에서 ⋮ 보이는지
- 새 글 작성 → 수정 → 삭제 흐름이 PWA에서도 정상인지
- iOS/Android 양쪽 PWA에서 모두 동작하는지

---

## 완료 기준

- 모든 Task의 빌드 및 syntax 검증 통과
- 위 통합 시나리오 10개 모두 통과
- 사장님 PWA에서 실제 사용 확인
- PLAN.md 갱신 + 푸시 완료
