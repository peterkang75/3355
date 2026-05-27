# 소식 커뮤니티 피드 — 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 하단 네비 '소식' 탭에서 지난 라운딩 사진(자동 게시물)과 정회원 자유 사진글이 인스타식으로 섞여 노출되고, 반응(♡)·댓글로 소통하는 커뮤니티 피드를 만든다.

**Architecture:** 백엔드는 기존 모듈식 Express 라우트(`server/routes/*.js`) + Prisma 패턴을 따라 `feed.js` 라우트와 공용 `Reaction`/`Comment`/`FeedPost`/`FeedPostMedia` 테이블을 추가한다. 미디어는 기존 R2 파이프라인(`server/utils/r2.js`, `server/routes/media.js`)을 공용 헬퍼로 추출해 재사용한다. 프론트는 `/feed` 라우트와 `src/pages/Feed.jsx` + 하위 컴포넌트로 구성하고, 라운딩 게시물은 기존 `MediaGallery`를 재사용한다.

**Tech Stack:** React 19 + Vite, Express, Prisma, PostgreSQL, Socket.IO(`req.io.emit`), Cloudflare R2(서명 URL), multer.

**검증 방식 (이 저장소 규칙):** 단위테스트 프레임워크 없음. 각 Task는 **(1) `npx vite build` 빌드 통과 + (2) API는 `curl` HTTP 검증 + (3) UI는 `npm run dev` 후 브라우저 수동 확인**으로 검증한다. (CLAUDE.md: Step마다 빌드 확인)

**디자인 규칙:** Primary `#0047AB`, Pretendard, 모바일 퍼스트, 터치 최소 44px, 박스 섀도우 `0 2px 8px rgba(0,0,0,0.07)`, 컴팩트·위계 중시·이모티콘 절제.

---

## ⚠️ 환경 안전 규칙 (필수 — 운영 DB 보호)

**확인된 사실:** 로컬 `.env`의 `DATABASE_URL`은 **운영(Railway) DB**(`monorail.proxy.rlwy.net`)를 직결한다. `prisma/migrations`는 2개뿐이고 실제 운영 스키마는 그 뒤 `db push`로 반영돼 와서 **마이그레이션과 실제 DB가 드리프트** 상태다.

**절대 금지:**
- `npm run db:push`(= `prisma migrate dev`) 실행 금지 — 드리프트 감지 시 **DB 리셋(데이터 전손) 위험.**
- 운영 DB에 대한 `prisma migrate dev` / `migrate reset` 금지.
- 서브에이전트는 **운영 DB에 절대 접근 금지.** 모든 개발·테스트는 로컬 DB에서만.

**테스트 전략 (사장님 확정 2026-05-27):**
- 로컬 Postgres 16(:5432)에 **테스트 DB `golf3355_dev`** 를 만들어 거기서만 개발·테스트.
- 로컬 DB 지정은 **셸 환경변수 오버라이드**로 (`.env`는 운영용 그대로 둠): 모든 prisma/서버 명령 앞에
  `DATABASE_URL="$LOCAL_DB_URL"` 를 붙인다. (`LOCAL_DB_URL` 예: `postgresql://peter@localhost:5432/golf3355_dev`)
- 스키마 반영은 **`prisma db push`**(추가만, 비파괴)로. `migrate dev` 안 씀.
- **운영 DB는 마지막 배포 단계(Task 11)에서만** 새 테이블 4개를 `db push`로 추가(기존 테이블 컬럼 변경 0 → 기존 데이터 무손상). 이 한 번만 운영 접촉, 사장님 확인 후 실행.
- 최종 UI 확인: 로컬 테스트 DB로 `npm run dev`를 띄워 **사장님이 브라우저에서 직접 클릭 확인** 후 배포.

**테스트 한계 (정직):** 백엔드(피드·반응·댓글·자유글)는 로컬 DB + curl로 자동 검증. 단, (1) 브라우저 UI 클릭은 사장님 확인 필요, (2) 실제 R2 사진 업로드 e2e는 운영 R2를 건드리므로 자동 테스트에서 제외 — 로컬 시드는 **기존 운영 R2 객체 키를 읽어와 참조**(신규 업로드 0)해 썸네일이 실제로 보이게 한다.

---

## Task 0: 로컬 테스트 환경 구축 + 시드 (메인 세션이 직접 수행, 서브에이전트 위임 금지)

**목표:** 운영과 격리된 로컬 DB에 현재 전체 스키마를 만들고, 피드 검증에 필요한 최소 데이터를 시드한다.

- [ ] **Step 1: 로컬 테스트 DB 생성 + 접속 URL 확정**

```bash
createdb golf3355_dev 2>/dev/null || echo "이미 존재"
# 접속 사용자 확인 (mac homebrew는 보통 OS 사용자 trust 인증)
psql -d golf3355_dev -c "select current_user;" 2>&1 | head -3
```
확정된 URL을 이후 모든 명령에 쓸 `LOCAL_DB_URL`로 메모 (예: `postgresql://peter@localhost:5432/golf3355_dev`).

- [ ] **Step 2: 위험한 npm 스크립트 교정 (선제 안전 조치)**

`package.json`의 `"db:push": "prisma migrate dev"` → `"db:push": "prisma db push"` 로 변경. (리셋 지뢰 제거)

- [ ] **Step 3: 현재 스키마를 로컬 DB에 push (신규 모델 추가 전, 깨끗한 운영 미러)**

```bash
DATABASE_URL="$LOCAL_DB_URL" npx prisma db push
```
Expected: 현재 schema.prisma의 모든 테이블이 로컬에 생성(에러 없음). (이 시점엔 아직 Task 1의 신규 모델 전.)

- [ ] **Step 4: 시드 — 회원/라운딩/미디어(운영 R2 키 참조)/스코어**

운영 DB에서 표시용 샘플을 읽어 로컬에 복제하는 일회성 시드 스크립트 작성: `server/scripts/seed-local-feed.js`
- 운영에서 **읽기만**: 사진 있는 지난 booking 1~2건 + 그 RoundingMedia 행(objectKey/thumbnailKey/type)을 읽음. (운영 쓰기 0)
- 로컬에 시드: 정회원 2명·게스트 1명·운영자 1명(Member), 지난 booking 2건, 위에서 읽은 미디어 키로 RoundingMedia 행(status `ready`), 점수 몇 건(Score).
- 스크립트는 읽기(운영)와 쓰기(로컬)를 **서로 다른 PrismaClient 인스턴스/URL**로 분리:
  ```javascript
  const prod = new PrismaClient({ datasources: { db: { url: process.env.PROD_DB_URL } } });
  const local = new PrismaClient({ datasources: { db: { url: process.env.LOCAL_DB_URL } } });
  // prod.roundingMedia.findMany(...read only...) → local.* create
  ```
실행:
```bash
PROD_DB_URL="<.env의 DATABASE_URL>" LOCAL_DB_URL="$LOCAL_DB_URL" node server/scripts/seed-local-feed.js
```
Expected: 로컬에 시드 완료 로그. **운영 DB에는 아무 쓰기도 일어나지 않음**(스크립트는 prod 핸들로 findMany만 호출).

- [ ] **Step 5: 로컬 서버 부팅 + 피드 빈 응답 확인**

```bash
DATABASE_URL="$LOCAL_DB_URL" node server/server.js &   # 또는 dev
curl -s -H "X-Member-Id: <시드된_정회원_ID>" http://localhost:5000/api/feed | jq '.items | length'
```
Expected: 200 응답(아직 feed 라우트 없으면 Task 3 이후 검증). 서버가 로컬 DB로 부팅되는지 확인.

> 이후 **모든 Task의 curl/서버 실행은 `DATABASE_URL="$LOCAL_DB_URL"` 를 앞에 붙여 로컬 DB로** 수행한다. 서브에이전트 프롬프트에 이 규칙을 명시한다.

- [ ] **Step 6: 커밋**

```bash
git add package.json server/scripts/seed-local-feed.js
git commit -m "chore(feed): 로컬 테스트 DB 시드 스크립트 + db:push 스크립트 안전 교정"
```

---

## 파일 구조 (생성/수정)

