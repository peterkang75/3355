# MIGRATION_GUIDE.md — Replit → Railway + GitHub 이전 가이드

> 이 문서는 Replit에서 Railway로 프로젝트를 이전할 때 재사용하는 표준 가이드입니다.
> 최초 작성: 2026-04-11 (골프앱 이전 기획 시)
> 대상: Node.js (Express) + PostgreSQL + Prisma 기반 프로젝트

---

## 전체 흐름 요약

```
Step 1: 사전 준비 (계정, 환경변수 백업)
Step 2: GitHub 저장소 생성 + 코드 push
Step 3: Railway 프로젝트 생성 + GitHub 연동
Step 4: Railway PostgreSQL 추가 + 환경변수 설정
Step 5: 데이터 마이그레이션 (기존 DB → Railway DB)
Step 6: 전체 기능 테스트
Step 7: 커스텀 도메인 연결 (필요한 경우)
Step 8: Replit 버전 중단
```

---

## Step 1: 사전 준비

### 1-1. 계정 준비 (최초 1회만)
- [x] GitHub 계정 생성 — github.com
- [ ] Railway 가입 — railway.app (GitHub 계정으로 로그인)
- [ ] Railway 결제수단 등록 — Settings → Billing (월 $5 Trial Plan)

### 1-2. 기존 환경변수 백업 (프로젝트마다)
Replit의 Secrets(환경변수) 탭에서 모든 변수를 메모합니다:
```
DATABASE_URL=postgresql://...     ← 이건 Railway에서 새로 생성됨, 메모 불필요
SESSION_SECRET=xxx                ← 이건 그대로 옮김
NODE_ENV=production               ← Railway에서 설정
기타 API_KEY, 외부 서비스 키 등    ← 있으면 전부 메모
```

---

## Step 2: GitHub 저장소 생성 + 코드 push

### 2-1. GitHub에서 저장소 만들기
1. github.com 로그인
2. 우측 상단 "+" → "New repository"
3. Repository name: `프로젝트이름` (예: golf-club-app)
4. Private 선택 (비공개)
5. 나머지 기본값 → "Create repository"

### 2-2. Claude Code 터미널에서 실행
```bash
# 프로젝트 폴더로 이동
cd /path/to/project

# .gitignore 파일 확인/생성 (아래 내용 포함)
cat > .gitignore << 'EOF'
node_modules/
.env
.env.local
dist/
.replit
replit.nix
.cache/
*.log
EOF

# Git 초기화 + GitHub에 push
git init
git add .
git commit -m "Initial commit: migrate from Replit"
git branch -M main
git remote add origin https://github.com/사장님계정/프로젝트이름.git
git push -u origin main
```

> ⚠️ GitHub 인증이 필요할 수 있음. Personal Access Token 생성 필요.
> GitHub → Settings → Developer Settings → Personal Access Tokens → Generate

---

## Step 3: Railway 프로젝트 생성

1. railway.app 로그인
2. "New Project" 클릭
3. "Deploy from GitHub Repo" 선택
4. 방금 만든 저장소 선택 (예: golf-club-app)
5. Railway가 자동으로 Node.js 감지 → 빌드 시작

---

## Step 4: Railway PostgreSQL + 환경변수

### 4-1. DB 추가
1. Railway 프로젝트 대시보드에서 "New Service" 또는 "+"
2. "Database" → "PostgreSQL" 선택
3. 생성 완료 (자동으로 DATABASE_URL 환경변수 생성됨)

### 4-2. DB 연결 (중요!)
1. PostgreSQL 서비스 클릭 → "Variables" 탭
2. `DATABASE_URL` 값 복사
3. 앱 서비스(GitHub에서 배포된 것) 클릭 → "Variables" 탭
4. `DATABASE_URL` 추가 → 복사한 값 붙여넣기
   - 또는 Railway의 Variable Reference 사용: `${{Postgres.DATABASE_URL}}`

### 4-3. 나머지 환경변수 설정
앱 서비스의 Variables 탭에 Step 1에서 메모한 변수들 추가:
```
SESSION_SECRET=xxx
NODE_ENV=production
PORT=3000          ← Railway는 자동 할당하지만 명시 권장
(기타 필요한 변수)
```

