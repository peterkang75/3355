# 3355 골프 클럽 앱 - 리팩토링 계획서 (Plan.md)

> 최초 작성일: 2026-04-07
> 최종 수정일: 2026-04-14 (Phase 6 Railway 이전 — 포트 설정 문제 해결 완료, 배포 성공)
> 상태: Phase 1 완료, Phase 2 일부 완료, Phase 2C → Phase 3 → Phase 4 → Phase 5 → Phase 2B(모바일 파인튜닝) 순서로 진행
> 참조 문서: PRD.md

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [현재 기술 스택](#2-현재-기술-스택)
3. [프로젝트 구조 (현재)](#3-프로젝트-구조-현재)
4. [코드 규모 현황](#4-코드-규모-현황)
5. [문제점 분석](#5-문제점-분석)
6. [잘 되어 있는 부분](#6-잘-되어-있는-부분)
7. [리팩토링 전략](#7-리팩토링-전략)
8. [PRD 대비 변경사항 요약](#8-prd-대비-변경사항-요약)
9. [Phase별 작업 계획](#9-phase별-작업-계획)
10. [작업 진행 기록](#10-작업-진행-기록)

---

## 1. 프로젝트 개요

- **앱 이름:** 3355 골프 클럽
- **목적:** 골프 동호회 운영 관리 (회원, 라운딩, 회비, 스코어, 게임)
- **플랫폼:** 웹 앱 (모바일 브라우저 최우선, PWA)
- **호스팅:** Replit
- **DB:** PostgreSQL (Replit 내장)

---

## 2. 현재 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 프론트엔드 | React | 19.2.0 |
| 빌드 | Vite | 7.2.0 |
| 라우팅 | React Router | 7.9.5 |
| 백엔드 | Express.js | 4.21.2 |
| ORM | Prisma | 6.19.0 |
| DB | PostgreSQL | - |
| 실시간 | Socket.IO | 4.8.1 |
| 상태관리 | Context API | 단일 AppContext |
| UI | 없음 | 순수 CSS + 인라인 스타일 |

---

## 3. 프로젝트 구조 (현재)

```
golf-club-app/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/
├── server/
│   ├── scripts/compress-photos.js
│   ├── api.js              ← 단일 파일 2,854줄
│   ├── db.js
│   └── server.js
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   ├── booking/
│   │   ├── Navigation.jsx
│   │   ├── InstallPrompt.jsx
│   │   ├── KakaoTalkBanner.jsx
│   │   ├── CrownIcon.jsx
│   │   └── LoadingButton.jsx
│   ├── contexts/
│   │   └── AppContext.jsx   ← 단일 파일 645줄
│   ├── hooks/
│   │   └── useActivityTracker.js
│   ├── pages/
│   │   ├── Dashboard.jsx        ← 1,683줄
│   │   ├── Play.jsx             ← 2,110줄
│   │   ├── RoundingListV2.jsx   ← 2,759줄
│   │   ├── DashboardSample.jsx  ← 삭제 대상
│   │   └── (기타 15개 페이지)
│   ├── services/api.js
│   ├── styles/globals.css, theme.js
│   ├── utils/handicap.js
│   └── App.jsx
└── package.json
```

---

## 4. 코드 규모 현황

| 파일 | 줄 수 | 심각도 |
|------|------|--------|
| server/api.js | 2,854 | 🔴 |
| RoundingListV2.jsx | 2,759 | 🔴 |
| Play.jsx | 2,110 | 🔴 |
| Dashboard.jsx | 1,683 | 🔴 |
| AppContext.jsx | 645 | 🟡 |
| globals.css | ~500 | 🟢 |
| server.js | ~140 | 🟢 |
| Navigation.jsx | ~100 | 🟢 |

---

## 5. 문제점 분석

### 🔴 P0 - 치명적 (즉시 해결)

| ID | 문제 | 영향 |
|----|------|------|
| P0-1 | API 인증/인가 완전 부재 | 누구나 회원 데이터 수정/삭제 가능 |
| P0-2 | 잔액 계산 로직 5회 이상 중복 | 하나 수정 시 나머지 불일치 → 잔액 버그 |
| P0-3 | DB 트랜잭션 미사용 (금융) | 중간 오류 시 데이터 정합성 깨짐 |
| P0-4 | 참가 처리 로직 프론트/백 이중화 | 중복 청구 또는 누락 가능 |

### 🟠 P1 - 구조 문제

| ID | 문제 |
|----|------|
| P1-1 | 거대 컴포넌트 3개 (합계 6,500줄) |
| P1-2 | 인라인 스타일 남용 (미디어 쿼리 불가) |
| P1-3 | server/api.js 단일 파일 2,854줄 |
| P1-4 | AppContext 만능 저장소 (전체 리렌더링) |
| P1-5 | participants: String[] + JSON 문자열 구조 |

### 🟡 P2 - 개선 필요

| ID | 문제 |
|----|------|
| P2-1 | 댓글/좋아요 Json 필드 (동시성 문제) |
| P2-2 | DB 타입 오류 (isClubMember:String, amount:Float 등) |
| P2-3 | Booking Json 필드 과다 |
| P2-4 | 금액 표기 $ → ₩ |
| P2-5 | 역할 체크 하드코딩 산재 |
| P2-6 | 정적 파일 캐시 비활성화 |
| P2-7 | Socket.IO 전체 재조회 방식 |
| P2-8 | MemberInfoForm 라우터 외부 처리 |
| P2-9 | 중복 라우트 (/booking, /v2/roundings) |

---

## 6. 잘 되어 있는 부분 (유지)

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

## 7. 리팩토링 전략

### 채택: 점진적 리팩토링

**원칙:**
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

## 8. PRD 대비 변경사항 요약

### 신규 기능
| 기능 | Phase | 상세 |
|------|-------|------|
| 게스트 초대링크 | 4 | 회원가입 없이 링크 접속 → 스코어 입력 → 리더보드 표시 |
| 월간 정산 보고서 | 3 | 입출금 입력 → 보고서 자동 생성 → 앱 내 조회 |
| 이월 시스템 | 3 | 잔여금 다음달 자동 이월 |

### 기능 변경/강화
| 기능 | Phase | 상세 |
|------|-------|------|
| Play 안정성 | 2 | 어떤 상황에서도 스코어 무손실 보장 |
| 참가비 2경로 | 3 | 직접참가 자동청구 + 운영진 등록 |
| 입출금 UX | 3 | 모바일 30초 이내 처리 |
| 모바일 UI | 2 | 인라인 스타일 제거, 모바일 퍼스트 |

### 삭제
| 대상 | Phase |
|------|-------|
| DashboardSample 페이지 | 1 |

---

## 9. Phase별 작업 계획

---

### Phase 1: 서버 안정화 및 구조 개선
> 목표: 금융 버그 해결, 보안 강화, 서버 코드 유지보수성 확보
> 예상 기간: 1~2주

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 1-1 | 잔액 계산 함수 통일 | `server/utils/balance.js` 생성, api.js 14곳 수정, outstanding 버그 수정 | ✅ 완료 |
| 1-2 | prisma.$transaction 적용 | 4개 엔드포인트 금융 트랜잭션 원자적 처리 | ✅ 완료 |
| 1-3 | 참가 처리 서버 통일 | Dashboard.jsx 프론트 트랜잭션 생성/삭제 제거 | ✅ 완료 |
| 1-4 | api.js 도메인별 분리 | routes/members, bookings, scores, transactions 등 | ✅ 완료 |
| 1-5 | 인증 미들웨어 추가 | 기본 인증 + 역할 기반 접근 제어 | ✅ 완료 |
| 1-6 | 역할 체크 유틸 함수화 | isAdmin, isOperator 등 공용 함수 | ✅ 완료 |
| 1-7 | 정적 파일 캐시 설정 | API만 no-cache, 정적 파일 캐시 허용 | ✅ 완료 |
| 1-8 | DashboardSample 삭제 | 라우트 및 파일 제거 | ✅ 완료 |
| 1-9 | 중복 라우트 정리 | /v2/roundings 제거 | ⏭️ 스킵 — /v2/roundings가 현재 사용 중인 UI, 제거 불가 |

**완료 기준:**
- [x] 잔액 계산이 한 곳에서만 이루어짐
- [x] 금융 로직이 DB 트랜잭션으로 보호됨
- [x] 참가비 중복 청구 불가능
- [x] API 무단 접근 차단됨

---

### Phase 2: 프론트엔드 구조 개선 + 모바일 UI + Play 안정성
> 목표: 모바일 퍼스트 UI, 컴포넌트 분리, Play 무손실 보장
> 예상 기간: 2~4주

#### 2-A: 프론트 기반 구조

| # | 작업 | 상태 |
|---|------|------|
| 2A-1 | AppContext → AuthContext, BookingContext, PostContext, FinanceContext 분리 | ✅ 완료 |
| 2A-2 | 공통 유틸 정리 (parseParticipants, formatCurrency₩, 역할 체크, 날짜) | ✅ 완료 (checkIsOperator 중앙화, 6개 파일 인라인 패턴 제거) |
| 2A-3 | 스타일 전략 확정 (CSS Module / Tailwind / 클래스 기반) | ✅ 완료 (전략: 인라인 스타일 + CSS 변수 단일 소스. theme.js 의존성 제거, Button/Badge/BookingBottomSheet/CreateBookingModal/BookingListCard 수정) |
| 2A-4 | 라우트 정리 (22개 축소, MemberInfoForm 라우터 내부로) | ✅ 완료 (/v2/roundings → redirect 유지(호환성), MemberInfoForm 인증 라우터 내부로 이동, 공유 URL /booking으로 통일) |

#### 2-B: 페이지별 재작성 (모바일 퍼스트) — ⏸️ 파인튜닝은 마지막으로 이동

> Azure Modern 디자인 시스템 적용은 완료. 컴포넌트 분리 및 인라인 스타일 제거 등 세밀한 작업은 기능 개발 후 마지막에 진행.

| # | 작업 | 현재 줄 수 | 목표 | 상태 |
|---|------|----------|------|------|
| 2B-0 | Azure Modern 디자인 시스템 적용 (색상, 폰트, 헤더 통일) | - | 전체 페이지 | ✅ 완료 |
| 2B-1 | Dashboard 분리/재작성 | 1,683줄 | 200줄 이하 | ✅ 완료 (474줄, 구조 양호) |
| 2B-2 | Navigation 개선 | 100줄 | 모바일 최적화 | ✅ 완료 (active pill indicator, SVG 메뉴 아이콘) |
| 2B-3 | RoundingListV2 분리/재작성 | 2,839줄 | 200줄 이하 | ✅ 완료 (6개 파일 분리, 메인 472줄) |
| 2B-4 | Fees 재작성 (월간 정산 준비) | - | 모바일 UX | ✅ 완료 (BottomSheet 패턴, EditModal 완성, paymentGuideText 배너) |
| 2B-5 | 나머지 페이지 모바일 파인튜닝 | - | - | ✅ 완료 (MyPage console.log 제거, MemberDetail dead code 정리, Board/Menu/Settlement/Login 점검 이상없음) |

#### 2-C: Play 안정성 강화 ⭐

| # | 작업 | 상태 |
|---|------|------|
| 2C-1 | Play 컴포넌트 분리 (2,110줄 → 각 200줄) | 🚫 영구 보류 — 안정성 로직 집중 유지, 리스크 대비 이득 없음 |
| 2C-2 | 이중 저장: 홀 점수 변경 → localStorage + 서버 동시 저장 | ✅ 완료 |
| 2C-3 | 복원: 앱 복귀 시 서버/로컬 비교 → 최신 데이터 복원 | ✅ 완료 |
| 2C-4 | 오프라인 큐: 저장 실패 시 큐 → 네트워크 복구 시 재시도 | ✅ 완료 |
| 2C-5 | 중단/재개: "저장하고 멈추기" vs "저장 안 하고 멈추기" 명확 분리 | ✅ 완료 (기존 UI 유지) |
| 2C-6 | 앱 상태 이벤트: visibilitychange, beforeunload, pagehide 대응 | ✅ 완료 |
| 2C-7 | 게스트도 동일한 안정성 보장 | ⏸️ 보류 (Phase 4에서) |
| 2C-8 | 모든 서버 호출에 인증 헤더 추가 (치명적 버그 수정) | ✅ 완료 |
| 2C-9 | 스와이프 홀 이동 + 슬라이드 애니메이션 (iOS/Android) | ✅ 완료 |

**완료 기준:**
- [ ] 모든 페이지 모바일 정상 동작 (인라인 스타일 0)
- [ ] 거대 컴포넌트 → 각 200줄 이하
- [ ] Play 어떤 시나리오에서도 점수 무손실
- [ ] AppContext 도메인별 분리됨

---

### Phase 3: 월간 정산 시스템 ⭐ 신규
> 목표: 입출금 간편 처리, 정산 보고서, 이월
> 예상 기간: 1~2주

| # | 작업 | 상태 |
|---|------|------|
| 3-1 | 정산 데이터 모델 설계 (MonthlySettlement 테이블) | ✅ 완료 |
| 3-2 | 입출금 간편 입력 UI (사전 설정 항목 → 금액 → 저장, 30초 이내) | ✅ 완료 |
| 3-3 | 참가비 2경로 명확화 (직접참가 자동청구 + 운영진 등록) | ✅ 완료 |
| 3-4 | 정산 보고서 페이지 (총수입, 총지출, 항목별, 미수금, 이월금) | ✅ 완료 |
| 3-5 | 이월 시스템 (잔여금 다음달 자동 이월) | ✅ 완료 |
| 3-6 | 크레딧 정리 (지급, 회비 납부 사용, 도네이션) | ✅ 완료 |

**완료 기준:**
- [ ] 입출금 모바일 30초 이내
- [ ] 보고서 자동 생성 + 전 회원 열람
- [ ] 이월금 정확 처리
- [ ] 크레딧 회비납부/도네이션 동작

---

### Phase 4: 게스트 초대링크 ⭐ 신규
> 목표: 비회원 게스트의 링크 접속 → 스코어 입력 → 리더보드
> 예상 기간: 1주

| # | 작업 | 상태 |
|---|------|------|
| 4-1 | 초대링크 생성 (라운딩별 고유 토큰, 공유 URL) | ✅ 완료 |
| 4-2 | 게스트 접속 페이지 (이름/핸디캡 입력 → Play 진입) | ✅ 완료 |
| 4-3 | 게스트 인증 (토큰 기반 임시 세션, 해당 라운딩만 접근) | ✅ 완료 |
| 4-4 | 리더보드 게스트 표시 (게스트 구분 표시) | ✅ 완료 |
| 4-5 | 게스트 데이터 영구 보존 | ✅ 완료 |

**완료 기준:**
- [ ] 초대링크 → 접속 → 스코어 입력 → 리더보드 전 과정 동작
- [ ] 게스트 데이터 영구 보존
- [ ] 기존 회원 기능 영향 없음

---

### Phase 5: DB 스키마 정리
> 목표: 데이터 무결성 강화
> 예상 기간: 1주
> **⏸️ 서비스 완전 이전 시점까지 전면 보류 — 현재 로컬/Replit이 동일 Neon DB 공유 중**

| # | 작업 | 상태 |
|---|------|------|
| 5-1 | 타입 교정 (isClubMember→Boolean, handicap→Float, amount→Int) | ⏸️ 보류 |
| 5-2 | 댓글 테이블 분리 (Post.comments Json → Comment 모델) | ⏸️ 보류 |
| 5-3 | participants 정규화 (String[] → BookingParticipant 테이블) | ⏸️ 보류 |
| 5-4 | Booking Json 필드 구조화 검토 | ⏸️ 보류 |

---

### Phase 6: 인프라 이전 (Replit → Railway + GitHub) ⭐ 신규
> 목표: Replit 종속 탈피. GitHub + Railway 기반 독립 배포 환경 구축
> 예상 기간: 1~2일 (골프앱 기준)
> 우선순위: 최우선 — 이후 모든 개발/배포 워크플로우의 기반
> 비용: Railway 월 $5~10 (Replit 에이전트 비용 대체)

#### 배경 및 목적
- Replit 에이전트 비용 절감 (개발은 Claude Code로 전환 완료)
- 코드 파일 수동 복붙 제거 → `git push` 한 줄로 자동 배포
- DB + 서버 + 배포를 한 곳(Railway)에서 관리
- 골프앱을 첫 케이스로 안정화 후, 나머지 3개 프로젝트도 동일하게 이전 예정

#### 기술 선택 근거
| 요구사항 | Railway 지원 여부 |
|---------|----------------|
| Node.js Express 상시 실행 | ✅ |
| Socket.IO (WebSocket) | ✅ |
| PostgreSQL (Prisma) | ✅ |
| HTTPS 자동 발급 | ✅ |
| 커스텀 도메인 연결 | ✅ |
| GitHub push → 자동 배포 | ✅ |

#### 6-A: 사전 준비 (사장님 직접)

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 6A-1 | GitHub 저장소 생성 | github.com → New Repository → "golf-club-app" (Private) | ✅ 완료 |
| 6A-2 | Railway 가입 | railway.app → GitHub 계정으로 가입 → 결제수단 등록 ($5 Trial Plan) | ✅ 완료 |
| 6A-3 | 현재 환경변수 백업 | Replit의 Secrets에서 DATABASE_URL, SESSION_SECRET 등 모든 환경변수 메모 | ✅ 완료 |

#### 6-B: 코드 → GitHub 업로드

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 6B-1 | .gitignore 작성 | node_modules, .env, dist 등 제외 목록 | ✅ 완료 |
| 6B-2 | 배포용 설정 파일 추가 | package.json start/server 스크립트 정리 | ✅ 완료 |
| 6B-3 | 로컬 Git 초기화 + push | GitHub 연결 및 push 완료 | ✅ 완료 |

#### 6-C: Railway 프로젝트 설정

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 6C-1 | Railway 프로젝트 생성 | New Project → Deploy from GitHub Repo → golf-club-app 선택 | ✅ 완료 |
| 6C-2 | PostgreSQL 서비스 추가 | Add New Service → Database → PostgreSQL | ✅ 완료 |
| 6C-3 | 환경변수 설정 | DATABASE_URL, NODE_ENV=production, ANTHROPIC_API_KEY 설정 완료 | ✅ 완료 |
| 6C-4 | 빌드/시작 명령어 설정 | Build: `npm run build`, Pre-deploy: `npx prisma db push`, Start: `npm start` | ✅ 완료 |
| 6C-5 | Networking 포트 설정 | Settings → Networking → Port 8080으로 수정 (기존 5000 → 불일치 문제였음) | 🔄 진행중 (재배포 필요) |

#### 6-D: 데이터 마이그레이션

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 6D-1 | Prisma 스키마 마이그레이션 | Pre-deploy `npx prisma db push`로 자동 처리 | ✅ 완료 |
| 6D-2 | 기존 데이터 내보내기 | Replit Shell에서 `pg_dump $DATABASE_URL > /tmp/backup.sql` 실행 | ✅ 완료 |
| 6D-3 | Railway DB에 데이터 가져오기 | `psql "[Railway Public URL]" < /tmp/backup.sql` 실행 성공 | ✅ 완료 |
| 6D-4 | 데이터 정합성 검증 | 로그인 후 데이터 확인 필요 (6C-5 해결 후) | ⬜ 대기 |

#### 6-E: 검증 및 전환

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 6E-1 | Railway 도메인으로 전체 기능 테스트 | 로그인, 라운딩 생성, 참가, 스코어 입력, 실시간 업데이트 | ⬜ 대기 |
| 6E-2 | 모바일 실기기 테스트 | PWA 설치, Safe Area, 터치 반응 | ⬜ 대기 |
| 6E-3 | Socket.IO 실시간 동작 확인 | 두 기기에서 동시 접속 → 실시간 반영 확인 | ⬜ 대기 |
| 6E-4 | Replit 버전 중단 | Railway 안정 확인 후 Replit 앱 정지 | ⬜ 대기 |

#### 6-F: 이후 워크플로우 (반복)

이전 완료 후 일상적인 개발/배포 흐름:
```
Claude Code에서 코드 수정
      ↓
git add . → git commit → git push  (터미널 명령어 3줄)
      ↓
Railway 자동 감지 → 빌드 → 배포 (자동, 2~3분)
      ↓
Railway 도메인에서 확인
```

**완료 기준:**
- [ ] 골프앱이 Railway에서 모든 기능 정상 동작
- [ ] Replit 없이 독립 운영 가능
- [ ] git push 한 번으로 배포 완료
- [ ] 기존 데이터 100% 이전 확인

**나머지 프로젝트 이전 계획:**
- 골프앱 안정화 확인 후 순차 진행
- 동일 Railway 계정에 프로젝트별 서비스 추가
- 커스텀 도메인 연결 필요한 앱은 DNS 설정 포함
- 상세 이전 가이드: MIGRATION_GUIDE.md 참조

---

### Phase 7: 라운딩 사진 갤러리 ⭐ 신규 (Phase 6 완료 후)
> 목표: 회원들이 라운딩 사진을 앱에서 업로드/조회/다운로드
> 예상 기간: 1주
> 전제조건: Phase 6 완료 (Railway 이전 후 진행)
> 사진 저장: 외부 무료 서비스 (Cloudinary 또는 Supabase Storage)
> 앱 DB에는 URL만 저장

| # | 작업 | 상태 |
|---|------|------|
| 7-1 | 사진 저장 서비스 결정 및 가입 (Cloudinary 추천) | ⬜ 대기 |
| 7-2 | RoundingPhoto 테이블 추가 (bookingId, imageUrl, thumbnailUrl, uploadedBy 등) | ⬜ 대기 |
| 7-3 | 사진 업로드 API (서버에서 외부 서비스로 업로드, URL 반환) | ⬜ 대기 |
| 7-4 | 사진 조회/삭제 API | ⬜ 대기 |
| 7-5 | 라운딩 상세 페이지 (정보 탭 + 스코어 탭 + 사진 탭) | ⬜ 대기 |
| 7-6 | 사진 갤러리 UI (그리드, 확대 보기, 다운로드) | ⬜ 대기 |
| 7-7 | 업로드 제한 (장당 2MB, 라운딩당 최대 30장) | ⬜ 대기 |

**완료 기준:**
- [ ] 라운딩별 사진 업로드/조회/다운로드 동작
- [ ] 라운딩 상세에서 참여자, 스코어, 장소, 사진 통합 조회
- [ ] 서버 저장소 부담 없음 (외부 URL만 저장)

---

## 10. 작업 진행 기록

### 2026-04-07 (Day 1)
- [x] Phase 0: 프로젝트 분석 완료
  - 분석 파일: package.json, schema.prisma, App.jsx, server.js, api.js(서버), api.js(프론트), AppContext.jsx, Dashboard.jsx, Play.jsx, RoundingListV2.jsx, Navigation.jsx, globals.css
  - 치명적 문제 4건, 구조 문제 5건, 개선 필요 9건 식별
  - 리팩토링 전략 확정: 점진적 리팩토링
- [x] Plan.md v1 작성

### 2026-04-09 (Day 3)
- [x] Azure Modern 디자인 시스템 전체 페이지 적용 (Primary #0047AB, Pretendard)
- [x] PageHeader 통일 (RootHeader: 아바타 좌측, SubHeader: 뒤로가기 좌측)
- [x] Play.jsx 모바일 화면 상단 잘림 수정 (safe-area-inset-top, viewport-fit=cover)
- [x] 대시보드 메인 배너 공지 기능 (isFeatured 필드, toggle-featured API, FeaturedBanner 컴포넌트)
- [x] 대시보드 핸디캡/회비잔액 섹션 제거, 환영문구 위치 조정
- [x] 우선순위 조정: 모바일 UI 파인튜닝(2B) → 마지막으로 이동

### 2026-04-08 (Day 2)
- [x] PRD.md 수신 및 정리
  - 신규: 게스트 초대링크, 월간 정산 보고서, 이월 시스템
  - 강화: Play 안정성, 참가비 2경로, 입출금 UX
  - 삭제: DashboardSample
- [x] Plan.md v2 전면 업데이트 (PRD 반영, 5 Phase 체계)
- [x] PRD.md 정식 문서 작성
- [x] 컬러 팔레트 확정: Option B 스카이 블루(#0284C7) + 그린 포인트(#16A34A)
- [x] PRD.md 디자인 시스템 섹션 추가
- [x] Phase 1-1: 잔액 계산 함수 통일
  - `server/utils/balance.js` 신규 생성 (calculateBalance, recalculateAndUpdateBalance)
  - api.js 14곳 수정: 중복 reduce 제거, 증분(increment/decrement) 방식 전면 제거
  - 버그 수정: GET /transactions/outstanding에서 creditDonation 누락 → 추가
- [x] Phase 1-2: prisma.$transaction 적용
  - PUT /bookings/:id (참가자 추가 시 트랜잭션 생성)
  - PUT /bookings/:id (참가자 취소 시 트랜잭션 삭제)
  - POST /transactions/charge-with-credit
  - POST /transactions/credit-to-donation
  - POST /transactions/credit-to-payment
- [x] Phase 1-3: 참가 처리 서버 통일
  - Dashboard.jsx handleJoinBooking에서 apiService.createTransaction() 제거
  - Dashboard.jsx handleJoinBooking에서 apiService.deleteChargeTransaction() 제거
  - participationFee 관련 코드 전체 제거

---

### 2026-04-13 (Day 5)
- [x] **Play.jsx 스코어카드 UI 파인튜닝**
  - PAR 배지 좌측 정렬 + 크기 확대 (s(52,44)px 정사각형, 파 번호 s(22,18))
  - TOTAL / O/U 섹션 글자 크기 확대 (숫자 s(23,19), 라벨 s(11,9))
  - 핸디캡(HC) 배지를 이름 옆 인라인 배치
  - 스코어 +/- 입력 영역 위치 살짝 하단으로 이동
  - 카드 사이 여백 확대 (shadowが 충분히 보이도록)
- [x] **Play.jsx 스와이프 홀 이동 기능 구현 (2C-9)**
  - 전체 스코어카드 영역 어디서든 스와이프 → 앞뒤 홀 이동
  - 슬라이드 애니메이션: 카드가 옆으로 밀려나가며 다음 홀 슬라이드인
  - 대각선 스와이프(~68°) 인식: `|dx| > |dy| * 0.4` 조건
  - 연속 스와이프: pendingTimeout 취소로 애니메이션 중에도 즉시 다음 홀 이동
  - iOS 탄성 스크롤 차단: `e.preventDefault()` + `overscrollBehavior: none`
  - Android 스와이프: CSS `.scorecard-swipe-root * { touch-action: none }` + 리스너를 document → 루트 엘리먼트로 이전
  - React state batching 우회: `setSlideX` 대신 `cardContainerRef.current.style.transform` 직접 조작
  - React Rules of Hooks: 모든 useRef/useEffect를 early return 이전으로 이동 (흰 화면 버그 수정)
  - Safari button flex 버그: `<button>` → `<div onClick>` 교체 (HOLE 선택기 중앙정렬 수정)

### 2026-04-13 (스와이프 크로스플랫폼 디버깅) ✅ 완료
- [x] **Android + iOS PWA 스와이프 미동작 버그 수정**
  - **증상:** Android Chrome 스와이프 불가 / iOS PWA(홈화면 추가) 스와이프 불가 + 폰트 확대
  - **시도 1 (실패):** Touch Events → Pointer Events API 교체, `setPointerCapture` 수평 확정 시 호출
    - CSS `touch-action: none *` → `pan-y` (root only) 로 변경
    - 결과: `pan-y`가 Android에서 pointercancel 유발
  - **시도 2 (실패):** CSS `touch-action: none` (root only) + Pointer Events 유지
    - `setPointerCapture` 즉시 호출 → 수직 이동 시 releasePointerCapture
    - 결과: Pointer Events 자체가 Android Chrome + iOS WKWebView에서 불안정
  - **시도 3 (실패, BUILD 2~3):** Touch Events 복귀 + ref callback 방식
    - 요소 레벨 addEventListener도 Android/iOS PWA에서 이벤트 수신 안 됨
  - **시도 4 (실패, BUILD 4):** document-level listeners + React state 디버그
    - document.addEventListener capture 사용했으나 step 체크 + React state 디버그가 방해
  - **시도 5 (성공, BUILD 5):** document-level listeners + React 완전 우회 ✅
    - **근본 원인:** 요소 레벨 이벤트 리스너가 Android Chrome/iOS WKWebView에서 touch 이벤트 수신 불가
    - **해결:** `document.addEventListener('touchstart/move/end', handler, { passive: false, capture: true })`
    - 조건부 early return 전부 제거, DOM 직접 조작으로 카드 transform 처리
  - **스와이프 즉시 홀 변경 (최종 개선):**
    - 기존: `setTimeout(setCurrentHole, 200)` → 애니메이션 끝나야 홀 변경
    - 수정: `setCurrentHole()` 즉시 호출 + 반대쪽에서 슬라이드-인 애니메이션
  - **최종 정리:** 디버그 마커/오버레이, BUILD 배지, 중복 이벤트 등록(bubble/window) 제거
- [x] **iOS PWA 폰트 확대 수정**
  - **증상:** 홈화면 추가로 설치 시 WKWebView가 Dynamic Type 폰트 스케일링 적용 → 글자 커짐 + 레이아웃 깨짐
  - **시도 1 (실패):** `-webkit-text-size-adjust: none` CSS — Dynamic Type은 CSS로 제어 불가
  - **시도 2 (실패):** 100px 요소 측정 후 동적 zoom 계산 — 측정이 스케일링 감지 못함
  - **시도 3 (성공, BUILD 7):** standalone 모드 감지 → `document.documentElement.style.zoom = '0.85'` ✅
    - `index.html` `<head>` 인라인 스크립트에서 `window.navigator.standalone` 또는 `display-mode: standalone` 체크
    - React 로드 전 즉시 적용되어 레이아웃 깜빡임 없음

### 2026-04-14 (Phase 6) — Railway 인프라 이전 진행

#### ✅ 완료
- [x] **GitHub → Railway 연동 및 최초 배포 완료**
  - GitHub Private Repo 생성 및 코드 push
  - Railway 프로젝트 생성, GitHub 자동 배포 연동
  - Railway PostgreSQL 서비스 추가

- [x] **Replit DB → Railway DB 데이터 이전**
  - Replit Shell에서 `pg_dump $DATABASE_URL > /tmp/backup.sql` 실행
  - Railway Public URL로 `psql "[url]" < /tmp/backup.sql` 복원 성공
  - COPY 8, 132, 382, 52... 등 모든 테이블 데이터 이전 확인

- [x] **Railway 환경변수 설정**
  - `DATABASE_URL`: `postgresql://postgres:...@postgres.railway.internal:5432/railway`
  - `NODE_ENV`: production
  - `ANTHROPIC_API_KEY`: 설정 완료

- [x] **빌드/배포 명령어 설정**
  - Custom Build Command: `npm run build` (Vite 빌드 — 빌드 단계에서 실행)
  - Pre-deploy Command: `npx prisma db push` (DB 스키마 자동 동기화)
  - Custom Start Command: `npm start` (`npm run build && npm run server`)

#### 🔄 진행 중 — "Application failed to respond" 문제 해결 중

**문제 원인 분석 과정:**

1. **1차 시도:** `DATABASE_URL` 누락 → 서버 DB 연결 실패
   - 해결: Railway Variables에 `DATABASE_URL` 추가

2. **2차 시도:** 컨테이너가 3초 만에 종료 (Start Command: `npm run server`)
   - 원인: 런타임 컨테이너에 `dist/` 폴더 없음 → 모든 요청 500 에러
   - `.gitignore`에 `dist` 포함 → Railway 런타임 이미지에 미포함
   - Metrics에서 확인: 5xx 에러율 90%+, CPU 0, Memory ~50MB

3. **3차 시도:** Start Command를 `npm start`로 변경 (빌드 + 서버 일체형)
   - 빌드 성공 (Vite 3.06s), 서버 정상 시작 (Port 8080)
   - 하지만 여전히 "Application failed to respond"

4. **4차 시도:** Networking 포트 불일치 발견
   - Railway Networking 설정: **Port 5000** (옛날 하드코딩 값)
   - 서버 실제 실행 포트: **Port 8080** (`process.env.PORT`)
   - → Railway 프록시가 5000번으로 트래픽 보내지만 서버는 8080번에서 대기
   - **해결:** Settings → Networking → Port 5000 → **8000으로 수정**

5. **5차 시도 (최종 해결):** Bad Gateway 지속 → `PORT` 환경변수 누락이 근본 원인
   - Networking Port는 8000으로 변경했지만 Railway Variables에 `PORT` 자체가 없었음
   - `server.js:18`: `const PORT = process.env.PORT || (NODE_ENV === 'production' ? 5000 : 3001)`
   - → `PORT` env var 부재 시 서버는 **5000**에서 리슨, 프록시는 **8000**으로 전달 → 502 Bad Gateway
   - **Railway는 PORT 환경변수를 자동 주입하지 않음** — Variables에 수동으로 추가해야 함
   - **해결:** Variables 탭 → `PORT=8000` 추가 → 자동 재배포 → **정상 작동 확인 ✅**

#### ✅ 해결 완료 (2026-04-14)
- [x] Railway Variables에 `PORT=8000` 추가 → 서버 포트와 프록시 포트 일치
- [x] `3355-production.up.railway.app` 정상 접속 확인

#### ⬜ 남은 작업
- [ ] 로그인 및 데이터 정상 표시 확인
- [ ] 전체 기능 테스트 (6E 항목)
- [ ] Socket.IO 실시간 동작 확인 (6E-3)
- [ ] Replit 버전 중단 (6E-4)

---

### 2026-04-14 (Day 7) — 캐주얼 라운딩 고도화 + 드롭다운 버그 수정

#### ✅ 완료
- [x] **캐주얼 라운딩 골프장 AI 검색 통합**
  - `CasualForm` 골프장 선택을 AI 검색 UI로 교체 (select → 검색창 + AI 검색 버튼)
  - 입력 시 기존 등록 골프장 드롭다운 표시 (부분 일치)
  - 기존 목록에 없으면 Anthropic AI 검색 → 결과 카드 (이름/주소/파수) 표시
  - "이 골프장 사용하기" → 골프장 관리 페이지 자동 등록 (`addCourse`)
  - 중복 등록 방지: 서버에서 동일 이름 골프장 존재 시 기존 것 반환
  - AI 실패 시 "직접 이름 그대로 사용" fallback 버튼
  - `server/routes/courses.js`: `POST /search`, `POST /` 권한을 `requireOperator` → `requireAuth`로 완화 (회원도 AI 검색 + 자동 등록 가능)
- [x] **초대링크 공유 버튼 3단계 fallback 수정**
  - `navigator.share` (Web Share API, await + AbortError 처리)
  - `navigator.clipboard.writeText` (HTTPS 환경)
  - `execCommand('copy')` (HTTP/localhost fallback)
  - `prompt()` 최후 수단 (위 모두 실패 시)
- [x] **GuestJoin.jsx 사전 등록 게스트 자동 선택 UI**
  - `GET /api/invite/:token` 응답에 `preAddedGuests: [{name, handicap}]` 추가
  - 게스트 1명: 링크 접속 → 자동 등록 → 바로 Play 이동
  - 게스트 2명 이상: "본인을 선택하세요" 이름 목록 → 탭 → 자동 등록 → Play 이동
  - 사전 등록 없음: 기존 이름+HC 직접 입력 폼 유지
  - `POST /api/invite/:token/register`: 사전 등록 participant 중복 제거 후 정식 Member 등록
- [x] **드롭다운 iOS 터치 버그 수정** (골프장/회원 검색 모두)
  - 원인: backdrop `onTouchStart`가 항목 `onTouchEnd`보다 먼저 실행되어 DOM 제거 → 이벤트가 날짜 입력창으로 전파
  - 수정: backdrop 완전 제거, `onBlur` 딜레이 200ms, 항목에 `onTouchStart e.stopPropagation` + `onTouchEnd e.preventDefault+stopPropagation` 적용
  - 터치 영역 padding `11px→14px` 확대

#### ⬜ 미완료 (다음 세션 최우선)
- [ ] **게스트 캐주얼 링크 접속 시 이름 재입력 문제**
  - 증상: 사전 등록한 게스트가 링크 접속해도 이름/HC 입력 폼이 나옴
  - 원인: 서버 재시작 필요 (이번 세션에서 수정했으나 미배포)
  - 해결: 서버 재시작 후 새 캐주얼 라운딩 생성으로 테스트
- [ ] **게스트 이름 입력 후 "라운딩 하기" → 로그인 페이지로 이동하는 문제**
  - 증상: GuestJoin에서 registerGuest 완료 후 Play 페이지 대신 Login 페이지로 리다이렉트
  - 원인 추정: App.jsx의 라우터 가드에서 비로그인 상태(게스트 세션)를 인증 실패로 처리
  - 해결 방향: `localStorage.getItem('guestSession')` 존재 시 Play 라우트 허용, 또는 Play 페이지에서 게스트 세션 직접 처리
- [ ] **라운딩 인원 4명 이하 시 조편성 없이 바로 시작**
  - 증상: 4명 이하 소규모 라운딩에서도 팀 구성 단계를 거쳐야 함
  - 해결 방향: Play 진입 시 participants 수 ≤ 4이면 TeamFormation 단계 skip, 전원 한 팀으로 자동 구성 후 바로 마커 선택으로 이동

---

### 2026-04-13 (Day 6) — 캐주얼 라운딩 + 스코어카드 헤더
- [x] **Play.jsx 스코어카드 헤더 재설계**
  - 좌우 화살표(홀 이동) 제거 → 스와이프로 대체 완료
  - 헤더 1행 통합: 라운드종료 | HOLE X | Leaderboard
  - 헤더 높이 3단계 조정 (padding s(27,21)px)
  - 18홀에서 Leaderboard 위로 올라가고 "점수확인" 버튼 추가
- [x] **Play.jsx 스코어 점검 로직 강화**
  - 0점 홀 경고 추가 (완성하지 않은 홀 확인 프롬프트)
  - 네트워크 실패 시 즉시 차단 (기존엔 silently catch)
  - getTeammateMemberId: `selectedTeammate.id` 우선 사용
  - "팀메이트 없이 완료" 버튼 추가 (scoreCheck 단계)
- [x] **server/routes/scores.js 3인 순환 마커 버그 수정**
  - 마커 자동저장이 플레이어 자기 입력을 덮어쓰는 문제 수정
  - `markerId === userId` → 자기 입력 판별
  - POST "/": 자기 입력된 레코드에 마커 입력 차단
  - POST "/verify-round": TEAMMATE_READY 조건 = 팀메이트가 self-entry 완료
- [x] **캐주얼 라운딩 기능 구현 (신규)**
  - `CreateBookingModal.jsx`: 타입 선택기에 "캐주얼 라운딩" 3번째 옵션 추가 (녹색 테마)
  - `CasualForm` 컴포넌트: 골프장(목록+직접입력), 날짜, 시간대, 회원검색, 게스트추가(이름+HC), 참가자 목록
  - "⚡ 바로 시작" 버튼 제거 (캐주얼과 개념 중복)
  - `RoundingListV2.jsx`: `handleCreateCasual()` 구현 (type='캐주얼', isGuestAllowed=true)
  - 생성 즉시 초대링크 자동 생성 (generateInviteLink API 호출)
  - 성공 모달: 초대 URL 표시 + Web Share API 공유 (fallback: 클립보드 복사)
  - `bookingHelpers.jsx`: getTileTypeBadge/getTypeBadge에 '캐주얼' 녹색 배지 추가

### 2026-04-11 (Day 5)
- [x] 사진 갤러리 기능 기획 검토
  - 외부 이미지 저장 서비스 활용 (Cloudinary 추천), 앱 DB에 URL만 저장
  - 라운딩 상세 페이지 내 탭 구조 (정보/스코어/사진) 방향 확정
  - Phase 7로 등록
- [x] 인프라 이전 계획 수립 (Replit → Railway + GitHub)
  - Replit 에이전트 비용 절감 목적, Claude Code 메인 전환
  - Railway 선정 근거: Express + Socket.IO + PostgreSQL + 자동배포 통합 지원
  - Phase 6으로 등록 (최우선 진행)
  - 골프앱 우선 이전 → 안정화 후 나머지 3개 프로젝트 순차 이전
- [x] Plan.md v3 업데이트 (Phase 6, 7 추가)
- [x] CLAUDE.md 작성 (프로젝트별 컨텍스트)
- [x] MIGRATION_GUIDE.md 작성 (프로젝트 간 재사용 가능한 이전 가이드)

---

### 2026-04-14 (Day 8) — 버그 수정 + iOS PWA UI 파인튜닝

#### ✅ 완료

- [x] **게스트 → 로그인 리다이렉트 버그 수정** (이전 세션 미완료 항목)
  - `App.jsx`: `hasGuestSession` 체크 후 `/play` 라우트를 공개 라우트로 조건부 등록
  - 게스트 세션(`guestMemberId + bookingId`)이 있으면 로그인 없이 Play 접근 허용

- [x] **Play.jsx 게스트 "로딩 중..." 무한 대기 수정** (이전 세션 미완료 항목)
  - `GuestJoin.jsx`: navigate 경로 `?bookingId=` → `?id=` 로 통일 (Play.jsx가 `searchParams.get('id')` 사용)

- [x] **4인 이하 조편성 skip 구현** (이전 세션 미완료 항목)
  - `Play.jsx`: teams 없는 경우 참가자 수 제한 제거 → 항상 자동 팀 구성
  - 중복 참가자 이름 기반 deduplicate (Map, phone 있는 항목 우선)
  - "조편성을 먼저 해주세요" 화면에 디버그 정보 표시 (raw/unique/teams/phone)

- [x] **캐주얼 라운딩 생성 시 주최자 자동 첫 참가자 등록**
  - `RoundingListV2.jsx`: `casualForm.participants` 초기값 = `[{type:'member', data:user, isOrganizer:true}]`
  - `CreateBookingModal.jsx`: 주최자에 "나" 배지 + "주최자" 라벨 표시, 삭제 불가
  - 빈 자리 3개 점선으로 시각화 ("빈 자리"), "N자리 남음" 텍스트 표시
  - 4명 채우면 추가 입력 영역 자동 숨김

- [x] **날짜/시간 입력칸 iOS 사이즈 버그 전체 수정**
  - `CreateBookingModal.jsx`: `dateInputStyle` 상수 추가 (`-webkit-appearance:none`, `minHeight:48px`, `lineHeight:1.5`)
  - `HostManageSheet.jsx`: 동일한 `dateInputStyle` 적용
  - `Settlement.jsx`: 날짜 입력 2곳 동일 적용
  - `src/styles/globals.css`: `input[type="date"], input[type="time"], input[type="datetime-local"]` 전역 규칙 추가 → `RoundingManagement.jsx`, `BookingForm.jsx`, `Admin.jsx`, `MemberDetail.jsx` 일괄 적용

- [x] **메인 네비게이션에서 마이페이지 제거**
  - `Navigation.jsx`: 마이페이지 NavItem 삭제 (프로필 아바타 클릭으로 접근 가능)

- [x] **참가비(Fees) 페이지 아이콘 스타일 통일**
  - 이모지 아이콘 → 인라인 SVG로 교체 (카드, 청구서, 카트, 하트 등 유형별 SVG)
  - 아이콘 배경 `borderRadius: 14` → `50%` (원형) 변경
  - 수입(파란계열) / 지출(붉은계열) 색상 적용

- [x] **모든 바텀시트 네비게이션 바 가림 문제 수정**
  - `Fees.jsx` CreditModal 버튼부: `paddingBottom: max(80px, calc(68px + env(safe-area-inset-bottom)))`
  - `Settlement.jsx` PaySheet 동일 적용
  - `MemberDetail.jsx` Admin/Handicap 시트 + 하단 버튼바 동일 적용

- [x] **더보기(Menu) 페이지 safe area 수정**
  - `Menu.jsx`: `PageHeader title="더보기"` 추가 (다른 루트 페이지와 동일한 헤더 구조)
  - `minHeight: '100dvh'` + flex 레이아웃으로 뷰포트 전체 채움

- [x] **참가비(Fees) 페이지 간격 조정**
  - 헤더↔탭 간격: `paddingTop` 16px → 8px
  - 파란 카드↔통계 간격: `marginBottom` 16px → 24px

- [x] **iOS PWA overscroll 바운스 시 네비게이션 위로 튀는 현상 방지**
  - `globals.css`: `body { overscroll-behavior-y: none }` 추가

- [x] **Navigation 포지셔닝 방식 변경 (iOS PWA 안정성)**
  - `left: '50%'; transform: 'translateX(-50%)'` → `left: 0; right: 0; margin: '0 auto'`
  - `transform` 제거로 iOS PWA에서 `backdrop-filter` + `position:fixed` 충돌 방지

---

### 2026-04-14 (Day 9) — iOS PWA 네비게이션 버그 수정 + UI 파인튜닝 완료

#### ✅ 완료

- [x] **iOS PWA 더보기(Menu) 네비게이션 위치/크기 버그 수정** ← 근본 원인 발견
  - **증상:** Menu 페이지에서만 하단 네비바가 다른 페이지보다 높이 위치 + 크기가 작음
  - **원인:** `index.html`의 `document.documentElement.style.zoom = '0.85'` hack이 `html` 요소에 새로운 containing block 생성 → `position: fixed` 네비 요소가 뷰포트 대신 `html`의 scaled viewport에 고정됨 → 페이지 컨텐츠 높이에 따라 위치 불안정
  - **해결:** `zoom: 0.85` hack 완전 제거. `-webkit-text-size-adjust: none`(globals.css에 이미 존재)으로 Dynamic Type 폰트 확대 대응
  - **교훈:** `transform`, `filter`, `backdrop-filter`, `zoom` 등을 루트(`html`/`body`) 요소에 적용하면 iOS Safari에서 `position:fixed` containing block 계산이 깨짐

- [x] **하단 네비게이션 아이콘 전면 redesign (Indeed 스타일 dual-tone)**
  - PNG 이미지 → 인라인 SVG 전환 (모든 5개 아이콘)
  - 비활성: stroke-only outline / 활성: 내부 fill 꽉 채움 (Indeed 앱 참고)
  - 아이콘 크기 22px → 25px, strokeWidth 2.0 → 2.2 (가독성 향상)
  - pill 배경 제거 (fill이 시각적 active indicator 대체)
  - 아이콘 교체: 홈(집 path), 라운딩(골프 깃발), 참가비(달러 코인), 관리(기어), 더보기(4분할 그리드)

---

### Phase 8: 골프장 API 교체 + Stableford 스코어 + 골프장 상세정보 ⭐ 신규
> 목표: 골프장 검색 정확도 향상, Stableford 점수 표시, 골프장 상세정보 강화
> 예상 기간: 1~2주
> 전제조건: Phase 6 완료 ✅

#### 배경 및 목적
- 현재 골프장 검색은 Anthropic AI(Haiku)를 사용 중이나, 정확한 정보를 못 가져오는 경우 다수
- 스코어카드에 Stroke만 표시 중 → **Stableford** 점수 병행 표시 필요
- Stableford 계산에는 홀별 **Stroke Index(SI)** 값이 필수 — 현재 Course 모델에 없음
- 골프장 연락처, 로고, 상세 주소 등 추가 정보 활용도 높음

#### 현재 상태
- **Course 모델:** `name`, `address`, `holePars`(JSON: male/female 파별), `nearHoles`, `isCompetition`
- **검색 API:** `POST /api/courses/search` → Anthropic Haiku로 이름+주소+파 정보 반환 (정확도 낮음)
- **Stableford:** Leaderboard/Play에 일부 참조 있으나 홀별 Index 없어 정확한 계산 불가

#### 8-A: 골프장 API 조사 및 교체 ✅ 완료

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 8A-1 | 무료 골프장 API 조사 | GolfCourseAPI (무료 300req/day) 선정 | ✅ |
| 8A-2 | API 선정 및 연동 테스트 | 호주 골프장 검색 확인, 데이터 품질 검증 | ✅ |
| 8A-3 | `POST /api/courses/search` 교체 | Anthropic AI → GolfCourseAPI, bluegolf SI 스크래핑 추가 | ✅ |
| 8A-4 | SI 자동 조회 전략 | ① GolfCourseAPI `handicap` 필드 → ② bluegolf 스크래핑 → ③ 수동 입력 | ✅ |

#### 8-B: Course 모델 확장 + 골프장 관리 UI ✅ 완료

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 8B-1 | Course 스키마 확장 | `holeIndexes`, `tees`, `city`, `state`, `country`, `latitude`, `longitude`, `externalId` 추가 | ✅ |
| 8B-2 | Admin 편집 UI 개선 | ScorecardGrid에 SI·티별거리 행 통합, 티박스 요약 섹션 추가 | ✅ |
| 8B-3 | SI 직접 입력 | bluegolf 없는 골프장 대비 18홀 수동 입력 UI (중복 검증) | ✅ |
| 8B-4 | API 검색 시 자동 채움 | GolfCourseAPI → tees/SI/좌표 자동 저장, 등록 후 bluegolf SI 백그라운드 조회 | ✅ |

#### 8-C: Stableford 점수 표시

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 8C-1 | Stableford 계산 유틸 | `utils/stableford.js` — 홀별 SI + 핸디캡 + 실타수 → Stableford 포인트 계산 | ⬜ 대기 |
| 8C-2 | Play.jsx 스코어카드에 Stableford 표시 | 각 홀 점수 옆에 Stableford 포인트 병행 표시 (SI 데이터 있을 때만) | ⬜ 대기 |
| 8C-3 | Leaderboard Stableford 순위 | 리더보드에서 Stroke/Stableford 탭 전환 또는 동시 표시 | ⬜ 대기 |
| 8C-4 | 스코어 히스토리에 Stableford 반영 | 개인 스코어 기록에 Stableford 총점 추가 표시 | ⬜ 대기 |

#### 8-D: 라운딩 정보에 골프장 위치 연동

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 8D-1 | 라운딩 카드에 주소 표시 | 골프장 이름 옆/아래에 주소 표시 (라운딩 목록, 상세) | ⬜ 대기 |
| 8D-2 | Google Maps 연결 버튼 | "위치 보기" 버튼 → Google Maps 앱/웹으로 이동 (좌표 또는 주소 기반) | ⬜ 대기 |
| 8D-3 | 길찾기 바로가기 | "길찾기" 버튼 → Google Maps 네비게이션 모드로 바로 연결 | ⬜ 대기 |

#### 8-E: 기존 게임 모드 점검

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 8E-1 | 2BBB(투볼베스트볼) 기능 점검 | 2BB 모드 전체 플로우 테스트 — 팀 구성, 스코어 입력, 결과 계산 | ⬜ 대기 |
| 8E-2 | 포썸(Foursome) 기능 점검 | 포썸 모드 전체 플로우 테스트 — 교대 입력, 팀 핸디캡, 결과 | ⬜ 대기 |

**완료 기준:**
- [ ] 골프장 검색 시 정확한 정보 반환 (파, SI, 주소, 연락처)
- [ ] 스코어카드에 Stroke + Stableford 동시 표시
- [ ] 골프장 관리에서 홀별 SI 입력/편집 가능
- [ ] 라운딩 정보에서 Google Maps로 바로 이동 가능
- [ ] 2BBB, 포썸 모드 정상 동작 확인

---

### 2026-04-16 (Day 10) — 4인 조편성 규칙 앱설정 도입 + 이전 오판 정정

#### ✅ 완료 (클로드 코드 모바일 앱에서 구현 → main 머지 → 배포)

- [x] **"4인 이하 조편성 skip 구현" (Day 8, 2026-04-14) 오판 정정**
  - 당시 증상: 멤버 추가 화면에서 주최자 본인이 안 보이고 빈칸 4개가 노출 → 총 5명 등록 → "조편성 없음" 에러 발생
  - 실제 원인: 폼 UI 버그 (주최자 미표시). 에러 자체는 정상 동작이었음
  - 잘못된 대응: `Play.jsx`에서 teams 없을 때 **인원수 무관하게 전원 자동 구성**으로 수정 → 골프 4인 1조 원칙 무시
  - 본질은 "규칙은 4명, 예외적으로만 우회"이므로 아래 앱설정 토글로 재설계

- [x] **4인 조편성 규칙 앱설정 기능 추가** (commit `08bd8c3`)
  - 관리 > 앱설정에 **"4인 조편성 규칙 적용"** 카드 추가 (라운딩 유형별 토글)
  - 토글 3종: 정기라운딩(`정기모임`), 컴페티션, 캐주얼 — 각각 ON/OFF
  - 기본값: `{ 정기모임: true, 컴페티션: true, 캐주얼: false }`
  - DB: `AppSettings(feature='squadFormationRules', value=JSON)` 단일 레코드에 저장
  - `AuthContext.jsx`: 앱 시작 시 규칙 로드 → `featureSettings.squadFormationRules`로 노출
  - `Play.jsx` step='selectMember' 진입 시 게이트 로직 추가:
    - `ruleEnabled && participantCount > 4 && !hasTeamFormation` → "⛳ 조편을 해야합니다" 안내 + "조편성 하러 가기" 버튼
    - 그 외 경우는 기존처럼 전원 자동 구성 후 마커 선택 진행

- [x] **게이트 우회 버그 핫픽스** (commit `73e1c66`)
  - 증상: `booking.teams`가 빈 JSON 문자열 `"[]"`인 경우 `!!booking.teams === true`로 평가되어 게이트 통과 실패
  - 해결: `hasTeamFormation` 계산 시 `JSON.parse` 후 배열 길이 체크로 수정

#### ✅ 조편성 게이트 수정 완료 (2026-04-16 오후)

- **원인 1:** Railway 프로젝트 2개 존재 (`3355_DB` + `tranquil-enchantment`) — GitHub 배포가 `tranquil-enchantment`로 가고 있었으나 실제 프로덕션 트래픽은 `3355_DB`에서 서빙 → 새 코드가 사용자에게 도달하지 않았음
- **해결:** `3355_DB`에서 Redeploy 실행, `tranquil-enchantment` GitHub 연결 해제 예정
- **원인 2:** 게이트 조건이 `participantCount > 4` (5명 이상)이었으나 실제 요구사항은 **4명 이상**
- **수정:** `participantCount >= 4`로 변경 + UI 문구 "5명 이상" → "4명 이상" (Play.jsx, Admin.jsx)

#### 🗂 영향 파일

- `src/contexts/AuthContext.jsx` (규칙 로드 + 기본값)
- `src/pages/Admin.jsx` (앱설정 UI + 토글 저장)
- `src/pages/Play.jsx` (게이트 로직, `hasTeamFormation` 계산 포함)

---

---

### 2026-04-16 (Day 10 오후) — Phase 8-A/8-B 완료

- [x] GolfCourseAPI로 골프장 검색 교체 (Anthropic AI 제거)
- [x] Course 모델 확장 (tees, holeIndexes, 위치 정보)
- [x] Admin 편집 UI: ScorecardGrid에 SI·티별거리 통합 표시
- [x] SI 자동 조회: GolfCourseAPI handicap → bluegolf 스크래핑 → 수동 입력 순서
- [x] bluegolf 헤더 강화 (클라우드 서버 IP 차단 우회 시도)
- [ ] **미완:** 기존 저장된 골프장들 SI 재조회 필요

---

---

### 2026-04-16 (Day 10 저녁) — 게스트 초대링크 고도화 + 정산 분리

#### ✅ 완료

- [x] **게스트 초대링크 날짜 제한 제거**
  - `server/routes/guest.js`: `isInviteValidToday()` 함수 완전 제거
  - 초대링크는 당일 여부 무관하게 항상 유효 (인원 모집 단계부터 사용 가능)
  - `src/pages/RoundingManagement.jsx`: "초대링크 (당일만 유효)" → "게스트 초대링크"로 레이블 수정

- [x] **게스트 자동 참가비 청구 (auto-billing)**
  - `server/routes/guest.js` 등록(`/invite/:token/register`) 시 `greenFee + cartFee` charge 트랜잭션 자동 생성
  - `recalculateAndUpdateBalance(guest.id)` 호출로 잔액 즉시 반영
  - 게스트 Member 생성 시 `id` 필드를 participant JSON에 포함 (스코어 저장 연결)

- [x] **정산 페이지 게스트/회원 분리 표시**
  - `server/routes/transactions.js` outstanding 엔드포인트: `isActive: true` 에서 게스트(`isGuest: true, approvalStatus: 'guest'`)도 포함하도록 OR 조건 추가
  - 응답에 `isGuest` 필드 포함, 일반회원 먼저 → 게스트 나중 정렬
  - `src/pages/Settlement.jsx`:
    - 게스트 납부 처리 시 category `'게스트 참가비납부'` 사용
    - 미납 목록에서 일반회원(주황)과 게스트(보라 'G' 배지) 분리 섹션 표시
    - 헤더에 "회원 $X / 게스트 $X" 별도 합계 배지 표시
    - PaySheet에 게스트 보라 배지 표시

- [x] **GuestJoin.jsx 등록 후 UX 개선 (날짜 분기)**
  - `isRoundToday()` 함수 추가: Australia/Sydney 기준 당일 여부 확인
  - 당일 라운딩: 등록 완료 → `/play?id=...` 즉시 이동 (기존 동작)
  - 미래 라운딩: 등록 완료 → `'registered'` 확인 화면 표시
    - 예약된 라운딩 정보 (날짜, 골프장, 이름, 핸디캡) 요약
    - 주황 안내 박스: "당일에 이 링크를 다시 열면 플레이 화면으로 이동합니다"
    - "이 링크 저장하기" 버튼 (Web Share API → 클립보드 fallback)
  - `src/services/api.js`: `fetchInviteInfo` 에러 시 서버 JSON 에러 메시지 그대로 throw

- [x] **마커 선택 화면 게스트 표시 버그 수정**
  - `src/pages/Play.jsx` stroke 모드 extraGuests 패턴 추가:
    - 팀에 배정된 phone 및 이름 Set 구성
    - participants 중 `isGuest: true`이면서 팀에 없는 게스트를 `extraGuests`로 fallback 추가
  - stroke 모드 게스트 phone 보강: `tm.phone.startsWith('guest_')` 시 participants JSON에서 id/name 병합
  - teams phone 교체 로직 추가 (`server/routes/guest.js`): 게스트 등록 시 팀 JSON에서 구 `guest_timestamp` phone을 새 `guest_crypto` phone + id로 교체
  - 마커 선택 영역 스크롤 수정: 외부 div에 `overflowY: 'auto'`, paddingBottom `120px`

- [x] **조편성 전 게스트 접속 안내 메시지 개선**
  - `src/pages/Play.jsx` teammates 없을 때 `isGuestMode` 분기:
    - 게스트: "조편성이 아직 안됐습니다. 운영진이 조편성을 완료한 후 다시 이 링크를 열어주세요." (조편성 버튼 없음)
    - 운영진/회원: 기존 안내 + "조편성 하러 가기" 버튼
  - 디버그 문자열 노출 제거

- [x] **Phase 8-D 지도보기 버튼 부분 완료**
  - `src/pages/RoundingListV2.jsx`: 라운딩 카드에 "지도보기" 버튼 추가 (Google Maps 좌표/주소 연동)

#### 🗂 영향 파일

- `server/routes/guest.js` (날짜 제한 제거, 자동청구, teams phone 교체, id 포함)
- `server/routes/transactions.js` (게스트 outstanding 포함)
- `src/services/api.js` (fetchInviteInfo 에러 메시지 개선)
- `src/pages/GuestJoin.jsx` (날짜 분기, 확인 화면)
- `src/pages/Settlement.jsx` (게스트 분리 표시, PaySheet 배지)
- `src/pages/Play.jsx` (extraGuests, 게스트 phone 보강, 조편성 전 안내, 스크롤)
- `src/pages/RoundingManagement.jsx` (레이블 변경)
- `src/pages/RoundingListV2.jsx` (지도보기 버튼)

---

### 2026-04-16 (Day 10 심야) — 클럽회계 트랜잭션 전면 삭제/복원 지원

#### 작업 내용

- [x] **Settlement.jsx 카테고리 상세 시트 — 지출 삭제 버튼 추가**
  - `CategoryDetailSheet`: 기존 수입 "납부취소" 버튼을 수입+지출 모두로 확장
  - 지출은 "삭제" 레이블 + "이 작업은 되돌릴 수 없습니다" 경고 문구
  - 수입은 기존 "납부취소" 레이블 유지
  - `handleReverse` 확인 메시지를 income/expense 분기로 변경

- [x] **ChargeDetailSheet 신규 컴포넌트 추가**
  - 미수금 회원별 청구(charge) 트랜잭션 목록 표시
  - `GET /api/transactions/member/:memberId` 응답에서 `type === 'charge'` 필터링
  - 각 청구 항목에 "청구취소" 버튼 (DELETE /api/transactions/:id 호출)
  - 청구 취소 후 미수금 목록 자동 갱신 + 시트 닫기

- [x] **미수금 섹션 — "청구 내역" 버튼 추가**
  - 일반회원: 주황 테두리 "청구 내역" 버튼 (납부처리 버튼 옆)
  - 게스트: 보라 테두리 "청구 내역" 버튼 (납부처리 버튼 옆)
  - 클릭 시 ChargeDetailSheet 열기
  - `chargeSheet` state 관리

#### 삭제 가능/불가 정책
- 삭제 가능: `charge` (청구취소), `payment` (납부취소), `expense` (삭제), `income`/`donation` (납부취소)
- 삭제 불가: MonthlySettlement (이월 체인 무결성), Score (게임 데이터)
- 마감된 달(`isClosed`)은 모든 버튼 숨김

#### 🗂 영향 파일
- `src/pages/Settlement.jsx` (ChargeDetailSheet 추가, 버튼 확장, chargeSheet state)

---

---

### 2026-04-16 (Day 11) — 버그 수정: 아프로후테 잔액 + 게스트 청구 동기화

#### ✅ 완료

- [x] **아프로후테 $257 잔액 버그 수정**
  - 원인: `server.js` 시작 시 `fixMissingMarchCharge()` 함수가 Railway 배포 race condition(두 인스턴스 동시 기동)으로 두 번 실행 → $125 March charge 중복 생성
  - 해결: `fixMissingMarchCharge()` → `deduplicateMarchCharge()`로 교체
    - "없으면 생성" → "중복이면 오래된 것 1개만 남기고 나머지 삭제" 방식으로 변경
    - 멱등성 보장: 몇 번 실행해도 결과 동일
  - 배포 후 Railway 재시작 시 자동 정정 (charge 2개 → 1개, 잔액 $257 → $132)

- [x] **게스트 추가 시 청구 미생성 버그 수정**
  - 원인: `handleHmAddGuest`가 participants 배열만 업데이트하고 Member 레코드 없이 저장 → charge 트랜잭션 없음
  - 해결: `POST /api/bookings/:id/add-guest` 엔드포인트 신규 추가
    - Member 레코드 생성 (isGuest:true, approvalStatus:guest)
    - greenFee + cartFee 기준 charge 트랜잭션 즉시 생성
    - participant에 Member `id` 포함하여 반환
  - `handleHmAddGuest`: 기존 직접 participant 구성 → 새 API 호출로 교체

- [x] **게스트 삭제 시 청구 미삭제 버그 수정**
  - 원인: 기존 방식에서 participant에 `id` 없음 → `handleHmRemoveParticipant`의 `target?.id` 체크 실패 → `deleteChargeTransaction` 스킵
  - 해결: 게스트 추가 시 이제 항상 Member 레코드 생성 + participant에 `id` 포함 → 삭제 시 정상 동작

- [x] **게스트 초대링크 등록 후 bookings/members/transactions 소켓 이벤트 emit 누락 추가**
  - `server/routes/guest.js`: 두 등록 경로(신규 / 기존 Member 재사용) 모두 `req.io.emit` 추가
  - 운영진 화면이 게스트 등록 즉시 실시간 갱신됨

#### 🗂 영향 파일
- `server/server.js` (deduplicateMarchCharge 교체)
- `server/routes/bookings.js` (add-guest 엔드포인트 추가, crypto require)
- `server/routes/guest.js` (등록 완료 후 소켓 emit 추가)
- `src/services/api.js` (addGuestToBooking 메서드 추가)
- `src/pages/RoundingListV2.jsx` (handleHmAddGuest API 호출로 교체)

---

### 2026-04-28 (Day 12) — 스코어카드 ScoreSection 리디자인 + Pickup(P) 기능

#### ✅ 완료

- [x] **ScoreSection 하단 영역 리디자인** — 4개 독립 흰색 박스 → 단일 흰색 카드 통합
  - 좌측 액션 영역: PAR 컬러박스 + P(Pickup) 버튼
  - 1px 구분선
  - 우측 정보 영역: TOTAL / O/U / STBL — 박스 없는 가벼운 라벨+숫자 텍스트
  - 카드 전체 높이 `s(82,70)` 유지 → 헤더 크기 변동 없음 (스코어 입력 공간 우선 원칙)

- [x] **NTP 버튼 위치 이동** — 하단 박스 → 본인 카드 이름 줄 오른쪽 (HC 배지 옆)
  - 파란 알약형 배지 + 깜빡임 애니메이션, 거리 입력 모달 트리거 유지
  - NTP 홀이 아니면 자리 차지 안 함 (헤더 크기 변동 0)
  - 본인 카드만 표시 (`!isTeammate && nearHoles[h]`)

- [x] **Pickup (P) 버튼 — 스테이블포드 픽업 자동 기록**
  - 누르면 `score = par + extraStrokes + 2` (넷 더블보기 = 0pts) 자동 입력
  - `pickedUpHoles: { me: bool[18], teammate: bool[18] }` 상태 신설
  - +/− 또는 PAR 버튼으로 직접 수정 시 해당 홀 P 마크 자동 OFF (auto-clear)
  - SI 데이터 있을 때만 노출
  - 긴 이름 ellipsis 처리 (포썸 모드 NTP 배지 잘림 방지)

- [x] **Pickup 영속화 — localStorage + 서버 저장**
  - localStorage `play_state_${bookingId}`에 `pickedUpHoles` 추가
  - 서버 저장: 기존 `gameMetadata` JSON 필드에 `pickedUpHoles` 키 추가 (스키마 변경 ✗)
  - 서버 복원: `GET /api/scores/by-rounding/:roundingName` SELECT에 `gameMode`, `gameMetadata` 추가
  - 호환성: 기존 데이터(메타 없음/foursome만) 모두 false로 fallback

- [x] **Leaderboard 스코어카드 모달에 "P" 표시**
  - 서버 응답의 `gameMetadata.pickedUpHoles` 파싱 → `selectedScore.pickedUpHoles`
  - 18홀 그리드 셀에서 picked-up 홀은 숫자 대신 **"P"** 렌더 (셀 배경/색상 동일)
  - 점수 합계는 그대로 net double bogey 값으로 합산

#### 🗂 영향 파일
- `src/pages/Play.jsx` (ScoreSection 리디자인, P 버튼 + Pickup 상태 관리, 저장/복원 통합)
- `src/pages/Leaderboard.jsx` (gameMetadata 파싱, 스코어카드 모달 P 셀 렌더)
- `server/routes/scores.js` (`/by-rounding` SELECT에 gameMetadata/gameMode 추가)

#### 📌 메모
- "점수확인 모달"(`step === 'scoreCheck'`)에는 홀별 그리드가 없어 P 표시 대상 없음 (총타수 비교/매치 안내만 표시)
- Pickup 시각 표식 추가 결정 — 사장님 (B) 선택: 별도 boolean 배열로 추적, "P"만 표시, 직접 수정 시 자동 해제

---

### 2026-05-02 (Day 14 — 추가 #3) — 영수증 첨부 표시 + 청구 내역 영수증 보기/납부완료 UI

#### 🐛 버그
1. 회원이 회비관리에서 "📎 계좌이체 영수증 첨부"로 영수증 업로드 후 다른 페이지 갔다 돌아오면 첨부한 영수증이 화면에서 사라짐
2. 관리자가 미수금 회원의 청구 내역에서 첨부된 영수증을 볼 UI가 없음 (납부 영수증 확인 대기 섹션 외)

#### 진단
- 원인 1: `/api/transactions/member/:memberId` 엔드포인트의 select에 `receiptImage`/`receiptImages` 필드 누락 → 화면 렌더링 시 영수증 없는 것처럼 표시 (DB엔 정상 저장됨)
- 원인 2: ChargeDetailSheet (관리자 청구 내역 바텀시트)에 영수증 표시 UI 자체가 없음

#### ✅ 수정
- [x] `GET /api/transactions/member/:memberId` select에 `receiptImage`, `receiptImages`, `bookingId` 추가
- [x] Settlement.jsx의 ChargeDetailSheet에 영수증 표시 + "🧾 영수증 보기" + "✓ 납부완료" 버튼 추가
- [x] `pending-receipts` 엔드포인트에 이미 납부된 charge 필터링 (memberId+bookingId 매칭 payment 존재 시 제외) — 납부 처리 후 목록에서 자동 제거

#### 🗂 영향 파일
- `server/routes/transactions.js` (member endpoint select + pending-receipts 필터)
- `src/pages/Settlement.jsx` (ChargeDetailSheet UI)

---

### 2026-05-02 (Day 14 — 추가 #2) — 부킹 fee 변경 시 charge 자동 동기화 + 5월 정기 데이터 정정

#### 🐛 버그
- 부킹 생성 후 fee(greenFee/cartFee/membershipFee) 수정해도 기존 charge 트랜잭션은 그대로 유지됨
- 5월 정기라운딩: 부킹 fee 합 $120인데 7명에게 모두 $217 청구 트랜잭션 박혀있음 (수정 전 fee로)
- 결과: 회원당 $120 청구되어야 할 게 $217 미수금으로 표시

#### ✅ 수정
- [x] **bookings.js PUT 핸들러에 fee 동기화 로직 추가**
  - greenFee/cartFee/membershipFee 변경 감지
  - 미납 charge 트랜잭션을 새 합계로 자동 갱신
  - 이미 납부된 charge는 스킵 (안전)
  - 회원 잔액 자동 재계산
- [x] **서버 시작 시 5월 정기라운딩 charge 일괄 정정** (1회성 마이그레이션)
  - 5월 정기라운딩 부킹 검색
  - 모든 charge 트랜잭션을 현재 fee 합계로 정정 (면제 회원은 별도 계산)
- [x] **Jacob/동백의 5월 부적절 트랜잭션 삭제**
  - 4월 정산 정정 과정에서 잘못 5월로 들어간 환불·회비납부 트랜잭션 4건 삭제
  - 사용자 확인됨: 실제로 5월에 환불/납부 일어나지 않음

#### 🗂 영향 파일
- `server/routes/bookings.js` (PUT 핸들러 fee 동기화 로직)
- `server/server.js` (시작 시 1회 마이그레이션)

---

### 2026-05-02 (Day 14 — 추가) — '회원 크레딧' 트랜잭션 type 보정

#### 🐛 버그
- 빠른 입력 UI는 mode='expense'면 `type='expense'`를 강제 → 카테고리 '회원 크레딧'으로 들어가도 type=expense
- balance.js는 expense를 잔액에서 차감 → 회원 크레딧 받은 회원이 미수금으로 표시됨
- (예: 브라이언 4월 라운딩 환불을 크레딧으로 받았는데 잔액 -$132로 보임)

#### ✅ 수정
- [x] **백엔드 POST /api/transactions** — category='회원 크레딧' + memberId 있으면 type을 자동으로 'credit'으로 보정 (앞으로 모든 신규 처리에 적용)
- [x] **서버 시작 시 마이그레이션** — 기존에 잘못 저장된 type=expense, category=회원 크레딧 트랜잭션을 type=credit으로 일괄 변경 (idempotent, 한 번 실행되면 매칭 0건이라 재시작마다 안전)
- [x] settlement.js는 type=credit도 totalExpense로 합산하므로 클럽 장부 표시는 변동 없음 — 회원 잔액만 +로 정정됨

#### 🗂 영향 파일
- `server/routes/transactions.js` (POST 핸들러에 type 보정 추가)
- `server/server.js` (시작 시 1회 마이그레이션)

---

### 2026-05-02 (Day 14) — 환불 시 미수금 오작동 + 월별 필터 누락 버그 수정

#### 🐛 발견된 버그

1. **환불 처리 시 회원 잔액에서 또 깎임 → 미수금처럼 표시**
   - `server/utils/balance.js`의 `expense` 타입은 모든 카테고리를 "회원 빚"으로 처리
   - 환불은 클럽이 회원에게 돌려준 돈이라 회원 빚이 아닌데도 `sum - amount` 적용
   - 결과: 청구(-X) + 납부(+X) + 환불(expense -X) = -X → 미수금으로 표시
   - 사용자 의도와 정반대

2. **`/api/transactions/outstanding` 엔드포인트가 yearMonth 쿼리 파라미터 무시**
   - 프론트엔드는 `?yearMonth=2026-04` 등 월별 필터로 호출
   - 백엔드는 그냥 `member.balance < 0`인 회원 전체 반환
   - 결과: 4월·5월 어느 탭을 봐도 같은 미수금 명단 노출

#### ✅ 수정

- [x] **balance.js — `EXCLUDED_EXPENSE_CATEGORIES = ['환불']` 추가**
  - 환불 카테고리 expense는 잔액 계산에서 스킵
  - 청구 + 납부 + 환불 = 0 (트랜잭션 흔적은 모두 보존, 잔액만 0)
  - 클럽 장부의 수입/지출 표시는 변경 없음

- [x] **outstanding 엔드포인트 — 월별 필터 적용**
  - yearMonth 지정 시 그 달의 net delta(charges − payments − non-환불 expenses 등)가 음수인 회원만 반환
  - 환불 카테고리 expense는 delta 계산에서 제외 (위 로직과 일관)
  - 미지정 시 기존 동작(전체 누적 잔액 음수) 유지 — 호환용

- [x] **서버 시작 시 회원 잔액 일괄 재계산 (1회)**
  - `recalculateAllBalances()` 함수 추가 — idempotent (트랜잭션 변경 없이 잔액만 재산출)
  - 시작 5초 후 실행 → 환불 카테고리 변경 사항이 기존 데이터에 자동 반영
  - 실행 결과 로그: `updated/unchanged/errors` 카운트

#### 📌 영향 범위

- 4월 환불 받은 회원들: 미수금에서 자동 제거 (잔액 0으로 정정)
- 4월 회비 미납 회원들: 그대로 미수금에 표시 (영향 없음)
- 5월 정기모임 자동청구 미수금: **건드리지 않음** — 5월 charge 트랜잭션은 그대로이며 잔액에 정상 반영
- 모든 트랜잭션 데이터(납부, 환불 기록)는 보존 — 사장님 요청대로 흔적 유지

#### 🗂 영향 파일
- `server/utils/balance.js` (`EXCLUDED_EXPENSE_CATEGORIES` + `recalculateAllBalances`)
- `server/routes/transactions.js` (`/outstanding` 엔드포인트 월별 필터)
- `server/server.js` (시작 시 잔액 재계산 1회 호출)

---

### 2026-05-01 (Day 13) — 플레이 자동 활성화 시점 변경 + 시드니 타임존 정확화

#### ✅ 완료

- [x] **자동 활성화 시점 변경**: 기존 "라운딩 시간 30분 전" → **"라운딩 당일 시드니 0시"**
  - 모든 라운딩 type에 동일 적용 (정기모임/소셜/컴페티션 등 구분 없이)
  - 수동 활성화/비활성화는 그대로 유지 (HostManageSheet의 Play 토글)
  - 자동 비활성화 시점 (라운딩 + 7시간 후)는 그대로 유지

- [x] **시드니 타임존 정확화** (기존 버그 동시 수정)
  - 기존 코드는 `now.toISOString()` UTC 날짜로 부킹 조회 → 시드니 새벽시간대에 매칭 안 됨
  - `Intl.DateTimeFormat`으로 시드니 로컬 날짜/시각 정확 계산 (DST 자동 반영)
  - 어제 날짜도 함께 조회 — 늦은 라운딩(저녁)의 +7h 윈도우가 새벽까지 이어지는 경우 처리

#### 🗂 영향 파일
- `server/server.js` (sydneyDateStr / sydneyLocalToUtc 헬퍼 + checkAndUpdatePlayStatus 재작성)
- `src/pages/RoundingManagement.jsx` ("30분 전 자동 활성화" → "라운딩 당일 자동 활성화" 안내문)

---

### 2026-04-28 (Day 12 — 추가) — 공지사항 게시글/댓글 수정·삭제 기능

#### ✅ 완료

- [x] **공지사항 페이지(Board.jsx) ⋮ 메뉴 + 수정·삭제 UI 추가**
  - 게시글 헤더 우측에 점 세 개(⋮) 버튼 — 본인 글이거나 관리자(사장님)인 경우만 노출
  - 수정: 인라인 폼(제목/내용 textarea + 저장/취소)
  - 삭제: confirm 후 soft delete (`isActive=false`로 숨김, DB 보존)
  - 댓글 영역도 동일 패턴 (본인 댓글 또는 관리자만 ⋮ 노출)
  - 외부 클릭 시 메뉴 자동 닫힘

- [x] **백엔드 권한 검사 보강 — 보안 구멍 패치**
  - `canManagePost(member, post)`, `canManageComment(member, comment)` 헬퍼 추가 (server/middleware/auth.js)
  - 게시글 작성자 본인 + 관리자(`관리자`/`방장` 역할 또는 `isAdmin=true`)만 수정/삭제 통과
  - PUT /api/posts/:id — 화이트리스트 필드(`title`/`content`/`isFeatured`/`isActive`)만 업데이트, 나머지 무시
  - DELETE/toggle-active/toggle-featured 모두 권한 검사 추가 (이전에 누구나 호출 가능했음)

- [x] **댓글/좋아요 전용 엔드포인트 신설**
  - `POST /api/posts/:id/comments` — 댓글 추가, 백엔드가 `authorId` 자동 부여
  - `PATCH /api/posts/:id/comments/:commentId` — 댓글 수정 (작성자 본인 or 관리자)
  - `DELETE /api/posts/:id/comments/:commentId` — 댓글 삭제 (hard)
  - `PATCH /api/posts/:id/comments/:commentId/like` — 댓글 좋아요 토글
  - `PATCH /api/posts/:id/like` — 게시글 좋아요 토글

- [x] **DashboardBoard.jsx 회귀 방지 마이그레이션**
  - 기존 `updatePost`로 comments/likes 통째 보내기 패턴 → 신규 전용 엔드포인트 사용
  - 댓글 추가/수정/삭제, 게시글/댓글 좋아요 모두 정상 작동

- [x] **클라이언트 API 메서드 추가** (src/services/api.js)
  - `softDeletePost`, `addComment`, `updateComment`, `deleteComment`, `toggleCommentLike`, `togglePostLike`
  - 기존 `deletePost`에 누락된 auth 헤더 추가

- [x] **권한 유틸 추가** (src/utils/index.js)
  - `canManagePost(user, post)`, `canManageComment(user, comment)` — 프론트엔드 ⋮ 노출 조건 일원화

#### 🗂 영향 파일
- `server/middleware/auth.js` (권한 헬퍼 + select 필드 확장)
- `server/routes/posts.js` (라우트 권한 검사 + 댓글/좋아요 전용 엔드포인트 추가)
- `src/services/api.js` (신규 메서드)
- `src/utils/index.js` (권한 유틸)
- `src/pages/Board.jsx` (⋮ 메뉴 UI + 인라인 편집 폼)
- `src/components/dashboard/DashboardBoard.jsx` (댓글/좋아요 핸들러 마이그레이션)

#### 📌 메모
- 삭제는 soft delete 채택 — 잘못 지운 글은 DB에서 `isActive=true`로 복구 가능
- 기존 댓글(authorId 없음)은 본인 식별 불가 → 관리자만 수정/삭제 가능
- 수정됨 표시는 사장님 결정으로 미적용
- 향후 작업: 삭제된 글 복구 UI(관리자 페이지), 대시보드 위젯 "삭제" hard delete 일관성 정리
- 설계서: `docs/superpowers/specs/2026-04-28-post-edit-delete-design.md`
- 구현 계획서: `docs/superpowers/plans/2026-04-28-post-edit-delete.md`

---

> **현재 상태:** Phase 1 ✅ / Phase 2 ✅ / Phase 3 ✅ / Phase 4 ✅ / Phase 5 ⏸️ / Phase 6 ✅ / Phase 7 ⬜ / Phase 8 진행 중 (8A✅ 8B✅ 8C✅(스테이블포드 + Pickup) 8D~8E ⬜)
> **현재 우선순위:** Phase 8-D (Google Maps 나머지) → 8-E (2BBB/포썸 점검) → Phase 7
> **참조:** 모든 작업 시작 전/후 이 문서 확인 및 업데이트 필수