**백엔드**
- 생성: `server/utils/mediaProcessing.js` — 업로드 미디어 처리(압축·썸네일·R2) 공용 헬퍼 (media.js에서 추출)
- 생성: `server/routes/feed.js` — 피드 목록 / 자유글 CRUD / 자유글 미디어 / 반응 / 댓글 / 링크프리뷰 라우트
- 수정: `prisma/schema.prisma` — `FeedPost`·`FeedPostMedia`·`Reaction`·`Comment` 추가 + `Member` 역관계
- 수정: `server/routes/media.js` — 추출된 공용 헬퍼 사용으로 교체
- 수정: `server/server.js` — `feed` 라우트 등록

**프론트**
- 생성: `src/pages/Feed.jsx` — 소식 피드 페이지(목록 로드/정렬/렌더)
- 생성: `src/pages/feed/RoundPostCard.jsx` — 라운딩 자동 게시물 카드
- 생성: `src/pages/feed/FreePostCard.jsx` — 자유글 카드
- 생성: `src/pages/feed/ReactionBar.jsx` — ♡/💬 카운트 + 좋아요 토글 (공용)
- 생성: `src/pages/feed/CommentSection.jsx` — 댓글 목록·입력 (공용)
- 생성: `src/pages/feed/ComposeFreePost.jsx` — 자유글 작성 모달(글+사진)
- 생성: `src/pages/feed/LinkEmbed.jsx` — 유튜브 임베드 / 인스타·일반 링크카드
- 수정: `src/App.jsx` — `/feed` 라우트 추가
- 수정: `src/components/Navigation.jsx` — '소식' 탭 추가 + '관리' 제거
- 수정: `src/pages/Menu.jsx` — '관리' 항목 추가(운영자 전용)
- 수정: `src/pages/Dashboard.jsx` — 배너 클릭 시 `/feed`로 이동
- 수정: `src/pages/RoundingListV2.jsx` — '지난' 탭에서 사진 제거 → 정보/스코어/시상 카드
- 수정: `src/services/api.js` — 피드 관련 메서드 추가

---

## Task 1: DB 스키마 — Reaction·Comment·FeedPost·FeedPostMedia

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: `Member` 모델에 역관계 추가**

`prisma/schema.prisma`의 `Member` 모델 relation 블록(현재 `voterPredictions`/`predictedWinnerOf` 아래, line ~47-48)에 추가:

```prisma
  feedPosts             FeedPost[]         @relation("MemberFeedPosts")
  comments              Comment[]          @relation("MemberComments")
  reactions             Reaction[]         @relation("MemberReactions")
```

- [ ] **Step 2: 신규 모델 4개를 파일 끝에 추가**

```prisma
model FeedPost {
  id        String          @id @default(cuid())
  authorId  String
  author    Member          @relation("MemberFeedPosts", fields: [authorId], references: [id], onDelete: Cascade)
  content   String?
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  media     FeedPostMedia[]

  @@index([authorId])
  @@index([createdAt])
}

model FeedPostMedia {
  id           String   @id @default(cuid())
  feedPostId   String
  feedPost     FeedPost @relation(fields: [feedPostId], references: [id], onDelete: Cascade)
  type         String   // "photo" | "video"
  objectKey    String
  thumbnailKey String?
  fileSize     Int      @default(0)
  durationSec  Int?
  width        Int?
  height       Int?
  status       String   @default("processing") // "processing" | "ready" | "failed"
  createdAt    DateTime @default(now())

  @@index([feedPostId])
}

model Reaction {
  id         String   @id @default(cuid())
  targetType String   // "booking" | "feedpost"
  targetId   String
  memberId   String
  member     Member   @relation("MemberReactions", fields: [memberId], references: [id], onDelete: Cascade)
  type       String   @default("like")
  createdAt  DateTime @default(now())

  @@unique([targetType, targetId, memberId, type])
  @@index([targetType, targetId])
}

model Comment {
  id         String   @id @default(cuid())
  targetType String   // "booking" | "feedpost"
  targetId   String
  authorId   String
  author     Member   @relation("MemberComments", fields: [authorId], references: [id], onDelete: Cascade)
  content    String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([targetType, targetId])
  @@index([authorId])
}
```

> 주: `Reaction`/`Comment`의 `targetType`/`targetId`는 다형성(라운딩=booking, 자유글=feedpost)이라 target에는 FK를 걸지 않는다. 작성자(member/author)만 실제 FK. Booking/FeedPost 삭제 시 고아 레코드는 앱에서 정리(Task 5·삭제 핸들러).

- [ ] **Step 3: 로컬 DB에 반영 (운영 금지 — `db push`만)**

```bash
DATABASE_URL="$LOCAL_DB_URL" npx prisma db push
```
Expected: 신규 4개 테이블이 **로컬 DB**에 생성 + `@prisma/client` 재생성, 에러 없음. (운영 DB는 Task 11까지 건드리지 않음.)
**`migrate dev` 절대 금지.**

- [ ] **Step 4: 빌드 확인 + 커밋**

Run: `npx vite build`
Expected: 빌드 성공.

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(feed): FeedPost·FeedPostMedia·Reaction·Comment 모델 추가"
```

---

## Task 2: 미디어 처리 공용 헬퍼 추출 (리팩터)

기존 `server/routes/media.js`의 업로드 처리 로직(이미지 압축/HEIC변환/EXIF회전, 영상 ffmpeg 압축, 썸네일, R2 업로드, 상태 업데이트)을 모델에 독립적인 공용 헬퍼로 추출하여 자유글 미디어가 재사용하게 한다. **기존 라운딩 미디어 동작은 절대 바뀌면 안 됨.**

**Files:**
- Create: `server/utils/mediaProcessing.js`
- Modify: `server/routes/media.js`

- [ ] **Step 1: media.js 정독**

Read: `server/routes/media.js` 전체. 특히 `processImage`, `processVideo`, `processJobsInBackground`(또는 동등 함수), multer 설정, `cleanupTemp`를 파악.

- [ ] **Step 2: 처리 로직을 mediaProcessing.js로 이동**

`processImage`/`processVideo`/`processJobsInBackground`와 그 의존(jimp·ffmpeg·crypto·r2 import)을 `server/utils/mediaProcessing.js`로 **그대로 옮긴다**. 단, prisma 모델을 하드코딩하지 말고 콜백으로 주입:

```javascript
// processJobsInBackground(jobs, { updateRow }) 형태로 변경
// 기존: await prisma.roundingMedia.update({ where:{id:rowId}, data:{...} })
// 변경: await updateRow(rowId, { ... })   // 호출부가 어느 테이블인지 결정
```

함수 시그니처(공개):
```javascript
module.exports = {
  buildBaseKey,          // (prefix) => `${prefix}/${Date.now()}-${hex}`
  processJobsInBackground, // (jobs, { updateRow }) => Promise
  cleanupTemp,           // (files) => void
  UPLOAD_DIR_MULTER,     // multer 인스턴스 또는 설정 (공유)
};
```

- [ ] **Step 3: media.js가 헬퍼를 사용하도록 교체**

`media.js`에서 옮긴 함수 정의를 지우고 `require('../utils/mediaProcessing')`로 가져온다. 라운딩 미디어 업로드 라우트의 백그라운드 호출을:

```javascript
processJobsInBackground(jobs, {
  updateRow: (id, data) => prisma.roundingMedia.update({ where: { id }, data }),
}).catch((e) => console.error('media process error', e));
```
로 변경. 나머지(참가자 권한 체크, 행 생성, 응답)는 그대로.

- [ ] **Step 4: 기존 라운딩 미디어 회귀 검증**

Run: `npm run dev` (별도 터미널), 그리고:
```bash
# 로그인 회원 id로 헤더 세팅 후 (실제 참가자 phone의 member id 사용)
curl -s -H "X-Member-Id: <PARTICIPANT_MEMBER_ID>" \
  -F "files=@/path/to/test.jpg" \
  http://localhost:5000/api/bookings/<BOOKING_ID>/media | jq .