### 4-4. 빌드/시작 명령어 확인
앱 서비스 → Settings 탭에서:
```
Build Command:  npm install && npx prisma generate && npm run build
Start Command:  npm start   (또는 node server/server.js)
```

> ⚠️ 프로젝트마다 package.json의 scripts를 확인하여 조정

---

## Step 5: 데이터 마이그레이션

### 5-1. Railway DB에 테이블 구조 생성
Railway 앱 서비스 터미널(또는 로컬에서 Railway DB URL로):
```bash
npx prisma db push
```

### 5-2. 기존 데이터 내보내기 (Replit DB에서)
```bash
# Replit 환경에서 실행
pg_dump --data-only --no-owner --no-privileges \
  "$DATABASE_URL" > backup.sql
```

### 5-3. Railway DB에 데이터 가져오기
```bash
# Railway DB URL을 사용하여
psql "$RAILWAY_DATABASE_URL" < backup.sql
```

### 5-4. 데이터 검증
```sql
-- 주요 테이블 행 수 비교
SELECT 'Member' as t, COUNT(*) FROM "Member"
UNION ALL SELECT 'Booking', COUNT(*) FROM "Booking"
UNION ALL SELECT 'Transaction', COUNT(*) FROM "Transaction"
UNION ALL SELECT 'Score', COUNT(*) FROM "Score";
```

---

## Step 6: 전체 기능 테스트

Railway가 제공하는 도메인(xxx.up.railway.app)에서:

- [ ] 로그인/로그아웃
- [ ] 메인 페이지 로딩
- [ ] 핵심 CRUD 기능 동작
- [ ] 실시간 기능 (Socket.IO) — 두 기기 동시 접속 테스트
- [ ] 모바일 브라우저 테스트
- [ ] PWA 설치 테스트 (해당 시)

---

## Step 7: 커스텀 도메인 연결 (선택)

1. Railway 앱 서비스 → Settings → Domains
2. "Add Custom Domain" → 도메인 입력 (예: myapp.com)
3. 표시되는 CNAME 레코드를 도메인 DNS에 추가
4. SSL 자동 발급 대기 (5~10분)

> ⚠️ DNS 변경은 전파에 최대 48시간 소요될 수 있음

---

## Step 8: Replit 버전 중단

Railway에서 모든 기능 정상 확인 후:
1. Replit 프로젝트의 배포(Deployment) 중단
2. 1~2주 동안 Replit 프로젝트는 삭제하지 않고 유지 (롤백 대비)
3. 안정 확인 후 Replit 프로젝트 정리

---

## 이전 후 일상 워크플로우

```bash
# Claude Code에서 코드 수정 후

git add .
git commit -m "기능 설명"
git push

# → Railway가 자동 감지 → 빌드 → 배포 (2~3분)
# → Railway 도메인에서 확인
```

---

## 프로젝트별 체크리스트 (복사해서 사용)

```
프로젝트명: _______________
이전일: _______________

[ ] GitHub 저장소 생성 (Private)
[ ] .gitignore 작성
[ ] 코드 push 완료
[ ] Railway 프로젝트 생성 + GitHub 연동
[ ] PostgreSQL 서비스 추가
[ ] DATABASE_URL 연결
[ ] 환경변수 설정 완료
[ ] Prisma db push 완료
[ ] 데이터 마이그레이션 완료
[ ] 데이터 행 수 검증
[ ] 기능 테스트 통과
[ ] 커스텀 도메인 연결 (해당 시)
[ ] Replit 배포 중단
[ ] 2주 후 Replit 정리
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 빌드 실패 | Prisma generate 누락 | Build Command에 `npx prisma generate` 추가 |
| DB 연결 실패 | DATABASE_URL 미설정 | 앱 서비스 Variables에서 DB URL 확인 |
| Socket.IO 연결 안 됨 | WebSocket 경로 | 서버 코드에서 CORS origin 설정 확인 |
| 정적 파일 404 | 빌드 안 됨 | Build Command에 `npm run build` 포함 확인 |
| 슬립 후 느림 | 무료 플랜 슬립 | 유료 전환 또는 healthcheck 설정 |