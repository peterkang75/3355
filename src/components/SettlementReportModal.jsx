import React, { useState, useEffect } from 'react';

const fmt = (n) => `$${Math.abs(n).toLocaleString()}`;

export default function SettlementReportModal({ yearMonth, authHeaders, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/settlement/${yearMonth}/report`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setReport(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [yearMonth]);

  const [y, m] = yearMonth.split('-');
  const title = `${y}년 ${parseInt(m)}월 정산서`;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', inset: 0,
        zIndex: 501,
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        {/* 헤더 */}
        <div style={{ background: '#0047AB', padding: '16px 20px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, width: 34, height: 34, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f4f6fb', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 14 }}>불러오는 중…</div>
          ) : !report ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 14 }}>데이터를 불러올 수 없습니다</div>
          ) : (
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* 라운딩 정보 */}
              {report.bookings.length > 0 && (
                <Section title="⛳ 라운딩 정보">
                  {report.bookings.map((b, i) => {
                    const [, bm, bd] = b.date.split('-');
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < report.bookings.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{b.title || b.courseName}</div>
                          {b.courseName && b.title && b.courseName !== b.title && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>{b.courseName}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{parseInt(bm)}월 {parseInt(bd)}일</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.participantCount}명</div>
                        </div>
                      </div>
                    );
                  })}
                </Section>
              )}

              {/* 요약 */}
              <Section title="📊 요약">
                <SummaryRow label="전달 이월금" value={report.carryover} color="#0047AB" sign />
                <SummaryRow label="이달 총 수입" value={report.totalIncome} color="#16a34a" sign />
                <SummaryRow label="이달 총 지출" value={report.totalExpense} color="#dc2626" negative />
                <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
                <SummaryRow label="이달 잔액" value={report.carryover + report.totalIncome - report.totalExpense} bold />
                <SummaryRow label="총잔액 (누계)" value={report.netBalance} bold color={report.netBalance >= 0 ? '#0047AB' : '#dc2626'} />
              </Section>

              {/* 수입 내역 */}
              {report.incomeByCategory.length > 0 && (
                <PLSection title="수입 내역" categories={report.incomeByCategory} color="#16a34a" sign="+" />
              )}

              {/* 지출 내역 */}
              {report.expenseByCategory.length > 0 && (
                <PLSection title="지출 내역" categories={report.expenseByCategory} color="#dc2626" sign="-" />
              )}

              {/* 하단 합계 */}
              <div style={{ background: '#0047AB', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <BottomRow label="이달 잔액" value={report.carryover + report.totalIncome - report.totalExpense} />
                <div style={{ height: 1, background: 'rgba(255,255,255,0.2)' }} />
                <BottomRow label="총잔액 (누계)" value={report.netBalance} large />
              </div>

              {/* 마감일 */}
              {report.closedAt && (
                <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
                  {new Date(report.closedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 마감
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>{title}</span>
      </div>
      <div style={{ padding: '4px 16px 12px' }}>{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, color, sign, negative, bold }) {
  const display = negative ? `-${fmt(value)}` : sign ? `+${fmt(value)}` : (value >= 0 ? `+${fmt(value)}` : `-${fmt(value)}`);
  const c = color || (value >= 0 ? '#374151' : '#dc2626');
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' }}>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? 800 : 600, color: c }}>{display}</span>
    </div>
  );
}

function PLSection({ title, categories, color, sign }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
      <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>{title}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>
          {sign}{fmt(categories.reduce((s, c) => s + c.total, 0))}
        </span>
      </div>
      {categories.map((cat, ci) => (
        <div key={ci} style={{ borderBottom: ci < categories.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
          {/* 카테고리 행 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#fafbfc' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{cat.category}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color }}>{sign}{fmt(cat.total)}</span>
          </div>
          {/* 세부 항목 */}
          {cat.items.map((item, ii) => {
            const [, mm, dd] = item.date.split('-');
            return (
              <div key={ii} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 6px 28px', borderTop: '1px solid #f8fafc' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 6 }}>{parseInt(mm)}.{parseInt(dd)}</span>
                  {item.memberName && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginRight: 6 }}>{item.memberName}</span>
                  )}
                  {item.memo && item.memo !== cat.category && (
                    <span style={{ fontSize: 11, color: '#64748b' }}>{item.memo}</span>
                  )}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0, marginLeft: 8 }}>{sign}{fmt(item.amount)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BottomRow({ label, value, large }) {
  const pos = value >= 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: large ? 15 : 13, fontWeight: large ? 800 : 600, color: 'rgba(255,255,255,0.85)' }}>{label}</span>
      <span style={{ fontSize: large ? 20 : 16, fontWeight: 800, color: pos ? '#a7f3d0' : '#fca5a5' }}>
        {pos ? '+' : '-'}{fmt(value)}
      </span>
    </div>
  );
}