```
Expected: `{ "created": 1, "processing": [...] }` 응답. 잠시 후 갤러리에서 사진이 `ready`로 표시(브라우저 확인).
**라운딩 사진 업로드가 이전과 동일하게 동작해야 함.**

- [ ] **Step 5: 빌드 + 커밋**

Run: `npx vite build` → 성공.
```bash
git add server/utils/mediaProcessing.js server/routes/media.js
git commit -m "refactor(media): 업로드 처리 로직을 mediaProcessing 공용 헬퍼로 추출"
```

---

## Task 3: 피드 백엔드 라우트 (feed.js)

**Files:**
- Create: `server/routes/feed.js`
- Modify: `server/server.js` (라우트 등록)

- [ ] **Step 1: feed.js 생성 — 공용 집계 헬퍼 + 피드 목록**

```javascript
const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAuthOrGuest } = require('../middleware/auth');
const { isOperator } = require('../utils/roles');

const router = express.Router();

const VALID_TARGETS = ['booking', 'feedpost'];

// targetKey 배열에 대한 반응/댓글 집계 (N+1 방지: 일괄 조회 후 JS 집계)
async function aggregateEngagement(targets, viewerId) {
  // targets: [{ targetType, targetId }]
  if (targets.length === 0) return { reactions: {}, comments: {} };
  const ids = targets.map((t) => t.targetId);
  const types = [...new Set(targets.map((t) => t.targetType))];

  const [reactions, comments] = await Promise.all([
    prisma.reaction.findMany({
      where: { targetType: { in: types }, targetId: { in: ids } },
      select: { targetType: true, targetId: true, memberId: true },
    }),
    prisma.comment.findMany({
      where: { targetType: { in: types }, targetId: { in: ids } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, targetType: true, targetId: true, content: true, createdAt: true,
        author: { select: { id: true, name: true, nickname: true, photo: true } },
      },
    }),
  ]);

  const rMap = {}; // key -> { count, likedByViewer }
  for (const r of reactions) {
    const key = `${r.targetType}:${r.targetId}`;
    if (!rMap[key]) rMap[key] = { count: 0, likedByViewer: false };
    rMap[key].count += 1;
    if (r.memberId === viewerId) rMap[key].likedByViewer = true;
  }
  const cMap = {}; // key -> [comments]
  for (const c of comments) {
    const key = `${c.targetType}:${c.targetId}`;
    if (!cMap[key]) cMap[key] = [];
    cMap[key].push({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      authorId: c.author.id,
      authorName: c.author.nickname || c.author.name,
      authorPhoto: c.author.photo || null,
    });
  }
  return { reactions: rMap, comments: cMap };
}

// GET /api/feed — 라운딩 자동게시물 + 자유글 병합, 최신순
router.get('/', requireAuthOrGuest, async (req, res) => {
  try {
    const viewerId = req.member.id;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    // 1) 라운딩 게시물 후보: 미래/아카이브 제외, ready 미디어 ≥1
    const bookings = await prisma.booking.findMany({
      where: { photosArchivedAt: null },
      include: {
        media: { where: { status: 'ready' }, orderBy: { createdAt: 'desc' } },
      },
    });
    const roundItems = bookings
      .filter((b) => new Date(b.date) < todayStart && b.media.length > 0)
      .map((b) => {
        const cover = b.media.find((m) => m.type === 'photo' && m.thumbnailKey)
          || b.media.find((m) => m.thumbnailKey) || b.media[0];
        const feedTs = b.media.reduce(
          (max, m) => (m.createdAt > max ? m.createdAt : max), b.media[0].createdAt);
        return {
          kind: 'round',
          id: b.id,
          targetType: 'booking',
          targetId: b.id,
          title: b.title || `${b.type}`,
          courseName: b.courseName,
          date: b.date,
          mediaCount: b.media.length,
          coverThumbKey: cover?.thumbnailKey || null,
          feedTs,
        };
      });

    // 2) 자유글
    const posts = await prisma.feedPost.findMany({
      include: {
        author: { select: { id: true, name: true, nickname: true, photo: true } },
        media: { orderBy: { createdAt: 'asc' } },
      },
    });
    const freeItems = posts.map((p) => ({
      kind: 'free',
      id: p.id,
      targetType: 'feedpost',
      targetId: p.id,
      content: p.content,
      authorId: p.author.id,
      authorName: p.author.nickname || p.author.name,
      authorPhoto: p.author.photo || null,
      media: p.media.map((m) => ({
        id: m.id, type: m.type, status: m.status,
        objectKey: m.objectKey, thumbnailKey: m.thumbnailKey,
      })),
      feedTs: p.createdAt,
    }));

    // 3) 병합 + 정렬 + 참여 집계
    const all = [...roundItems, ...freeItems]
      .sort((a, b) => new Date(b.feedTs) - new Date(a.feedTs));
    const { reactions, comments } = await aggregateEngagement(
      all.map((i) => ({ targetType: i.targetType, targetId: i.targetId })), viewerId);

    const items = all.map((i) => {
      const key = `${i.targetType}:${i.targetId}`;
      const r = reactions[key] || { count: 0, likedByViewer: false };
      const c = comments[key] || [];
      return {
        ...i,
        likeCount: r.count,
        likedByViewer: r.likedByViewer,
        commentCount: c.length,
        recentComments: c.slice(-2), // 최근 2개 미리보기
      };
    });

    res.json({ items });
  } catch (e) {
    console.error('GET /api/feed error', e);
    res.status(500).json({ error: '피드를 불러오지 못했습니다.' });
  }
});

module.exports = router;
```

- [ ] **Step 2: 반응 토글 라우트 추가 (게스트 허용)**

`module.exports` 위에 추가:

```javascript
// POST /api/feed/reactions/toggle  { targetType, targetId }
router.post('/reactions/toggle', requireAuthOrGuest, async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    if (!VALID_TARGETS.includes(targetType) || !targetId) {
      return res.status(400).json({ error: '잘못된 대상입니다.' });
    }
    const existing = await prisma.reaction.findUnique({
      where: { targetType_targetId_memberId_type: {
        targetType, targetId, memberId: req.member.id, type: 'like' } },
    });
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: { targetType, targetId, memberId: req.member.id, type: 'like' } });
    }
    const count = await prisma.reaction.count({ where: { targetType, targetId } });
    req.io.emit('feed:updated');
    res.json({ liked: !existing, count });
  } catch (e) {
    console.error('toggle reaction error', e);
    res.status(500).json({ error: '반응 처리 실패' });
  }
});
```

- [ ] **Step 3: 댓글 라우트 추가 (작성=정회원만, 삭제=작성자·운영자)**

```javascript
// GET /api/feed/comments?targetType=&targetId=
router.get('/comments', requireAuthOrGuest, async (req, res) => {
  const { targetType, targetId } = req.query;
  if (!VALID_TARGETS.includes(targetType) || !targetId) {
    return res.status(400).json({ error: '잘못된 대상입니다.' });
  }
  const comments = await prisma.comment.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, content: true, createdAt: true,
      author: { select: { id: true, name: true, nickname: true, photo: true } } },
  });
  res.json({ comments: comments.map((c) => ({
    id: c.id, content: c.content, createdAt: c.createdAt,
    authorId: c.author.id, authorName: c.author.nickname || c.author.name,
    authorPhoto: c.author.photo || null,
  })) });
});

// POST /api/feed/comments  { targetType, targetId, content }  — requireAuth = 정회원만(게스트 차단)
router.post('/comments', requireAuth, async (req, res) => {
  const { targetType, targetId, content } = req.body;
  if (!VALID_TARGETS.includes(targetType) || !targetId) {
    return res.status(400).json({ error: '잘못된 대상입니다.' });
  }
  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: '내용을 입력하세요.' });
  }
  const comment = await prisma.comment.create({
    data: { targetType, targetId, authorId: req.member.id, content: content.trim() },
    select: { id: true, content: true, createdAt: true,
      author: { select: { id: true, name: true, nickname: true, photo: true } } },
  });
  req.io.emit('feed:updated');
  res.json({ comment: {
    id: comment.id, content: comment.content, createdAt: comment.createdAt,
    authorId: comment.author.id, authorName: comment.author.nickname || comment.author.name,
    authorPhoto: comment.author.photo || null } });
});

