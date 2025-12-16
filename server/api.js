const express = require("express");
const prisma = require("./db");

const router = express.Router();

router.get("/members", async (req, res) => {
  try {
    // 비활성화된 회원은 제외하고 조회
    const members = await prisma.member.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.post("/members", async (req, res) => {
  try {
    // 이미 존재하는 전화번호인지 확인
    const existingMember = await prisma.member.findFirst({
      where: { phone: req.body.phone },
    });

    if (existingMember) {
      return res.status(409).json({
        error: "DUPLICATE_PHONE",
        message: `이미 회원가입이 되어있습니다. [${existingMember.nickname || existingMember.name}]`,
        nickname: existingMember.nickname || existingMember.name,
      });
    }

    // 회원가입 승인 필요 설정 확인
    const approvalSetting = await prisma.appSettings.findUnique({
      where: { feature: "memberApprovalRequired" },
    });

    const requiresApproval = approvalSetting?.enabled || false;

    const member = await prisma.member.create({
      data: {
        ...req.body,
        approvalStatus: requiresApproval ? "pending" : "approved",
      },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error creating member:", error);
    res.status(500).json({ error: "Failed to create member" });
  }
});

router.put("/members/:id", async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: req.body,
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

router.delete("/members/:id", async (req, res) => {
  try {
    // 회원을 삭제하는 대신 비활성화 처리 (라운딩 데이터 보존)
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    req.io.emit("members:updated");
    res.json({ success: true, member });
  } catch (error) {
    console.error("Error deactivating member:", error);
    res.status(500).json({ error: "Failed to deactivate member" });
  }
});

router.patch("/members/:id/toggle-admin", async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isAdmin: !member.isAdmin },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling admin status:", error);
    res.status(500).json({ error: "Failed to toggle admin status" });
  }
});

router.patch("/members/:id/toggle-active", async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: member.isActive === false ? true : false },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling active status:", error);
    res.status(500).json({ error: "Failed to toggle active status" });
  }
});

router.patch("/members/:id/toggle-fees-permission", async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { canManageFees: !member.canManageFees },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling fees permission:", error);
    res.status(500).json({ error: "Failed to toggle fees permission" });
  }
});

router.patch("/members/:id/role", async (req, res) => {
  try {
    const { role } = req.body;

    if (!["관리자", "방장", "운영진", "클럽운영진", "회원"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: {
        role,
        isAdmin: role === "관리자",
      },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ error: "Failed to update member role" });
  }
});

router.get("/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { author: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const { id, ...postData } = req.body; // ID 제거
    const post = await prisma.post.create({
      data: postData,
      include: { author: true },
    });

    req.io.emit("posts:updated");
    res.json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.put("/posts/:id", async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: req.body,
      include: { author: true },
    });

    req.io.emit("posts:updated");
    res.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.delete("/posts/:id", async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: req.params.id },
    });
    console.log("📤 Socket 이벤트 발송: posts:updated (삭제)");
    req.io.emit("posts:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

router.patch("/posts/:id/toggle-active", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const updatedPost = await prisma.post.update({
      where: { id: req.params.id },
      data: { isActive: !post.isActive },
      include: { author: true },
    });
    req.io.emit("posts:updated");
    res.json(updatedPost);
  } catch (error) {
    console.error("Error toggling post active status:", error);
    res.status(500).json({ error: "Failed to toggle post status" });
  }
});

router.get("/bookings", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { organizer: true },
      orderBy: { date: "desc" },
    });
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const booking = await prisma.booking.create({
      data: req.body,
      include: { organizer: true },
    });
    req.io.emit("bookings:updated");
    res.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

