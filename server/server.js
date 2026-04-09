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

const PORT = process.env.NODE_ENV === 'production' ? 5000 : 3001;

async function checkAndUpdatePlayStatus() {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const bookings = await prisma.booking.findMany({
      where: {
        date: todayStr
      }
    });
    
    for (const booking of bookings) {
      const [hours, minutes] = booking.time.split(':').map(Number);
      const roundingTime = new Date(booking.date);
      roundingTime.setHours(hours, minutes, 0, 0);
      
      const thirtyMinBefore = new Date(roundingTime.getTime() - 30 * 60 * 1000);
      const sevenHoursAfter = new Date(roundingTime.getTime() + 7 * 60 * 60 * 1000);
      
      const isInActiveWindow = now >= thirtyMinBefore && now < sevenHoursAfter;
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
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Database connected`);
  console.log(`🔌 Socket.IO ready`);
  await initializeDefaultCategories();
});
