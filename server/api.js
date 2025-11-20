const express = require('express');
const prisma = require('./db');

const router = express.Router();

router.get('/members', async (req, res) => {
  try {
    // 비활성화된 회원은 제외하고 조회
    const members = await prisma.member.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

router.post('/members', async (req, res) => {
  try {
    // 회원가입 승인 필요 설정 확인
    const approvalSetting = await prisma.appSettings.findUnique({
      where: { feature: 'memberApprovalRequired' }
    });
    
    const requiresApproval = approvalSetting?.enabled || false;
    
    const member = await prisma.member.create({
      data: {
        ...req.body,
        approvalStatus: requiresApproval ? 'pending' : 'approved'
      }
    });
    req.io.emit('members:updated');
    res.json(member);
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

router.put('/members/:id', async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: req.body
    });
    req.io.emit('members:updated');
    res.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

router.delete('/members/:id', async (req, res) => {
  try {
    // 회원을 삭제하는 대신 비활성화 처리 (라운딩 데이터 보존)
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    req.io.emit('members:updated');
    res.json({ success: true, member });
  } catch (error) {
    console.error('Error deactivating member:', error);
    res.status(500).json({ error: 'Failed to deactivate member' });
  }
});

router.patch('/members/:id/toggle-admin', async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id }
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isAdmin: !member.isAdmin }
    });
    
    req.io.emit('members:updated');
    res.json(updated);
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

router.patch('/members/:id/toggle-active', async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id }
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: member.isActive === false ? true : false }
    });
    
    req.io.emit('members:updated');
    res.json(updated);
  } catch (error) {
    console.error('Error toggling active status:', error);
    res.status(500).json({ error: 'Failed to toggle active status' });
  }
});

router.patch('/members/:id/toggle-fees-permission', async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id }
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { canManageFees: !member.canManageFees }
    });
    
    req.io.emit('members:updated');
    res.json(updated);
  } catch (error) {
    console.error('Error toggling fees permission:', error);
    res.status(500).json({ error: 'Failed to toggle fees permission' });
  }
});

