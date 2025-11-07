-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nickname" TEXT,
    "gender" TEXT,
    "birthYear" TEXT,
    "region" TEXT,
    "isClubMember" TEXT,
    "club" TEXT,
    "handicap" TEXT,
    "golflinkNumber" TEXT,
    "clubMemberNumber" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "photo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "participants" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fee" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "dueDate" TEXT,
    "appliesTo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "coursePar" INTEGER NOT NULL DEFAULT 72,
    "holes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MemberFees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MemberFees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_phone_key" ON "Member"("phone");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Booking_organizerId_idx" ON "Booking"("organizerId");

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");

-- CreateIndex
CREATE INDEX "Fee_date_idx" ON "Fee"("date");

-- CreateIndex
CREATE INDEX "Fee_status_idx" ON "Fee"("status");

-- CreateIndex
CREATE INDEX "Score_userId_idx" ON "Score"("userId");

-- CreateIndex
CREATE INDEX "Score_date_idx" ON "Score"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Course_name_key" ON "Course"("name");

-- CreateIndex
CREATE INDEX "_MemberFees_B_index" ON "_MemberFees"("B");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberFees" ADD CONSTRAINT "_MemberFees_A_fkey" FOREIGN KEY ("A") REFERENCES "Fee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberFees" ADD CONSTRAINT "_MemberFees_B_fkey" FOREIGN KEY ("B") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
