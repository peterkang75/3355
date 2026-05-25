require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const apiRouter = require('./api');
const prisma = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 3001);

// 시드니 로컬 날짜 문자열 (YYYY-MM-DD)
function sydneyDateStr(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

// 시드니 로컬 (날짜+시간) → UTC Date (DST 자동 반영)
function sydneyLocalToUtc(dateStr, timeStr) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const fakeUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const parts = fmt.formatToParts(fakeUtc);
  const get = (type) => parts.find(p => p.type === type).value;
  const sydneyAsUtc = Date.UTC(
    +get('year'), +get('month') - 1, +get('day'),
    +get('hour'), +get('minute'), +get('second')
  );
  const offsetMin = Math.round((sydneyAsUtc - fakeUtc.getTime()) / 60000);
  return new Date(fakeUtc.getTime() - offsetMin * 60000);
}

async function checkAndUpdatePlayStatus() {
  try {
    const now = new Date();
    const todayStr = sydneyDateStr(now);
    // 어제도 함께 조회 — 늦은 라운딩(저녁)의 +7h 윈도우가 다음날 새벽까지 이어지는 경우 처리
    const yesterdayBase = new Date(`${todayStr}T00:00:00Z`);
    yesterdayBase.setUTCDate(yesterdayBase.getUTCDate() - 1);
    const yesterdayStr = yesterdayBase.toISOString().split('T')[0];

    const bookings = await prisma.booking.findMany({
      where: {
        date: { in: [yesterdayStr, todayStr] }
      }
    });

    for (const booking of bookings) {
      // 활성 윈도우: 시드니 기준 라운딩 당일 00:00 ~ 라운딩 시간 + 7시간
      const sydneyMidnight = sydneyLocalToUtc(booking.date, '00:00');
      const roundingTime = sydneyLocalToUtc(booking.date, booking.time);
      const sevenHoursAfter = new Date(roundingTime.getTime() + 7 * 60 * 60 * 1000);

      const isInActiveWindow = now >= sydneyMidnight && now < sevenHoursAfter;
      const isPastWindow = now >= sevenHoursAfter;

      if (isInActiveWindow && !booking.playEnabled && !booking.playManuallyDisabled) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { playEnabled: true }
        });
        console.log(`⛳ 플레이 자동 활성화: ${booking.courseName} (${booking.date})`);
        io.emit('bookings:updated');
      } else if (isPastWindow && booking.playEnabled) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            playEnabled: false,
            playManuallyDisabled: false
          }
        });
        console.log(`⛳ 플레이 자동 비활성화: ${booking.courseName} (${booking.date})`);
        io.emit('bookings:updated');
      }
    }
  } catch (error) {
    console.error('플레이 상태 체크 오류:', error);
  }
}

setInterval(checkAndUpdatePlayStatus, 60 * 1000);

// 서버 시작 시 회원 잔액 안전 재계산
// 주의: 과거 여기에 있던 1회성 데이터 정정/삭제 스크립트(회원 크레딧 type 보정,
//       5월 charge 정정, Jacob/동백 5월 거래 삭제)는 제거함 (2026-05-25).
//       역할을 다한 뒤에도 재시작마다 재실행되어, 정산 마감 후 정상 납부 기록을
//       삭제해 미수금을 잘못 발생시키는 사고를 유발했음. 일회성 보정은 다시 넣지 말 것.
//       아래 재계산은 기존 거래로부터 잔액만 다시 더하는 것이라 데이터를 변경/삭제하지 않음.
setTimeout(async () => {
  try {
    const { recalculateAllBalances } = require('./utils/balance');
    const result = await recalculateAllBalances();
    console.log(`💰 회원 잔액 재계산 완료 — updated=${result.updated}, unchanged=${result.unchanged}, errors=${result.errors}`);
  } catch (err) {
    console.error('서버 시작 시 잔액 재계산 오류:', err);
  }
}, 5000);

async function initializeDefaultCategories() {
  try {
    const incomeCount = await prisma.incomeCategory.count();
    if (incomeCount === 0) {
      await prisma.incomeCategory.createMany({
        data: [
          { name: '참가비' },
          { name: '회식비' }
        ]
      });
      console.log('✅ 기본 입금항목 생성 완료');
    }

    const expenseCount = await prisma.expenseCategory.count();
    if (expenseCount === 0) {
      await prisma.expenseCategory.createMany({
        data: [
          { name: '골프장 그린피' },
          { name: '점심값' },
          { name: '음료수' },
          { name: '상품' },
          { name: '환불' },
          { name: '회원 크레딧' }
        ]
      });
      console.log('✅ 기본 출금항목 생성 완료');
    } else {
      const requiredCategories = ['환불', '회원 크레딧'];
      for (const categoryName of requiredCategories) {
        const exists = await prisma.expenseCategory.findFirst({
          where: { name: categoryName }
        });
        if (!exists) {
          await prisma.expenseCategory.create({
            data: { name: categoryName }
          });
          console.log(`✅ 출금항목 '${categoryName}' 추가됨`);
        }
      }
    }
  } catch (error) {
    console.error('기본 카테고리 초기화 실패:', error);
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API: 항상 최신 데이터
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  req.io = io;
  next();
}, apiRouter);

// 정적 파일: Vite 빌드 결과물은 파일명에 콘텐츠 해시 포함 → 1년 캐시
// index.html, manifest.json 등 해시 없는 파일은 no-cache
app.use(express.static(path.join(__dirname, '../dist'), {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('manifest.json')) {
      res.set('Cache-Control', 'no-cache');
    } else {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

app.get('*', (req, res) => {
  // SPA 라우팅: index.html은 절대 캐시되면 안 됨 (iOS PWA가 옛 JS 해시를 계속 로드하는 원인)
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// (제거됨 2026-05-25) 아프로후테 3월 charge 중복 제거 + payment 복원 함수.
// 위 Jacob/동백 사고와 동일한 패턴(재시작마다 도는 1회성 정정)이라 함께 제거함.

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Database connected`);
  console.log(`🔌 Socket.IO ready`);
  await initializeDefaultCategories();
});