router.patch('/members/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['관리자', '방장', '운영진', '클럽운영진', '회원'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { 
        role,
        isAdmin: role === '관리자'
      }
    });
    
    req.io.emit('members:updated');
    res.json(updated);
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const { id, ...postData } = req.body; // ID 제거
    const post = await prisma.post.create({
      data: postData,
      include: { author: true }
    });
    console.log('📤 Socket 이벤트 발송: posts:updated');
    req.io.emit('posts:updated');
    res.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/posts/:id', async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: req.body,
      include: { author: true }
    });
    console.log('📤 Socket 이벤트 발송: posts:updated');
    req.io.emit('posts:updated');
    res.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: req.params.id }
    });
    console.log('📤 Socket 이벤트 발송: posts:updated (삭제)');
    req.io.emit('posts:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { organizer: true },
      orderBy: { date: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const booking = await prisma.booking.create({
      data: req.body,
      include: { organizer: true }
    });
    req.io.emit('bookings:updated');
    res.json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.put('/bookings/:id', async (req, res) => {
  try {
    const oldBooking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });

    if (!oldBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: req.body,
      include: { organizer: true }
    });

    if (req.body.participants !== undefined) {
      const oldParticipants = oldBooking.participants || [];
      const newParticipants = req.body.participants || [];

      const parseParticipant = (p) => {
        try {
          return typeof p === 'string' ? JSON.parse(p) : p;
        } catch {
          return p;
        }
      };

      const oldPhones = oldParticipants.map(p => parseParticipant(p).phone).filter(Boolean);
      const newPhones = newParticipants.map(p => parseParticipant(p).phone).filter(Boolean);

      const addedPhones = newPhones.filter(phone => !oldPhones.includes(phone));
      const removedPhones = oldPhones.filter(phone => !newPhones.includes(phone));

      for (const phone of addedPhones) {
        const member = await prisma.member.findFirst({
          where: { phone }
        });

        if (member) {
          const totalAmount = 
            (booking.greenFee || 0) + 
            (booking.cartFee || 0) + 
            (booking.membershipFee || 0);

          if (totalAmount > 0) {
            await prisma.transaction.create({
              data: {
                type: 'charge',
                amount: totalAmount,
                description: `${booking.courseName} 라운딩`,
                date: new Date().toISOString().split('T')[0],
                memberId: member.id,
                bookingId: booking.id
              }
            });
          }

          const memberTransactions = await prisma.transaction.findMany({
            where: { memberId: member.id }
          });

          const newBalance = memberTransactions.reduce((sum, t) => {
            if (t.type === 'charge') return sum - t.amount;
            if (t.type === 'payment') return sum + t.amount;
            return sum;
          }, 0);

          await prisma.member.update({
            where: { id: member.id },
            data: { balance: newBalance }
          });
        }
      }

      for (const phone of removedPhones) {
        const member = await prisma.member.findFirst({
          where: { phone }
        });

        if (member) {
          const transactionsToDelete = await prisma.transaction.findMany({
            where: {
              memberId: member.id,
              bookingId: booking.id,
              type: 'charge'
            }
          });

          for (const transaction of transactionsToDelete) {
            await prisma.transaction.delete({
              where: { id: transaction.id }
            });
          }

          const memberTransactions = await prisma.transaction.findMany({
            where: { memberId: member.id }
          });

          const newBalance = memberTransactions.reduce((sum, t) => {
            if (t.type === 'charge') return sum - t.amount;
            if (t.type === 'payment') return sum + t.amount;
            return sum;
          }, 0);

          await prisma.member.update({
            where: { id: member.id },
            data: { balance: newBalance }
          });
        }
      }
    }

    req.io.emit('bookings:updated');
    req.io.emit('members:updated');
    req.io.emit('transactions:updated');
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

router.delete('/bookings/:id', async (req, res) => {
  try {
    await prisma.booking.delete({
      where: { id: req.params.id }
    });
    req.io.emit('bookings:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

router.patch('/bookings/:id/toggle-announce', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { isAnnounced: !booking.isAnnounced },
      include: { organizer: true }
    });
    
    req.io.emit('bookings:updated');
    res.json(updated);
  } catch (error) {
    console.error('Error toggling announce status:', error);
    res.status(500).json({ error: 'Failed to toggle announce status' });
  }
});

router.patch('/bookings/:id/toggle-number-rental', async (req, res) => {
  try {
    const { userPhone } = req.body;
    
    if (!userPhone) {
      return res.status(400).json({ error: 'User phone is required' });
    }
    
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const currentRentals = booking.numberRentals || [];
    const isRenting = currentRentals.includes(userPhone);
    
    const updatedRentals = isRenting
      ? currentRentals.filter(phone => phone !== userPhone)
      : [...currentRentals, userPhone];
    
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { numberRentals: updatedRentals },
      include: { organizer: true }
    });
    
    req.io.emit('bookings:updated');
    res.json(updated);
  } catch (error) {
    console.error('Error toggling number rental:', error);
    res.status(500).json({ error: 'Failed to toggle number rental' });
  }
});

router.patch('/bookings/:id/grade-settings', async (req, res) => {
  try {
    const { gradeSettings } = req.body;
    
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { gradeSettings },
      include: { organizer: true }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating grade settings:', error);
    res.status(500).json({ error: 'Failed to update grade settings' });
  }
});

router.get('/fees', async (req, res) => {
  try {
    const fees = await prisma.fee.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(fees);
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
});

router.post('/fees', async (req, res) => {
  try {
    const fee = await prisma.fee.create({
      data: req.body
    });
    res.json(fee);
  } catch (error) {
    console.error('Error creating fee:', error);
    res.status(500).json({ error: 'Failed to create fee' });
  }
});

router.put('/fees/:id', async (req, res) => {
  try {
    const fee = await prisma.fee.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(fee);
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ error: 'Failed to update fee' });
  }
});

router.delete('/fees/:id', async (req, res) => {
  try {
    await prisma.fee.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting fee:', error);
    res.status(500).json({ error: 'Failed to delete fee' });
  }
});

router.get('/scores/booking/:date/:courseName', async (req, res) => {
  try {
    const { date, courseName } = req.params;
    const scores = await prisma.score.findMany({
      where: { 
        date: decodeURIComponent(date),
        courseName: decodeURIComponent(courseName)
      },
      include: { user: true }
    });
    res.json(scores);
  } catch (error) {
    console.error('Error fetching booking scores:', error);
    res.status(500).json({ error: 'Failed to fetch booking scores' });
  }
});

router.get('/scores/:userId', async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      where: { userId: req.params.userId },
      orderBy: { date: 'desc' }
    });
    res.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

