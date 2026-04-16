import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, checkIsOperator } from '../utils';
import apiService from '../services/api';
import { ProfileBadge } from '../components/common';
import SettlementReportModal from '../components/SettlementReportModal';

// ─── 아이콘 ───────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────
function getYearMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
function fmtMonth(ym) {
  const [y, m] = ym.split('-');
  return `${y}년 ${parseInt(m)}월`;
}

// ─── 빠른 입력 바텀시트 ───────────────────────────────────────────────────────
function QuickInputSheet({ onClose, onSaved, members, yearMonth, authHeaders }) {
  const [mode, setMode] = useState('expense');
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [saving, setSaving] = useState(false);
  const [receiptImages, setReceiptImages] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);

  // 바텀시트 열릴 때 body 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleImageAdd = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('이미지는 5MB 이하만 첨부 가능합니다.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptImages(prev => [...prev, ev.target.result]);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/transactions/income-categories', { headers: authHeaders }).then(r => r.json()),
      fetch('/api/transactions/expense-categories', { headers: authHeaders }).then(r => r.json()),
    ]).then(([inc, exp]) => {
      setIncomeCategories(inc || []);
      setExpenseCategories(exp || []);
    }).catch(() => {});
  }, []);

  const categories = mode === 'income' ? incomeCategories : expenseCategories;

  const handleSave = async () => {
    if (!amount || !selectedCategory) { alert('항목과 금액을 입력해주세요.'); return; }
    const parsed = parseInt(amount.replace(/,/g, ''), 10);
    if (!parsed || parsed <= 0) { alert('올바른 금액을 입력하세요.'); return; }
    if (!date) { alert('날짜를 선택해주세요.'); return; }
    setSaving(true);
    try {
      const body = {
        type: mode === 'income' ? 'payment' : 'expense',
        category: selectedCategory,
        amount: parsed,
        description: memo || selectedCategory,
        date,
        memberId: selectedMember || null,
        ...(mode === 'expense' && receiptImages.length > 0 ? { receiptImages } : {}),
      };
      const r = await fetch('/api/transactions', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      onSaved();
      onClose();
    } catch (e) {
      alert('저장 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    /* 배경 오버레이 */
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end', touchAction: 'none' }}
    >
      {/* 시트 본체 — 세로 스크롤만 허용, 배경 스크롤 차단 */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: '#fff',
          borderRadius: '22px 22px 0 0',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88dvh',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          overflowX: 'hidden',
        }}
      >
        {/* 스크롤 영역 */}
        <div style={{ overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', touchAction: 'pan-y', padding: '24px 20px 20px', flex: 1 }}>

          {/* 헤더 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--on-background)' }}>빠른 입력</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
          </div>

          {/* 수입/지출 토글 */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 20 }}>
            {[['income', '수입'], ['expense', '지출']].map(([val, label]) => (
              <button key={val} onClick={() => { setMode(val); setSelectedCategory(''); setReceiptImages([]); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  background: mode === val ? (val === 'income' ? 'var(--primary)' : '#ef4444') : 'transparent',
                  color: mode === val ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s',
                }}>{label}</button>
            ))}
          </div>

          {/* 항목 선택 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>항목 선택</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.name)}
                  style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: selectedCategory === cat.name ? (mode === 'income' ? 'var(--primary)' : '#ef4444') : '#f1f5f9',
                    color: selectedCategory === cat.name ? '#fff' : 'var(--on-background)',
                  }}>{cat.name}</button>
              ))}
            </div>
          </div>

          {/* 금액 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>금액</div>
            <div style={{ position: 'relative' }}>
              <input type="number" inputMode="numeric" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                style={{ width: '100%', padding: '14px 16px 14px 36px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 20, fontWeight: 700, color: 'var(--on-background)', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
            </div>
          </div>

          {/* 영수증 + 메모 (나란히 배치) */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'stretch' }}>
            {/* 영수증 첨부 (지출만) */}
            {mode === 'expense' && (
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>영수증 (선택)</div>
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
                  {receiptImages.map((img, i) => (
                    <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                      <img src={img} alt="영수증" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1.5px solid #e2e8f0' }} />
                      <button onClick={() => setReceiptImages(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                  {receiptImages.length < 5 && (
                    <label style={{ width: 72, height: 72, borderRadius: 10, border: '1.5px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', gap: 4, background: '#f8fafc' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span style={{ fontSize: 10, fontWeight: 600 }}>사진 추가</span>
                      <input type="file" accept="image/*" onChange={handleImageAdd} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* 메모 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>메모 (선택)</div>
              <textarea
                placeholder="메모 입력"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                style={{
                  flex: 1,
                  minHeight: mode === 'expense' ? 88 : 72,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1.5px solid #e2e8f0',
                  fontSize: 14,
                  color: 'var(--on-background)',
                  background: '#f8fafc',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>

          {/* 날짜 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>날짜</div>
              {date !== todayStr && (
                <button onClick={() => setDate(todayStr)} style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>오늘로 되돌리기</button>
              )}
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: 'var(--on-background)', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', display: 'block', minHeight: '48px', lineHeight: '1.5' }} />
            {date !== todayStr && (
              <div style={{ fontSize: 11, color: '#ea580c', marginTop: 5, fontWeight: 600 }}>⚠ 오늘({todayStr})이 아닌 날짜로 기록됩니다</div>
            )}
          </div>

          {/* 회원 선택 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>회원 (선택)</div>
            <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, color: 'var(--on-background)', background: '#f8fafc', outline: 'none' }}>
              <option value="">회원 선택 안함</option>
              {members.filter(m => m.isActive).map(m => (
                <option key={m.id} value={m.id}>{m.nickname || m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 저장 버튼 — 시트 하단 고정 (flex item, 내비 바 위) */}
        <div style={{ flexShrink: 0, padding: '12px 20px', paddingBottom: 'calc(12px + 60px + env(safe-area-inset-bottom))', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#94a3b8' : (mode === 'income' ? 'var(--primary)' : '#ef4444'), color: '#fff' }}>
            {saving ? '저장 중…' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 영수증 이미지 전체화면 뷰어 ────────────────────────────────────────────
function ReceiptViewer({ images, onClose }) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1200, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* 상단 페이지 표시 */}
      {images.length > 1 && (
        <div style={{ textAlign: 'center', padding: '12px 20px 0', flexShrink: 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>{idx + 1} / {images.length}</span>
        </div>
      )}
      {/* 이미지 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', minHeight: 0 }}>
        <img src={images[idx]} alt="영수증" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }} />
      </div>
      {/* 하단 버튼 영역 */}
      <div style={{ flexShrink: 0, padding: '12px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        {images.length > 1 && (
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            style={{ padding: '12px 28px', borderRadius: 14, border: 'none', background: idx === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>
            ← 이전
          </button>
        )}
        <button onClick={onClose}
          style={{ padding: '14px 36px', borderRadius: 14, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', minWidth: 100 }}>
          닫기
        </button>
        {images.length > 1 && (
          <button onClick={() => setIdx(i => Math.min(images.length - 1, i + 1))} disabled={idx === images.length - 1}
            style={{ padding: '12px 28px', borderRadius: 14, border: 'none', background: idx === images.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: idx === images.length - 1 ? 'not-allowed' : 'pointer' }}>
            다음 →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 카테고리 상세 바텀시트 ──────────────────────────────────────────────────
function CategoryDetailSheet({ categoryKey, side, yearMonth, authHeaders, onClose, isOperator, isClosed, onRefresh }) {
  const [txList, setTxList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerImages, setViewerImages] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingTx, setEditingTx] = useState(null); // 수정 중인 트랜잭션
  const [editCategory, setEditCategory] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!categoryKey) return;
    setLoading(true);
    fetch(`/api/settlement/${yearMonth}/category?key=${encodeURIComponent(categoryKey)}&side=${side}`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setTxList(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [categoryKey, side, yearMonth]);

  useEffect(() => {
    const endpoint = side === 'income' ? '/api/transactions/income-categories' : '/api/transactions/expense-categories';
    fetch(endpoint, { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCategories(data.map(c => c.name)))
      .catch(() => {});
  }, [side]);

  const openEdit = (tx) => {
    setEditingTx(tx);
    setEditCategory(tx.category || categoryKey);
    setEditMemo(tx.memo || tx.description || '');
    setEditAmount(String(tx.amount));
  };

  const handleEditSave = async () => {
    if (!editingTx) return;
    const amt = parseFloat(editAmount);
    if (!amt || isNaN(amt)) { alert('금액을 입력해주세요.'); return; }
    setEditSaving(true);
    try {
      const r = await fetch(`/api/transactions/${editingTx.id}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, memo: editMemo, description: editMemo, category: editCategory }),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      setTxList(prev => prev.map(t => t.id === updated.id ? { ...t, amount: updated.amount, memo: updated.memo, description: updated.description, category: updated.category } : t));
      setEditingTx(null);
      onRefresh?.();
    } catch {
      alert('수정에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleReverse = async (tx) => {
    const memberName = tx.member?.nickname || tx.member?.name || '내역';
    const confirmMsg = isIncome
      ? `${memberName}님의 납부(${formatCurrency(tx.amount)})를 취소하고 미납 상태로 되돌리겠습니까?`
      : `이 지출 내역(${formatCurrency(tx.amount)})을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
    if (!confirm(confirmMsg)) return;
    setDeletingId(tx.id);
    try {
      const r = await fetch(`/api/transactions/${tx.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!r.ok) throw new Error('Failed');
      setTxList(prev => prev.filter(t => t.id !== tx.id));
      onRefresh?.();
    } catch {
      alert(isIncome ? '납부 취소 처리에 실패했습니다.' : '삭제 처리에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!categoryKey) return null;

  const total = txList.reduce((s, t) => s + t.amount, 0);
  const isIncome = side === 'income';
  const color = isIncome ? '#16a34a' : '#ef4444';

  const getImages = (t) => {
    const multi = Array.isArray(t.receiptImages) ? t.receiptImages : [];
    const single = t.receiptImage ? [t.receiptImage] : [];
    return multi.length > 0 ? multi : single;
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '22px 22px 0 0', zIndex: 301,
        display: 'flex', flexDirection: 'column', maxHeight: '78vh',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--on-background)' }}>{categoryKey}</div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>×</button>
          </div>
          <div style={{ fontSize: 13, color: color, fontWeight: 700, marginBottom: 14 }}>
            {isIncome ? '+' : '-'}{formatCurrency(total)} · {txList.length}건
          </div>
          <div style={{ height: 1, background: '#f1f5f9' }} />
        </div>

        {/* 거래 목록 */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 14 }}>불러오는 중…</div>
          ) : txList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 14 }}>거래 내역이 없습니다</div>
          ) : (
            txList.map((t, i) => {
              const memberName = t.member?.nickname || t.member?.name || '';
              const memoText = t.memo || (t.description && t.description !== (t.category || categoryKey) ? t.description : '');
              const [, mm, dd] = t.date.split('-');
              const images = getImages(t);
              return (
                <div key={t.id} style={{
                  padding: '13px 0',
                  borderBottom: i < txList.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    {/* 왼쪽: 날짜 + 이름/메모 */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, paddingTop: 1 }}>
                        {parseInt(mm)}. {parseInt(dd)}.
                      </div>
                      <div style={{ minWidth: 0 }}>
                        {memberName && (
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-background)', marginBottom: 1 }}>{memberName}</div>
                        )}
                        {memoText ? (
                          <div style={{ fontSize: 12, color: '#64748b' }}>{memoText}</div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#cbd5e1' }}>메모 없음</div>
                        )}
                      </div>
                    </div>
                    {/* 오른쪽: 금액 + 버튼들 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color }}>{isIncome ? '+' : '-'}{formatCurrency(t.amount)}</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {images.length > 0 && (
                          <button onClick={() => setViewerImages(images)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                            </svg>
                            영수증{images.length > 1 ? ` ${images.length}장` : ''}
                          </button>
                        )}
                        {isOperator && (
                          <button onClick={() => openEdit(t)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #dbeafe', background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            수정
                          </button>
                        )}
                        {isOperator && !isClosed && (
                          <button onClick={() => handleReverse(t)} disabled={deletingId === t.id} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #fecaca', background: deletingId === t.id ? '#f8fafc' : '#fff5f5', color: deletingId === t.id ? '#9ca3af' : '#dc2626', fontSize: 11, fontWeight: 600, cursor: deletingId === t.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                            {deletingId === t.id ? '...' : (isIncome ? '취소' : '삭제')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 영수증 뷰어 */}
      {viewerImages && <ReceiptViewer images={viewerImages} onClose={() => setViewerImages(null)} />}

      {/* 수정 모달 */}
      {editingTx && (
        <>
          <div onClick={() => setEditingTx(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '22px 22px 0 0', zIndex: 1101, padding: '20px 20px 0' }}>
            <div style={{ width: 40, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>내역 수정</div>

            {/* 항목 선택 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>항목</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setEditCategory(cat)} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: editCategory === cat ? (side === 'income' ? '#0047AB' : '#ef4444') : '#f1f5f9', color: editCategory === cat ? '#fff' : 'var(--on-background)' }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>메모</div>
              <textarea value={editMemo} onChange={e => setEditMemo(e.target.value)} placeholder="메모 입력" rows={2}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#f8fafc', outline: 'none', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>

            {/* 금액 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>금액</div>
              <div style={{ position: 'relative' }}>
                <input type="number" inputMode="numeric" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px 12px 34px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 18, fontWeight: 700, background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: 8, paddingBottom: 'calc(70px + env(safe-area-inset-bottom))' }}>
              <button onClick={() => setEditingTx(null)} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'var(--text-muted)' }}>취소</button>
              <button onClick={handleEditSave} disabled={editSaving} style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: editSaving ? '#94a3b8' : (side === 'income' ? '#0047AB' : '#ef4444'), color: '#fff', fontSize: 15, fontWeight: 800, cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                {editSaving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── 납부 처리 바텀시트 ──────────────────────────────────────────────────────
function PaySheet({ member, amount, setAmount, memo, setMemo, date, setDate, onConfirm, onClose, paying }) {
  if (!member) return null;
  const todayStr = new Date().toISOString().split('T')[0];
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '22px 22px 0 0', zIndex: 301, padding: '20px 20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 40, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '0 auto 16px' }} />
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--on-background)' }}>납부 처리</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
            {member.isGuest && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', background: '#EDE9FE', borderRadius: 6, padding: '2px 6px' }}>게스트</span>
            )}
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{member.memberNickname || member.memberName}</span>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>납부 금액</div>
          <div style={{ position: 'relative' }}>
            <input
              type="number" inputMode="numeric" value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 36px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 20, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>납부 날짜</div>
            {date !== todayStr && (
              <button onClick={() => setDate(todayStr)}
                style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                오늘로 되돌리기
              </button>
            )}
          </div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0',
              fontSize: 14, color: 'var(--on-background)', background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
              WebkitAppearance: 'none', display: 'block', minHeight: '48px', lineHeight: '1.5',
            }}
          />
          {date !== todayStr && (
            <div style={{ fontSize: 11, color: '#ea580c', marginTop: 5, fontWeight: 600 }}>
              ⚠ 오늘({todayStr})이 아닌 날짜로 기록됩니다
            </div>
          )}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>메모 (선택)</div>
          <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="예: 현장 수령, 계좌 이체..."
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 'max(80px, calc(68px + env(safe-area-inset-bottom)))' }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>취소</button>
          <button onClick={onConfirm} disabled={paying}
            style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: paying ? '#94a3b8' : '#16a34a', color: '#fff', fontWeight: 800, fontSize: 14, cursor: paying ? 'not-allowed' : 'pointer' }}>
            {paying ? '처리 중…' : '납부 완료 처리'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── 청구 내역 바텀시트 (미수금 회원별 charge 목록) ──────────────────────────
function ChargeDetailSheet({ member, authHeaders, onClose, onRefresh, isClosed }) {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    fetch(`/api/transactions/member/${member.memberId}`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setCharges(data.filter(t => t.type === 'charge'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [member?.memberId]);

  const handleCancel = async (charge) => {
    const label = charge.booking?.courseName || charge.booking?.title || charge.description || '청구';
    if (!confirm(`"${label}" 청구(${formatCurrency(charge.amount)})를 취소하시겠습니까?\n취소 후 미수금 목록에서 제거됩니다.`)) return;
    setDeletingId(charge.id);
    try {
      const r = await fetch(`/api/transactions/${charge.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!r.ok) throw new Error('Failed');
      setCharges(prev => prev.filter(c => c.id !== charge.id));
      onRefresh?.();
    } catch {
      alert('청구 취소에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteGuestMember = async () => {
    if (!member.isGuest) return;
    const name = member.memberNickname || member.memberName;
    if (!confirm(`게스트 "${name}"의 모든 청구 내역과 회원 정보를 완전 삭제하시겠습니까?`)) return;
    setDeletingMember(true);
    try {
      const r = await fetch(`/api/members/${member.memberId}/guest`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!r.ok) throw new Error('Failed');
      onRefresh?.();
      onClose();
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeletingMember(false);
    }
  };

  if (!member) return null;

  const memberName = member.memberNickname || member.memberName;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '22px 22px 0 0', zIndex: 301,
        display: 'flex', flexDirection: 'column', maxHeight: '70vh',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--on-background)' }}>
              {member.isGuest && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', background: '#EDE9FE', borderRadius: 6, padding: '2px 6px', marginRight: 6 }}>G</span>
              )}
              {memberName} 청구 내역
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {member.isGuest && !isClosed && (
                <button
                  onClick={handleDeleteGuestMember}
                  disabled={deletingMember}
                  style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {deletingMember ? '삭제중...' : '게스트 삭제'}
                </button>
              )}
              <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>×</button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#ea580c', fontWeight: 600, marginBottom: 14 }}>
            청구취소 시 해당 미수금이 제거됩니다
          </div>
          <div style={{ height: 1, background: '#f1f5f9' }} />
        </div>

        {/* 청구 목록 */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 14 }}>불러오는 중…</div>
          ) : charges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 14 }}>청구 내역이 없습니다</div>
          ) : (
            charges.map((c, i) => {
              const label = c.booking?.courseName || c.booking?.title || c.description || '—';
              const [, mm, dd] = (c.date || '').split('-');
              return (
                <div key={c.id} style={{
                  padding: '13px 0',
                  borderBottom: i < charges.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                      {mm && dd ? `${parseInt(mm)}. ${parseInt(dd)}.` : '—'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-background)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>미납</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#ea580c' }}>-{formatCurrency(c.amount)}</span>
                    {!isClosed && (
                      <button
                        onClick={() => handleCancel(c)}
                        disabled={deletingId === c.id}
                        style={{
                          padding: '3px 10px', borderRadius: 8,
                          border: '1px solid #fecaca',
                          background: deletingId === c.id ? '#f8fafc' : '#fff5f5',
                          color: deletingId === c.id ? '#9ca3af' : '#dc2626',
                          fontSize: 11, fontWeight: 600,
                          cursor: deletingId === c.id ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {deletingId === c.id ? '처리중...' : '청구취소'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ─── 메인 Settlement 페이지 ──────────────────────────────────────────────────
function Settlement() {
  const navigate = useNavigate();
  const { user, members } = useApp();
  const isOperator = checkIsOperator(user);

  const [yearMonth, setYearMonth] = useState(getYearMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuickInput, setShowQuickInput] = useState(false);
  const [closingMonth, setClosingMonth] = useState(false);
  const [editingCarryover, setEditingCarryover] = useState(false);
  const [carryoverInput, setCarryoverInput] = useState('');
  const [showReport, setShowReport] = useState(false);

  const [outstandingMembers, setOutstandingMembers] = useState([]);
  const [payingMember, setPayingMember] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMemo, setPayMemo] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [paying, setPaying] = useState(false);
  const [catSheet, setCatSheet] = useState(null); // { key, side }
  const [chargeSheet, setChargeSheet] = useState(null); // { memberId, memberName, isGuest }
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [completingId, setCompletingId] = useState(null);
  const [receiptViewer, setReceiptViewer] = useState(null);

  const authHeaders = {
    'X-Member-Id': user?.id || '',
    'Content-Type': 'application/json',
  };

  const loadOutstanding = useCallback(async () => {
    if (!isOperator) return;
    try {
      const r = await fetch(`/api/transactions/outstanding?yearMonth=${yearMonth}`, { headers: authHeaders });
      if (r.ok) setOutstandingMembers(await r.json());
    } catch {}
  }, [isOperator, user?.id, yearMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/settlement/${yearMonth}`, { headers: authHeaders });
      if (!r.ok) throw new Error('Failed');
      const d = await r.json();
      setData(d);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [yearMonth, user?.id]);

  const loadPendingReceipts = useCallback(async () => {
    if (!isOperator) return;
    try {
      const r = await fetch('/api/transactions/pending-receipts', { headers: authHeaders });
      if (r.ok) setPendingReceipts(await r.json());
    } catch {}
  }, [isOperator, user?.id]);

  const handleCompletePayment = async (chargeId) => {
    if (!confirm('이 영수증으로 납부완료 처리하시겠습니까?')) return;
    setCompletingId(chargeId);
    try {
      const r = await fetch(`/api/transactions/${chargeId}/complete-payment`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (r.ok) {
        setPendingReceipts(prev => prev.filter(p => p.id !== chargeId));
        load();
        loadOutstanding();
        alert('납부완료 처리되었습니다.');
      } else {
        const err = await r.json();
        alert(err.error || '처리 실패');
      }
    } catch { alert('오류가 발생했습니다.'); }
    finally { setCompletingId(null); }
  };

  useEffect(() => { load(); loadOutstanding(); loadPendingReceipts(); }, [load, loadOutstanding, loadPendingReceipts]);

  const handlePayMember = async () => {
    if (!payingMember || paying) return;
    const parsed = parseInt(payAmount, 10);
    if (!parsed || parsed <= 0) { alert('올바른 금액을 입력하세요.'); return; }
    setPaying(true);
    try {
      const isGuestPayment = payingMember.isGuest;
      const r = await fetch('/api/transactions', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'payment',
          category: isGuestPayment ? '게스트 참가비납부' : '회비납부',
          amount: parsed,
          description: payMemo || (isGuestPayment ? '게스트 참가비납부' : '회비납부'),
          date: payDate,
          memberId: payingMember.memberId,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setPayingMember(null);
      setPayAmount('');
      setPayMemo('');
      setPayDate(new Date().toISOString().split('T')[0]);
      await Promise.all([load(), loadOutstanding()]);
    } catch (e) {
      alert('납부 처리 실패: ' + e.message);
    } finally {
      setPaying(false);
    }
  };

  const handleCloseMonth = async () => {
    if (!confirm(`${fmtMonth(yearMonth)}을 마감하고 다음달로 이월하시겠습니까?`)) return;
    setClosingMonth(true);
    try {
      const r = await fetch(`/api/settlement/${yearMonth}/close`, {
        method: 'POST',
        headers: authHeaders,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      alert(`마감 완료! ${fmtMonth(d.nextMonth)} 이월금: ${formatCurrency(d.carryoverToNext)}`);
      load();
    } catch (e) {
      alert('마감 실패: ' + e.message);
    } finally {
      setClosingMonth(false);
    }
  };

  const handleSaveCarryover = async () => {
    const val = parseInt(carryoverInput.replace(/,/g, ''), 10) || 0;
    try {
      const r = await fetch(`/api/settlement/${yearMonth}/carryover`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ carryover: val }),
      });
      if (!r.ok) throw new Error('Failed');
      setEditingCarryover(false);
      load();
    } catch (e) {
      alert('저장 실패');
    }
  };

  // 카테고리 아이콘
  const getCategoryIcon = (cat, side) => {
    const c = (cat || '').toLowerCase();
    const isIncome = side === 'income';
    const iconColor = isIncome ? '#0047AB' : '#64748b';
    const bgColor = isIncome ? '#DBEAFE' : '#F1F5F9';

    let path = null;
    if (c.includes('회비') || c.includes('참가비') || c.includes('납부'))
      path = 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z';
    else if (c.includes('도네이션') || c.includes('후원') || c.includes('기부'))
      path = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
    else if (c.includes('가입'))
      path = 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';
    else if (c.includes('그린피') || c.includes('골프'))
      path = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';
    else if (c.includes('회식') || c.includes('식비') || c.includes('식사') || c.includes('간식') || c.includes('음료'))
      path = 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z';
    else if (c.includes('물품') || c.includes('상품') || c.includes('구매') || c.includes('쇼핑'))
      path = 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.43 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z';
    else if (c.includes('크레딧'))
      path = 'M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z';

    if (!path) path = isIncome
      ? 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z'
      : 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z';

    return (
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={iconColor}><path d={path} /></svg>
      </div>
    );
  };

  return (
    <div style={{ background: '#EEF1F6', minHeight: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* 헤더 + 월 선택 고정 */}
      <div style={{ position: 'sticky', top: 'env(safe-area-inset-top)', zIndex: 100 }}>
        {/* 헤더 */}
        <div style={{
          background: 'rgba(238,241,246,0.97)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 56,
        }}>
          <div style={{ width: 38 }} />
          <span style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>클럽회계</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {user && (
              <>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', letterSpacing: '-0.02em' }}>
                  {user.nickname || user.name}
                </span>
                <ProfileBadge user={user} size={32} />
              </>
            )}
          </div>
        </div>

        {/* 월 선택 — 헤더 바로 아래 고정 */}
        <div style={{ background: 'rgba(238,241,246,0.97)', backdropFilter: 'blur(8px)', padding: '6px 16px 10px' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setYearMonth(prevMonth(yearMonth))}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          >
            <ChevronLeft />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0047AB"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{fmtMonth(yearMonth)}</span>
            {data?.isClosed && (
              <span style={{ fontSize: 11, background: '#64748b', color: '#fff', borderRadius: 6, padding: '2px 6px', fontWeight: 600 }}>마감</span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8"><path d="M7 10l5 5 5-5z"/></svg>
          </div>
          <button
            onClick={() => setYearMonth(nextMonth(yearMonth))}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          >
            <ChevronRight />
          </button>
        </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 120px' }}>

        {/* 납부 영수증 대기 섹션 */}
        {isOperator && pendingReceipts.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1.5px solid #fbbf24' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>🧾</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>납부 영수증 확인 대기</span>
              <span style={{ background: '#fbbf24', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 800, padding: '2px 8px', marginLeft: 4 }}>{pendingReceipts.length}건</span>
            </div>
            {pendingReceipts.map(p => {
              const memberName = p.member?.nickname || p.member?.name || '';
              const bookingName = p.booking?.title || p.booking?.courseName || '';
              const images = p.receiptImages?.length ? p.receiptImages : p.receiptImage ? [p.receiptImage] : [];
              return (
                <div key={p.id} style={{ padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{memberName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{bookingName} · ${p.amount.toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>-${p.amount.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {images.length > 0 && (
                      <button onClick={() => setReceiptViewer(images)}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1.5px solid #0047AB', background: '#eff6ff', color: '#0047AB', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        영수증 보기
                      </button>
                    )}
                    <button onClick={() => handleCompletePayment(p.id)} disabled={completingId === p.id}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', background: completingId === p.id ? '#94a3b8' : '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: completingId === p.id ? 'not-allowed' : 'pointer' }}>
                      {completingId === p.id ? '처리 중…' : '✓ 납부완료'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>불러오는 중…</div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>데이터를 불러올 수 없습니다</div>
        ) : (() => {
          const monthNet = data.totalIncome - data.totalExpense;
          const incomeEntries = Object.entries(data.incomeByCategory).sort((a, b) => b[1] - a[1]);
          const expenseEntries = Object.entries(data.expenseByCategory).sort((a, b) => b[1] - a[1]);
          return (
            <>
              {/* ① 메인 다크 카드 — 수입/지출/이달잔액 */}
              <div style={{
                background: 'linear-gradient(145deg, #0A2158 0%, #0047AB 100%)',
                borderRadius: 24, padding: '20px 20px 22px', marginBottom: 14,
                boxShadow: '0 8px 28px rgba(0,71,171,0.28)',
              }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.02em' }}>이달의 수입</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>+{formatCurrency(data.totalIncome)}</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.02em' }}>이달의 지출</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#FF7B7B', letterSpacing: '-0.02em' }}>-{formatCurrency(data.totalExpense)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>이달 손익</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: monthNet >= 0 ? '#fff' : '#FF7B7B', letterSpacing: '-0.02em' }}>
                    {monthNet >= 0 ? '+' : '-'}{formatCurrency(Math.abs(monthNet))}
                  </div>
                </div>
              </div>

              {/* ② 이월금 / 전체잔액 카드 */}
              <div style={{ background: '#fff', borderRadius: 22, padding: '20px 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                {/* 지난달 이월금 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, background: '#F1F5F9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#64748b"><path d="M13 3a9 9 0 1 0 0 18A9 9 0 0 0 13 3zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm.5-11H12v6l5.25 3.15.75-1.23-4.5-2.67V8z"/></svg>
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>지난달 이월 금액</span>
                  {isOperator && !data.isClosed && (
                    editingCarryover ? (
                      <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
                        <input type="number" value={carryoverInput} onChange={e => setCarryoverInput(e.target.value)}
                          style={{ width: 90, padding: '4px 8px', borderRadius: 8, border: '1.5px solid #0047AB', fontSize: 13, outline: 'none' }} autoFocus />
                        <button onClick={handleSaveCarryover} style={{ background: '#0047AB', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>저장</button>
                        <button onClick={() => setEditingCarryover(false)} style={{ background: '#e2e8f0', color: '#64748b', border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>취소</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingCarryover(true); setCarryoverInput(String(data.carryover)); }}
                        style={{ marginLeft: 'auto', background: '#EFF6FF', color: '#0047AB', border: 'none', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>수정</button>
                    )
                  )}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', marginBottom: 18, letterSpacing: '-0.02em' }}>
                  {formatCurrency(data.carryover)}
                </div>

                <div style={{ height: 1, background: '#F1F5F9', marginBottom: 16 }} />

                {/* 전체 잔액 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#0047AB"><path d="M4 10v7h3v-7H4zm6.5 0v7h3v-7h-3zM2 22h19v-3H2v3zm15-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z"/></svg>
                  </div>
                  <span style={{ fontSize: 12, color: '#0047AB', fontWeight: 700, letterSpacing: '0.01em' }}>전체 잔액 (Total Balance)</span>
                </div>
                <div style={{ fontSize: 34, fontWeight: 900, color: data.netBalance >= 0 ? '#0047AB' : '#ef4444', letterSpacing: '-0.03em' }}>
                  {data.netBalance >= 0 ? '' : '-'}{formatCurrency(Math.abs(data.netBalance))}
                </div>
              </div>

              {/* 미수금 목록 */}
              {outstandingMembers.length > 0 && (() => {
                const regularMembers = outstandingMembers.filter(m => !m.isGuest);
                const guestMembers = outstandingMembers.filter(m => m.isGuest);
                const regularTotal = regularMembers.reduce((s, m) => s + Math.abs(m.balance), 0);
                const guestTotal = guestMembers.reduce((s, m) => s + Math.abs(m.balance), 0);
                return (
                  <div style={{ background: '#fff', borderRadius: 20, padding: '18px 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1.5px solid #fed7aa' }}>
                    {/* 헤더 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#ea580c"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        미수금
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {regularTotal > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', background: '#FEF3C7', borderRadius: 8, padding: '2px 8px' }}>
                            회원 {formatCurrency(regularTotal)}
                          </span>
                        )}
                        {guestTotal > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#EDE9FE', borderRadius: 8, padding: '2px 8px' }}>
                            게스트 {formatCurrency(guestTotal)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 일반 회원 */}
                    {regularMembers.map((m, i) => (
                      <div key={m.memberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid #FEF3C7' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{m.memberNickname || m.memberName}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#ea580c' }}>{formatCurrency(Math.abs(m.balance))}</span>
                          {isOperator && !data?.isClosed && (
                            <>
                              <button
                                onClick={() => setChargeSheet(m)}
                                style={{ padding: '5px 10px', borderRadius: 10, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >청구 내역</button>
                              <button
                                onClick={() => { setPayingMember(m); setPayAmount(String(Math.abs(m.balance))); setPayMemo(''); }}
                                style={{ padding: '5px 14px', borderRadius: 10, border: 'none', background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >납부 처리</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 구분선 */}
                    {regularMembers.length > 0 && guestMembers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                        <div style={{ flex: 1, height: 1, background: '#EDE9FE' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>게스트</span>
                        <div style={{ flex: 1, height: 1, background: '#EDE9FE' }} />
                      </div>
                    )}

                    {/* 게스트 */}
                    {guestMembers.map((m, i) => (
                      <div key={m.memberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: i === 0 && regularMembers.length === 0 ? '1px solid #EDE9FE' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', background: '#EDE9FE', borderRadius: 6, padding: '2px 6px', letterSpacing: '0.02em' }}>G</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{m.memberNickname || m.memberName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>{formatCurrency(Math.abs(m.balance))}</span>
                          {isOperator && !data?.isClosed && (
                            <>
                              <button
                                onClick={() => setChargeSheet(m)}
                                style={{ padding: '5px 10px', borderRadius: 10, border: '1px solid #c4b5fd', background: '#faf5ff', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >청구 내역</button>
                              <button
                                onClick={() => { setPayingMember(m); setPayAmount(String(Math.abs(m.balance))); setPayMemo(''); }}
                                style={{ padding: '5px 14px', borderRadius: 10, border: 'none', background: '#EDE9FE', color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >납부 처리</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* 수입 내역 */}
              {incomeEntries.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1e293b"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>수입 내역</span>
                    </div>
                    <div style={{ background: '#DCFCE7', color: '#16a34a', borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 700 }}>
                      + {formatCurrency(data.totalIncome)}
                    </div>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 20, padding: '0 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                    {incomeEntries.map(([cat, amt], i) => (
                      <div key={cat}
                        onClick={() => setCatSheet({ key: cat, side: 'income' })}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < incomeEntries.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer' }}>
                        {getCategoryIcon(cat, 'income')}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{cat}</div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#16a34a', flexShrink: 0 }}>+{formatCurrency(amt)}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 지출 내역 */}
              {expenseEntries.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1e293b"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>지출 내역</span>
                    </div>
                    <div style={{ background: '#FEE2E2', color: '#ef4444', borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 700 }}>
                      - {formatCurrency(data.totalExpense)}
                    </div>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 20, padding: '0 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                    {expenseEntries.map(([cat, amt], i) => (
                      <div key={cat}
                        onClick={() => setCatSheet({ key: cat, side: 'expense' })}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < expenseEntries.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer' }}>
                        {getCategoryIcon(cat, 'expense')}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{cat}</div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#ef4444', flexShrink: 0 }}>-{formatCurrency(amt)}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 데이터 없음 */}
              {incomeEntries.length === 0 && expenseEntries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#fff', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>이번달 거래 내역이 없습니다</div>
                </div>
              )}

              {/* 운영진: 마감 버튼 */}
              {isOperator && (
                <div style={{ marginTop: 4 }}>
                  {!data.isClosed ? (
                    <button
                      onClick={handleCloseMonth}
                      disabled={closingMonth}
                      style={{
                        width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                        background: closingMonth ? '#94a3b8' : '#1e293b',
                        color: '#fff', fontSize: 15, fontWeight: 800, cursor: closingMonth ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                      }}
                    >
                      {closingMonth ? '마감 처리 중…' : `${fmtMonth(yearMonth)} 마감 및 이월`}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button
                        onClick={() => setShowReport(true)}
                        style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: '#0047AB', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,71,171,0.25)' }}
                      >
                        📋 정산서 보기
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('마감을 취소하시겠습니까?')) return;
                          await fetch(`/api/settlement/${yearMonth}/reopen`, { method: 'POST', headers: authHeaders });
                          load();
                        }}
                        style={{ width: '100%', padding: '12px', borderRadius: 16, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        마감 취소
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* 빠른 입력 FAB — 운영진만 */}
      {isOperator && !data?.isClosed && (
        <button
          onClick={() => setShowQuickInput(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            right: 20,
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--primary)',
            color: '#fff', border: 'none',
            boxShadow: '0 4px 20px rgba(0,71,171,0.35)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
          }}
          aria-label="빠른 입력"
        >
          <PlusIcon />
        </button>
      )}

      {showQuickInput && (
        <QuickInputSheet
          onClose={() => setShowQuickInput(false)}
          onSaved={load}
          members={members || []}
          yearMonth={yearMonth}
          authHeaders={{ 'X-Member-Id': user?.id || '' }}
        />
      )}

      <PaySheet
        member={payingMember}
        amount={payAmount}
        setAmount={setPayAmount}
        memo={payMemo}
        setMemo={setPayMemo}
        date={payDate}
        setDate={setPayDate}
        onConfirm={handlePayMember}
        onClose={() => { setPayingMember(null); setPayAmount(''); setPayMemo(''); setPayDate(new Date().toISOString().split('T')[0]); }}
        paying={paying}
      />

      <CategoryDetailSheet
        categoryKey={catSheet?.key || null}
        side={catSheet?.side || 'income'}
        yearMonth={yearMonth}
        authHeaders={authHeaders}
        onClose={() => setCatSheet(null)}
        isOperator={isOperator}
        isClosed={data?.isClosed}
        onRefresh={() => { load(); loadOutstanding(); }}
      />

      <ChargeDetailSheet
        member={chargeSheet}
        authHeaders={authHeaders}
        onClose={() => setChargeSheet(null)}
        onRefresh={() => { load(); loadOutstanding(); setChargeSheet(null); }}
        isClosed={data?.isClosed}
      />

      {showReport && (
        <SettlementReportModal
          yearMonth={yearMonth}
          authHeaders={authHeaders}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* 영수증 뷰어 */}
      {receiptViewer && (
        <ReceiptViewer images={receiptViewer} onClose={() => setReceiptViewer(null)} />
      )}
    </div>
  );
}

export default Settlement;
