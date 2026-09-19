// 참석 투표 테이블 생성 (추가 전용 SQL)
//
// 운영 DB에는 `prisma db push` 를 쓰지 않는다 — 스키마 드리프트가 있으면
// 기존 테이블을 파괴할 수 있기 때문. RoundCancellation 때와 같은 방식으로
// CREATE TABLE IF NOT EXISTS 만 실행한다. 여러 번 실행해도 안전하다.
//
// 실행: set -a; . ./.env; set +a; node scripts/create-attendance-poll-tables.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "AttendancePoll" (
     "id"        TEXT NOT NULL,
     "bookingId" TEXT NOT NULL,
     "title"     TEXT NOT NULL,
     "options"   JSONB NOT NULL DEFAULT '[]',
     "closesAt"  TIMESTAMP(3),
     "closedAt"  TIMESTAMP(3),
     "createdBy" TEXT,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "AttendancePoll_pkey" PRIMARY KEY ("id")
   )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "AttendancePoll_bookingId_key"
     ON "AttendancePoll"("bookingId")`,

  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendancePoll_bookingId_fkey') THEN
       ALTER TABLE "AttendancePoll"
         ADD CONSTRAINT "AttendancePoll_bookingId_fkey"
         FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
         ON DELETE CASCADE ON UPDATE CASCADE;
     END IF;
   END $$`,

  `CREATE TABLE IF NOT EXISTS "AttendanceVote" (
     "id"        TEXT NOT NULL,
     "pollId"    TEXT NOT NULL,
     "memberId"  TEXT NOT NULL,
     "optionKey" TEXT NOT NULL,
     "votedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "AttendanceVote_pkey" PRIMARY KEY ("id")
   )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceVote_pollId_memberId_key"
     ON "AttendanceVote"("pollId", "memberId")`,

  `CREATE INDEX IF NOT EXISTS "AttendanceVote_pollId_idx" ON "AttendanceVote"("pollId")`,
  `CREATE INDEX IF NOT EXISTS "AttendanceVote_memberId_idx" ON "AttendanceVote"("memberId")`,

  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceVote_pollId_fkey') THEN
       ALTER TABLE "AttendanceVote"
         ADD CONSTRAINT "AttendanceVote_pollId_fkey"
         FOREIGN KEY ("pollId") REFERENCES "AttendancePoll"("id")
         ON DELETE CASCADE ON UPDATE CASCADE;
     END IF;
   END $$`,

  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceVote_memberId_fkey') THEN
       ALTER TABLE "AttendanceVote"
         ADD CONSTRAINT "AttendanceVote_memberId_fkey"
         FOREIGN KEY ("memberId") REFERENCES "Member"("id")
         ON DELETE CASCADE ON UPDATE CASCADE;
     END IF;
   END $$`,
];

(async () => {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log('✓', sql.trim().split('\n')[0].slice(0, 70));
  }

  const pollCount = await prisma.attendancePoll.count();
  const voteCount = await prisma.attendanceVote.count();
  console.log(`\n완료 — AttendancePoll ${pollCount}건 / AttendanceVote ${voteCount}건`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('실패:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