router.post('/scores', async (req, res) => {
  try {
    const score = await prisma.score.create({
      data: req.body
    });
    res.json(score);
  } catch (error) {
    console.error('Error creating score:', error);
    res.status(500).json({ error: 'Failed to create score' });
  }
});

router.put('/scores/:id', async (req, res) => {
  try {
    const score = await prisma.score.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(score);
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

router.delete('/scores/:id', async (req, res) => {
  try {
    await prisma.score.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting score:', error);
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

router.delete('/scores/booking/:date/:courseName', async (req, res) => {
  try {
    const { date, courseName } = req.params;
    
    await prisma.score.deleteMany({
      where: { 
        date: decodeURIComponent(date),
        courseName: decodeURIComponent(courseName)
      }
    });
    
    const booking = await prisma.booking.findFirst({
      where: {
        date: decodeURIComponent(date),
        courseName: decodeURIComponent(courseName)
      }
    });
    
    if (booking) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { dailyHandicaps: null }
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking scores:', error);
    res.status(500).json({ error: 'Failed to delete booking scores' });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const course = await prisma.course.create({
      data: req.body
    });
    res.json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const { name, address, holePars, isCompetition } = req.body;
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        holePars,
        isCompetition
      }
    });
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    await prisma.course.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.appSettings.findMany();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings/:feature', async (req, res) => {
  try {
    const { minRole, enabled } = req.body;
    const updateData = {};
    if (minRole !== undefined) updateData.minRole = minRole;
    if (enabled !== undefined) updateData.enabled = enabled;
    
    const setting = await prisma.appSettings.upsert({
      where: { feature: req.params.feature },
      update: updateData,
      create: { feature: req.params.feature, ...updateData }
    });
    res.json(setting);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

router.get('/scores/:memberId', async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      where: { userId: req.params.memberId },
      orderBy: { date: 'desc' }
    });
    res.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

router.post('/scores', async (req, res) => {
  try {
    const { memberId, roundingName, date, courseName, totalScore } = req.body;
    const score = await prisma.score.create({
      data: {
        userId: memberId,
        roundingName,
        date,
        courseName,
        totalScore,
        holes: ''
      }
    });
    res.json(score);
  } catch (error) {
    console.error('Error creating score:', error);
    res.status(500).json({ error: 'Failed to create score' });
  }
});

// 회원 승인
router.patch('/members/:id/approve', async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { approvalStatus: 'approved' }
    });
    req.io.emit('members:updated');
    res.json(member);
  } catch (error) {
    console.error('Error approving member:', error);
    res.status(500).json({ error: 'Failed to approve member' });
  }
});

// 회원 거부
router.patch('/members/:id/reject', async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { approvalStatus: 'rejected' }
    });
    req.io.emit('members:updated');
    res.json(member);
  } catch (error) {
    console.error('Error rejecting member:', error);
    res.status(500).json({ error: 'Failed to reject member' });
  }
});

// ============= Transaction API =============

// 모든 거래 내역 조회 (최적화: limit 지원)
router.get('/transactions', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    
    const transactions = await prisma.transaction.findMany({
      include: {
        member: {
          select: {
            id: true,
            name: true,
            nickname: true
          }
        },
        booking: {
          select: {
            id: true,
            courseName: true,
            date: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: limit
    });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// 회원별 거래 내역 조회
router.get('/transactions/member/:memberId', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { memberId: req.params.memberId },
      include: {
        booking: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching member transactions:', error);
    res.status(500).json({ error: 'Failed to fetch member transactions' });
  }
});

// 회원 잔액 계산
router.get('/transactions/balance/:memberId', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { memberId: req.params.memberId }
    });

    const balance = transactions.reduce((sum, t) => {
      if (t.type === 'charge') return sum - t.amount;
      if (t.type === 'payment') return sum + t.amount;
      return sum;
    }, 0);

    res.json({ balance });
  } catch (error) {
    console.error('Error calculating member balance:', error);
    res.status(500).json({ error: 'Failed to calculate balance' });
  }
});

// 클럽 잔액 계산 (최적화)
router.get('/transactions/club-balance', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      select: {
        type: true,
        amount: true
      }
    });

    const balance = transactions.reduce((sum, t) => {
      if (t.type === 'payment') return sum + t.amount;
      if (t.type === 'donation') return sum + t.amount;
      if (t.type === 'expense') return sum - t.amount;
      return sum;
    }, 0);

    res.json({ balance });
  } catch (error) {
    console.error('Error calculating club balance:', error);
    res.status(500).json({ error: 'Failed to calculate club balance' });
  }
});

