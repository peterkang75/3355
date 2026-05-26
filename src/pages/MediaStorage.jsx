import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import PageHeader from '../components/common/PageHeader';

const fmtBytes = (b) => {
  if (!b) return '0 MB';
  const mb = b / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
};

export default function MediaStorage() {
  const { user } = useApp();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiService.fetchStorageInfo()
      .then((d) => { if (!cancelled) setInfo(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleDownload = async (m) => {
    if (downloading) return;
    setDownloading(m.yearMonth);
    try {
      const blob = await apiService.downloadMonthArchive(m.yearMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rounding-${m.yearMonth}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading(null);
    }
  };

  const pct = info ? Math.min(100, Math.round((info.totalBytes / info.limitBytes) * 100)) : 0;
  const over80 = pct >= 80;

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <PageHeader title="저장소 관리" user={user} showBackButton />
      <div style={{ padding: '16px 16px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: '60px 0' }}>불러오는 중...</div>
        ) : error ? (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: 12, padding: 14, fontSize: 13 }}>{error}</div>
        ) : (
          <>
            {/* 사용량 */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEF2F7', padding: 18, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>사용량</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: over80 ? '#B45309' : '#0047AB' }}>
                  {fmtBytes(info.totalBytes)} / {fmtBytes(info.limitBytes)} ({pct}%)
                </span>
              </div>
              <div style={{ height: 10, background: '#EEF2F7', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: over80 ? '#F59E0B' : '#0047AB', borderRadius: 9999, transition: 'width 0.3s' }} />
              </div>
              {over80 && (
                <div style={{ fontSize: 12, color: '#B45309', fontWeight: 600, marginTop: 8 }}>⚠️ 곧 가득 찹니다. 오래된 자료를 백업·정리하세요.</div>
              )}
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: over80 ? 6 : 8 }}>💻 큰 용량은 PC에서 다운로드하시길 권장합니다.</div>
            </div>

            {/* 월별 */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', margin: '4px 2px 10px' }}>월별 자료</div>
            {info.months.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 14 }}>저장된 사진·영상이 없습니다</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {info.months.map((m) => (
                  <div key={m.yearMonth} style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEF2F7', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{m.count}개 · {fmtBytes(m.bytes)}</div>
                    </div>
                    <button
                      onClick={() => handleDownload(m)}
                      disabled={!!downloading}
                      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, border: '1px solid #BFDBFE', background: '#EBF2FF', color: '#0047AB', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (downloading && downloading !== m.yearMonth) ? 0.5 : 1 }}
                    >
                      {downloading === m.yearMonth ? '준비 중...' : '⬇ 다운로드'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