// DELETE /api/feed/comments/:id — 작성자 또는 운영자
router.delete('/comments/:id', requireAuth, async (req, res) => {
  const c = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: '댓글이 없습니다.' });
  if (c.authorId !== req.member.id && !isOperator(req.member)) {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }
  await prisma.comment.delete({ where: { id: req.params.id } });
  req.io.emit('feed:updated');
  res.json({ success: true });
});
```

- [ ] **Step 4: server.js에 라우트 등록**

`server/server.js`에서 기존 라우트 등록부(예: `app.use('/api/posts', ...)`) 옆에 추가:
```javascript
app.use('/api/feed', require('./routes/feed'));
```
(기존 패턴과 동일 위치/스타일로. `req.io` 주입 미들웨어가 이미 전역이면 그대로 동작.)

- [ ] **Step 5: HTTP 검증**

Run: `npm run dev` 후
```bash
MID=<정회원_MEMBER_ID>
# 피드 목록
curl -s -H "X-Member-Id: $MID" http://localhost:5000/api/feed | jq '.items | length, .items[0]'
# 반응 토글 (라운딩 대상)
curl -s -X POST -H "X-Member-Id: $MID" -H "Content-Type: application/json" \
  -d '{"targetType":"booking","targetId":"<BOOKING_WITH_PHOTOS>"}' \
  http://localhost:5000/api/feed/reactions/toggle | jq .
# 댓글 작성
curl -s -X POST -H "X-Member-Id: $MID" -H "Content-Type: application/json" \
  -d '{"targetType":"booking","targetId":"<BOOKING_WITH_PHOTOS>","content":"테스트"}' \
  http://localhost:5000/api/feed/comments | jq .
```
Expected: 피드 items 배열에 사진 있는 지난 라운딩이 최신순으로; 토글 시 `{liked:true,count:1}` → 재호출 시 `{liked:false,count:0}`; 댓글 작성 시 comment 객체 반환.

- [ ] **Step 6: 빌드 + 커밋**

Run: `npx vite build` → 성공.
```bash
git add server/routes/feed.js server/server.js
git commit -m "feat(feed): 피드 목록·반응·댓글 API"
```

---

## Task 4: 자유글 작성/미디어/삭제 API

**Files:**
- Modify: `server/routes/feed.js`

- [ ] **Step 1: 자유글 생성·삭제 라우트 추가**

`feed.js` `module.exports` 위에 (multer·헬퍼 import는 파일 상단에 추가):

```javascript
const multer = require('multer');
const { buildBaseKey, processJobsInBackground, cleanupTemp } = require('../utils/mediaProcessing');
const upload = multer({ dest: 'uploads/tmp', limits: { fileSize: 200 * 1024 * 1024 } });
```

```javascript
// POST /api/feed/posts  { content } — requireAuth = 정회원만
router.post('/posts', requireAuth, async (req, res) => {
  const { content } = req.body;
  const text = (content || '').trim();
  // 사진은 별도 업로드. 글 생성 시 본문은 비어도 허용(직후 사진 업로드 예정).
  const post = await prisma.feedPost.create({
    data: { authorId: req.member.id, content: text || null },
  });
  req.io.emit('feed:updated');
  res.json({ id: post.id });
});

// DELETE /api/feed/posts/:id — 작성자 또는 운영자
router.delete('/posts/:id', requireAuth, async (req, res) => {
  const post = await prisma.feedPost.findUnique({
    where: { id: req.params.id }, include: { media: true } });
  if (!post) return res.status(404).json({ error: '게시물이 없습니다.' });
  if (post.authorId !== req.member.id && !isOperator(req.member)) {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }
  // R2 객체 삭제
  const { deleteKeys } = require('../utils/r2');
  const keys = post.media.flatMap((m) => [m.objectKey, m.thumbnailKey].filter(Boolean));
  if (keys.length) await deleteKeys(keys).catch(() => {});
  // 고아 반응/댓글 정리
  await prisma.reaction.deleteMany({ where: { targetType: 'feedpost', targetId: post.id } });
  await prisma.comment.deleteMany({ where: { targetType: 'feedpost', targetId: post.id } });
  await prisma.feedPost.delete({ where: { id: post.id } }); // media는 cascade
  req.io.emit('feed:updated');
  res.json({ success: true });
});
```

- [ ] **Step 2: 자유글 미디어 업로드 라우트 (작성자만, R2 파이프라인 재사용)**

```javascript
// POST /api/feed/posts/:id/media  (multipart files) — 작성자만
router.post('/posts/:id/media', requireAuth, upload.array('files', 10), async (req, res) => {
  const post = await prisma.feedPost.findUnique({ where: { id: req.params.id } });
  if (!post) { cleanupTemp(req.files); return res.status(404).json({ error: '게시물이 없습니다.' }); }
  if (post.authorId !== req.member.id) {
    cleanupTemp(req.files);
    return res.status(403).json({ error: '작성자만 사진을 올릴 수 있습니다.' });
  }
  const jobs = [];
  for (const file of req.files || []) {
    const isVideo = (file.mimetype || '').startsWith('video/');
    const baseKey = buildBaseKey(`feedposts/${post.id}`);
    const objectKey = `${baseKey}.${isVideo ? 'mp4' : 'jpg'}`;
    const row = await prisma.feedPostMedia.create({
      data: { feedPostId: post.id, type: isVideo ? 'video' : 'photo',
        objectKey, thumbnailKey: null, fileSize: 0, status: 'processing' } });
    jobs.push({ rowId: row.id, file, isVideo, baseKey, objectKey });
  }
  res.json({ created: jobs.length, processing: jobs.map((j) => j.rowId) });
  processJobsInBackground(jobs, {
    updateRow: (id, data) => prisma.feedPostMedia.update({ where: { id }, data }),
  }).catch((e) => console.error('feed media process error', e));
});
```

> `buildBaseKey`/`processJobsInBackground`/`cleanupTemp`의 정확한 인자 형태는 Task 2에서 확정된 시그니처에 맞춘다(특히 `jobs` 항목 필드명). Task 2 추출 시 라운딩 라우트가 쓰던 job 객체 형태를 그대로 따른다.

- [ ] **Step 3: 서명 URL — 피드 미디어 표시용**

피드/갤러리에서 자유글 사진을 보려면 기존 미디어와 동일하게 서명 URL이 필요하다. 기존 라운딩 미디어가 서명 URL을 발급받는 라우트(`media.js`의 조회/프리뷰 라우트)를 확인해, 자유글 미디어도 같은 방식으로 `objectKey`/`thumbnailKey` → `signedUrl`로 변환하는 경로를 맞춘다. 가장 단순한 방법: `GET /api/feed`와 자유글 상세 응답에서 서버가 `signedUrl(key)`로 즉시 변환해 `url`/`thumbUrl` 필드로 내려준다.

`feed.js` 상단에 `const { signedUrl } = require('../utils/r2');` 추가 후, Step 1(Task3)의 freeItems media 매핑과 roundItems cover를 URL로 변환:
```javascript
// freeItems media 매핑에서:
media: p.media.map((m) => ({
  id: m.id, type: m.type, status: m.status,
  url: m.status === 'ready' ? signedUrl(m.objectKey) : null,
  thumbUrl: m.thumbnailKey ? signedUrl(m.thumbnailKey) : null,
})),
// roundItems cover:
coverThumbUrl: cover?.thumbnailKey ? signedUrl(cover.thumbnailKey) : null,
```
(`coverThumbKey`/`objectKey` 원시 키는 응답에서 제거하고 URL만 내려준다.)

- [ ] **Step 4: HTTP 검증**

```bash
MID=<정회원_MEMBER_ID>
# 자유글 생성
PID=$(curl -s -X POST -H "X-Member-Id: $MID" -H "Content-Type: application/json" \
  -d '{"content":"연습장 다녀왔어요"}' http://localhost:5000/api/feed/posts | jq -r .id)
echo $PID
# 사진 업로드
curl -s -X POST -H "X-Member-Id: $MID" -F "files=@/path/to/test.jpg" \
  http://localhost:5000/api/feed/posts/$PID/media | jq .
# 피드에 자유글이 뜨고 사진 url 내려오는지
curl -s -H "X-Member-Id: $MID" http://localhost:5000/api/feed | jq '.items[] | select(.kind=="free")'
# 게스트 차단 확인 (게스트 member id로 작성 시 401)
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "X-Member-Id: <GUEST_ID>" \
  -H "Content-Type: application/json" -d '{"content":"x"}' http://localhost:5000/api/feed/posts
# 삭제
curl -s -X DELETE -H "X-Member-Id: $MID" http://localhost:5000/api/feed/posts/$PID | jq .
```
Expected: 생성→id, 업로드→`created:1`, 잠시 후 피드에서 `status:"ready"` + `url`; 게스트는 `401`; 삭제 `{success:true}`.

- [ ] **Step 5: 빌드 + 커밋**

Run: `npx vite build` → 성공.
```bash
git add server/routes/feed.js
git commit -m "feat(feed): 자유글 작성·미디어 업로드·삭제 API (정회원 전용)"
```

---

## Task 5: 프론트 API 메서드 추가

**Files:**
- Modify: `src/services/api.js`

- [ ] **Step 1: 피드 메서드 추가**

기존 메서드들 사이(예: `createPost` 근처)에 추가. `getAuthHeaders()`·`API_BASE` 기존 것 사용:

```javascript
async fetchFeed() {
  const res = await fetch(`${API_BASE}/feed`, { headers: this.getAuthHeaders() });
  if (!res.ok) throw new Error('피드를 불러오지 못했습니다.');
  return res.json();
},

async toggleFeedReaction(targetType, targetId) {
  const res = await fetch(`${API_BASE}/feed/reactions/toggle`, {
    method: 'POST',
    headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ targetType, targetId }),
  });
  if (!res.ok) throw new Error('반응 처리 실패');
  return res.json();
},

