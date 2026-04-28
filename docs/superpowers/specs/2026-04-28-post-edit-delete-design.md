# 공지사항 수정/삭제 기능 설계서

**작성일:** 2026-04-28
**대상:** Board.jsx (공지사항 페이지) 및 백엔드 posts 라우트

## 1. 배경

현재 공지사항 페이지(`src/pages/Board.jsx`)는 게시글 작성과 댓글 작성만 가능하며, **수정/삭제 기능이 없다**. 회원이 오타나 잘못된 정보를 입력해도 본인이 고치거나 지울 수 없는 상태.

대시보드 위젯(`src/components/dashboard/DashboardBoard.jsx`)에는 점 세 개(⋮) 메뉴를 통한 수정/삭제 UI가 이미 구현되어 있어, 동일한 패턴을 공지사항 페이지에도 적용한다.

또한 백엔드(`server/routes/posts.js`)는 `PUT`/`DELETE` 엔드포인트가 존재하지만 **권한 검사가 없어**, 인증된 사용자라면 누구든 남의 글을 수정/삭제할 수 있는 보안 구멍이 있다. 이를 함께 보완한다.

## 2. 요구사항 요약 (사장님 승인 사항)

| 항목 | 결정 |
|------|------|
| 수정/삭제 권한 | 작성자 본인 + 관리자(`관리자` 또는 `방장` 역할) |
| 적용 범위 | 게시글 + 댓글 둘 다 |
| 삭제 방식 | Soft Delete (`isActive=false`로 숨김, DB엔 보존) |
| 수정됨 표시 | 표시 안 함 |

## 3. 사용자 흐름 (UX)

### 3.1 게시글 수정/삭제

1. 회원이 공지사항 페이지를 연다.
2. 본인이 작성한 글 또는 사장님(관리자) 권한이 있는 경우, 글 헤더 우측에 점 세 개(⋮) 버튼이 보인다. 그 외 회원에겐 보이지 않는다.
3. ⋮ 클릭 → 작은 드롭다운 메뉴: `[수정 / 삭제]`
4. **수정** 선택 시:
   - 글 카드 자리에 인라인 폼이 펼쳐진다 (제목 입력, 내용 textarea, "저장"/"취소" 버튼)
   - 저장 → API 호출 → 성공 시 폼 닫고 글 카드로 복귀, 갱신된 내용 표시
5. **삭제** 선택 시:
   - `confirm("이 게시글을 삭제하시겠습니까?")` 확인
   - 확인 시 API 호출 → DB의 `isActive`가 `false`로 전환 → 목록에서 사라짐
   - 거절 시 아무 일 없음

### 3.2 댓글 수정/삭제

1. 펼쳐진 게시글의 댓글 영역에서, 본인이 작성한 댓글 또는 관리자인 경우 댓글 우측에 ⋮ 버튼이 보인다.
2. ⋮ 클릭 → `[수정 / 삭제]`
3. **수정**: 댓글 텍스트가 입력란으로 변환 → 수정 후 저장 → 갱신
4. **삭제**: `confirm("이 댓글을 삭제하시겠습니까?")` → 확인 시 댓글 사라짐

## 4. 권한 모델

### 4.1 게시글
```
canManagePost(user, post) =
  user.id === post.authorId
  OR user.role IN ['관리자', '방장']
  OR user.isAdmin === true
```

### 4.2 댓글
```
canManageComment(user, comment) =
  (comment.authorId 존재 AND user.id === comment.authorId)
  OR user.role IN ['관리자', '방장']
  OR user.isAdmin === true
```

**중요 — 기존 댓글 처리:** 현재 댓글에는 `authorId` 필드가 없고 `author`(이름 문자열)만 저장된다. 따라서 기존 댓글은 본인 식별 불가 → **관리자(`관리자`/`방장`)만 수정/삭제 가능**. 새로 작성되는 댓글부터 `authorId`가 함께 저장되어 작성자 본인도 수정/삭제 가능.

## 5. 컴포넌트 설계

### 5.1 새로운 공통 함수

**`src/utils/index.js`** (또는 `src/utils/permissions.js` 신설):
- `canManagePost(user, post)` — 위 권한 모델 구현
- `canManageComment(user, comment)` — 위 권한 모델 구현

### 5.2 Board.jsx 변경 사항

**상태 추가:**
- `editingPostId`: 현재 인라인 편집 중인 게시글 ID
- `editPostDraft`: `{title, content}` 편집 중인 값
- `editingCommentKey`: 현재 편집 중인 댓글 식별자 (`postId:commentId` 조합)
- `editCommentDraft`: 편집 중인 댓글 텍스트
- `openMenuId`: 현재 열린 ⋮ 메뉴 식별자 (post:<id> 또는 comment:<postId>:<commentId>)

