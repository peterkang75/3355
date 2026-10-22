// 회원 정보 필수 항목 점검 — 마이페이지 "미입력" 표시와 홈 "정보 업데이트하기" 카드가 같은 기준을 쓴다.

// isClubMember 는 이제 "골프링크(GA) 번호 보유 여부" 뜻으로 쓴다 (예전 '클럽 회원'='yes' 회원은 모두 골프링크 번호 필수였으므로 호환)
// 예전 데이터는 isClubMember 없이 club 만 있는 경우가 있어 club 으로 보정
export const getClubMemberStatus = (m) => m?.isClubMember || (m?.club ? 'yes' : '');

export function getMissingMemberInfo(m) {
  if (!m) return [];
  const fields = [
    ['name', '한국 이름'], ['nickname', '카톡 대화명'], ['gender', '성별'], ['birthYear', '출생연도'],
  ];
  const status = getClubMemberStatus(m);
  if (status === 'yes') {
    fields.push(['golflinkNumber', 'Golflink 번호'], ['gaRegisteredName', '골프링크에 등록된 이름'], ['gaHandy', 'GA 핸디']);
    // 소속 골프장은 선택 — 적었을 때만 회원번호가 필수
    if (String(m.club ?? '').trim()) fields.push(['clubMemberNumber', '클럽 회원번호']);
  }
  const missing = fields
    .filter(([key]) => !String(m[key] ?? '').trim())
    .map(([key, label]) => ({ key, label }));
  if (!status) missing.push({ key: 'isClubMember', label: '골프링크 번호 여부' });
  return missing;
}