router.put("/bookings/:id", async (req, res) => {
  try {
    const oldBooking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!oldBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: req.body,
      include: { organizer: true },
    });

    if (req.body.participants !== undefined) {
      const oldParticipants = oldBooking.participants || [];
      const newParticipants = req.body.participants || [];

      const parseParticipant = (p) => {
        try {
          return typeof p === "string" ? JSON.parse(p) : p;
        } catch {
          return p;
        }
      };

      const oldPhones = oldParticipants
        .map((p) => parseParticipant(p).phone)
        .filter(Boolean);
      const newPhones = newParticipants
        .map((p) => parseParticipant(p).phone)
        .filter(Boolean);

      const addedPhones = newPhones.filter(
        (phone) => !oldPhones.includes(phone),
      );
      const removedPhones = oldPhones.filter(
        (phone) => !newPhones.includes(phone),
      );

      for (const phone of addedPhones) {
        const member = await prisma.member.findFirst({
          where: { phone },
        });

        if (member) {
          // 중복 청구 방지: 이미 해당 라운딩에 대한 거래가 있는지 확인
          const existingTransaction = await prisma.transaction.findFirst({
            where: {
              memberId: member.id,
              bookingId: booking.id,
              type: { in: ["charge", "expense"] },
            },
          });

          if (existingTransaction) {
            console.log(`Skipping duplicate charge for member ${member.nickname} on booking ${booking.title}`);
            continue;
          }

          let totalAmount;
          if (member.isFeeExempt) {
            totalAmount = (booking.greenFee || 0) + (booking.cartFee || 0);
          } else {
            totalAmount =
              (booking.greenFee || 0) +
              (booking.cartFee || 0) +
              (booking.membershipFee || 0);
          }

          if (totalAmount > 0) {
            const memberTransactionsBefore = await prisma.transaction.findMany({
              where: { memberId: member.id },
            });
            const currentBalance = memberTransactionsBefore.reduce((sum, t) => {
              if (t.type === "charge") return sum - t.amount;
              if (
                t.type === "payment" &&
                t.category !== "크레딧 자동 납부" &&
                t.category !== "크레딧 납부" &&
                t.category !== "크레딧 자동 차감"
              )
                return sum + t.amount;
              if (t.type === "credit") return sum + t.amount;
              if (t.type === "expense") return sum - t.amount;
              if (t.type === "creditDonation") return sum - t.amount;
              return sum;
            }, 0);

            const creditBalance = currentBalance > 0 ? currentBalance : 0;
            const creditToUse = Math.min(creditBalance, totalAmount);
            const remainingCharge = totalAmount - creditToUse;
            const today = new Date().toISOString().split("T")[0];
            const baseDescription = member.isFeeExempt
              ? `${booking.title} 라운딩 (참가비 면제)`
              : `${booking.title} 라운딩`;

            // 1. 크레딧 사용분 처리 (Expense + Payment 생성)
            if (creditToUse > 0) {
              // 회원의 크레딧 차감 (expense)
              await prisma.transaction.create({
                data: {
                  type: "expense",
                  amount: creditToUse,
                  description: `${baseDescription} (크레딧 자동 차감)`,
                  category: "크레딧 자동 차감",
                  date: today,
                  memberId: member.id,
                  bookingId: booking.id,
                },
              });
              
              // 클럽 수입 기록 (payment) - 크레딧 차감액만큼 클럽 잔액 증가
              await prisma.transaction.create({
                data: {
                  type: "payment",
                  amount: creditToUse,
                  description: `${baseDescription} (크레딧 자동 차감)`,
                  category: "크레딧 자동 차감",
                  date: today,
                  memberId: member.id,
                  bookingId: booking.id,
                },
              });
            }

            // 2. 남은 금액 처리 (Charge 생성 -> 미수금 발생)
            if (remainingCharge > 0) {
              await prisma.transaction.create({
                data: {
                  type: "charge",
                  amount: remainingCharge,
                  description:
                    creditToUse > 0
                      ? `${baseDescription} (크레딧 $${creditToUse} 사용 후 잔액)`
                      : baseDescription,
                  date: today,
                  memberId: member.id,
                  bookingId: booking.id,
                },
              });
            }
          }

          const memberTransactions = await prisma.transaction.findMany({
            where: { memberId: member.id },
          });

          const newBalance = memberTransactions.reduce((sum, t) => {
            if (t.type === "charge") return sum - t.amount;
            if (
              t.type === "payment" &&
              t.category !== "크레딧 자동 납부" &&
              t.category !== "크레딧 납부" &&
              t.category !== "크레딧 자동 차감"
            )
              return sum + t.amount;
            if (t.type === "credit") return sum + t.amount;
            if (t.type === "expense") return sum - t.amount;
            if (t.type === "creditDonation") return sum - t.amount;
            return sum;
          }, 0);

          await prisma.member.update({
            where: { id: member.id },
            data: { balance: newBalance },
          });
        }
      }

      // 참가 취소된 회원의 청구/크레딧사용 트랜잭션 삭제 및 잔액 업데이트
      for (const phone of removedPhones) {
        const member = await prisma.member.findFirst({
          where: { phone },
        });

        if (member) {
          // 해당 라운딩의 청구, 크레딧 자동 차감 (expense + payment) 트랜잭션 삭제
          await prisma.transaction.deleteMany({
            where: {
              memberId: member.id,
              bookingId: booking.id,
              OR: [
                { type: "charge" },
                { type: "expense", category: "크레딧 자동 차감" },
                { type: "payment", category: "크레딧 자동 차감" },
              ],
            },
          });

          // 잔액 재계산
          const memberTransactions = await prisma.transaction.findMany({
            where: { memberId: member.id },
          });

          const newBalance = memberTransactions.reduce((sum, t) => {
            if (t.type === "charge") return sum - t.amount;
            if (
              t.type === "payment" &&
              t.category !== "크레딧 자동 납부" &&
              t.category !== "크레딧 납부" &&
              t.category !== "크레딧 자동 차감"
            )
              return sum + t.amount;
            if (t.type === "credit") return sum + t.amount;
            if (t.type === "expense") return sum - t.amount;
            if (t.type === "creditDonation") return sum - t.amount;
            return sum;
          }, 0);

          await prisma.member.update({
            where: { id: member.id },
            data: { balance: newBalance },
          });
        }
      }
    }

    req.io.emit("bookings:updated");
    req.io.emit("members:updated");
    req.io.emit("transactions:updated");
    res.json(booking);
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

router.delete("/bookings/:id", async (req, res) => {
  try {
    await prisma.booking.delete({
      where: { id: req.params.id },
    });
    req.io.emit("bookings:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

router.patch("/bookings/:id/toggle-announce", async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { isAnnounced: !booking.isAnnounced },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling announce status:", error);
    res.status(500).json({ error: "Failed to toggle announce status" });
  }
});

router.patch("/bookings/:id/toggle-play", async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const newPlayEnabled = !booking.playEnabled;
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        playEnabled: newPlayEnabled,
        playManuallyDisabled: !newPlayEnabled,
      },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling play status:", error);
    res.status(500).json({ error: "Failed to toggle play status" });
  }
});

router.patch("/bookings/:id/toggle-number-rental", async (req, res) => {
  try {
    const { userPhone } = req.body;

    if (!userPhone) {
      return res.status(400).json({ error: "User phone is required" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const currentRentals = booking.numberRentals || [];
    const isRenting = currentRentals.includes(userPhone);

    const updatedRentals = isRenting
      ? currentRentals.filter((phone) => phone !== userPhone)
      : [...currentRentals, userPhone];

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { numberRentals: updatedRentals },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling number rental:", error);
    res.status(500).json({ error: "Failed to toggle number rental" });
  }
});

router.patch("/bookings/:id/grade-settings", async (req, res) => {
  try {
    const { gradeSettings } = req.body;

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { gradeSettings: JSON.stringify(gradeSettings) },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error updating grade settings:", error);
    res.status(500).json({ error: "Failed to update grade settings" });
  }
});

router.get("/fees", async (req, res) => {
  try {
    const fees = await prisma.fee.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(fees);
  } catch (error) {
    console.error("Error fetching fees:", error);
    res.status(500).json({ error: "Failed to fetch fees" });
  }
});

router.post("/fees", async (req, res) => {
  try {
    const fee = await prisma.fee.create({
      data: req.body,
    });
    res.json(fee);
  } catch (error) {
    console.error("Error creating fee:", error);
    res.status(500).json({ error: "Failed to create fee" });
  }
});

router.put("/fees/:id", async (req, res) => {
  try {
    const fee = await prisma.fee.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(fee);
  } catch (error) {
    console.error("Error updating fee:", error);
    res.status(500).json({ error: "Failed to update fee" });
  }
});

router.delete("/fees/:id", async (req, res) => {
  try {
    await prisma.fee.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting fee:", error);
    res.status(500).json({ error: "Failed to delete fee" });
  }
});

router.get("/scores/all", async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      include: { user: true },
      orderBy: { date: "desc" },
    });
    res.json(scores);
  } catch (error) {
    console.error("Error fetching all scores:", error);
    res.status(500).json({ error: "Failed to fetch all scores" });
  }
});