**핸들러 추가:**
- `handleEditPostStart(post)` — 편집 시작
- `handleEditPostSave()` — `apiService.updatePost(id, {title, content})`
- `handleEditPostCancel()`
- `handleDeletePost(postId)` — `confirm` 후 `apiService.softDeletePost(id)` 호출
- `handleEditCommentStart(postId, comment)`
- `handleEditCommentSave(postId, commentId)` — 새 댓글 API 호출 (6.3 참조)
- `handleDeleteComment(postId, commentId)` — 새 댓글 API 호출 (6.3 참조)
- `closeAllMenus()` — 외부 클릭 시 메뉴 닫기

**UI 요소:**
- 게시글 헤더에 ⋮ 버튼 (chevron 옆) — `canManagePost(user, post)` 시만 렌더
- 댓글 우측에 ⋮ 버튼 — `canManageComment(user, comment)` 시만 렌더
- 드롭다운 메뉴 (absolute 포지셔닝, z-index)

### 5.3 댓글 작성 시 authorId 추가

`handleAddComment`에서 새 댓글 객체에 `authorId: user.id` 추가:
```js
{
  id: Date.now(),
  content: newComment,
  authorId: user.id,        // 신규 추가
  author: user.name,         // 호환성 유지 (UI에서 fallback)
  date: new Date().toLocaleDateString('ko-KR')
}
```

## 6. 백엔드 설계

### 6.1 권한 검사 헬퍼 (`server/middleware/auth.js` 또는 `server/utils/roles.js`)

- `isAdminOrBangjang(user)` — `user.role === '관리자' || user.role === '방장' || user.isAdmin`
- `canManagePost(user, post)` — `user.id === post.authorId || isAdminOrBangjang(user)`
- `canManageComment(user, comment)` — `(comment.authorId && user.id === comment.authorId) || isAdminOrBangjang(user)`

### 6.2 라우트 변경 (`server/routes/posts.js`)

#### `PUT /api/posts/:id` — 게시글 수정
- 변경: 글 fetch → `canManagePost(req.user, post)` 검사 → 실패 시 `403`
- `req.body`에서 다음 필드는 **제거** 후 prisma update 호출:
  - `authorId`, `id`, `createdAt` — 변경 불가 필드 (방어적)
  - `comments` — 댓글 변경은 전용 엔드포인트로 처리하기 위함 (댓글별 권한 검사 우회 방지)
- 결과적으로 PUT은 `title`, `content`, `isFeatured`, `isActive` 같은 게시글 자체 필드만 갱신.

#### `PATCH /api/posts/:id/toggle-active` — Soft Delete (재사용)
- **공지사항 페이지의 "삭제" 액션은 이 기존 엔드포인트를 호출**하여 `isActive` 플래그를 `false`로 만든다 (재활성화도 동일 엔드포인트).
- **변경:** 기존 코드에 권한 검사 누락 → `canManagePost` 추가 → 실패 시 `403`
- 응답/이벤트: 기존 그대로 (`posts:updated` emit)

#### `DELETE /api/posts/:id` — Hard Delete (손대지 않음)
- 현재 `DashboardBoard.jsx`에서 "삭제" 버튼이 이 엔드포인트를 호출하여 **하드 삭제**를 수행하고 있음. 동작 유지.
- 다만 권한 누락 보안 구멍은 동일하므로 `canManagePost` 검사만 추가.

> **알려진 비일관성:** 대시보드 위젯의 "삭제"는 hard delete, 공지사항 페이지의 "삭제"는 soft delete가 된다. 같은 단어가 두 곳에서 다른 동작을 하는 문제는 향후 별도 작업으로 정리 권장 (대시보드 위젯에서 "삭제"를 제거하거나 soft delete로 통일). 이번 작업의 범위는 아님.

#### `PATCH /api/posts/:id/comments/:commentId` — 댓글 수정 (신규)
- 게시글 fetch → 댓글 배열에서 `commentId` 매치 항목 찾기
- `canManageComment(req.user, comment)` 검사 → 실패 시 `403`
- 댓글 항목의 `content` 갱신 → 게시글의 `comments` JSON 전체 업데이트
- `posts:updated` 이벤트 emit

#### `DELETE /api/posts/:id/comments/:commentId` — 댓글 삭제 (신규)
- 게시글 fetch → 댓글 배열에서 `commentId` 매치 항목 찾기
- `canManageComment` 검사
- 해당 댓글을 배열에서 제거 (Hard delete — JSON 항목이라 soft 의미 적음)
- 게시글의 `comments` JSON 전체 업데이트 + `posts:updated` emit

### 6.3 클라이언트 API 서비스 (`src/services/api.js`)

기존 메서드 (변경 없음):
- `updatePost(id, data)` — `PUT /api/posts/:id` 호출. 게시글 본문 수정용. 호출 시 `comments` 필드는 보내지 않도록 호출부 정리.
- `deletePost(id)` — `DELETE /api/posts/:id`. 대시보드 위젯의 hard delete용. Board.jsx에선 사용 안 함.

신규 메서드:
- `softDeletePost(id)` — `PATCH /api/posts/:id/toggle-active` 호출. Board.jsx "삭제" 버튼이 이걸 사용. (호출 시점에 현재 `isActive=true`인 항목에 대해서만 호출하므로 toggle 동작이 곧 비활성화가 됨.)
- `updateComment(postId, commentId, content)` — `PATCH /api/posts/:postId/comments/:commentId`
- `deleteComment(postId, commentId)` — `DELETE /api/posts/:postId/comments/:commentId`