async fetchFeedComments(targetType, targetId) {
  const res = await fetch(`${API_BASE}/feed/comments?targetType=${targetType}&targetId=${targetId}`,
    { headers: this.getAuthHeaders() });
  if (!res.ok) throw new Error('댓글을 불러오지 못했습니다.');
  return res.json();
},

async addFeedComment(targetType, targetId, content) {
  const res = await fetch(`${API_BASE}/feed/comments`, {
    method: 'POST',
    headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ targetType, targetId, content }),
  });
  if (!res.ok) throw new Error('댓글 작성 실패');
  return res.json();
},

async deleteFeedComment(commentId) {
  const res = await fetch(`${API_BASE}/feed/comments/${commentId}`, {
    method: 'DELETE', headers: this.getAuthHeaders() });
  if (!res.ok) throw new Error('댓글 삭제 실패');
  return res.json();
},

async createFeedPost(content) {
  const res = await fetch(`${API_BASE}/feed/posts`, {
    method: 'POST',
    headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('게시물 작성 실패');
  return res.json();
},

uploadFeedPostMedia(postId, files, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/feed/posts/${postId}/media`);
    Object.entries(this.getAuthHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (ev) => {
      if (onProgress && ev.lengthComputable) onProgress(ev.loaded / ev.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText || '{}'));
      else reject(new Error('업로드에 실패했습니다.'));
    };
    xhr.onerror = () => reject(new Error('업로드에 실패했습니다.'));
    xhr.send(fd);
  });
},

async deleteFeedPost(postId) {
  const res = await fetch(`${API_BASE}/feed/posts/${postId}`, {
    method: 'DELETE', headers: this.getAuthHeaders() });
  if (!res.ok) throw new Error('게시물 삭제 실패');
  return res.json();
},
```

> 주: `api.js`가 객체 리터럴이면 위처럼 `메서드,` 콤마 형식으로, 클래스면 `async fetchFeed() {}` 형식으로 파일 스타일에 맞춘다.

- [ ] **Step 2: 빌드 + 커밋**

Run: `npx vite build` → 성공 (import/문법 확인).
```bash
git add src/services/api.js
git commit -m "feat(feed): 프론트 피드 API 메서드 추가"
```

---

## Task 6: 네비게이션 — '소식' 탭 추가 + '관리' 더보기 이동 + 라우트

**Files:**
- Modify: `src/components/Navigation.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/Menu.jsx`

- [ ] **Step 1: App.jsx에 `/feed` 라우트 추가**

`src/App.jsx`의 `<Routes>` 안(다른 `<Route>`들 사이)에:
```jsx
<Route path="/feed" element={<Feed />} />
```
상단 import 추가:
```jsx
import Feed from './pages/Feed';
```

- [ ] **Step 2: Navigation.jsx — '관리' 제거, '소식' 추가**

`src/components/Navigation.jsx`에서 운영자 전용 `관리` NavItem 블록(`{checkIsOperator(user) && (<NavItem href="/admin" ...>)}`)을 **삭제**하고, 라운딩과 참가비 사이에 '소식' 탭을 추가:

```jsx
<NavItem href="/feed" label="소식" active={isActive('/feed')} onClick={(e) => handleNavClick(e, '/feed')}>
  <FeedIcon active={isActive('/feed')} />
</NavItem>
```

`FeedIcon`은 기존 아이콘 컴포넌트(HomeIcon 등) 스타일을 따라 같은 파일/아이콘 모듈에 추가. 사진/말풍선 모티브, active 시 `#0047AB` / 비활성 `#94A3B8`. 예:
```jsx
function FeedIcon({ active }) {
  const c = active ? '#0047AB' : '#94A3B8';
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="14" rx="3" stroke={c} strokeWidth="2"/>
      <circle cx="9" cy="10" r="2" stroke={c} strokeWidth="2"/>
      <path d="M6 16l4-3 3 2 3-3 2 2" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
```

- [ ] **Step 3: Menu.jsx — '관리' 항목 추가 (운영자 전용)**

`src/pages/Menu.jsx`에서 `allMenuItems` 정렬 후 운영자면 맨 앞에 관리 항목을 넣는다. `checkIsOperator(user)`를 import/사용:

```jsx
import { checkIsOperator } from '../utils';
// ...
const menuItems = allMenuItems.filter((item) => {
  if (item.featureKey && featureSettings?.[item.featureKey] === false) return false;
  return true;
});
const finalMenuItems = checkIsOperator(user)
  ? [{ icon: <GearIcon />, iconBg: '#EFF6FF', iconColor: '#0047AB',
       title: '관리', description: '회원·회비·라운딩 운영 관리', path: '/admin' }, ...menuItems]
  : menuItems;
```
렌더 루프를 `menuItems.map` → `finalMenuItems.map`으로 변경. `GearIcon`은 Navigation에서 쓰던 것과 동일 모양으로 Menu.jsx에 추가(또는 공용 import). `user` prop이 Menu에 없으면 기존 사용자 조회 방식(localStorage `golfUser` 또는 상위 prop) 따라 가져온다.

- [ ] **Step 4: 빌드 + 브라우저 확인**

Run: `npx vite build` → 성공.
Run: `npm run dev` → 브라우저에서:
- 하단 네비가 `홈·라운딩·소식·참가비·더보기` 5개로 보임.
- '소식' 탭 클릭 → `/feed`(아직 빈 페이지여도 됨, Task 7에서 채움).
- 운영자 계정: '더보기'에 '관리' 항목이 보이고 클릭 시 `/admin` 이동.
- 일반회원: '더보기'에 '관리' 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/App.jsx src/components/Navigation.jsx src/pages/Menu.jsx
git commit -m "feat(feed): 소식 탭 추가 + 관리 더보기 이동 + /feed 라우트"
```

---

## Task 7: 공용 컴포넌트 — ReactionBar, CommentSection, LinkEmbed

**Files:**
- Create: `src/pages/feed/ReactionBar.jsx`
- Create: `src/pages/feed/CommentSection.jsx`
- Create: `src/pages/feed/LinkEmbed.jsx`

- [ ] **Step 1: ReactionBar.jsx**

게시물 단위 ♡/💬 카운트 + 좋아요 토글. 낙관적 업데이트.

```jsx
import { useState } from 'react';
import apiService from '../../services/api';

export default function ReactionBar({ targetType, targetId, likeCount, likedByViewer, commentCount, onToggleComments }) {
  const [liked, setLiked] = useState(!!likedByViewer);
  const [count, setCount] = useState(likeCount || 0);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const prevLiked = liked, prevCount = count;
    setLiked(!liked); setCount(count + (liked ? -1 : 1)); // 낙관적
    try {
      const r = await apiService.toggleFeedReaction(targetType, targetId);
      setLiked(r.liked); setCount(r.count);
    } catch {
      setLiked(prevLiked); setCount(prevCount);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '8px 0' }}>
      <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: 0,
        color: liked ? '#E0245E' : '#64748B', fontSize: 15, fontWeight: 600 }}>
        <span style={{ fontSize: 20 }}>{liked ? '♥' : '♡'}</span>{count > 0 ? count : ''}
      </button>
      <button onClick={onToggleComments} style={{ display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, padding: 0,
        color: '#64748B', fontSize: 15, fontWeight: 600 }}>
        <span style={{ fontSize: 18 }}>💬</span>{commentCount > 0 ? commentCount : ''}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: CommentSection.jsx**

댓글 목록 + 입력. `currentUser`로 작성 가능 여부(게스트면 입력창 숨김), 본인/운영자 삭제.

```jsx
import { useEffect, useState } from 'react';
import apiService from '../../services/api';

export default function CommentSection({ targetType, targetId, currentUser, isOperator }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const isGuest = currentUser?.approvalStatus === 'guest' || currentUser?.isGuest;

  useEffect(() => {
    apiService.fetchFeedComments(targetType, targetId)
      .then((r) => setComments(r.comments || [])).catch(() => setComments([]));
  }, [targetType, targetId]);

  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const r = await apiService.addFeedComment(targetType, targetId, t);
      setComments((cs) => [...(cs || []), r.comment]); setText('');
    } catch { /* noop */ } finally { setSending(false); }
  };

  const remove = async (id) => {
    try { await apiService.deleteFeedComment(id);
      setComments((cs) => cs.filter((c) => c.id !== id)); } catch { /* noop */ }
  };

  if (comments === null) return null;

  return (
    <div style={{ marginTop: 4 }}>
      {comments.map((c) => (
        <div key={c.id} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14 }}>
          <span style={{ fontWeight: 600, color: '#0F172A', flexShrink: 0 }}>{c.authorName}</span>
          <span style={{ color: '#334155', flex: 1 }}>{c.content}</span>
          {(c.authorId === currentUser?.id || isOperator) && (
            <button onClick={() => remove(c.id)} style={{ background: 'none', border: 'none',
              color: '#CBD5E1', cursor: 'pointer', fontSize: 12 }}>삭제</button>
          )}
        </div>
      ))}
      {!isGuest && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="댓글 입력..."
            style={{ flex: 1, minHeight: 40, border: '1px solid #E2E8F0', borderRadius: 8,
              padding: '0 12px', fontSize: 14 }} />
          <button onClick={submit} disabled={sending}
            style={{ minHeight: 40, padding: '0 14px', border: 'none', borderRadius: 8,
              background: '#0047AB', color: '#fff', fontWeight: 600, fontSize: 14 }}>등록</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: LinkEmbed.jsx (유튜브 임베드 / 인스타·일반 링크카드)**

본문에서 첫 URL을 찾아 종류별 렌더. 유튜브는 썸네일+재생, 그 외는 링크카드.

```jsx
import { useState } from 'react';

const URL_RE = /(https?:\/\/[^\s]+)/i;

function youtubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function extractFirstUrl(text) {
  if (!text) return null;
  const m = text.match(URL_RE);
  return m ? m[0] : null;
}

export default function LinkEmbed({ url }) {
  const [playing, setPlaying] = useState(false);
  if (!url) return null;
  const yt = youtubeId(url);

  if (yt) {
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9',
        borderRadius: 10, overflow: 'hidden', background: '#000', marginTop: 8 }}>
        {playing ? (
          <iframe title="youtube" width="100%" height="100%"
            src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
            frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen
            style={{ position: 'absolute', inset: 0 }} />
        ) : (
          <button onClick={() => setPlaying(true)} style={{ position: 'absolute', inset: 0,
            border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }}>
            <img src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22 }}>▶</span>
          </button>
        )}
      </div>
    );
  }

  // 인스타/일반 링크 → 링크 카드 (리치 미리보기 안 함)
  const isInsta = /instagram\.com/i.test(url);
  let host = url; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* noop */ }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: 12,
        border: '1px solid #E2E8F0', borderRadius: 10, textDecoration: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <span style={{ fontSize: 20 }}>{isInsta ? '📷' : '🔗'}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, color: '#0F172A', fontSize: 14 }}>
          {isInsta ? 'Instagram' : host}</span>
        <span style={{ display: 'block', color: '#94A3B8', fontSize: 12,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
      </span>
    </a>
  );
}
```

> v1은 일반 링크 OG 서버 프리뷰 없이 호스트명 카드로 처리(범위 단순화, 스펙의 "폴백" 동작). 추후 `/api/feed/link-preview` 추가 시 카드 제목/썸네일만 교체.

- [ ] **Step 4: 빌드 + 커밋**

Run: `npx vite build` → 성공.
```bash
git add src/pages/feed/ReactionBar.jsx src/pages/feed/CommentSection.jsx src/pages/feed/LinkEmbed.jsx
git commit -m "feat(feed): 공용 컴포넌트 ReactionBar·CommentSection·LinkEmbed"
```

---

## Task 8: 피드 페이지 + 카드 + 작성 모달

**Files:**
- Create: `src/pages/Feed.jsx`
- Create: `src/pages/feed/RoundPostCard.jsx`
- Create: `src/pages/feed/FreePostCard.jsx`
- Create: `src/pages/feed/ComposeFreePost.jsx`

- [ ] **Step 1: RoundPostCard.jsx**

라운딩 자동 게시물 카드. 대표사진 탭 → 기존 갤러리 열기(상위에서 booking 객체로 콜백).

```jsx
import { useState } from 'react';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';

