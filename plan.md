# 3355 골프 클럽 앱 - 리팩토링 계획서 (Plan.md)

> 최초 작성일: 2026-04-07
> 최종 수정일: 2026-04-09 (Phase 1 완료)
> 상태: Phase 1 완료, Phase 2 대기
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
| 2A-2 | 공통 유틸 정리 (parseParticipants, formatCurrency₩, 역할 체크, 날짜) | ⬜ |
| 2A-3 | 스타일 전략 확정 (CSS Module / Tailwind / 클래스 기반) | ⬜ |
| 2A-4 | 라우트 정리 (22개 축소, MemberInfoForm 라우터 내부로) | ⬜ |

#### 2-B: 페이지별 재작성 (모바일 퍼스트)

| # | 작업 | 현재 줄 수 | 목표 | 상태 |
|---|------|----------|------|------|
| 2B-1 | Dashboard 분리/재작성 | 1,683줄 | 200줄 이하 | ⬜ |
| 2B-2 | Navigation 개선 | 100줄 | 모바일 최적화 | ⬜ |
| 2B-3 | RoundingListV2 분리/재작성 | 2,759줄 | 200줄 이하 | ⬜ |
| 2B-4 | Fees 재작성 (월간 정산 준비) | - | 모바일 UX | ⬜ |
| 2B-5 | 나머지 페이지 모바일 최적화 | - | - | ⬜ |

#### 2-C: Play 안정성 강화 ⭐

| # | 작업 | 상태 |
|---|------|------|
| 2C-1 | Play 컴포넌트 분리 (2,110줄 → 각 200줄) | ⬜ |
| 2C-2 | 이중 저장: 홀 점수 변경 → localStorage + 서버 동시 저장 | ⬜ |
| 2C-3 | 복원: 앱 복귀 시 서버/로컬 비교 → 최신 데이터 복원 | ⬜ |
| 2C-4 | 오프라인 큐: 저장 실패 시 큐 → 네트워크 복구 시 재시도 | ⬜ |
| 2C-5 | 중단/재개: "저장하고 멈추기" vs "저장 안 하고 멈추기" 명확 분리 | ⬜ |
| 2C-6 | 앱 상태 이벤트: visibilitychange, beforeunload, pagehide 대응 | ⬜ |
| 2C-7 | 게스트도 동일한 안정성 보장 | ⬜ |

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
| 3-1 | 정산 데이터 모델 설계 (MonthlySettlement 테이블) | ⬜ |
| 3-2 | 입출금 간편 입력 UI (사전 설정 항목 → 금액 → 저장, 30초 이내) | ⬜ |
| 3-3 | 참가비 2경로 명확화 (직접참가 자동청구 + 운영진 등록) | ⬜ |
| 3-4 | 정산 보고서 페이지 (총수입, 총지출, 항목별, 미수금, 이월금) | ⬜ |
| 3-5 | 이월 시스템 (잔여금 다음달 자동 이월) | ⬜ |
| 3-6 | 크레딧 정리 (지급, 회비 납부 사용, 도네이션) | ⬜ |

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
| 4-1 | 초대링크 생성 (라운딩별 고유 토큰, 공유 URL) | ⬜ |
| 4-2 | 게스트 접속 페이지 (이름/핸디캡 입력 → Play 진입) | ⬜ |
| 4-3 | 게스트 인증 (토큰 기반 임시 세션, 해당 라운딩만 접근) | ⬜ |
| 4-4 | 리더보드 게스트 표시 (게스트 구분 표시) | ⬜ |
| 4-5 | 게스트 데이터 영구 보존 | ⬜ |

**완료 기준:**
- [ ] 초대링크 → 접속 → 스코어 입력 → 리더보드 전 과정 동작
- [ ] 게스트 데이터 영구 보존
- [ ] 기존 회원 기능 영향 없음

---

### Phase 5: DB 스키마 정리
> 목표: 데이터 무결성 강화
> 예상 기간: 1주

| # | 작업 | 상태 |
|---|------|------|
| 5-1 | 타입 교정 (isClubMember→Boolean, handicap→Float, amount→Int) | ⬜ |
| 5-2 | 댓글 테이블 분리 (Post.comments Json → Comment 모델) | ⬜ |
| 5-3 | participants 정규화 (String[] → BookingParticipant 테이블) | ⬜ |
| 5-4 | Booking Json 필드 구조화 검토 | ⬜ |

---

## 10. 작업 진행 기록

### 2026-04-07 (Day 1)
- [x] Phase 0: 프로젝트 분석 완료
  - 분석 파일: package.json, schema.prisma, App.jsx, server.js, api.js(서버), api.js(프론트), AppContext.jsx, Dashboard.jsx, Play.jsx, RoundingListV2.jsx, Navigation.jsx, globals.css
  - 치명적 문제 4건, 구조 문제 5건, 개선 필요 9건 식별
  - 리팩토링 전략 확정: 점진적 리팩토링
- [x] Plan.md v1 작성

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

> **다음 작업:** Phase 1-8 (DashboardSample 삭제)
> **참조:** 모든 작업 시작 전/후 이 문서 확인 및 업데이트 필수