router.get("/scores/booking/:date/:courseName", async (req, res) => {
  try {
    const { date, courseName } = req.params;
    const scores = await prisma.score.findMany({
      where: {
        date: decodeURIComponent(date),
        courseName: decodeURIComponent(courseName),
      },
      include: { user: true },
    });
    res.json(scores);
  } catch (error) {
    console.error("Error fetching booking scores:", error);
    res.status(500).json({ error: "Failed to fetch booking scores" });
  }
});

router.get("/scores/by-rounding/:roundingName", async (req, res) => {
  try {
    const { roundingName } = req.params;
    const scores = await prisma.score.findMany({
      where: {
        roundingName: decodeURIComponent(roundingName),
      },
      select: {
        id: true,
        userId: true,
        totalScore: true,
        coursePar: true,
        holes: true,
        courseName: true,
        date: true,
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            handicap: true,
            gender: true,
          },
        },
      },
    });
    res.json(scores);
  } catch (error) {
    console.error("Error fetching rounding scores:", error);
    res.status(500).json({ error: "Failed to fetch rounding scores" });
  }
});

router.get("/scores/round-comparison", async (req, res) => {
  try {
    const { roundingName, date, myId, teammateId } = req.query;

    if (!roundingName || !date || !myId || !teammateId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const scores = await prisma.score.findMany({
      where: {
        roundingName,
        date,
        userId: { in: [myId, teammateId] },
      },
    });

    const myScore = scores.find((s) => s.userId === myId);
    const teammateScore = scores.find((s) => s.userId === teammateId);

    const result = {
      myScore: myScore ? JSON.parse(myScore.holes || "[]") : null,
      teammateScore: teammateScore
        ? JSON.parse(teammateScore.holes || "[]")
        : null,
      myVerified: myScore?.verified || false,
      teammateVerified: teammateScore?.verified || false,
      teammateComplete: !!teammateScore,
      mismatches: [],
    };

    res.json(result);
  } catch (error) {
    console.error("Error fetching round comparison:", error);
    res.status(500).json({ error: "Failed to fetch round comparison" });
  }
});

router.post("/scores/verify-round", async (req, res) => {
  try {
    const {
      roundingName,
      date,
      myId,
      teammateId,
      myHoles,
      teammateHolesRecordedByMe,
    } = req.body;

    if (!roundingName || !date || !myId || !teammateId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const teammateScore = await prisma.score.findUnique({
      where: {
        userId_date_roundingName: {
          userId: teammateId,
          date,
          roundingName,
        },
      },
    });

    if (!teammateScore) {
      return res.json({
        success: false,
        error: "TEAMMATE_NOT_READY",
        message: "팀메이트가 아직 스코어를 입력하지 않았습니다.",
      });
    }

    const teammateHoles = JSON.parse(teammateScore.holes || "[]");
    const mismatches = [];

    for (let i = 0; i < 18; i++) {
      if (teammateHoles[i] !== teammateHolesRecordedByMe[i]) {
        mismatches.push(i + 1);
      }
    }

    if (mismatches.length === 0) {
      await prisma.score.update({
        where: { id: teammateScore.id },
        data: {
          verified: true,
          verifiedBy: myId,
        },
      });

      return res.json({
        success: true,
        verified: true,
        message: "팀메이트 스코어가 검증되었습니다.",
      });
    } else {
      return res.json({
        success: true,
        verified: false,
        mismatches,
        message: `${mismatches.length}개 홀의 점수가 일치하지 않습니다.`,
      });
    }
  } catch (error) {
    console.error("Error verifying round:", error);
    res.status(500).json({ error: "Failed to verify round" });
  }
});

router.get("/scores/member/:memberId/:roundingName", async (req, res) => {
  try {
    const { memberId, roundingName } = req.params;
    const score = await prisma.score.findFirst({
      where: {
        userId: memberId,
        roundingName: decodeURIComponent(roundingName),
      },
    });
    if (score) {
      res.json(score);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error("Error fetching member score:", error);
    res.status(500).json({ error: "Failed to fetch member score" });
  }
});

router.get("/scores/:userId", async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      where: { userId: req.params.userId },
      orderBy: { date: "desc" },
    });
    res.json(scores);
  } catch (error) {
    console.error("Error fetching scores:", error);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

router.get("/scores/check", async (req, res) => {
  try {
    const { memberId, date, roundingName } = req.query;

    const score = await prisma.score.findFirst({
      where: {
        userId: memberId,
        date: date,
        roundingName: roundingName,
      },
    });

    res.json({ exists: !!score, completed: score?.completed || false });
  } catch (error) {
    console.error("Error checking score:", error);
    res.status(500).json({ error: "Failed to check score" });
  }
});

router.post("/scores/complete", async (req, res) => {
  try {
    const { memberId, markerId, date, roundingName } = req.body;

    await prisma.score.updateMany({
      where: {
        OR: [
          { userId: memberId, markerId: markerId, date, roundingName },
          { userId: markerId, markerId: memberId, date, roundingName },
        ],
      },
      data: { completed: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error completing score:", error);
    res.status(500).json({ error: "Failed to complete score" });
  }
});

router.delete(
  "/scores/member/:memberId/:date/:roundingName",
  async (req, res) => {
    try {
      const { memberId, date, roundingName } = req.params;
      const decodedMemberId = decodeURIComponent(memberId);
      const decodedDate = decodeURIComponent(date);
      const decodedRoundingName = decodeURIComponent(roundingName);

      await prisma.score.delete({
        where: {
          userId_date_roundingName: {
            userId: decodedMemberId,
            date: decodedDate,
            roundingName: decodedRoundingName,
          },
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting member scores:", error);
      res.status(500).json({ error: "Failed to delete member scores" });
    }
  },
);

router.post("/scores", async (req, res) => {
  try {
    const {
      memberId,
      markerId,
      roundingName,
      date,
      courseName,
      totalScore,
      coursePar,
      holes,
      isVerification,
    } = req.body;

    const isSelfEntry = !markerId || markerId === memberId;

    if (isVerification && !isSelfEntry) {
      const existingScore = await prisma.score.findUnique({
        where: {
          userId_date_roundingName: {
            userId: memberId,
            date: date,
            roundingName: roundingName || "",
          },
        },
      });

      if (!existingScore) {
        return res.status(400).json({
          error: "PLAYER_SCORE_NOT_FOUND",
          message: "플레이어가 아직 스코어를 입력하지 않았습니다.",
        });
      }

      if (existingScore.totalScore !== totalScore) {
        return res.status(400).json({
          error: "SCORE_MISMATCH",
          message: `점수가 일치하지 않습니다. 플레이어 입력: ${existingScore.totalScore}타, 마커 입력: ${totalScore}타`,
          playerScore: existingScore.totalScore,
          markerScore: totalScore,
        });
      }

      const verifiedScore = await prisma.score.update({
        where: { id: existingScore.id },
        data: {
          verified: true,
          verifiedBy: markerId,
        },
      });

      return res.json({
        ...verifiedScore,
        verificationSuccess: true,
        message: "스코어가 검증되었습니다.",
      });
    }

    const score = await prisma.score.upsert({
      where: {
        userId_date_roundingName: {
          userId: memberId,
          date: date,
          roundingName: roundingName || "",
        },
      },
      update: {
        courseName,
        totalScore,
        coursePar,
        holes: JSON.stringify(holes),
        markerId: isSelfEntry ? memberId : markerId,
        verified: false,
        verifiedBy: null,
      },
      create: {
        userId: memberId,
        markerId: isSelfEntry ? memberId : markerId,
        roundingName: roundingName || "",
        date,
        courseName,
        totalScore,
        coursePar,
        holes: JSON.stringify(holes),
        verified: false,
      },
    });
    res.json(score);
  } catch (error) {
    console.error("Error creating score:", error);
    res.status(500).json({ error: "Failed to create score" });
  }
});

router.put("/scores/:id", async (req, res) => {
  try {
    const { totalScore, holes } = req.body;
    const updateData = { totalScore };
    if (holes) {
      updateData.holes = JSON.stringify(holes);
    }
    const score = await prisma.score.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(score);
  } catch (error) {
    console.error("Error updating score:", error);
    res.status(500).json({ error: "Failed to update score" });
  }
});

router.delete("/scores/:id", async (req, res) => {
  try {
    await prisma.score.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting score:", error);
    res.status(500).json({ error: "Failed to delete score" });
  }
});

router.delete("/scores/booking/:date/:courseName", async (req, res) => {
  try {
    const { date, courseName } = req.params;

    await prisma.score.deleteMany({
      where: {
        date: decodeURIComponent(date),
        courseName: decodeURIComponent(courseName),
      },
    });

    const booking = await prisma.booking.findFirst({
      where: {
        date: decodeURIComponent(date),
        courseName: decodeURIComponent(courseName),
      },
    });

    if (booking) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { dailyHandicaps: null },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking scores:", error);
    res.status(500).json({ error: "Failed to delete booking scores" });
  }
});

router.get("/courses", async (req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

router.post("/courses", async (req, res) => {
  try {
    const course = await prisma.course.create({
      data: req.body,
    });
    res.json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

router.put("/courses/:id", async (req, res) => {
  try {
    const { name, address, holePars, nearHoles, isCompetition } = req.body;
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        holePars,
        nearHoles,
        isCompetition,
      },
    });
    res.json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

router.delete("/courses/:id", async (req, res) => {
  try {
    await prisma.course.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

router.get("/ntp/:bookingId", async (req, res) => {
  try {
    const ntpRecords = await prisma.ntpRecord.findMany({
      where: { bookingId: req.params.bookingId },
      orderBy: [{ holeNumber: "asc" }, { distance: "asc" }],
    });
    res.json(ntpRecords);
  } catch (error) {
    console.error("Error fetching NTP records:", error);
    res.status(500).json({ error: "Failed to fetch NTP records" });
  }
});

router.post("/ntp", async (req, res) => {
  try {
    const { bookingId, memberId, memberName, holeNumber, distance } = req.body;
    const ntpRecord = await prisma.ntpRecord.upsert({
      where: {
        bookingId_memberId_holeNumber: {
          bookingId,
          memberId,
          holeNumber,
        },
      },
      update: { distance, memberName },
      create: { bookingId, memberId, memberName, holeNumber, distance },
    });
    res.json(ntpRecord);
  } catch (error) {
    console.error("Error saving NTP record:", error);
    res.status(500).json({ error: "Failed to save NTP record" });
  }
});

router.delete("/ntp/:id", async (req, res) => {
  try {
    await prisma.ntpRecord.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting NTP record:", error);
    res.status(500).json({ error: "Failed to delete NTP record" });
  }
});

router.get("/settings", async (req, res) => {
  try {
    const settings = await prisma.appSettings.findMany();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings/:feature", async (req, res) => {
  try {
    const { minRole, enabled, value } = req.body;
    const updateData = {};
    if (minRole !== undefined) updateData.minRole = minRole;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (value !== undefined) updateData.value = value;

    const setting = await prisma.appSettings.upsert({
      where: { feature: req.params.feature },
      update: updateData,
      create: { feature: req.params.feature, ...updateData },
    });
    res.json(setting);
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// 회원 승인
router.patch("/members/:id/approve", async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { approvalStatus: "approved" },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error approving member:", error);
    res.status(500).json({ error: "Failed to approve member" });
  }
});

// 회원 거부
router.patch("/members/:id/reject", async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { approvalStatus: "rejected" },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error rejecting member:", error);
    res.status(500).json({ error: "Failed to reject member" });
  }
});

// ============= Transaction API =============

// 모든 거래 내역 조회 (최적화: 페이지네이션 지원, 이미지 제외)
router.get("/transactions", async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const skip = (page - 1) * limit;
    const includeCharges = req.query.includeCharges === 'true';

    const whereClause = includeCharges ? {} : { type: { not: "charge" } };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          category: true,
          memo: true,
          date: true,
          createdAt: true,
          memberId: true,
          bookingId: true,
          createdBy: true,
          member: {
            select: {
              id: true,
              name: true,
              nickname: true,
            },
          },
          booking: {
            select: {
              id: true,
              title: true,
              courseName: true,
              date: true,
            },
          },
          executor: {
            select: {
              id: true,
              name: true,
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// 거래 상세 정보 조회 (영수증 이미지 포함)
router.get("/transactions/:id/details", async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        receiptImage: true,
        receiptImages: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    res.status(500).json({ error: "Failed to fetch transaction details" });
  }
});

// 회원별 거래 내역 조회 (최적화 - 이미지 제외)
router.get("/transactions/member/:memberId", async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { memberId: req.params.memberId },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        category: true,
        memo: true,
        date: true,
        createdAt: true,
        booking: {
          select: {
            id: true,
            title: true,
            courseName: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching member transactions:", error);
    res.status(500).json({ error: "Failed to fetch member transactions" });
  }
});

// 회원 잔액 계산 (최적화) - 도네이션은 개인 잔액에 영향 없음
router.get("/transactions/balance/:memberId", async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { memberId: req.params.memberId },
      select: { type: true, amount: true, category: true },
    });

    const balance = transactions.reduce((sum, t) => {
      if (t.type === "charge") return sum - t.amount;
      if (
        t.type === "payment" &&
        t.category !== "크레딧 자동 납부" &&
        t.category !== "크레딧 납부" &&
        t.category !== "크레딧 자동 차감"
      )
        return sum + t.amount;
      if (t.type === "credit") return sum + t.amount;
      if (t.type === "expense") return sum - t.amount;
      if (t.type === "creditDonation") return sum - t.amount;
      return sum;
    }, 0);

    res.json({ balance });
  } catch (error) {
    console.error("Error calculating member balance:", error);
    res.status(500).json({ error: "Failed to calculate balance" });
  }
});

// [Optimized] Club Balance & Category Breakdown
router.get('/transactions/club-balance', async (req, res) => {
  try {
    const [incomeAgg, expenseAgg, creditExpenseAgg, creditAgg, incomeGroups, expenseGroups] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: { in: ['payment', 'donation'] } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'expense' } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'expense', category: { in: ['크레딧 자동 차감', '크레딧 납부'] } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'credit' } }),
      prisma.transaction.groupBy({ by: ['category', 'description'], _sum: { amount: true }, where: { type: { in: ['payment', 'donation'] } } }),
      prisma.transaction.groupBy({ by: ['category'], _sum: { amount: true }, where: { type: 'expense' } })
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpense = expenseAgg._sum.amount || 0;
    const totalCreditExpense = creditExpenseAgg._sum.amount || 0;
    const totalCreditIssued = creditAgg._sum.amount || 0;
    const realExpense = totalExpense - totalCreditExpense;
    const balance = totalIncome - realExpense - totalCreditIssued;

    const incomeBreakdown = {};
    incomeGroups.forEach(g => {
        let key = g.category || '기타 수입';
        if (key === '기타 수입' && g.description) {
           if (g.description.includes(' - ')) key = g.description.split(' - ')[0];
           else if (g.description.includes(' (')) key = g.description.split(' (')[0];
           else key = g.description;
        }
        incomeBreakdown[key] = (incomeBreakdown[key] || 0) + (g._sum.amount || 0);
    });

    const expenseBreakdown = {};
    expenseGroups.forEach(g => {
        const key = g.category || '기타 지출';
        expenseBreakdown[key] = (expenseBreakdown[key] || 0) + (g._sum.amount || 0);
    });

    res.json({ balance, incomeBreakdown, expenseBreakdown });

  } catch (error) {
    console.error('Error calculating club stats:', error);
    res.status(500).json({ error: 'Failed to calculate club stats' });
  }
});

// 회원별 미수금 조회 (최적화: N+1 쿼리 해결)
router.get("/transactions/outstanding", async (req, res) => {
  try {
    const [members, transactions] = await Promise.all([
      prisma.member.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          nickname: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          OR: [
            { type: "charge" },
            { type: "payment" },
            { type: "credit" },
            { type: "donation" },
            { type: "expense" },
          ],
        },
        select: {
          memberId: true,
          type: true,
          amount: true,
          category: true,
        },
      }),
    ]);

    const balanceByMember = {};

    transactions.forEach((t) => {
      if (!t.memberId) return;
      if (!balanceByMember[t.memberId]) {
        balanceByMember[t.memberId] = 0;
      }
      if (t.type === "charge") {
        balanceByMember[t.memberId] -= t.amount;
      } else if (
        t.type === "payment" &&
        t.category !== "크레딧 자동 납부" &&
        t.category !== "크레딧 납부" &&
        t.category !== "크레딧 자동 차감"
      ) {
        balanceByMember[t.memberId] += t.amount;
      } else if (t.type === "credit") {
        balanceByMember[t.memberId] += t.amount;
      } else if (t.type === "expense") {
        balanceByMember[t.memberId] -= t.amount;
      }
    });

    const outstandingBalances = members
      .map((member) => ({
        memberId: member.id,
        memberName: member.name,
        memberNickname: member.nickname,
        balance: balanceByMember[member.id] || 0,
      }))
      .filter((ob) => ob.balance < 0);

    res.json(outstandingBalances);
  } catch (error) {
    console.error("Error fetching outstanding balances:", error);
    res.status(500).json({ error: "Failed to fetch outstanding balances" });
  }
});

// 거래 생성 (charge, payment, expense, donation, credit, creditDonation)
router.post("/transactions", async (req, res) => {
  try {
    const { memberId, bookingId, type } = req.body;

    // 중복 청구 방지: bookingId가 있고 charge 타입인 경우 기존 거래 확인
    if (bookingId && memberId && type === "charge") {
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          memberId: memberId,
          bookingId: bookingId,
          type: { in: ["charge", "expense"] },
        },
      });

      if (existingTransaction) {
        return res.status(400).json({ 
          error: "이미 해당 라운딩에 대한 청구가 존재합니다.",
          existingTransactionId: existingTransaction.id
        });
      }
    }

    const transaction = await prisma.transaction.create({
      data: req.body,
      include: {
        member: true,
        booking: true,
      },
    });

    // 회원 잔액 증분 업데이트 (전체 재계산 대신)
    if (transaction.memberId) {
      let balanceChange = 0;
      if (transaction.type === "charge") balanceChange = -transaction.amount;
      else if (
        transaction.type === "payment" &&
        transaction.category !== "크레딧 자동 납부" &&
        transaction.category !== "크레딧 납부" &&
        transaction.category !== "크레딧 자동 차감"
      )
        balanceChange = transaction.amount;
      else if (transaction.type === "credit")
        balanceChange = transaction.amount;
      else if (transaction.type === "expense")
        balanceChange = -transaction.amount;
      else if (transaction.type === "creditDonation")
        balanceChange = -transaction.amount;

      if (balanceChange !== 0) {
        await prisma.member.update({
          where: { id: transaction.memberId },
          data: { balance: { increment: balanceChange } },
        });
      }
    }

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json(transaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// 청구 생성 (크레딧 자동 차감 포함)
router.post("/transactions/charge-with-credit", async (req, res) => {
  try {
    const { memberId, amount, description, date, bookingId, createdBy } =
      req.body;

    if (!memberId || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "memberId and positive amount are required" });
    }

    // 중복 청구 방지: bookingId가 있으면 해당 라운딩에 대한 기존 거래 확인
    if (bookingId) {
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          memberId: memberId,
          bookingId: bookingId,
          type: { in: ["charge", "expense"] },
        },
      });

      if (existingTransaction) {
        return res.status(400).json({ 
          error: "이미 해당 라운딩에 대한 청구가 존재합니다.",
          existingTransactionId: existingTransaction.id
        });
      }
    }

    // 저장된 회원 잔액 사용 (전체 거래 조회 대신)
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { balance: true },
    });

    const currentBalance = member?.balance || 0;
    const creditBalance = currentBalance > 0 ? currentBalance : 0;
    const creditToUse = Math.min(creditBalance, amount);
    const today = date || new Date().toISOString().split("T")[0];

    const transactions = [];
    const remainingCharge = amount - creditToUse;
    let totalBalanceChange = 0;

    // 1. 크레딧 사용분 처리 (Expense + Payment 생성)
    if (creditToUse > 0) {
      const baseCategory =
        description.split(" - ")[0].replace("청구", "").trim() || "참가비";
      
      // 회원의 크레딧 차감 (expense)
      const expenseTx = await prisma.transaction.create({
        data: {
          type: "expense",
          amount: creditToUse,
          description: `${baseCategory} (크레딧 자동 차감)`,
          category: "크레딧 자동 차감",
          date: today,
          memberId: memberId,
          bookingId: bookingId || null,
          createdBy: createdBy || null,
        },
      });
      transactions.push(expenseTx);
      totalBalanceChange -= creditToUse;
      
      // 클럽 수입 기록 (payment) - 크레딧 차감액만큼 클럽 잔액 증가
      const paymentTx = await prisma.transaction.create({
        data: {
          type: "payment",
          amount: creditToUse,
          description: `${baseCategory} (크레딧 자동 차감)`,
          category: "크레딧 자동 차감",
          date: today,
          memberId: memberId,
          bookingId: bookingId || null,
          createdBy: createdBy || null,
        },
      });
      transactions.push(paymentTx);
    }

    // 2. 남은 금액 처리 (Charge 생성)
    if (remainingCharge > 0) {
      const chargeTx = await prisma.transaction.create({
        data: {
          type: "charge",
          amount: remainingCharge,
          description: description,
          date: today,
          memberId: memberId,
          bookingId: bookingId || null,
          createdBy: createdBy || null,
        },
      });
      transactions.push(chargeTx);
      totalBalanceChange -= remainingCharge;
    }

    // 증분 업데이트
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: { balance: { increment: totalBalanceChange } },
    });

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({
      success: true,
      transactions,
      creditUsed: creditToUse,
      remainingCharge,
      newBalance: updatedMember.balance,
    });
  } catch (error) {
    console.error("Error creating charge with credit:", error);
    res.status(500).json({ error: "Failed to create charge with credit" });
  }
});