export default function RoundPostCard({ item, currentUser, isOperator, onOpenGallery }) {
  const [showComments, setShowComments] = useState(false);
  const d = new Date(item.date);
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ padding: '12px 14px 8px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{item.title}</div>
        <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 2 }}>
          {item.courseName} · {d.getMonth() + 1}/{d.getDate()}</div>
      </div>
      <button onClick={() => onOpenGallery(item.id)} style={{ display: 'block', width: '100%',
        border: 'none', padding: 0, cursor: 'pointer', position: 'relative', background: '#F1F5F9' }}>
        {item.coverThumbUrl
          ? <img src={item.coverThumbUrl} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', aspectRatio: '4/3' }} />}
        <span style={{ position: 'absolute', right: 10, bottom: 10, background: 'rgba(0,0,0,0.55)',
          color: '#fff', fontSize: 12, padding: '3px 8px', borderRadius: 20 }}>📷 {item.mediaCount}</span>
      </button>
      <div style={{ padding: '4px 14px 12px' }}>
        <ReactionBar targetType="booking" targetId={item.id}
          likeCount={item.likeCount} likedByViewer={item.likedByViewer}
          commentCount={item.commentCount} onToggleComments={() => setShowComments((s) => !s)} />
        {item.recentComments?.slice(-2).map((c) => (
          <div key={c.id} style={{ fontSize: 13.5, color: '#334155', padding: '2px 0' }}>
            <b style={{ color: '#0F172A' }}>{c.authorName}</b> {c.content}</div>
        ))}
        {showComments && (
          <CommentSection targetType="booking" targetId={item.id}
            currentUser={currentUser} isOperator={isOperator} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: FreePostCard.jsx**

자유글 카드. 작성자 헤더, 본문, 사진, 링크 임베드, 반응·댓글, 본인/운영자 삭제.

```jsx
import { useState } from 'react';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import LinkEmbed, { extractFirstUrl } from './LinkEmbed';
import apiService from '../../services/api';

export default function FreePostCard({ item, currentUser, isOperator, onDeleted }) {
  const [showComments, setShowComments] = useState(false);
  const url = extractFirstUrl(item.content);
  const photos = (item.media || []).filter((m) => m.status === 'ready');
  const canDelete = item.authorId === currentUser?.id || isOperator;

  const del = async () => {
    if (!window.confirm('이 게시물을 삭제할까요?')) return;
    try { await apiService.deleteFeedPost(item.id); onDeleted?.(item.id); } catch { /* noop */ }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '12px 14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden',
          background: '#E2E8F0', flexShrink: 0 }}>
          {item.authorPhoto && <img src={item.authorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{item.authorName}</div>
        {canDelete && (
          <button onClick={del} style={{ marginLeft: 'auto', background: 'none', border: 'none',
            color: '#CBD5E1', cursor: 'pointer', fontSize: 13 }}>삭제</button>
        )}
      </div>
      {item.content && (
        <div style={{ fontSize: 14.5, color: '#1E293B', whiteSpace: 'pre-wrap', marginTop: 8, lineHeight: 1.5 }}>
          {item.content}</div>
      )}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr' : '1fr 1fr',
          gap: 4, marginTop: 8, borderRadius: 10, overflow: 'hidden' }}>
          {photos.map((m) => (
            <img key={m.id} src={m.thumbUrl || m.url} alt=""
              style={{ width: '100%', aspectRatio: photos.length === 1 ? '4/3' : '1/1', objectFit: 'cover' }} />
          ))}
        </div>
      )}
      <LinkEmbed url={url} />
      <ReactionBar targetType="feedpost" targetId={item.id}
        likeCount={item.likeCount} likedByViewer={item.likedByViewer}
        commentCount={item.commentCount} onToggleComments={() => setShowComments((s) => !s)} />
      {item.recentComments?.slice(-2).map((c) => (
        <div key={c.id} style={{ fontSize: 13.5, color: '#334155', padding: '2px 0' }}>
          <b style={{ color: '#0F172A' }}>{c.authorName}</b> {c.content}</div>
      ))}
      {showComments && (
        <CommentSection targetType="feedpost" targetId={item.id}
          currentUser={currentUser} isOperator={isOperator} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: ComposeFreePost.jsx (작성 모달, 정회원)**

```jsx
import { useState } from 'react';
import apiService from '../../services/api';
import { compressImageFile } from '../../utils'; // MediaGallery가 쓰는 압축 유틸 경로에 맞춤

export default function ComposeFreePost({ onClose, onCreated }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const pick = (e) => setFiles(Array.from(e.target.files || []));

  const submit = async () => {
    if (!text.trim() && files.length === 0) return;
    setBusy(true);
    try {
      const { id } = await apiService.createFeedPost(text.trim());
      if (files.length > 0) {
        const imgs = await Promise.all(files.map((f) =>
          f.type.startsWith('image/') ? compressImageFile(f, 1600) : f));
        await apiService.uploadFeedPostMedia(id, imgs);
      }
      onCreated?.();
      onClose();
    } catch { alert('게시 실패. 다시 시도해주세요.'); } finally { setBusy(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', width: '100%', borderTopLeftRadius: 18, borderTopRightRadius: 18,
        padding: 16, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 15 }}>취소</button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>새 글</div>
          <button onClick={submit} disabled={busy} style={{ background: 'none', border: 'none',
            color: '#0047AB', fontWeight: 700, fontSize: 15 }}>{busy ? '게시중…' : '게시'}</button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
          placeholder="무슨 일이 있었나요? (유튜브/인스타 링크도 붙여보세요)"
          style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12,
            fontSize: 15, resize: 'none', boxSizing: 'border-box' }} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
          color: '#0047AB', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          📷 사진 추가
          <input type="file" accept="image/*,video/*" multiple onChange={pick} style={{ display: 'none' }} />
        </label>
        {files.length > 0 && <span style={{ marginLeft: 8, color: '#64748B', fontSize: 13 }}>{files.length}개 선택됨</span>}
      </div>
    </div>
  );
}
```

> `compressImageFile`의 정확한 import 경로는 `MediaGallery.jsx`가 사용하는 것과 동일하게 맞춘다(Phase 7에서 추가됨). 영상은 압축 없이 그대로 업로드(서버 처리).

- [ ] **Step 4: Feed.jsx (페이지)**

피드 로드·정렬은 서버가 함. 카드 분기 렌더 + 작성 FAB + 라운딩 게시물의 갤러리 열기(기존 MediaGallery 재사용).

```jsx
import { useEffect, useState, useCallback } from 'react';
import apiService from '../services/api';
import { checkIsOperator } from '../utils';
import RoundPostCard from './feed/RoundPostCard';
import FreePostCard from './feed/FreePostCard';
import ComposeFreePost from './feed/ComposeFreePost';
import MediaGallery from './booking/MediaGallery';

export default function Feed() {
  const [items, setItems] = useState(null);
  const [composing, setComposing] = useState(false);
  const [galleryBooking, setGalleryBooking] = useState(null);
  const [bookings, setBookings] = useState([]);

  const user = (() => { try { return JSON.parse(localStorage.getItem('golfUser')); } catch { return null; } })();
  const isOperator = checkIsOperator(user);
  const isGuest = user?.approvalStatus === 'guest' || user?.isGuest;

  const load = useCallback(() => {
    apiService.fetchFeed().then((r) => setItems(r.items || [])).catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  // 갤러리 열기용 booking 객체 확보
  useEffect(() => { apiService.fetchBookings().then(setBookings).catch(() => {}); }, []);

  const openGallery = (bookingId) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (b) setGalleryBooking(b);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 12px 90px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '6px 4px 12px' }}>소식</h1>
      {items === null ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>불러오는 중…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 14 }}>
          아직 게시물이 없어요.<br />라운딩 사진을 올리거나 첫 글을 남겨보세요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((it) => it.kind === 'round'
            ? <RoundPostCard key={`r-${it.id}`} item={it} currentUser={user}
                isOperator={isOperator} onOpenGallery={openGallery} />
            : <FreePostCard key={`f-${it.id}`} item={it} currentUser={user}
                isOperator={isOperator} onDeleted={() => load()} />)}
        </div>
      )}

      {!isGuest && (
        <button onClick={() => setComposing(true)} aria-label="글쓰기"
          style={{ position: 'fixed', right: 18, bottom: 'calc(72px + env(safe-area-inset-bottom))',
            width: 56, height: 56, borderRadius: '50%', border: 'none', background: '#0047AB',
            color: '#fff', fontSize: 28, boxShadow: '0 4px 14px rgba(0,71,171,0.4)', zIndex: 1500 }}>+</button>
      )}
      {composing && <ComposeFreePost onClose={() => setComposing(false)} onCreated={() => load()} />}
      {galleryBooking && (
        <MediaGallery booking={galleryBooking} onClose={() => { setGalleryBooking(null); load(); }} />
      )}
    </div>
  );
}
```

> `MediaGallery`의 import 경로/props(`booking`, `onClose`)는 `RoundingListV2.jsx`가 여는 방식과 동일하게 맞춘다. 다르면 그 사용처를 그대로 복제.

- [ ] **Step 5: 빌드 + 브라우저 확인**

Run: `npx vite build` → 성공.
Run: `npm run dev` → '소식' 탭에서:
- 사진 있는 지난 라운딩이 카드로, 최신순. 대표사진 탭 → 갤러리 열림.
- ♡ 토글 동작(숫자 즉시 반영). 💬 탭 → 댓글 펼침/작성.
- 우하단 + 버튼 → 작성 모달 → 글+사진 게시 → 피드 상단에 등장.
- 게스트 계정: + 버튼·댓글 입력창 안 보임, ♡는 가능.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/Feed.jsx src/pages/feed/RoundPostCard.jsx src/pages/feed/FreePostCard.jsx src/pages/feed/ComposeFreePost.jsx
git commit -m "feat(feed): 소식 피드 페이지 + 라운딩/자유글 카드 + 작성 모달"
```