// 회원별 미수금 조회 (최적화: N+1 쿼리 해결)
router.get('/transactions/outstanding', async (req, res) => {
  try {
    const [members, transactions] = await Promise.all([
      prisma.member.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          nickname: true
        }
      }),
      prisma.transaction.findMany({
        where: {
          OR: [
            { type: 'charge' },
            { type: 'payment' }
          ]
        },
        select: {
          memberId: true,
          type: true,
          amount: true
        }
      })
    ]);

    const balanceByMember = {};
    
    transactions.forEach(t => {
      if (!t.memberId) return;
      if (!balanceByMember[t.memberId]) {
        balanceByMember[t.memberId] = 0;
      }
      if (t.type === 'charge') {
        balanceByMember[t.memberId] -= t.amount;
      } else if (t.type === 'payment') {
        balanceByMember[t.memberId] += t.amount;
      }
    });

    const outstandingBalances = members
      .map(member => ({
        memberId: member.id,
        memberName: member.name,
        memberNickname: member.nickname,
        balance: balanceByMember[member.id] || 0
      }))
      .filter(ob => ob.balance < 0);

    res.json(outstandingBalances);
  } catch (error) {
    console.error('Error fetching outstanding balances:', error);
    res.status(500).json({ error: 'Failed to fetch outstanding balances' });
  }
});

// 거래 생성 (charge, payment, expense, donation)
router.post('/transactions', async (req, res) => {
  try {
    const transaction = await prisma.transaction.create({
      data: req.body,
      include: {
        member: true,
        booking: true
      }
    });
    
    // 회원 잔액 업데이트
    if (transaction.memberId && (transaction.type === 'charge' || transaction.type === 'payment')) {
      const memberTransactions = await prisma.transaction.findMany({
        where: { memberId: transaction.memberId }
      });

      const newBalance = memberTransactions.reduce((sum, t) => {
        if (t.type === 'charge') return sum - t.amount;
        if (t.type === 'payment') return sum + t.amount;
        return sum;
      }, 0);

      await prisma.member.update({
        where: { id: transaction.memberId },
        data: { balance: newBalance }
      });
    }

    req.io.emit('transactions:updated');
    req.io.emit('members:updated');
    res.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// 거래 삭제
router.delete('/transactions/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await prisma.transaction.delete({
      where: { id: req.params.id }
    });

    // 회원 잔액 재계산
    if (transaction.memberId) {
      const memberTransactions = await prisma.transaction.findMany({
        where: { memberId: transaction.memberId }
      });

      const newBalance = memberTransactions.reduce((sum, t) => {
        if (t.type === 'charge') return sum - t.amount;
        if (t.type === 'payment') return sum + t.amount;
        return sum;
      }, 0);

      await prisma.member.update({
        where: { id: transaction.memberId },
        data: { balance: newBalance }
      });
    }

    req.io.emit('transactions:updated');
    req.io.emit('members:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// 입금항목 조회
router.get('/income-categories', async (req, res) => {
  try {
    const categories = await prisma.incomeCategory.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching income categories:', error);
    res.status(500).json({ error: 'Failed to fetch income categories' });
  }
});

// 입금항목 생성
router.post('/income-categories', async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.incomeCategory.create({
      data: { name }
    });
    res.json(category);
  } catch (error) {
    console.error('Error creating income category:', error);
    res.status(500).json({ error: 'Failed to create income category' });
  }
});

// 입금항목 삭제
router.delete('/income-categories/:id', async (req, res) => {
  try {
    await prisma.incomeCategory.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting income category:', error);
    res.status(500).json({ error: 'Failed to delete income category' });
  }
});

// 출금항목 조회
router.get('/expense-categories', async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
});

// 출금항목 생성
router.post('/expense-categories', async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.expenseCategory.create({
      data: { name }
    });
    res.json(category);
  } catch (error) {
    console.error('Error creating expense category:', error);
    res.status(500).json({ error: 'Failed to create expense category' });
  }
});

// 출금항목 삭제
router.delete('/expense-categories/:id', async (req, res) => {
  try {
    await prisma.expenseCategory.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense category:', error);
    res.status(500).json({ error: 'Failed to delete expense category' });
  }
});

module.exports = router;