// 크레딧을 도네이션으로 전환 (단일 거래 방식)
router.post("/transactions/credit-to-donation", async (req, res) => {
  try {
    const { memberId, amount, memo } = req.body;

    if (!memberId || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "memberId and positive amount are required" });
    }

    // 저장된 회원 잔액 사용 (전체 거래 조회 대신)
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { balance: true },
    });

    const currentBalance = member?.balance || 0;
    if (currentBalance < amount) {
      return res.status(400).json({ error: "크레딧 잔액이 부족합니다" });
    }

    const today = new Date().toISOString().split("T")[0];

    // 회원 크레딧 차감 (단일 거래)
    const creditDonationTx = await prisma.transaction.create({
      data: {
        type: "creditDonation",
        amount: amount,
        description: memo ? `도네이션 (크레딧): ${memo}` : "도네이션 (크레딧)",
        category: "크레딧 도네이션",
        date: today,
        memberId: memberId,
      },
    });

    // 모임 수입 기록 (회원 연결)
    const clubDonationTx = await prisma.transaction.create({
      data: {
        type: "donation",
        amount: amount,
        description: memo ? `도네이션: ${memo}` : "도네이션",
        category: "도네이션",
        date: today,
        memberId: memberId,
      },
    });

    // 증분 업데이트 (creditDonation만 잔액에 영향)
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: { balance: { decrement: amount } },
    });

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({
      success: true,
      creditDonationTx,
      clubDonationTx,
      newBalance: updatedMember.balance,
    });
  } catch (error) {
    console.error("Error converting credit to donation:", error);
    res.status(500).json({ error: "Failed to convert credit to donation" });
  }
});