### 6.4 DashboardBoard.jsx 영향 (필수 동반 변경)

대시보드 위젯의 댓글 수정/삭제는 현재 `updatePost`로 `comments` 배열을 통째로 보내는 방식이다. 6.2의 PUT 보강으로 인해 이 방식이 더 이상 작동하지 않으므로, **DashboardBoard.jsx의 댓글 핸들러도 신규 댓글 엔드포인트를 사용하도록 함께 수정**한다:
- `handleUpdateComment` → `apiService.updateComment(postId, commentId, content)`
- `handleDeleteComment` → `apiService.deleteComment(postId, commentId)`
- `handleToggleCommentLike` (좋아요) — 이건 댓글 데이터 변경이지만 권한과 무관. 별도 엔드포인트 필요. 이번 범위에선 **현재 동작 유지를 위해 PUT comments 통째 보내기 방식 잠정 유지** — 좋아요 핸들러에서 보내는 `comments` 배열은 `comment.likes` 필드만 변경된 케이스이므로, 백엔드 PUT이 comments를 무시하면 좋아요가 저장되지 않게 된다. 따라서 좋아요 전용 엔드포인트(`PATCH /api/posts/:postId/comments/:commentId/like`)를 함께 추가하여 깔끔하게 분리한다.

> **추가 작업 정당화:** 사장님이 요청하신 건 공지사항 페이지의 수정/삭제이지만, 백엔드 보안 패치(PUT의 comments 필드 무시)가 대시보드 위젯의 기존 댓글 동작을 깨뜨리므로 동반 수정이 필수. 그렇지 않으면 대시보드의 댓글 수정/삭제/좋아요가 모두 동작 중지됨. 이 부분은 추가 작업이 아니라 **회귀 방지에 필수**.

## 7. 실시간 동기화

기존 `posts:updated` Socket.IO 이벤트가 이미 모든 변경 시 emit되고 `PostContext`가 구독 중이므로, **추가 작업 없이** 다음 흐름이 자동으로 작동한다:

```
사용자 A 수정/삭제 클릭
  → API 호출
  → DB 업데이트
  → 서버: io.emit("posts:updated")
  → 모든 접속자(A 포함): PostContext 리스너 트리거
  → 300ms 디바운스 후 GET /api/posts
  → 화면 자동 갱신
```

## 8. 데이터 모델 영향

### 8.1 Prisma 스키마 변경
**없음.** 기존 `Post` 모델의 `isActive`, `comments` (JSON), `updatedAt` 필드 그대로 사용.

### 8.2 댓글 JSON 구조
- **추가 필드:** `authorId: string`
- **기존 댓글 호환:** `authorId` 없는 댓글은 작성자 식별 불가로 간주 → 관리자만 관리 가능

## 9. 보안 / 엣지케이스

| 케이스 | 처리 |
|--------|------|
| 로그인 안 한 사용자가 PUT/DELETE 호출 | `requireAuth`에서 401 |
| 다른 회원의 글을 수정하려는 호출 | 권한 검사에서 403 |
| 존재하지 않는 글 ID | 404 |
| 댓글 ID가 게시글의 댓글에 없음 | 404 |
| 동시 수정 (race condition) | 마지막 저장이 이김 — 공지사항 트래픽상 무시 가능 |
| 삭제된 글의 댓글 추가 시도 | UI에서 삭제된 글이 보이지 않으므로 사실상 발생 불가 |
| 본인이 본인 글 수정 중 다른 관리자가 동일 글 삭제 | 다음 저장 시 404 → "이미 삭제됨" 알림으로 처리 |

## 10. 비범위 (Out of Scope)

이번 작업에 포함하지 않는 것:
- 삭제된 글 복구 UI (관리자 페이지) — 향후 별도 요청 시 작업
- 수정 이력 표시 ("(수정됨)" 라벨) — 사용자 결정으로 제외
- 수정 횟수 제한, 시간 제한
- 댓글 정규화 (별도 테이블 마이그레이션) — JSON 유지

## 11. 테스트 시나리오 (수동)

1. 로그인 후 본인이 쓴 글에 ⋮ 보이는지
2. 다른 사람 글에 ⋮ 안 보이는지 (일반 회원)
3. 관리자(사장님) 계정에서 모든 글에 ⋮ 보이는지
4. 글 수정 → 저장 → 화면 갱신 → 다른 디바이스에서도 자동 갱신되는지
5. 글 삭제 → 확인 → 사라짐 → DB 확인 시 `isActive=false`인지
6. 댓글 수정/삭제 동일 흐름
7. 새 댓글 작성 → DB 확인 시 `authorId` 들어있는지
8. 기존(authorId 없는) 댓글 → 일반 회원 화면에서 ⋮ 안 보임, 관리자 화면에선 보임
9. 보안 테스트: 일반 회원 토큰으로 남의 글 PUT/DELETE 직접 호출 시 403 응답
