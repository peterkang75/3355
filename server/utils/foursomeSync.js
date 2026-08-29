// server/utils/foursomeSync.js
// 포썸 페어 스코어 동기화 - 단일 소스
//
// 포썸은 페어(2인)가 하나의 스코어를 공유한다. 한 사람이 기록하면 파트너의
// Score 행에도 같은 점수를 복제해야 리더보드에서 페어로 집계된다.
// 스코어 신규 등록(POST)과 운영진 수정(PUT) 양쪽에서 같은 규칙을 써야 하므로
// 여기 한 곳에 둔다.
//
// 조별 지정(혼용) 라운딩에서는 "포썸으로 지정된 조"에서만 복제한다 —
// 신페리오 조 회원의 개인 스코어를 페어 점수로 덮어쓰면 안 된다.

const { usesMode, resolveTeamMode } = require('./teamGameModes');

/**
 * @returns {boolean} 파트너에게 복제했으면 true
 */
async function syncFoursomePartner(prisma, {
  memberId, roundingName, date, courseName, totalScore, coursePar, holes,
}) {
  const booking = await prisma.booking.findFirst({ where: { title: roundingName } });
  if (!booking || !booking.teams) return false;

  let gradeSettings = null;
  try {
    gradeSettings = typeof booking.gradeSettings === 'string'
      ? JSON.parse(booking.gradeSettings.replace(/^"|"$/g, ''))
      : booking.gradeSettings;
  } catch (e) { /* 파싱 실패 시 기본 방식으로 판정된다 */ }

  if (!usesMode(gradeSettings, 'foursome')) return false;

  let teams = null;
  try {
    teams = typeof booking.teams === 'string'
      ? JSON.parse(booking.teams.replace(/^"|"$/g, ''))
      : booking.teams;
  } catch (e) { return false; }
  if (!Array.isArray(teams)) return false;

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return false;

  for (const team of teams) {
    if (!team.members) continue;
    const memberIndex = team.members.findIndex((m) => m?.phone === member.phone);
    if (memberIndex < 0) continue;

    // 내 조가 포썸이 아니면 복제하지 않는다 (혼용 라운딩의 신페리오 조 등)
    if (resolveTeamMode(gradeSettings, team.teamNumber) !== 'foursome') return false;

    const partnerIndex = memberIndex % 2 === 0 ? memberIndex + 1 : memberIndex - 1;
    const partner = team.members[partnerIndex];
    if (!partner?.phone) return false;

    const partnerMember = await prisma.member.findFirst({ where: { phone: partner.phone } });
    if (!partnerMember || partnerMember.id === memberId) return false;

    const isTeamA = memberIndex < 2;
    const opponents = (isTeamA ? [2, 3] : [0, 1]).map((i) => team.members[i]).filter(Boolean);

    const partnerGameMetadata = {
      partner: { name: member.nickname || member.name, phone: member.phone },
      opponents: opponents.map((o) => ({ name: o.nickname || o.name, phone: o.phone })),
      recordedBy: member.nickname || member.name,
    };

    const shared = {
      courseName, totalScore, coursePar,
      holes: JSON.stringify(holes),
      markerId: memberId,
      verified: false,
      gameMode: 'foursome',
      gameMetadata: JSON.stringify(partnerGameMetadata),
    };

    await prisma.score.upsert({
      where: {
        userId_date_roundingName: { userId: partnerMember.id, date, roundingName: roundingName || "" },
      },
      update: { ...shared, verifiedBy: null },
      create: {
        userId: partnerMember.id,
        roundingName: roundingName || "",
        date,
        ...shared,
      },
    });

    console.log(`🏌️ 포썸 파트너 스코어 동기화: ${member.nickname} → ${partnerMember.nickname}`);
    return true;
  }

  return false;
}

module.exports = { syncFoursomePartner };