// 크레딧으로 미수금 납부
router.post("/transactions/credit-to-payment", async (req, res) => {
  try {
    const { memberId, amount, chargeId, memo } = req.body;

    if (!memberId || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "memberId and positive amount are required" });
    }

    // 저장된 회원 잔액 사용 (전체 거래 조회 대신)
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { balance: true },
    });

    const currentBalance = member?.balance || 0;
    if (currentBalance < amount) {
      return res.status(400).json({ error: "크레딧 잔액이 부족합니다" });
    }

    const today = new Date().toISOString().split("T")[0];
    let chargeInfo = null;

    if (chargeId) {
      chargeInfo = await prisma.transaction.findUnique({
        where: { id: chargeId },
        include: { booking: true },
      });
    }

    const bookingName =
      chargeInfo?.booking?.courseName || chargeInfo?.description || "미수금";
    const description = memo
      ? `크레딧 납부: ${memo}`
      : `크레딧으로 납부 (${bookingName})`;

    const expenseTx = await prisma.transaction.create({
      data: {
        type: "expense",
        amount: amount,
        description: description,
        category: "크레딧 납부",
        date: today,
        memberId: memberId,
        bookingId: chargeInfo?.bookingId || null,
      },
    });

    const paymentTx = await prisma.transaction.create({
      data: {
        type: "payment",
        amount: amount,
        description: description,
        category: "크레딧 납부",
        date: today,
        memberId: memberId,
        bookingId: chargeInfo?.bookingId || null,
      },
    });

    // expense(-) + payment(+, 크레딧 납부는 제외) = 0 (잔액 변화 없음)
    // expense만 잔액에 영향
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: { balance: { decrement: amount } },
    });

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({
      success: true,
      expenseTx,
      paymentTx,
      newBalance: updatedMember.balance,
    });
  } catch (error) {
    console.error("Error converting credit to payment:", error);
    res.status(500).json({ error: "Failed to convert credit to payment" });
  }
});

