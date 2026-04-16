import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import apiService from "../services/api";
import { checkIsOperator } from "../utils";
import { PageHeader } from "../components/common";
import SettlementReportModal from "../components/SettlementReportModal";

// ─── helpers ─────────────────────────────────────────────────────────────────

const getTransactionLabel = (t) => {
  if (t.type === "creditDonation") return "도네이션 (크레딧)";
  if (t.type === "donation") return t.category || "도네이션";
  if (t.type === "credit") return t.description || "크레딧";
  if (t.type === "expense") {
    if (t.category === "크레딧 자동 차감" && t.description) {
      return `${t.description.split(" (크레딧")[0]}(크레딧차감)`;
    }
    return t.category || t.description || "지출";
  }
  if (t.type === "charge") {
    const bookingName = t.booking?.title || t.booking?.courseName || '';
    return bookingName ? `청구 · ${bookingName}` : "청구";
  }
  if (t.type === "payment") return t.description?.split(" - ")[0] || "납부";
  return "";
};

const isDebit = (t) => ["charge", "expense", "creditDonation"].includes(t.type);
const getTransactionSign = (t) => (isDebit(t) ? "-" : "+");

const fmtDate = (d) => new Date(d).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });

// ─── BottomSheet wrapper ──────────────────────────────────────────────────────

function BottomSheet({ onClose, children, maxHeight = "85vh" }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "24px 24px 0 0", zIndex: 1000, maxHeight, display: "flex", flexDirection: "column", animation: "slideUpFees 0.25s ease-out", boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", padding: "14px 0 6px", flexShrink: 0 }}>
          <div style={{ width: "40px", height: "4px", background: "#D1D5DB", borderRadius: "2px", margin: "0 auto" }} />
        </div>
        {children}
      </div>
    </>
  );
}

// ─── CreditModal ──────────────────────────────────────────────────────────────