---

## Task 9: 홈 배너 → /feed + 라운딩 '지난' 탭 정보 전용 재구성

**Files:**
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/RoundingListV2.jsx`

- [ ] **Step 1: Dashboard 배너 클릭 → /feed**

`src/pages/Dashboard.jsx`의 자동 "지난 정기모임" 배너 onClick(현재 sessionStorage + `navigate('/booking')`)을:
```jsx
onClick={() => navigate('/feed')}
```
로 변경. (sessionStorage `reopenGalleryBooking` 세팅 제거)

- [ ] **Step 2: RoundingListV2 '지난' 탭 — 사진 제거, 정보/스코어/시상 표시**

`src/pages/RoundingListV2.jsx`의 '지난' 탭 JSX(`viewMode === 'past'` 블록, ~645-719)에서 **사진 썸네일/`mediaPreviews`/`onClick={() => setGalleryBooking(b)}` 갤러리 진입을 제거**하고, 기록 카드로 교체:

```jsx
{viewMode === 'past' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {pastRegular.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 14 }}>
        지난 정기라운딩이 없습니다</div>
    ) : pastRegular.map((b) => {
      const parts = parseParticipants(b.participants);
      const names = parts.map((p) => p.name);
      const summary = names.length <= 4 ? names.join(', ') : `${names.slice(0, 4).join(', ')} 외 ${names.length - 4}명`;
      const d = new Date(b.date);
      return (
        <div key={b.id} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{b.title || '정기라운딩'}</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 3 }}>
            {d.getFullYear()}. {d.getMonth() + 1}. {d.getDate()} · {b.courseName}</div>
          <div style={{ fontSize: 13.5, color: '#475569', marginTop: 8 }}>
            👥 {parts.length}명 · {summary}</div>
          <button onClick={() => navigate(`/leaderboard?rounding=${encodeURIComponent(b.title || b.id)}`)}
            style={{ marginTop: 10, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8,
              background: '#F8FAFC', color: '#0047AB', fontWeight: 600, fontSize: 13.5, minHeight: 40 }}>
            스코어·시상 보기</button>
        </div>
      );
    })}
  </div>
)}
```

`mediaPreviews` 관련 state·useEffect(~138-146)와 import가 '지난' 탭에서만 쓰였다면 제거. (다른 곳에서 안 쓰면 깔끔히 삭제.) "스코어·시상 보기" 링크 경로는 기존 리더보드 진입 방식(`Leaderboard`가 받는 쿼리/state)에 맞춘다 — `MediaGallery` 안의 Leaderboard 이동 코드를 참고해 동일 형식 사용.

- [ ] **Step 3: 빌드 + 브라우저 확인**

Run: `npx vite build` → 성공.
Run: `npm run dev`:
- 홈 "지난 정기모임" 배너 클릭 → `/feed`로 이동.
- 라운딩 → '지난' 탭: 사진 없이 날짜·장소·참가자·"스코어·시상 보기" 버튼만. 버튼 → 리더보드.
- 사진은 '소식' 탭에서만 보임(중복 제거 확인).

- [ ] **Step 4: 커밋**

```bash
git add src/pages/Dashboard.jsx src/pages/RoundingListV2.jsx
git commit -m "feat(feed): 홈 배너 소식 연결 + 라운딩 지난 탭 정보/스코어 전용 전환"
```

---

## Task 10: 자동 통합 검증 (로컬 DB) + 사장님 로컬 dev 확인

- [ ] **Step 1: 백엔드 시나리오 자동 검증 (curl, 로컬 DB)**

`DATABASE_URL="$LOCAL_DB_URL"` 로 서버 실행 후 시드 회원 ID들로:
- 피드 목록: 라운딩 게시물+자유글 혼합·최신순, 사진 url 내려옴.
- 반응 토글 → liked/count 정상, 재호출 시 토글백.
- 댓글 작성/삭제 → 정회원 OK, 게스트 401, 작성자/운영자 삭제 OK·타인 403.
- 자유글 작성/삭제 → 정회원 OK, 게스트 401.
- 정렬: 시드 booking의 미디어 createdAt을 최신으로 바꾼 뒤 피드 재조회 → 해당 게시물이 최상단인지.

- [ ] **Step 2: 빌드 최종 확인**

Run: `npx vite build` → 성공.

- [ ] **Step 3: 사장님 로컬 dev 확인 요청 (게이트)**

메인 세션이 로컬 dev를 띄움:
```bash
DATABASE_URL="$LOCAL_DB_URL" npm run dev
```
사장님께 확인 항목 안내(브라우저 클릭):
- 소식 탭: 라운딩 사진 게시물 + 자유글 혼합·최신순, 썸네일 보임.
- ♡/💬 토글·댓글 작성, 자유글 작성(글+사진, 유튜브 링크 임베드, 인스타 링크 카드).
- 운영자: 남의 글/댓글 삭제. 게스트: +버튼·댓글창 숨김, ♡만.
- 네비 5개 + 더보기에 관리(운영자만). 라운딩 '지난' = 사진 없는 정보/스코어.
**사장님 OK를 받기 전까지 배포(Task 11) 진행 금지.**

---

## Task 11: 운영 배포 (메인 세션 + 사장님 확인 — 서브에이전트 금지)

- [ ] **Step 1: 운영 DB에 새 테이블 4개 추가 (유일한 운영 접촉, 사장님 확인 후)**

기존 데이터 컬럼 변경 0, 신규 테이블 4개만 추가 → 기존 데이터 무손상. 사장님 확인 후:
```bash
# .env의 DATABASE_URL(운영)을 그대로 사용 — db push만, migrate 금지
npx prisma db push
```
Expected: `FeedPost`/`FeedPostMedia`/`Reaction`/`Comment` 4개 테이블만 추가됨. 만약 prisma가 기존 테이블 변경/삭제/리셋을 경고하면 **즉시 중단하고 사장님께 보고**(예상과 다름 = 진행 금지).

- [ ] **Step 2: Plan.md 갱신**

`Plan.md` "현재 상태" 표에 `| 9 | 소식 커뮤니티 피드 | ✅ 완료 (YYYY-MM-DD) |` 추가, 우선순위 문구 갱신, Phase 9 상세 섹션 추가(구현 메모: 공용 Reaction/Comment 다형성 테이블, 자유글 정회원 전용·게스트 반응만, 유튜브 임베드/링크카드, 라운딩 지난 탭 정보전용 전환, 운영 db push로 테이블 추가).

- [ ] **Step 3: 커밋 + 푸시 (배포)**

```bash
git add Plan.md
git commit -m "docs(plan): Phase 9 소식 커뮤니티 피드 완료"
git push
```
(푸시 시 Railway 자동 배포.)

- [ ] **Step 4: 배포 후 운영 확인**

배포 완료 후 실제 앱에서: 소식 탭 로드, 라운딩 게시물 표시, 반응/댓글 1회 동작 확인. 이상 시 즉시 보고.

---

## Self-Review (스펙 대비 점검)

- **스펙 §3 네비(소식 추가/관리 이동):** Task 6 ✅
- **스펙 §4.1 라운딩 자동게시물(사진 ≥1, 미래·아카이브 제외, 대표사진):** Task 3 Step1 + Task 8 RoundPostCard ✅
- **스펙 §4.2 자유 사진글(정회원):** Task 4 + Task 8 Compose/FreePostCard ✅
- **스펙 §4.2.1 링크(유튜브 임베드/인스타·일반 카드):** Task 7 LinkEmbed ✅ (일반 OG 서버프리뷰는 v1 제외 — 스펙 폴백 허용 범위)
- **스펙 §4.3 정렬(새 사진 위로):** Task 3 feedTs=max(media.createdAt) ✅
- **스펙 §4.4 반응(게시물 단위, 게스트 가능):** Task 3 toggle(requireAuthOrGuest) + Task 7 ReactionBar ✅
- **스펙 §4.5 댓글(정회원, 본인/운영자 삭제):** Task 3 comments(requireAuth) + delete(작성자·isOperator) + Task 7 CommentSection ✅
- **스펙 §4.6 권한 표:** requireAuth(정회원만 작성/댓글) vs requireAuthOrGuest(조회·반응) ✅
- **스펙 §5 공용 다형성 테이블:** Task 1 Reaction/Comment(targetType) ✅
- **스펙 §6 홈 배너 → 소식:** Task 9 Step1 ✅
- **스펙 §7 지난 탭 정보전용:** Task 9 Step2 ✅
- **스펙 §8 엣지(고아 정리, ready만, 게스트 이중방어, 빈 피드):** Task 3·4·8에 반영 ✅
- **스펙 §9 범위 밖(알림·@멘션·사진별댓글·무한스크롤·대댓글·Post마이그레이션·게스트작성):** 미구현 유지 ✅

**미해결/구현 시 확정 필요:**
- Task 2의 `processJobsInBackground`/job 객체 필드명 — 기존 media.js 실제 형태에 맞춰 확정.
- `compressImageFile`·`MediaGallery` import 경로 — 기존 사용처 그대로 차용.
- 리더보드 진입 쿼리 형식 — 기존 진입부 그대로 차용.