// 거래 수정
router.put("/transactions/:id", async (req, res) => {
  try {
    const {
      amount,
      date,
      description,
      category,
      memo,
      bookingId,
      receiptImage,
      receiptImages,
    } = req.body;

    console.log("📝 Transaction update request:", {
      id: req.params.id,
      amount,
      date,
      category,
      memo,
      bookingId,
      hasReceiptImage: !!receiptImage,
      receiptImagesCount: receiptImages?.length || 0,
    });

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });

    if (!existingTransaction) {
      console.log("❌ Transaction not found:", req.params.id);
      return res.status(404).json({ error: "Transaction not found" });
    }

    const updateData = {
      amount:
        amount !== undefined ? parseFloat(amount) : existingTransaction.amount,
      date: date || existingTransaction.date,
      description:
        description !== undefined
          ? description
          : existingTransaction.description,
    };

    if (category !== undefined) {
      updateData.category = category || null;
    }

    if (memo !== undefined) {
      updateData.memo = memo || null;
    }

    if (bookingId !== undefined) {
      updateData.bookingId = bookingId || null;
    }

    if (receiptImage !== undefined) {
      updateData.receiptImage = receiptImage || null;
    }

    if (receiptImages !== undefined) {
      updateData.receiptImages = receiptImages || [];
    }

    console.log("📝 Update data:", {
      ...updateData,
      receiptImage: updateData.receiptImage ? "[BASE64]" : null,
      receiptImages: updateData.receiptImages?.length || 0,
    });

    const updatedTransaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        member: true,
        booking: true,
        executor: true,
      },
    });

    console.log("✅ Transaction updated successfully:", updatedTransaction.id);

    // 회원 잔액 증분 업데이트 (금액 변경 시에만)
    if (updatedTransaction.memberId && amount !== undefined) {
      const oldAmount = existingTransaction.amount;
      const newAmount = parseFloat(amount);
      const amountDiff = newAmount - oldAmount;

      if (amountDiff !== 0) {
        let balanceChange = 0;
        const type = updatedTransaction.type;
        const cat = updatedTransaction.category;

        if (type === "charge") balanceChange = -amountDiff;
        else if (
          type === "payment" &&
          cat !== "크레딧 자동 납부" &&
          cat !== "크레딧 납부" &&
          cat !== "크레딧 자동 차감"
        )
          balanceChange = amountDiff;
        else if (type === "credit") balanceChange = amountDiff;
        else if (type === "expense") balanceChange = -amountDiff;
        else if (type === "creditDonation") balanceChange = -amountDiff;

        if (balanceChange !== 0) {
          await prisma.member.update({
            where: { id: updatedTransaction.memberId },
            data: { balance: { increment: balanceChange } },
          });
        }
      }
    }

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// 거래 삭제 (크레딧 도네이션 쌍 삭제 지원)
router.delete("/transactions/:id", async (req, res) => {
  try {
    const targetTx = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });

    if (!targetTx) {
      // 이미 삭제됨 (쌍 삭제 등으로) - 성공으로 처리
      return res.json({ success: true, alreadyDeleted: true });
    }

    // 크레딧 도네이션 쌍(pair) 찾기
    let siblingTx = null;
    const targetCreatedAt = new Date(targetTx.createdAt);
    const twoSecondsMs = 2000;

    if (
      targetTx.type === "donation" &&
      targetTx.category === "도네이션" &&
      targetTx.memberId
    ) {
      // donation 삭제 시 -> creditDonation 쌍 찾기
      const candidates = await prisma.transaction.findMany({
        where: {
          type: "creditDonation",
          memberId: targetTx.memberId,
          amount: targetTx.amount,
          date: targetTx.date,
        },
      });
      siblingTx = candidates.find((c) => {
        const diff = Math.abs(
          new Date(c.createdAt).getTime() - targetCreatedAt.getTime(),
        );
        return diff <= twoSecondsMs;
      });
    } else if (targetTx.type === "creditDonation" && targetTx.memberId) {
      // creditDonation 삭제 시 -> donation 쌍 찾기
      const candidates = await prisma.transaction.findMany({
        where: {
          type: "donation",
          category: "도네이션",
          memberId: targetTx.memberId,
          amount: targetTx.amount,
          date: targetTx.date,
        },
      });
      siblingTx = candidates.find((c) => {
        const diff = Math.abs(
          new Date(c.createdAt).getTime() - targetCreatedAt.getTime(),
        );
        return diff <= twoSecondsMs;
      });
    }

    // Helper: 잔액 변경 계산
    const calcBalanceChange = (tx) => {
      if (!tx.memberId) return 0;
      const type = tx.type;
      const cat = tx.category;
      const amount = tx.amount;

      if (type === "charge") return amount; // 청구 삭제 = 잔액 증가
      if (
        type === "payment" &&
        cat !== "크레딧 자동 납부" &&
        cat !== "크레딧 납부" &&
        cat !== "크레딧 자동 차감"
      )
        return -amount;
      if (type === "credit") return -amount;
      if (type === "expense") return amount;
      if (type === "creditDonation") return amount; // creditDonation 삭제 = 크레딧 복원
      return 0;
    };

    // 쌍이 있으면 함께 삭제
    if (siblingTx) {
      await prisma.transaction.delete({ where: { id: siblingTx.id } });

      // 쌍의 잔액 복원
      const siblingBalanceChange = calcBalanceChange(siblingTx);
      if (siblingBalanceChange !== 0 && siblingTx.memberId) {
        await prisma.member.update({
          where: { id: siblingTx.memberId },
          data: { balance: { increment: siblingBalanceChange } },
        });
      }
      console.log(
        `🔗 Paired deletion: deleted sibling ${siblingTx.type} (${siblingTx.id})`,
      );
    }

    // 대상 거래 삭제
    await prisma.transaction.delete({
      where: { id: req.params.id },
    });

    // 대상 거래의 잔액 복원
    const targetBalanceChange = calcBalanceChange(targetTx);
    if (targetBalanceChange !== 0 && targetTx.memberId) {
      await prisma.member.update({
        where: { id: targetTx.memberId },
        data: { balance: { increment: targetBalanceChange } },
      });
    }

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ success: true, pairedDeletion: !!siblingTx });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// 청구 트랜잭션 삭제 (회원 ID와 라운딩 ID로)
router.delete("/transactions/charge/:memberId/:bookingId", async (req, res) => {
  try {
    const { memberId, bookingId } = req.params;

    // 해당 회원과 라운딩에 대한 청구 트랜잭션 찾기
    const transaction = await prisma.transaction.findFirst({
      where: {
        memberId: memberId,
        bookingId: bookingId,
        type: "charge",
      },
    });

    if (!transaction) {
      return res.json({ success: true }); // 이미 삭제되었거나 없음
    }

    // 트랜잭션 삭제
    await prisma.transaction.delete({
      where: { id: transaction.id },
    });

    // 회원 잔액 증분 업데이트 (charge 삭제 = 잔액 증가)
    await prisma.member.update({
      where: { id: memberId },
      data: { balance: { increment: transaction.amount } },
    });

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting charge transaction:", error);
    res.status(500).json({ error: "Failed to delete charge transaction" });
  }
});

