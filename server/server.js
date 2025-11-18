const express = require('express');
const path = require('path');
const apiRouter = require('./api');
const prisma = require('./db');

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? 5000 : 3001;

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
          { name: '상품' }
        ]
      });
      console.log('✅ 기본 출금항목 생성 완료');
    }
  } catch (error) {
    console.error('기본 카테고리 초기화 실패:', error);
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/api', apiRouter);

app.use(express.static(path.join(__dirname, '../dist'), {
  etag: false,
  lastModified: false
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Database connected`);
  await initializeDefaultCategories();
});
