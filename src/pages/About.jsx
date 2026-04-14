import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import defaultLogoImage from '../assets/logo-new.png';
import golfMembersPhoto from '../assets/golf-members.jpeg';
import PageHeader from '../components/common/PageHeader';

/* ─── 기능 아이콘 ─── */
const MemberIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const FlagIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);
const WalletIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 13h.01"/>
    <path d="M2 10h20"/>
  </svg>
);
const BingoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/>
    <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

function About() {
  const navigate = useNavigate();
  const { user, clubLogo } = useApp();
  const logoImage = clubLogo || defaultLogoImage;
  const [clubIntroText, setClubIntroText] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [clubRulesText, setClubRulesText] = useState('');
  const [openFaqs, setOpenFaqs] = useState({});
  const toggleFaq = (i) => setOpenFaqs(prev => ({ ...prev, [i]: !prev[i] }));

  useEffect(() => {
    apiService.fetchSettings().then(settings => {
      const intro = settings.find(s => s.feature === 'clubIntroText');
      if (intro?.value) setClubIntroText(intro.value);
      const rules = settings.find(s => s.feature === 'clubRulesText');
      if (rules?.value) setClubRulesText(rules.value);
    }).catch(() => {});
  }, []);

  /* 소개글에서 **bold** 파싱 */
  const renderIntro = (text) => {
    if (!text) return null;
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#0047AB' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const defaultIntro = '3355 골프모임은 사람들 사이의 정과 즐거움, 따뜻함이 넘치는 모임입니다. 우리는 골프를 통해 함께 웃고 어울리지만, **냉정한 경쟁보다는 배려와 유쾌함**이 이루어진 분위기를 더 소중하게 생각합니다.';
  const rawIntro = clubIntroText || defaultIntro;
  // 인용구("스코어보다...") 앞 문단만 상단에 표시 (중복 방지)
  const introToShow = rawIntro.split('스코어보다')[0].trim();

  return (
    <div style={{ paddingBottom: 80, background: '#fff', minHeight: '100vh' }}>
      <PageHeader title="About" user={user} showBackButton={false} />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 16px' }}>

        {/* ─── 히어로 ─── */}
        <div style={{ textAlign: 'center', padding: '28px 24px 20px' }}>
          <div style={{
            width: 80, height: 80,
            borderRadius: 20,
            overflow: 'hidden',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(0,71,171,0.18)',
            border: '2px solid rgba(0,71,171,0.08)',
          }}>
            <img src={logoImage} alt="3355 골프모임"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 6, letterSpacing: '-0.03em' }}>
            3355 골프모임
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 11, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.05em' }}>
            <span>VERSION 2.0.0</span>
            <span>·</span>
            <span>BUILD {typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : '---'}</span>
          </div>
        </div>

        {/* ─── 소개글 ─── */}
        <div style={{ padding: '0 20px 16px' }}>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: '#334155', margin: 0 }}>
            {renderIntro(introToShow)}
          </p>
        </div>

        {/* ─── 인용구 ─── */}
        <div style={{ margin: '0 20px 20px', padding: '16px 20px', borderLeft: '4px solid #0047AB', background: 'transparent' }}>
          <p style={{ fontSize: 14, lineHeight: 1.85, color: '#64748B', margin: 0, fontStyle: 'italic' }}>
            스코어보다 한마디의 격려가, 승부보다 함께한 시간이 더 값지다고 믿습니다.
            3355는 골프를 사랑하는 사람들의 따뜻한 쉼터이자, 진심으로 연결된 친구들의 모임입니다.
          </p>
        </div>

        {/* ─── 골프 사진 ─── */}
        <div style={{
          margin: '0 20px 28px',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          height: 260,
          backgroundImage: `url(${golfMembersPhoto})`,
          backgroundSize: 'cover',
          backgroundPosition: '70% bottom',
          backgroundRepeat: 'no-repeat',
        }} />

        {/* ─── CAPABILITIES ─── */}
        <div style={{ padding: '0 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', marginBottom: 8 }}>
            CAPABILITIES
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 20, letterSpacing: '-0.03em' }}>
            주요기능
          </h2>

          {/* ── 통일 카드 스타일 기능 목록 ── */}
          {[
            {
              icon: <MemberIcon />,
              title: '회원관리',
              desc: '프라이빗한 멤버십 관리와 효율적인 회원 인벤토리.',
              tags: [],
              note: null,
              onClick: null,
            },
            {
              icon: <FlagIcon />,
              title: '라운딩 관리',
              desc: '라운딩 일정부터 조편성, 스코어 기록까지 통합 관리.',
              tags: ['라운딩 생성', '조편성하기', '스코어 기록', '하우스 핸디', '경기결과'],
              note: '참석/불참석 및 반려대여 자동화 시스템',
              onClick: null,
            },
            {
              icon: <WalletIcon />,
              title: '회비관리',
              desc: '참석 여부 연동 회비 관리와 투명한 잔액 확인.',
              tags: ['참가비 관리', '지출 관리', '잔액 확인', '도네이션 내역'],
              note: null,
              onClick: null,
            },
            {
              icon: <BingoIcon />,
              title: '빙고 게임',
              desc: '회원 대화명으로 함께하는 빙고 게임.',
              tags: [],
              note: null,
              onClick: () => navigate('/bingo'),
            },
          ].map((item, i) => (
            <div
              key={i}
              onClick={item.onClick || undefined}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '16px',
                marginBottom: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #F1F5F9',
                cursor: item.onClick ? 'pointer' : 'default',
              }}
            >
              {/* 아이콘 + 제목 */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: item.desc || item.tags.length ? 12 : 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#EFF6FF', color: '#0047AB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>{item.title}</div>
                {item.onClick && <div style={{ marginLeft: 'auto', color: '#CBD5E1' }}>›</div>}
              </div>
              {/* 설명 */}
              {item.desc && (
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: item.tags.length ? 10 : 0 }}>
                  {item.desc}
                </div>
              )}
              {/* 태그 */}
              {item.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: item.note ? 10 : 0 }}>
                  {item.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#F1F5F9', borderRadius: 8, padding: '4px 10px' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* 체크 노트 */}
              {item.note && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                  <CheckIcon />
                  {item.note}
                </div>
              )}
            </div>
          ))}
          <div style={{ marginBottom: 20 }} />
        </div>

        {/* ─── 회칙 보기 ─── */}
        {clubRulesText && (
          <div style={{ padding: '0 20px', marginBottom: 24 }}>
            <button
              onClick={() => setShowRulesModal(true)}
              style={{ width: '100%', padding: '13px', background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 14, fontSize: 14, fontWeight: 700, color: '#334155', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
            >
              📋 모임 회칙 보기
            </button>
          </div>
        )}

        {/* ─── FAQ ─── */}
        {(() => {
          const faqs = [
            {
              q: '이 앱은 누가 사용하고, 어떻게 만들어졌나요?',
              a: '이 앱은 3355 골프클럽 회원만을 위해 만들어진 전용 앱입니다. 우리 모임의 회원이 직접 개발하였으며, 외부에 공개되거나 다른 모임과 공유되지 않습니다. 오직 우리 모임의 편리한 운영을 위해 개발되고 사용되며, 회원님들의 의견을 반영하여 지속적으로 개선해 나가고 있습니다.',
            },
            {
              q: '이 앱이 안전한가요? 개인정보가 유출되지 않나요?',
              a: '3355 골프클럽 앱은 회원님의 개인정보를 소중히 다룹니다. 모임 운영에 꼭 필요한 최소한의 정보만 수집하며, 수집된 정보는 회원님의 동의 없이 외부에 제공하지 않습니다. 또한 모든 데이터는 안전한 서버에 저장되며, 운영진 외에는 접근할 수 없습니다. 안심하고 이용해 주세요.',
            },
            {
              q: '카카오톡 오픈방과는 어떤 관계인가요?',
              a: '카카오톡 오픈방은 회원 간 자유로운 소통과 대화를 위한 공간이고, 이 앱은 회원 관리, 라운딩 일정, 회비 관리 등 모임 운영에 필요한 기능을 담당합니다. 카톡방에서 대화하고, 앱에서 관리하는 구조로 서로 보완하는 역할이라고 생각해 주시면 됩니다.',
            },
            {
              q: '이 앱을 꼭 써야 하나요?',
              a: '필수는 아니지만, 사용하시는 것을 권장드립니다. 라운딩 참가 신청, 스코어 기록, 회비 내역 확인, 핸디캡 조회 등 회원으로서의 모든 편의 기능을 이 앱에서 이용하실 수 있습니다. 앱을 사용하지 않으시면 이런 기능들을 직접 확인하기 어려울 수 있습니다.',
            },
            {
              q: '어떤 기능이 있나요?',
              a: '주요 기능은 다음과 같습니다.',
              bullets: [
                '라운딩 일정 확인 및 참가 신청',
                '실시간 스코어 입력 및 리더보드 반영',
                '개인 기록 관리 (라운딩 히스토리, 평균 스코어, 베스트 스코어)',
                '핸디캡 자동 계산',
                '회비 납부 현황 및 잔액 확인',
                '게시판 (공지사항, 회원 소통)',
              ],
            },
            {
              q: '스코어 입력도 여기서 하나요?',
              a: '네, 라운딩 당일 앱에서 바로 스코어를 입력하실 수 있습니다. 홀별로 점수를 입력하시면 실시간으로 저장되며, 리더보드에 바로 반영됩니다. 혹시 중간에 앱이 꺼지거나 네트워크가 불안정해도 입력하신 스코어는 자동으로 보호되니 안심하셔도 됩니다.',
            },
            {
              q: '내 기록 관리도 할 수 있나요?',
              a: '물론입니다. 마이페이지에서 지금까지의 라운딩 참가 이력, 홀별 스코어, 평균 타수, 베스트 스코어, 핸디캡 변화 추이를 확인하실 수 있습니다. 라운딩을 기록할수록 더 의미 있는 데이터가 쌓이니, 꾸준히 입력해 주세요.',
            },
            {
              q: '핸디캡은 어떻게 계산되나요?',
              a: '최근 라운딩 기록을 기반으로 자동 계산됩니다. 일반적으로 최근 20라운드 중 상위 기록을 기준으로 산출하는 방식을 따르며, 라운딩 데이터가 쌓일수록 더 정확한 핸디캡이 반영됩니다. 별도로 계산하실 필요 없이, 스코어만 입력하시면 앱이 알아서 관리해 드립니다.',
            },
          ];

          return (
            <div style={{ padding: '0 20px', marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', marginBottom: 8 }}>
                FAQ
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 16, letterSpacing: '-0.03em' }}>
                자주 묻는 질문
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {faqs.map((faq, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 14, border: 'none', boxShadow: openFaqs[i] ? '0 2px 12px rgba(0,71,171,0.12)' : '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
                    {/* 질문 버튼 */}
                    <button
                      onClick={() => toggleFaq(i)}
                      style={{
                        width: '100%', minHeight: 52,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        padding: '14px 16px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: openFaqs[i] ? '#0047AB' : '#1E293B', lineHeight: 1.5, flex: 1 }}>
                        {faq.q}
                      </span>
                      <svg
                        width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke={openFaqs[i] ? '#0047AB' : '#94A3B8'} strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, transform: openFaqs[i] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {/* 답변 — max-height 트릭으로 부드러운 애니메이션 */}
                    <div style={{
                      maxHeight: openFaqs[i] ? 600 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease',
                    }}>
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F1F5F9' }}>
                        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, margin: '12px 0 0' }}>
                          {faq.a}
                        </p>
                        {faq.bullets && (
                          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                            {faq.bullets.map((b, j) => (
                              <li key={j} style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, marginBottom: 2 }}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ─── 푸터 ─── */}
        <div style={{ borderTop: '1px solid #E2E8F0', margin: '0 20px', paddingTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', marginBottom: 8 }}>
            PROJECT IDENTITY
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0047AB', marginBottom: 12, letterSpacing: '-0.02em' }}>
            3355 골프모임 V2.0
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.7, marginBottom: 20 }}>
            © 2024 The Azure Standard Group.<br />
            All rights reserved for the community.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            {[
              { icon: <GlobeIcon />, action: () => {} },
              { icon: <MailIcon />, action: () => {} },
              { icon: <ChatIcon />, action: () => window.open('https://open.kakao.com/o/g7EaZjRh', '_blank') },
            ].map((item, i) => (
              <button key={i} onClick={item.action}
                style={{ width: 40, height: 40, borderRadius: 10, background: '#F1F5F9', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {item.icon}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 10, color: '#CBD5E1', fontWeight: 600, letterSpacing: '0.08em' }}>
            BUILD {typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : '---'}
          </div>
        </div>

      </div>

      {/* ─── 회칙 모달 ─── */}
      {showRulesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1E293B' }}>📋 3355 골프모임 회칙</h3>
              <button onClick={() => setShowRulesModal(false)}
                style={{ background: '#F1F5F9', border: 'none', fontSize: 18, cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                ×
              </button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, fontSize: 14, lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-wrap' }}>
              {clubRulesText}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <button onClick={() => setShowRulesModal(false)}
                style={{ padding: '12px 40px', background: '#0047AB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default About;
