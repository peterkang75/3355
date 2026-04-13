# 3355 골프 클럽 앱 - 리팩토링 계획서 (Plan.md)

> 최초 작성일: 2026-04-07
> 최종 수정일: 2026-04-14 (Day 9 UI 파인튜닝 완료 + Phase 6 대기)
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
| 6A-1 | GitHub 저장소 생성 | github.com → New Repository → "golf-club-app" (Private) | ⬜ 대기 |
| 6A-2 | Railway 가입 | railway.app → GitHub 계정으로 가입 → 결제수단 등록 ($5 Trial Plan) | ⬜ 대기 |
| 6A-3 | 현재 환경변수 백업 | Replit의 Secrets에서 DATABASE_URL, SESSION_SECRET 등 모든 환경변수 메모 | ⬜ 대기 |

#### 6-B: 코드 → GitHub 업로드

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 6B-1 | .gitignore 작성 | node_modules, .env, prisma/migrations 등 제외 목록 | ⬜ 대기 |
| 6B-2 | 배포용 설정 파일 추가 | Procfile 또는 railway.toml, 빌드/시작 스크립트 정리 | ⬜ 대기 |
| 6B-3 | 로컬 Git 초기화 + push | Claude Code 터미널에서 git init → add → commit → push | ⬜ 대기 |

#### 6-C: Railway 프로젝트 설정 (사장님 직접, 프롬프트 제공)

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 6C-1 | Railway 프로젝트 생성 | New Project → Deploy from GitHub Repo → golf-club-app 선택 | ⬜ 대기 |
| 6C-2 | PostgreSQL 서비스 추가 | Add New Service → Database → PostgreSQL | ⬜ 대기 |
| 6C-3 | 환경변수 설정 | DATABASE_URL (Railway DB 자동생성), SESSION_SECRET, NODE_ENV=production 등 | ⬜ 대기 |
| 6C-4 | 빌드/시작 명령어 확인 | Build: npm run build, Start: npm start (또는 node server/server.js) | ⬜ 대기 |

#### 6-D: 데이터 마이그레이션

| # | 작업 | 상세 | 상태 |
|---|------|------|------|
| 6D-1 | Prisma 스키마 마이그레이션 | Railway DB에 npx prisma db push (테이블 구조 생성) | ⬜ 대기 |
| 6D-2 | 기존 데이터 내보내기 | Replit DB에서 pg_dump로 데이터 추출 (스크립트 제공) | ⬜ 대기 |
| 6D-3 | Railway DB에 데이터 가져오기 | pg_restore 또는 SQL 파일 실행 (스크립트 제공) | ⬜ 대기 |
| 6D-4 | 데이터 정합성 검증 | 회원 수, 라운딩 수, 거래 건수 원본과 비교 확인 | ⬜ 대기 |

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

> **현재 상태:** Phase 1 ✅ / Phase 2 ✅ / Phase 3 ✅ / Phase 4 ✅ / Phase 5 ⏸️ (서비스 이전 시) / Phase 6 ⬜ 진행 예정 / Phase 7 ⬜ 대기 (Phase 6 후)
> **현재 우선순위:** Phase 6 (인프라 이전: Replit → Railway + GitHub) → Phase 7 (사진 갤러리)
> **미결 이슈:** 없음 ✅
> **참조:** 모든 작업 시작 전/후 이 문서 확인 및 업데이트 필수