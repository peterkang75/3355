# ⛳ 골프 모임 관리 앱

한국어 모바일 웹 기반 골프 모임 관리 애플리케이션입니다.

## 🎯 주요 기능

### 1. 간편한 로그인
- 전화번호 끝 6자리만으로 로그인
- 테스트 계정: **123456** (관리자)

### 2. 개인 대시보드
- 현재 핸디캡 확인
- 회비 잔액 및 미수금 확인
- 다가오는 부킹 일정
- 최근 스코어 기록

### 3. 게시판
- 관리자 공지사항 작성
- 모든 회원 댓글 작성 가능
- 실시간 업데이트

### 4. 골프장 부킹
- 골프장 정보 등록 (이름, 날짜, 시간)
- 참가 신청/취소
- 실시간 참가자 목록
- 인원 제한 설정

### 5. 스코어 입력
- 18홀 스코어 카드
- +/- 버튼으로 간편 입력
- 실시간 포인트 계산
- PAR, SHOTS, PICK UP, TOTAL 표시
- 라운드 타이머

### 6. 핸디캡 자동 계산
- 스코어 데이터 기반 하우스 핸디
- 최근 라운드 자동 분석
- 평균 스코어 추적

### 7. 회비 관리
- 회비 항목 생성
- 납부 내역 확인
- 자동 잔액 계산
- 지출 처리

### 8. 관리자 기능
- 회원 관리
- 권한 설정
- 회비 생성
- 골프장 등록

## 🚀 시작하기

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

앱이 http://localhost:5000 에서 실행됩니다.

### 빌드
```bash
npm run build
```

## 🔧 기술 스택

- **Frontend**: React 19, React Router DOM
- **Build Tool**: Vite 7
- **Styling**: CSS-in-JS (Inline Styles)
- **Storage**: LocalStorage (기본) / Google Sheets API (선택)

## 📱 디자인

- 모바일 최적화 (최대 너비 600px)
- 골프 테마 초록색 팔레트
- 반응형 레이아웃
- 터치 친화적 UI

## 🗄️ 데이터 저장

현재는 **로컬 스토리지**를 사용하지만, Google Sheets API 연동이 가능합니다.

### Google Sheets 연동 (선택사항)

1. `.env.example`을 `.env`로 복사
2. Google Sheets API 키 발급
3. 스프레드시트 ID 입력

```env
VITE_GOOGLE_API_KEY=your_api_key_here
VITE_GOOGLE_SHEET_ID=your_sheet_id_here
```

필요한 시트:
- Members (회원)
- Posts (게시판)
- Comments (댓글)
- Bookings (부킹)
- Scores (스코어)
- Fees (회비)
- Courses (골프장)

## 📝 사용 방법

1. **로그인**: 전화번호 끝 6자리 입력 (테스트: 123456)
2. **대시보드**: 개인 정보 확인
3. **게시판**: 공지사항 확인 및 댓글 작성
4. **부킹**: 골프 일정 참가 신청
5. **스코어**: 라운드 후 스코어 입력
6. **회비**: 납부 내역 확인

## 🎨 색상 팔레트

- Primary Green: `#2d5f3f`
- Secondary Green: `#3a7d54`
- Light Green: `#4a9d6a`
- Background: `#f0f7f4`

## 📄 라이선스

ISC

## 👥 관리자 기능

관리자 계정(123456)으로 로그인하면:
- 공지사항 작성
- 부킹 생성
- 회비 관리
- 회원 관리
- 골프장 등록

모든 기능에 접근할 수 있습니다.
