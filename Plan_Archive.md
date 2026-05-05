# Plan_Archive.md — 3355 골프 클럽 앱

> Plan.md에서 완료된 항목과 배경 자료를 이곳으로 이동.  
> 현재 진행 작업은 **Plan.md** 참조.

---

## 목차

1. [프로젝트 개요 및 기술 스택](#1-프로젝트-개요-및-기술-스택)
2. [문제점 분석 (초기)](#2-문제점-분석-초기)
3. [잘 되어 있는 부분](#3-잘-되어-있는-부분)
4. [리팩토링 전략](#4-리팩토링-전략)
5. [PRD 대비 변경사항](#5-prd-대비-변경사항)
6. [완료된 Phase 상세](#6-완료된-phase-상세)
7. [작업 진행 기록](#7-작업-진행-기록)

---

## 1. 프로젝트 개요 및 기술 스택

- **앱 이름:** 3355 골프 클럽
- **목적:** 골프 동호회 운영 관리 (회원, 라운딩, 회비, 스코어, 게임)
- **플랫폼:** 웹 앱 (모바일 브라우저 최우선, PWA)
- **호스팅:** Railway (2026-04-14 Replit에서 이전 완료)

| 영역 | 기술 | 버전 |
|------|------|------|
| 프론트엔드 | React | 19.2.0 |
| 빌드 | Vite | 7.2.0 |
| 라우팅 | React Router | 7.9.5 |
| 백엔드 | Express.js | 4.21.2 |
| ORM | Prisma | 6.19.0 |
| DB | PostgreSQL | Railway 호스팅 |
| 실시간 | Socket.IO | 4.8.1 |
| 상태관리 | Context API | AuthContext, BookingContext 등 분리 완료 |
| UI | 순수 CSS + 인라인 스타일 | Azure Modern 디자인 시스템 |

---

## 2. 문제점 분석 (초기)

### 🔴 P0 - 치명적 (해결 완료)

| ID | 문제 | 상태 |
|----|------|------|
| P0-1 | API 인증/인가 완전 부재 | ✅ Phase 1-5 |
| P0-2 | 잔액 계산 로직 5회 이상 중복 | ✅ Phase 1-1 |
| P0-3 | DB 트랜잭션 미사용 (금융) | ✅ Phase 1-2 |
| P0-4 | 참가 처리 로직 프론트/백 이중화 | ✅ Phase 1-3 |

### 🟠 P1 - 구조 문제

| ID | 문제 | 상태 |
|----|------|------|
| P1-1 | 거대 컴포넌트 3개 (합계 6,500줄) | ✅ 분리 완료 (Phase 2) |
| P1-2 | 인라인 스타일 남용 | ✅ 전략 확정 (CSS 변수 기반) |
| P1-3 | server/api.js 단일 파일 2,854줄 | ✅ 도메인별 분리 (Phase 1-4) |
| P1-4 | AppContext 만능 저장소 | ✅ 도메인별 분리 (Phase 2A) |
| P1-5 | participants: String[] + JSON | ⏸️ Phase 5로 이연 |

### 🟡 P2 - 개선 필요

| ID | 문제 | 상태 |
|----|------|------|
| P2-1 | 댓글/좋아요 JSON 필드 (동시성) | ⏸️ Phase 5로 이연 |
| P2-2 | DB 타입 오류 | ⏸️ Phase 5로 이연 |
| P2-3 | Booking JSON 필드 과다 | ⏸️ Phase 5로 이연 |
| P2-4 | 금액 표기 $ → ₩ | ✅ 완료 |
| P2-5 | 역할 체크 하드코딩 산재 | ✅ 유틸 함수화 |
| P2-6 | 정적 파일 캐시 비활성화 | ✅ Phase 1-7 |
| P2-7 | Socket.IO 전체 재조회 방식 | 유지 (우선순위 하락) |
| P2-8 | MemberInfoForm 라우터 외부 처리 | ✅ Phase 2A |
| P2-9 | 중복 라우트 (/booking, /v2/roundings) | ✅ /v2 redirect로 호환 |

---

## 3. 잘 되어 있는 부분

- ✅ CSS 변수 시스템 (globals.css)
- ✅ 반응형 미디어 쿼리 5단계
- ✅ safe-area-inset 대응
- ✅ 접근성 (reduced-motion, high-contrast)
- ✅ 터치 최적화 (min-height: 44px)
- ✅ 회원 사진 제외 조회 최적화
- ✅ 소프트 삭제 패턴
- ✅ Socket.IO 디바운스
- ✅ useMemo/useCallback/memo 사용
- ✅ 활동 로그 자동 정리
- ✅ 중복 가입 방지
- ✅ 승인 시스템

---

## 4. 리팩토링 전략

**채택: 점진적 리팩토링**

1. 서비스 중단 없이 한 영역씩 교체
2. 가장 위험한 것(금융 안정성)부터 해결
3. 구조 개선과 기능 변경을 병행
4. 각 Phase 완료 후 테스트 → 다음 Phase

**순서 결정 근거:**
- Phase 1 (서버 안정화) 먼저: 프론트를 아무리 바꿔도 서버가 불안하면 버그 재발
- Phase 2 (프론트 + Play): 컴포넌트 분리 후 안정성 로직 구현 가능
- Phase 3 (월간 정산): 서버 금융 로직 안정 후 새 기능 추가
- Phase 4 (게스트): 독립적 기능이므로 마지막에 추가
- Phase 5 (DB 정리): 모든 기능 안정화 후 스키마 개선

---

## 5. PRD 대비 변경사항

### 신규 기능

| 기능 | Phase | 상세 |
|------|-------|------|
| 게스트 초대링크 | 4 | 회원가입 없이 링크 접속 → 스코어 입력 → 리더보드 |
| 월간 정산 보고서 | 3 | 입출금 입력 → 보고서 자동 생성 → 앱 내 조회 |
| 이월 시스템 | 3 | 잔여금 다음달 자동 이월 |
| Railway 인프라 이전 | 6 | git push → 자동 배포 |
| Stableford + Pickup | 8 | 스테이블포드 포인트 계산, 픽업(P) 버튼 |

---

## 6. 완료된 Phase 상세

---

### Phase 1: 서버 안정화 및 구조 개선 ✅

| # | 작업 | 상태 |
|---|------|------|
| 1-1 | 잔액 계산 함수 통일 (`server/utils/balance.js`) | ✅ |
| 1-2 | prisma.$transaction 적용 (4개 금융 엔드포인트) | ✅ |
| 1-3 | 참가 처리 서버 통일 (Dashboard.jsx 프론트 로직 제거) | ✅ |
| 1-4 | api.js 도메인별 분리 (routes/members, bookings, scores 등) | ✅ |
| 1-5 | 인증 미들웨어 추가 | ✅ |
| 1-6 | 역할 체크 유틸 함수화 (isAdmin, isOperator) | ✅ |
| 1-7 | 정적 파일 캐시 설정 | ✅ |
| 1-8 | DashboardSample 삭제 | ✅ |
| 1-9 | 중복 라우트 정리 (/v2/roundings) | ⏭️ 스킵 — 현재 사용 중인 UI라 redirect로 호환 유지 |

---

### Phase 2: 프론트엔드 구조 개선 + 모바일 UI + Play 안정성 ✅

#### 2-A: 프론트 기반 구조

| # | 작업 | 상태 |
|---|------|------|
| 2A-1 | AppContext → AuthContext, BookingContext, PostContext, FinanceContext 분리 | ✅ |
| 2A-2 | 공통 유틸 정리 (parseParticipants, formatCurrency₩, 역할 체크, 날짜) | ✅ |
| 2A-3 | 스타일 전략 확정 (인라인 스타일 + CSS 변수 단일 소스) | ✅ |
| 2A-4 | 라우트 정리 (MemberInfoForm 인증 라우터 내부로, /booking으로 통일) | ✅ |

#### 2-B: 페이지별 재작성 (모바일 퍼스트)

| # | 작업 | 상태 |
|---|------|------|
| 2B-0 | Azure Modern 디자인 시스템 적용 | ✅ |
| 2B-1 | Dashboard 분리/재작성 (1,683줄 → 474줄) | ✅ |
| 2B-2 | Navigation 개선 (active pill, SVG 아이콘) | ✅ |
| 2B-3 | RoundingListV2 분리/재작성 (2,839줄 → 6개 파일, 메인 472줄) | ✅ |
| 2B-4 | Fees 재작성 (BottomSheet 패턴) | ✅ |
| 2B-5 | 나머지 페이지 모바일 파인튜닝 | ✅ |

#### 2-C: Play 안정성 강화

| # | 작업 | 상태 |
|---|------|------|
| 2C-1 | Play 컴포넌트 분리 | 🚫 영구 보류 — 안정성 로직 집중 유지 |
| 2C-2 | 홀 점수 변경 → localStorage + 서버 동시 저장 | ✅ |
| 2C-3 | 앱 복귀 시 서버/로컬 비교 → 최신 데이터 복원 | ✅ |
| 2C-4 | 오프라인 큐: 실패 시 큐 → 네트워크 복구 시 재시도 | ✅ |
| 2C-5 | 중단/재개 명확 분리 | ✅ |
| 2C-6 | visibilitychange, beforeunload, pagehide 대응 | ✅ |
| 2C-7 | 게스트도 동일한 안정성 보장 | ✅ (Phase 4에서 처리) |
| 2C-8 | 모든 서버 호출에 인증 헤더 추가 | ✅ |
| 2C-9 | 스와이프 홀 이동 + 슬라이드 애니메이션 | ✅ |

---

### Phase 3: 월간 정산 시스템 ✅

| # | 작업 | 상태 |
|---|------|------|
| 3-1 | 정산 데이터 모델 설계 (MonthlySettlement 테이블) | ✅ |
| 3-2 | 입출금 간편 입력 UI (30초 이내) | ✅ |
| 3-3 | 참가비 2경로 명확화 (직접참가 자동청구 + 운영진 등록) | ✅ |
| 3-4 | 정산 보고서 페이지 | ✅ |
| 3-5 | 이월 시스템 (잔여금 다음달 자동 이월) | ✅ |
| 3-6 | 크레딧 정리 (지급, 회비 납부 사용, 도네이션) | ✅ |

---

### Phase 4: 게스트 초대링크 ✅

| # | 작업 | 상태 |
|---|------|------|
| 4-1 | 초대링크 생성 (라운딩별 고유 토큰, 공유 URL) | ✅ |
| 4-2 | 게스트 접속 페이지 (이름/핸디캡 입력 → Play 진입) | ✅ |
| 4-3 | 게스트 인증 (토큰 기반 임시 세션) | ✅ |
| 4-4 | 리더보드 게스트 표시 | ✅ |
| 4-5 | 게스트 데이터 영구 보존 | ✅ |

---

### Phase 6: 인프라 이전 (Replit → Railway + GitHub) ✅

**결과:** `3355-production.up.railway.app` 정상 운영 중

| 항목 | 내용 |
|------|------|
| GitHub | Private Repo, git push → Railway 자동 배포 |
| Railway | PostgreSQL + Express + Socket.IO 통합 |
| 빌드 | Custom Build: `npm run build`, Pre-deploy: `npx prisma db push`, Start: `npm start` |
| 포트 | PORT=8000 (Variables에 수동 설정 필수 — Railway 자동 주입 안 함) |
| DB URL | DATABASE_URL에 public URL literal 사용 (internal URL 함정 주의) |

**주요 해결 이슈:**
- PORT 환경변수 미설정 시 서버(5000) ↔ 프록시(8000) 불일치 → 502 Bad Gateway
- dist 폴더가 .gitignore에 포함 → Start Command에서 빌드 포함 필요
- Railway 프로젝트 2개 중 잘못된 프로젝트에 GitHub 연결 → 재연결

---

### Phase 8-A: 골프장 API 교체 ✅

| # | 작업 | 상태 |
|---|------|------|
| 8A-1 | 무료 골프장 API 조사 | ✅ GolfCourseAPI (300req/day) 선정 |
| 8A-2 | API 연동 테스트 | ✅ |
| 8A-3 | `POST /api/courses/search` 교체 (Anthropic AI → GolfCourseAPI) | ✅ |
| 8A-4 | SI 자동 조회: GolfCourseAPI → bluegolf 스크래핑 → 수동 입력 | ✅ |

---

### Phase 8-B: Course 모델 확장 + 골프장 관리 UI ✅

| # | 작업 | 상태 |
|---|------|------|
| 8B-1 | Course 스키마 확장 (holeIndexes, tees, 위치 정보, externalId) | ✅ |
| 8B-2 | Admin 편집 UI: ScorecardGrid에 SI·티별거리 통합 | ✅ |
| 8B-3 | SI 직접 입력 UI (18홀 수동 입력, 중복 검증) | ✅ |
| 8B-4 | API 검색 시 tees/SI/좌표 자동 저장 | ✅ |

---

### Phase 8-C: Stableford 점수 표시 ✅

| # | 작업 | 상태 |
|---|------|------|
| 8C-1 | Stableford 계산 유틸 | ✅ |
| 8C-2 | Play.jsx 스코어카드 Stableford 표시 + Pickup(P) 버튼 | ✅ |
| 8C-3 | Leaderboard 스코어카드 모달에 "P" 표시 | ✅ |
| 8C-4 | 스코어 히스토리에 Stableford 총점 표시 | ⬜ 미완료 (Plan.md 참조) |

**Pickup(P) 설계:**
- 누르면 `score = par + extraStrokes + 2` (넷 더블보기 = 0pts) 자동 입력
- +/− 또는 PAR 버튼 직접 수정 시 P 마크 자동 OFF
- SI 데이터 있을 때만 노출
- `pickedUpHoles` → localStorage + `gameMetadata` JSON 필드에 영속화

---

## 7. 작업 진행 기록

### 2026-04-07 (Day 1)
- [x] Phase 0: 프로젝트 분석 완료 (치명적 4건, 구조 5건, 개선 9건 식별)
- [x] Plan.md v1 작성

### 2026-04-08 (Day 2)
- [x] PRD.md 수신 및 정리
- [x] Plan.md v2 전면 업데이트 (PRD 반영, 5 Phase 체계)
- [x] 컬러 팔레트 확정: Option B 스카이 블루(#0284C7) + 그린 포인트(#16A34A)
- [x] Phase 1-1: 잔액 계산 함수 통일 (`server/utils/balance.js`)
- [x] Phase 1-2: prisma.$transaction 적용
- [x] Phase 1-3: 참가 처리 서버 통일

### 2026-04-09 (Day 3)
- [x] Azure Modern 디자인 시스템 전체 페이지 적용
- [x] PageHeader 통일 (RootHeader / SubHeader)
- [x] Play.jsx 모바일 화면 상단 잘림 수정
- [x] 대시보드 공지 기능 (isFeatured, FeaturedBanner)

### 2026-04-13 (Day 5)
- [x] Play.jsx 스코어카드 UI 파인튜닝 (PAR 배지, TOTAL/O/U 확대, HC 배지 인라인)
- [x] 스와이프 홀 이동 (2C-9) — Android/iOS 크로스플랫폼 디버깅 포함
  - document-level listeners + React 완전 우회로 최종 해결
  - `zoom: 0.85` hack 시도 → 실패 → 제거
- [x] iOS PWA 폰트 확대 수정 (Dynamic Type 대응)

### 2026-04-13 (Day 6)
- [x] 캐주얼 라운딩 기능 구현 (CreateBookingModal 3번째 옵션, CasualForm)
- [x] 캐주얼 생성 시 초대링크 자동 생성 + Web Share API 공유
- [x] Play.jsx 스코어카드 헤더 재설계 (1행 통합, 점수확인 버튼)
- [x] 3인 순환 마커 버그 수정 (자기 입력 덮어쓰기 문제)

### 2026-04-14 (Day 7)
- [x] 캐주얼 라운딩 골프장 AI 검색 → GolfCourseAPI (Phase 8-A 선행)
- [x] 초대링크 공유 버튼 3단계 fallback 수정
- [x] GuestJoin.jsx 사전 등록 게스트 자동 선택 UI
- [x] 드롭다운 iOS 터치 버그 수정 (backdrop 제거, onBlur 딜레이 200ms)

**미완(다음 세션으로 이월):**
- 게스트 캐주얼 링크 접속 시 이름 재입력 문제
- 게스트 등록 후 Play 대신 Login으로 리다이렉트
- 4인 이하 조편성 skip

### 2026-04-14 (Day 8) — iOS PWA 파인튜닝
- [x] 게스트 → 로그인 리다이렉트 버그 수정 (guestSession 체크)
- [x] GuestJoin navigate 경로 통일 (`?bookingId=` → `?id=`)
- [x] 4인 이하 조편성 skip 구현 (이후 오판 확인 → Day 10에 재설계)
- [x] 캐주얼 주최자 자동 첫 참가자 등록 + "나" 배지 + 빈 자리 3개 점선
- [x] 날짜/시간 입력칸 iOS 사이즈 버그 전체 수정 (globals.css 전역 규칙)
- [x] Navigation 마이페이지 제거 (프로필 아바타 클릭으로 접근)
- [x] Fees 아이콘 인라인 SVG 교체, 원형 배경
- [x] 모든 바텀시트 네비게이션 바 가림 문제 수정

### 2026-04-14 (Day 9) — iOS PWA 네비게이션 버그 수정
- [x] `zoom: 0.85` hack 완전 제거 (root에 적용 시 fixed 요소 containing block 깨짐)
- [x] 하단 네비게이션 아이콘 전면 redesign (Indeed 스타일 dual-tone SVG)

### 2026-04-14 (Phase 6) — Railway 인프라 이전
- [x] GitHub → Railway 연동 및 최초 배포
- [x] Replit DB → Railway DB 데이터 이전 (pg_dump/psql)
- [x] 포트 불일치 문제 해결 (PORT=8000 수동 설정)
- [x] `3355-production.up.railway.app` 정상 접속 확인

**Railway 환경 트러블슈팅 기록:**
1. DATABASE_URL 누락 → 서버 DB 연결 실패
2. dist 폴더 .gitignore → 런타임 이미지에 미포함
3. 빌드+서버 Start Command에 통합 필요
4. Networking 포트 5000 ↔ 서버 8080 불일치
5. PORT env var 수동 설정 필요 (Railway 자동 주입 안 함)

### 2026-04-16 (Day 10)
- [x] "4인 이하 조편성 skip" 오판 정정 + 앱설정 기반 재설계
  - 기본값: 정기모임/컴페티션 ON, 캐주얼 OFF
  - `participantCount >= 4`이면 조편성 필요 안내
- [x] GolfCourseAPI 교체 (Phase 8-A ✅)
- [x] Course 모델 확장 (Phase 8-B ✅)
- [x] 게스트 초대링크 날짜 제한 제거
- [x] 게스트 자동 참가비 청구 (auto-billing)
- [x] 정산 페이지 게스트/회원 분리 표시
- [x] GuestJoin 날짜 분기 (당일 → Play 이동, 미래 → 확인 화면)
- [x] 마커 선택 화면 게스트 표시 버그 수정 (extraGuests fallback)
- [x] 라운딩 카드 "지도보기" 버튼 추가 (Phase 8-D 부분)
- [x] Settlement 지출 삭제 버튼 + ChargeDetailSheet 컴포넌트 추가

### 2026-04-16 (Day 11)
- [x] 아프로후테 잔액 버그 수정 (charge 중복 생성 → 멱등성 보장)
- [x] 게스트 추가 시 charge 미생성 버그 수정 (`/bookings/:id/add-guest` 엔드포인트)
- [x] 게스트 삭제 시 charge 미삭제 버그 수정 (participant에 id 포함)
- [x] 게스트 등록 완료 후 소켓 이벤트 emit 누락 추가

### 2026-04-28 (Day 12)
- [x] Play ScoreSection 리디자인 (4개 독립 박스 → 단일 카드)
- [x] NTP 버튼 이름 줄 오른쪽으로 이동
- [x] Pickup(P) 버튼 구현 (스테이블포드 픽업 자동 기록, Phase 8-C)
- [x] Pickup 영속화 (localStorage + gameMetadata)
- [x] Leaderboard 스코어카드 모달 "P" 표시

### 2026-04-28 (Day 12 추가)
- [x] 공지사항 게시글/댓글 수정·삭제 기능 (⋮ 메뉴 UI)
- [x] 백엔드 권한 검사 보강 (canManagePost, canManageComment)
- [x] 댓글/좋아요 전용 엔드포인트 신설
- [x] DashboardBoard.jsx 신규 엔드포인트로 마이그레이션

### 2026-05-01 (Day 13)
- [x] 자동 활성화 시점 변경: "라운딩 30분 전" → **"라운딩 당일 시드니 0시"**
- [x] 시드니 타임존 정확화 (`Intl.DateTimeFormat`, DST 자동 반영)

### 2026-05-02 (Day 14)
- [x] 환불 처리 시 회원 잔액 차감 버그 수정 (`EXCLUDED_EXPENSE_CATEGORIES = ['환불']`)
- [x] outstanding 엔드포인트 월별 필터 적용 (yearMonth 파라미터)
- [x] 서버 시작 시 잔액 일괄 재계산 (`recalculateAllBalances`)

### 2026-05-02 (Day 14 추가)
- [x] '회원 크레딧' 트랜잭션 type 보정 (expense → credit 자동 변환)
- [x] 부킹 fee 변경 시 charge 자동 동기화 (PUT bookings handler)
- [x] 5월 정기라운딩 charge 일괄 정정 (1회성 마이그레이션)
- [x] Jacob/동백의 5월 부적절 트랜잭션 4건 삭제

### 2026-05-02 (Day 14 추가 #3)
- [x] `/api/transactions/member/:memberId` select에 `receiptImage`, `receiptImages`, `bookingId` 추가 (영수증 사라짐 버그 수정)
- [x] ChargeDetailSheet에 영수증 표시 + "영수증 보기" + "납부완료" 버튼
- [x] `pending-receipts` 엔드포인트 — 납부된 charge 자동 필터링