// 입금항목 조회
router.get("/income-categories", async (req, res) => {
  try {
    const categories = await prisma.incomeCategory.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching income categories:", error);
    res.status(500).json({ error: "Failed to fetch income categories" });
  }
});

// 입금항목 생성
router.post("/income-categories", async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.incomeCategory.create({
      data: { name },
    });
    res.json(category);
  } catch (error) {
    console.error("Error creating income category:", error);
    res.status(500).json({ error: "Failed to create income category" });
  }
});

// 입금항목 삭제
router.delete("/income-categories/:id", async (req, res) => {
  try {
    await prisma.incomeCategory.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting income category:", error);
    res.status(500).json({ error: "Failed to delete income category" });
  }
});

// 출금항목 조회
router.get("/expense-categories", async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    res.status(500).json({ error: "Failed to fetch expense categories" });
  }
});

// 출금항목 생성
router.post("/expense-categories", async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.expenseCategory.create({
      data: { name },
    });
    res.json(category);
  } catch (error) {
    console.error("Error creating expense category:", error);
    res.status(500).json({ error: "Failed to create expense category" });
  }
});

// 출금항목 삭제
router.delete("/expense-categories/:id", async (req, res) => {
  try {
    await prisma.expenseCategory.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense category:", error);
    res.status(500).json({ error: "Failed to delete expense category" });
  }
});

