# CLAUDE.md — 3355 골프 클럽 앱

> 이 파일은 Claude Code가 매 세션 시작 시 자동으로 읽는 프로젝트 컨텍스트입니다.

---

## 프로젝트 개요

- **앱 이름:** 3355 골프 클럽
- **목적:** 골프 동호회 운영 관리 (회원, 라운딩, 회비, 스코어, 게임)
- **플랫폼:** 웹 앱 (모바일 브라우저 최우선, PWA)
- **기술 스택:** React 19 + Vite + Express.js + Prisma + PostgreSQL + Socket.IO

---

## 현재 상태 (2026-04-11 기준)

- **Phase 1~4 완료** (서버 안정화, 프론트 구조 개선, 월간 정산, 게스트 초대링크)
- **Phase 5 보류** (DB 스키마 정리 — 인프라 이전 후 진행)
- **Phase 6 진행 예정** ⭐ (Replit → Railway + GitHub 인프라 이전)
- **Phase 7 대기** (라운딩 사진 갤러리 — Phase 6 완료 후)

---

## ⭐ 인프라 이전 계획 (최우선)

### 현재
- 배포: Replit
- DB: Replit 내장 PostgreSQL (Neon)
- 개발: Claude Code (Replit 에이전트에서 전환 완료)

### 목표
- 배포: Railway (Express + Socket.IO 상시 실행)
- DB: Railway PostgreSQL
- 코드 관리: GitHub (Private Repository)
- 개발: Claude Code → git push → Railway 자동 배포

### 이유
- Replit 에이전트 비용 절감
- 코드 수동 복붙 제거 (git push 한 줄로 배포)
- DB + 서버 + 배포 한 곳에서 관리

### 나머지 프로젝트
이 골프앱이 **첫 번째 이전 대상**이며, 안정화 확인 후 아래 프로젝트도 동일하게 이전 예정:
- 프로젝트 B (Replit, 자체 도메인 있음)
- 프로젝트 C (Replit, 자체 도메인 있음)
- 프로젝트 D (Replit, 자체 도메인 있음)

이전 절차는 **MIGRATION_GUIDE.md** 참조.

---

## 작업 규칙

1. 모든 작업 시작 전/후 **Plan.md** 확인 및 업데이트 필수
2. 사장님(프로젝트 오너)은 비개발자 — DB/설정 작업은 Replit 프롬프트 또는 단계별 가이드 제공
3. 코드 변경은 해당 파일의 전체 코드를 제공하여 복사-붙여넣기로 처리
4. 구현 전 반드시 기획 검토 (가능 여부, 방법, 문제점 분석) 선행
5. 구현 완료 후 역으로 검수하여 문제점 보고
6. 비효율적이거나 불필요한 요구는 솔직하게 피드백

---

## 핵심 파일 위치

| 파일 | 위치 | 용도 |
|------|------|------|
| Plan.md | 프로젝트 루트 | 전체 작업 계획서 (Phase 1~7) |
| PRD.md | 프로젝트 루트 | 제품 요구사항 정의서 |
| MIGRATION_GUIDE.md | 프로젝트 루트 | Railway 이전 가이드 (프로젝트 간 재사용) |
| schema.prisma | prisma/ | DB 스키마 |
| server/server.js | server/ | Express + Socket.IO 서버 엔트리 |
| src/App.jsx | src/ | React 앱 엔트리 |

---

## 디자인 시스템

- Primary: #0047AB (Azure Blue)
- Font: Pretendard
- 모바일 퍼스트, Safe Area 대응, 터치 최적화 (min 44px)
- CSS 변수 기반 (globals.css)