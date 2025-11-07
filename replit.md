# 골프 모임 관리 앱

## 프로젝트 개요
한국어 모바일 웹 기반 골프 모임 관리 애플리케이션입니다.
회원들이 골프 모임을 효율적으로 관리할 수 있도록 부킹, 스코어, 회비 등을 통합 관리합니다.

## 주요 기능

### 1. 로그인 시스템
- 전화번호 끝 6자리로 간단한 로그인
- 데이터베이스 기반 회원 인증
- 비활성화된 계정 차단 기능

### 2. 대시보드
- 개인화된 정보 표시
- 현재 핸디캡
- 회비 잔액 (미수금)
- 다가오는 부킹 일정
- 최근 스코어 기록

### 3. 게시판
- 관리자가 공지사항 작성
- 모든 회원이 댓글 작성 가능
- 실시간 댓글 알림

### 4. 골프장 부킹 관리
- 관리자가 골프장 부킹 생성
- 날짜, 시간, 골프장 정보 입력
- 회원들이 참가/취소 버튼으로 참여
- 실시간 참가자 명단 확인
- 최대 인원 설정 가능

### 5. 스코어 입력
- 홀별 타수 입력 (18홀)
- +/- 버튼으로 쉬운 입력
- PAR, SHOTS, PICK UP, TOTAL 표시
- 실시간 포인트 계산
- 라운드 시간 측정
- 홀별 거리 정보

### 6. 핸디캡 계산
- 스코어 데이터 기반 하우스 핸디 자동 계산
- 최근 라운드 기록 분석
- 평균 스코어 추적

### 7. 회비 관리
- 회비 항목 생성 (월회비, 회식비 등)
- 전체 또는 선택 회원에게 적용
- 납부 내역 추적
- 미수금 자동 계산
- 지출 처리 기능

### 8. 관리자 기능
- 회원 관리
- 권한 설정
- 회비 생성 및 관리
- 골프장 등록
- 지출 항목 관리

## 기술 스택
- **Frontend**: React 19, Vite 7, React Router DOM
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Neon-hosted)
- **ORM**: Prisma
- **개발 도구**: Concurrently (개발 서버 동시 실행)

## 데이터베이스 구조

### Members (회원)
- id, name, phone, nickname, gender, birthYear, region
- club, handicap, isAdmin, balance, photo, isActive

### Posts (게시글)
- id, title, content, authorId, createdAt

### Bookings (예약)
- id, courseName, date, time, organizerId, participants

### Fees (회비)
- id, title, amount, type, dueDate, appliesTo, status

### Scores (스코어)
- id, userId, date, courseName, totalScore, coursePar, holes

### Courses (골프장)
- id, name, address

## 디자인
- 모바일 최적화
- 골프 테마 초록색 (#2d5f3f, #3a7d54, #4a9d6a)
- 반응형 레이아웃
- 최대 너비 600px

## 개발 서버

### 개발 모드
```bash
npm run dev
```
- Vite: 포트 5000 (프론트엔드)
- Express API: 포트 3001 (백엔드)
- Vite 프록시를 통해 `/api` 요청이 Express로 전달됨

### 프로덕션 모드
```bash
npm run build
npm run server
```
- Express가 포트 5000에서 빌드된 정적 파일 + API 제공

## 데이터베이스 명령어
```bash
npm run db:push      # 스키마 변경사항을 DB에 적용
npm run db:studio    # Prisma Studio 열기 (GUI 데이터베이스 관리)
```

## 최근 변경사항 (2025-11-07)

### PostgreSQL 마이그레이션 완료 ✅
- **구글 시트 완전 제거**: 모든 외부 서비스 의존성 제거
- **Prisma ORM 설정**: 자동 ID 생성 (cuid) 지원
- **완전한 CRUD API**: 모든 테이블에 대한 생성, 조회, 수정, 삭제 엔드포인트
- **서버 기반 Toggle 엔드포인트**: Race condition 방지를 위한 서버 측 토글 로직
  - PATCH /api/members/:id/toggle-admin
  - PATCH /api/members/:id/toggle-active
- **AppContext 완전 동기화**: 모든 Admin mutation이 refreshMembers() 호출
- **단일 진실 소스**: PostgreSQL 데이터베이스가 모든 데이터의 유일한 소스

### 아키텍처 개선
- **자동 ID 생성**: Prisma cuid()로 충돌 없는 고유 ID 생성
- **상태 동기화 패턴**: Admin 컴포넌트가 모든 변경 후 AppContext 새로고침
- **Race Condition 방지**: 서버가 현재 값을 읽고 토글하여 stale state 문제 해결
- **에러 핸들링**: 모든 API 호출에 try-catch 및 사용자 피드백

### 이전 변경사항
- 프로젝트 초기 설정
- 모든 주요 기능 UI 구현
- 게시판 답글 기능 추가
- 스코어 입력 화면 완성 (첨부 이미지 디자인 참조)
- 모바일 네비게이션 구현
- 관리자 권한 관리 기능 추가

## API 엔드포인트

### Members
- GET /api/members - 모든 회원 조회
- POST /api/members - 회원 생성
- PUT /api/members/:id - 회원 정보 수정
- DELETE /api/members/:id - 회원 삭제
- **PATCH /api/members/:id/toggle-admin** - 관리자 권한 토글 (서버 측)
- **PATCH /api/members/:id/toggle-active** - 활성 상태 토글 (서버 측)

### Posts
- GET /api/posts - 모든 게시글 조회
- POST /api/posts - 게시글 생성
- PUT /api/posts/:id - 게시글 수정
- DELETE /api/posts/:id - 게시글 삭제

### Bookings
- GET /api/bookings - 모든 예약 조회
- POST /api/bookings - 예약 생성
- PUT /api/bookings/:id - 예약 수정
- DELETE /api/bookings/:id - 예약 삭제

### Fees
- GET /api/fees - 모든 회비 조회
- POST /api/fees - 회비 생성
- DELETE /api/fees/:id - 회비 삭제

### Scores
- GET /api/scores - 모든 스코어 조회
- GET /api/scores/:userId - 사용자별 스코어 조회
- POST /api/scores - 스코어 생성
- DELETE /api/scores/:id - 스코어 삭제

### Courses
- GET /api/courses - 모든 골프장 조회
- POST /api/courses - 골프장 생성
- DELETE /api/courses/:id - 골프장 삭제

## 환경 변수
- DATABASE_URL: PostgreSQL 데이터베이스 연결 문자열 (자동 설정)
- NODE_ENV: production/development

## 다음 단계
- [ ] 핸디캡 자동 계산 알고리즘 구현
- [ ] 실시간 알림 기능
- [ ] 회비 자동 계산 및 리포트
- [ ] 이미지 최적화 및 압축