// 빙고 설정 조회 (gridSize, bingoTargetLines만 동기화)
router.get("/bingo-settings", async (req, res) => {
  try {
    let settings = await prisma.bingoSettings.findFirst();
    if (!settings) {
      settings = await prisma.bingoSettings.create({
        data: {
          gridSize: 5,
          bingoTargetLines: 5,
        },
      });
    }
    res.json({
      gridSize: settings.gridSize,
      bingoTargetLines: settings.bingoTargetLines,
    });
  } catch (error) {
    console.error("Error fetching bingo settings:", error);
    res.status(500).json({ error: "Failed to fetch bingo settings" });
  }
});

// 빙고 설정 저장 (운영자 전용 - gridSize, bingoTargetLines만)
router.post("/bingo-settings", async (req, res) => {
  try {
    const { gridSize, bingoTargetLines } = req.body;

    let settings = await prisma.bingoSettings.findFirst();

    if (settings) {
      settings = await prisma.bingoSettings.update({
        where: { id: settings.id },
        data: {
          gridSize,
          bingoTargetLines,
        },
      });
    } else {
      settings = await prisma.bingoSettings.create({
        data: {
          gridSize,
          bingoTargetLines,
        },
      });
    }

    req.io.emit("bingo:settings", { gridSize, bingoTargetLines });
    res.json({
      gridSize: settings.gridSize,
      bingoTargetLines: settings.bingoTargetLines,
    });
  } catch (error) {
    console.error("Error saving bingo settings:", error);
    res.status(500).json({ error: "Failed to save bingo settings" });
  }
});

router.post("/logs", async (req, res) => {
  try {
    const { memberId, memberName, path, action, userAgent } = req.body;

    if (!memberId || !path || !action) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    const log = await prisma.activityLog.create({
      data: {
        memberId,
        memberName: memberName || "Unknown",
        path,
        action,
        ipAddress,
        userAgent: userAgent || null,
      },
    });

    await prisma.member.update({
      where: { id: memberId },
      data: { lastActiveAt: new Date() },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
      },
    });

    res.json({ success: true, log });
  } catch (error) {
    console.error("Error creating activity log:", error);
    res.status(500).json({ error: "Failed to create activity log" });
  }
});

router.get("/logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      },
    });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

router.get("/online-members", async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineMembers = await prisma.member.findMany({
      where: {
        lastActiveAt: { gte: fiveMinutesAgo },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        lastActiveAt: true,
      },
      orderBy: { lastActiveAt: "desc" },
    });
    res.json(onlineMembers);
  } catch (error) {
    console.error("Error fetching online members:", error);
    res.status(500).json({ error: "Failed to fetch online members" });
  }
});

module.exports = router;