function CreditModal({ mode, creditBalance, actualUnpaid, amount, setAmount, memo, setMemo, onConfirm, onClose, loading }) {
  const isDonation = mode === "donation";
  return (
    <BottomSheet onClose={onClose} maxHeight="60vh">
      <div style={{ padding: "8px 20px 20px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
          {isDonation ? "클럽에 기부하기" : "크레딧으로 납부"}
        </div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>
          {isDonation ? `사용 가능 크레딧: $${creditBalance.toLocaleString()}` : `미납: $${actualUnpaid.toLocaleString()} · 크레딧: $${creditBalance.toLocaleString()}`}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>금액</div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 16, outline: "none", boxSizing: "border-box", fontWeight: 700 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>메모 (선택)</div>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 입력"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, paddingBottom: "max(80px, calc(68px + env(safe-area-inset-bottom)))" }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1.5px solid #E5E7EB", background: "#fff", color: "#6B7280", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>취소</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: loading ? "#94A3B8" : "#0047AB", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "처리중..." : isDonation ? "기부하기" : "납부하기"}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

function Fees() {
  const location = useLocation();
  const { user, userTransactions } = useApp();

  const [activeTab, setActiveTab] = useState("personal");
  const [settlements, setSettlements] = useState([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [reportYearMonth, setReportYearMonth] = useState(null);
  const [paymentGuideText, setPaymentGuideText] = useState("");

  const [showCreditModal, setShowCreditModal] = useState(null);
  const [creditActionAmount, setCreditActionAmount] = useState("");
  const [creditActionMemo, setCreditActionMemo] = useState("");
  const [creditActionLoading, setCreditActionLoading] = useState(false);
  const [selectedChargeId, setSelectedChargeId] = useState(null);

  useEffect(() => {
    if (location.state?.reset) { setActiveTab("personal"); window.history.replaceState({}, document.title); }
  }, [location]);

  useEffect(() => { loadPaymentGuide(); }, []);

  useEffect(() => {
    if (activeTab === "settlements") loadSettlements();
  }, [activeTab]);

  const loadPaymentGuide = async () => {
    try {
      const settings = await apiService.fetchSettings();
      const guideSetting = settings.find((s) => s.feature === "paymentGuideText");
      if (guideSetting?.value) setPaymentGuideText(guideSetting.value);
    } catch {}
  };

  const loadSettlements = async () => {
    setSettlementsLoading(true);
    try {
      const r = await fetch('/api/settlement/closed', {
        headers: { 'X-Member-Id': user?.id || '' },
      });
      if (r.ok) setSettlements(await r.json());
    } catch {}
    finally { setSettlementsLoading(false); }
  };

  const handleCreditToDonation = async () => {
    if (creditActionLoading) return;
    const amount = parseFloat(creditActionAmount);
    if (!amount || amount <= 0 || amount > creditBalance) return alert("금액을 확인해주세요.");
    setCreditActionLoading(true);
    try {
      await apiService.creditToDonation(user.id, amount, creditActionMemo);
      setShowCreditModal(null);
      setCreditActionAmount("");
      setCreditActionMemo("");
    } catch { alert("실패"); }
    finally { setCreditActionLoading(false); }
  };

  const handleCreditToPayment = async () => {
    if (creditActionLoading) return;
    const amount = parseFloat(creditActionAmount);
    if (!amount || amount <= 0 || amount > creditBalance || amount > actualUnpaid) return alert("금액을 확인해주세요.");
    setCreditActionLoading(true);
    try {
      await apiService.creditToPayment(user.id, amount, selectedChargeId, creditActionMemo);
      setShowCreditModal(null);
      setCreditActionAmount("");
      setCreditActionMemo("");
    } catch { alert("실패"); }
    finally { setCreditActionLoading(false); }
  };

  // ── Balance calculations ───────────────────────────────────────────────────
  const totalCharges = userTransactions.filter((t) => t.type === "charge").reduce((s, t) => s + t.amount, 0);
  const totalPayments = userTransactions.filter((t) => t.type === "payment" && t.category !== "크레딧 자동 납부" && t.category !== "크레딧 자동 차감").reduce((s, t) => s + t.amount, 0);
  const totalCredits = userTransactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = userTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalCreditDonations = userTransactions.filter((t) => t.type === "creditDonation").reduce((s, t) => s + t.amount, 0);
  const balance = totalPayments + totalCredits - totalCharges - totalExpenses - totalCreditDonations;
  const actualUnpaid = Math.max(0, -balance);
  const creditBalance = balance > 0 ? balance : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="회비 관리" user={user} />

      <div className="page-content" style={{ paddingTop: 8, minHeight: 'calc(100dvh - 60px)' }}>
        {/* 탭 */}
        <div style={{ display: "flex", background: "#E2E8F0", borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {[["personal", "개인 참가비 내역"], ["settlements", "정산서"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: activeTab === key ? "#FFF" : "transparent", fontWeight: activeTab === key ? 800 : 600, color: activeTab === key ? "#0047AB" : "#6B7280", cursor: "pointer", transition: "all 0.18s", fontSize: 14 }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "personal" ? (
          <div style={{ padding: "0 0 8px" }}>
            {/* 잔액 카드 — azure gradient */}
            <div style={{ background: "linear-gradient(135deg, #0047AB 0%, #00327d 100%)", borderRadius: 24, padding: "28px 24px 24px", marginBottom: 24, boxShadow: "0 20px 40px rgba(0,50,125,0.18)", position: "relative", overflow: "hidden" }}>
              {/* 지갑 배경 패턴 */}
              <svg style={{ position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)", opacity: 0.15, pointerEvents: "none" }} width="170" height="150" viewBox="0 0 170 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 지갑 본체 */}
                <rect x="6" y="28" width="130" height="94" rx="14" stroke="white" strokeWidth="5" />
                {/* 지갑 상단 플랩 구분선 */}
                <line x1="6" y1="56" x2="136" y2="56" stroke="white" strokeWidth="4" />
                {/* 동전 포켓 (오른쪽 돌출 원형) */}
                <rect x="108" y="60" width="55" height="52" rx="12" stroke="white" strokeWidth="5" fill="none" />
                {/* 동전 포켓 안 원형 버튼 */}
                <circle cx="135" cy="86" r="14" stroke="white" strokeWidth="4" fill="none" />
                <circle cx="135" cy="86" r="5" fill="white" />
                {/* 카드 슬롯 라인 */}
                <rect x="22" y="70" width="72" height="6" rx="3" fill="white" />
                <rect x="22" y="86" width="56" height="6" rx="3" fill="white" opacity="0.7" />
              </svg>
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8, letterSpacing: "0.06em" }}>현재 잔액</div>
                <div style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  {balance < 0 ? "-" : ""}${Math.abs(balance).toLocaleString()}
                </div>
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 999, padding: "6px 14px" }}>
                    <span style={{ fontSize: 13 }}>✦</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>3355 Golf Club</span>
                  </div>
                  {creditBalance > 0 && (
                    <button
                      onClick={() => { setShowCreditModal("donation"); setCreditActionAmount(creditBalance.toString()); }}
                      style={{ background: "#fff", color: "#0047AB", border: "none", borderRadius: 12, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      기부하기
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 청구 / 사용 가능 / 미납 금액 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div style={{ background: "#fff", borderRadius: 20, padding: "16px 14px", boxShadow: "0 8px 24px rgba(25,27,34,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(220,38,38,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>📋</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>총 청구</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: totalCharges > 0 ? "#DC2626" : "#111827" }}>
                  {totalCharges > 0 ? "-" : ""}${totalCharges.toLocaleString()}
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: 20, padding: "16px 14px", boxShadow: "0 8px 24px rgba(25,27,34,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,71,171,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>사용 가능</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>${creditBalance.toLocaleString()}</div>
                {creditBalance > 0 && actualUnpaid > 0 && (
                  <button onClick={() => { setShowCreditModal("payment"); setCreditActionAmount(Math.min(creditBalance, actualUnpaid).toString()); }} style={{ marginTop: 8, width: "100%", padding: "6px 0", background: "#0047AB", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    납부
                  </button>
                )}
              </div>
              <div style={{ background: actualUnpaid > 0 ? "#FEF2F2" : "#fff", borderRadius: 20, padding: "16px 14px", boxShadow: "0 8px 24px rgba(147,0,10,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>!</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: actualUnpaid > 0 ? "#991B1B" : "#64748B" }}>미납</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: actualUnpaid > 0 ? "#DC2626" : "#111827" }}>${actualUnpaid.toLocaleString()}</div>
              </div>
            </div>

            {/* 거래 내역 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 2px" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>최근 내역</span>
              </div>
              {userTransactions.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 16, padding: "28px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>내역이 없습니다.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {userTransactions
                    .filter((t) => !(t.type === "donation" && t.category === "도네이션") && !(t.type === "payment" && t.category === "크레딧 자동 차감"))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((t) => {
                      const debit = isDebit(t);
                      const iconBg = debit ? "rgba(220,38,38,0.09)" : "rgba(0,71,171,0.09)";
                      const iconColor = debit ? "#DC2626" : "#0047AB";
                      const TxIcon = () => {
                        const s = { width: 20, height: 20, stroke: iconColor, fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
                        if (t.type === "payment" || t.type === "credit") return (
                          <svg viewBox="0 0 24 24" style={s}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>
                        );
                        if (t.type === "charge") return (
                          <svg viewBox="0 0 24 24" style={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
                        );
                        if (t.type === "expense") return (
                          <svg viewBox="0 0 24 24" style={s}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        );
                        if (t.type === "creditDonation" || t.type === "donation") return (
                          <svg viewBox="0 0 24 24" style={s}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        );
                        return (
                          <svg viewBox="0 0 24 24" style={s}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        );
                      };
                      return (
                        <div key={t.id} style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <TxIcon />
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{getTransactionLabel(t)}</div>
                              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{fmtDate(t.date || t.createdAt)}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: iconColor }}>{getTransactionSign(t)}${t.amount.toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>

            {/* 납부 안내 문구 — 맨 아래 박스 */}
            {paymentGuideText && (
              <div style={{ background: "#EBF2FF", borderRadius: 20, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14, border: "1px solid rgba(0,71,171,0.12)", marginBottom: 0 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0047AB", marginBottom: 6 }}>납부 안내</div>
                  <div style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{paymentGuideText}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "0 0 8px" }}>
            {settlementsLoading ? (
              <div style={{ background: "#fff", borderRadius: 18, padding: "40px 20px", textAlign: "center", color: "#9CA3AF", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>불러오는 중...</div>
            ) : settlements.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 18, padding: "48px 20px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 6 }}>아직 마감된 정산서가 없습니다</div>
                <div style={{ fontSize: 13, color: "#9CA3AF" }}>월 마감이 완료되면 여기에 표시됩니다</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[...settlements].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)).map((s) => {
                  const [y, m] = s.yearMonth.split("-");
                  const closedDate = s.closedAt ? new Date(s.closedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";
                  const isPositive = s.netBalance >= 0;
                  const monthNet = s.totalIncome - s.totalExpense;
                  const monthPos = monthNet >= 0;
                  return (
                    <div key={s.yearMonth} style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                      {/* 헤더: 월 + 마감 뱃지 + 정산서 버튼 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                            {y}년 {parseInt(m)}월
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#f0fdf4", borderRadius: 20, padding: "3px 8px" }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a" }}>마감</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setReportYearMonth(s.yearMonth)}
                          style={{ padding: "5px 11px", borderRadius: 8, border: "none", background: "#0047AB", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          정산서 보기
                        </button>
                      </div>
                      {/* 수입 / 지출 / 월잔액 한 줄 */}
                      <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#f8fafc", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ flex: 1, padding: "9px 10px", borderRight: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>수입</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>+${s.totalIncome.toLocaleString()}</div>
                        </div>
                        <div style={{ flex: 1, padding: "9px 10px", borderRight: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>지출</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#dc2626" }}>-${s.totalExpense.toLocaleString()}</div>
                        </div>
                        <div style={{ flex: 1, padding: "9px 10px" }}>
                          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>월잔액</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: monthPos ? "#16a34a" : "#dc2626" }}>
                            {monthPos ? "+" : "-"}${Math.abs(monthNet).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {/* 전체 잔액 */}
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 8, gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>누계 잔액</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: isPositive ? "#0047AB" : "#dc2626" }}>
                          {isPositive ? "" : "-"}${Math.abs(s.netBalance).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreditModal && (
        <CreditModal
          mode={showCreditModal}
          creditBalance={creditBalance}
          actualUnpaid={actualUnpaid}
          amount={creditActionAmount}
          setAmount={setCreditActionAmount}
          memo={creditActionMemo}
          setMemo={setCreditActionMemo}
          onConfirm={showCreditModal === "donation" ? handleCreditToDonation : handleCreditToPayment}
          onClose={() => { setShowCreditModal(null); setCreditActionAmount(""); setCreditActionMemo(""); }}
          loading={creditActionLoading}
        />
      )}

      {reportYearMonth && (
        <SettlementReportModal
          yearMonth={reportYearMonth}
          authHeaders={{ 'X-Member-Id': user?.id }}
          onClose={() => setReportYearMonth(null)}
        />
      )}

      <style>{`
        @keyframes slideUpFees {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default Fees;
