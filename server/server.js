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

// 서버 시작 시 1회 마이그레이션 + 잔액 재계산
// idempotent — 한 번 실행 후엔 매칭 대상이 없어 재시작마다 안전
setTimeout(async () => {
  try {
    // (1) '회원 크레딧' 카테고리는 type=credit이어야 회원 잔액에 +로 반영됨.
    //     과거 빠른 입력 UI에서 expense로 잘못 저장된 트랜잭션 정정.
    const wrongCredits = await prisma.transaction.findMany({
      where: { type: 'expense', category: '회원 크레딧', memberId: { not: null } },
      select: { id: true, memberId: true, amount: true },
    });
    if (wrongCredits.length > 0) {
      const ids = wrongCredits.map((t) => t.id);
      await prisma.transaction.updateMany({
        where: { id: { in: ids } },
        data: { type: 'credit' },
      });
      console.log(`🔧 '회원 크레딧' 트랜잭션 type 보정: ${wrongCredits.length}건 (expense → credit)`);
    }

    // (2) 모든 회원 잔액 재계산 (환불 카테고리 처리 변경 + 위 type 보정 반영)
    const { recalculateAllBalances } = require('./utils/balance');
    const result = await recalculateAllBalances();
    console.log(`💰 회원 잔액 재계산 완료 — updated=${result.updated}, unchanged=${result.unchanged}, errors=${result.errors}`);
  } catch (err) {
    console.error('서버 시작 시 마이그레이션 오류:', err);
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

// ── 아프로후테 3월 charge 중복 제거 + payment 복원 ────────────────────────────
async function fixAprohuteBalance() {
  try {
    const { recalculateAndUpdateBalance } = require('./utils/balance');
    const member = await prisma.member.findFirst({
      where: { nickname: '아프로후테' },
      select: { id: true },
    });
    if (!member) return;

    const booking = await prisma.booking.findFirst({
      where: { title: { contains: '3월 정기라운딩' }, courseName: { contains: 'Stonecutters' } },
      select: { id: true },
    });
    if (!booking) return;

    let changed = false;

    // 1) charge 중복 제거
    const charges = await prisma.transaction.findMany({
      where: { memberId: member.id, bookingId: booking.id, type: 'charge' },
      orderBy: { createdAt: 'asc' },
    });
    if (charges.length > 1) {
      for (const c of charges.slice(1)) {
        await prisma.transaction.delete({ where: { id: c.id } });
        console.log(`🧹 중복 March charge 삭제: id=${c.id}`);
      }
      changed = true;
    }

    // 2) 삭제된 payment 복원 (없을 때만)
    const existingPayment = await prisma.transaction.findFirst({
      where: { memberId: member.id, bookingId: booking.id, type: 'payment' },
    });
    if (!existingPayment) {
      await prisma.transaction.create({
        data: {
          type: 'payment',
          amount: 125,
          description: '3월 정기라운딩 참가비 납부 (복원)',
          date: '2026-03-29',
          memberId: member.id,
          bookingId: booking.id,
        },
      });
      console.log('✅ 아프로후테 3월 payment 복원 완료');
      changed = true;
    }

    if (changed) await recalculateAndUpdateBalance(member.id);
  } catch (e) {
    console.error('fixAprohuteBalance error:', e.message);
  }
}

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Database connected`);
  console.log(`🔌 Socket.IO ready`);
  await initializeDefaultCategories();
  await fixAprohuteBalance();
});
