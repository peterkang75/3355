import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CrownIcon from '../components/CrownIcon';
import api from '../services/api';

function Fees() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, members, userTransactions } = useApp();
  const [activeTab, setActiveTab] = useState('personal');
  const [allTransactions, setAllTransactions] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState({ type: 'all', memberId: 'all' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state?.reset) {
      setActiveTab('personal');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (activeTab === 'personal') {
      setLoading(false);
    } else {
      loadLedgerData();
    }
  }, [user.id, activeTab]);

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      const transactionsData = await api.fetchTransactions();
      setAllTransactions(transactionsData || []);
    } catch (error) {
      console.error('장부 데이터 로드 실패:', error);
      setAllTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCharges = userTransactions
    .filter(t => t.type === 'charge')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = userTransactions
    .filter(t => t.type === 'payment' || t.type === 'donation')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalCredits = userTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalPayments + totalCredits - totalCharges;

  const getTransactionLabel = (transaction) => {
    if (transaction.type === 'donation') {
      return '도네이션';
    }
    if (transaction.type === 'credit') {
      // description을 그대로 표시 (예: "크레딧처리")
      return transaction.description || '크레딧처리';
    }
    if (transaction.type === 'charge') {
      // description에서 항목명 추출
      if (transaction.description) {
        const parts = transaction.description.split(' - ');
        const categoryName = parts[0].replace(/\s*\([^)]*\)$/, ''); // 괄호 내용 제거
        
        // "라운딩"이 포함된 경우만 "참가비"로 표시
        if (categoryName.includes('라운딩')) {
          return '참가비';
        }
        
        // 그 외에는 항목명 그대로 표시 (예: "회식비청구" 등)
        return categoryName;
      }
      return '참가비 발생';
    }
    if (transaction.type === 'payment') {
      // description에서 전액납부/부분납부/참가비 환불 구분
      if (transaction.description && transaction.description.includes('전액')) {
        return '전액납부';
      } else if (transaction.description && transaction.description.includes('부분')) {
        return '부분납부';
      } else if (transaction.description && transaction.description.includes('환불')) {
        return '참가비 환불';
      }
      return '납부';
    }
    return '';
  };

  const getTransactionColor = (transaction) => {
    if (transaction.type === 'charge') return 'var(--alert-red)';
    if (transaction.type === 'payment') return 'var(--success-green)';
    if (transaction.type === 'donation') return 'var(--success-green)';
    if (transaction.type === 'credit') return 'var(--success-green)';
    return 'var(--text-primary)';
  };

  const getTransactionSign = (transaction) => {
    if (transaction.type === 'charge') return '-';
    if (transaction.type === 'payment') return '+';
    if (transaction.type === 'donation') return '+';
    if (transaction.type === 'credit') return '+';
    return '';
  };

  if (loading) {
    return (
      <div>
        <div className="header">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              color: 'var(--text-light)',
              minWidth: '24px'
            }}
          >
            ‹
          </button>
          <h1 style={{ flex: 1, marginLeft: '12px' }}>참가비 관리</h1>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/mypage')}
          >
            <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-light)' }}>
              환영합니다 {user.nickname || user.name}님
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--primary-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                border: '2px solid var(--border-color)'
              }}>
                {user.photo ? (
                  <img 
                    src={user.photo} 
                    alt="프로필" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                ) : (
                  <span>{(user.nickname || user.name).charAt(0)}</span>
                )}
              </div>
              {user.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(user.role) && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  zIndex: 10
                }}>
                  <CrownIcon role={user.role} size={16} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="page-content">
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.7 }}>
            로딩 중...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-light)',
            minWidth: '24px'
          }}
        >
          ‹
        </button>
        <h1 style={{ flex: 1, marginLeft: '12px' }}>회비 관리</h1>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/mypage')}
        >
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-light)' }}>
            환영합니다 {user.nickname || user.name}님
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--primary-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              border: '2px solid var(--border-color)'
            }}>
              {user.photo ? (
                <img 
                  src={user.photo} 
                  alt="프로필" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }} 
                />
              ) : (
                <span>{(user.nickname || user.name).charAt(0)}</span>
              )}
            </div>
            {user.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(user.role) && (
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                zIndex: 10
              }}>
                <CrownIcon role={user.role} size={16} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '0',
        background: 'var(--bg-page)',
        borderBottom: '2px solid var(--border-color)',
        position: 'sticky',
        top: '64px',
        zIndex: 100
      }}>
        <button
          onClick={() => setActiveTab('personal')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'personal' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'personal' ? 'white' : 'var(--text-dark)',
            border: 'none',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'personal' ? '3px solid var(--accent-bright-green)' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          개인 참가비 내역
        </button>
        <button
          onClick={() => setActiveTab('club')}
          style={{
            flex: 1,
            padding: '16px',
            background: activeTab === 'club' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'club' ? 'white' : 'var(--text-dark)',
            border: 'none',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'club' ? '3px solid var(--accent-bright-green)' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          클럽 회계장부
        </button>
      </div>

      <div className="page-content">
        {activeTab === 'personal' ? (
          <>
            <div className="card" style={{
              background: balance < 0 
                ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
                : 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
              color: 'white',
              padding: '24px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>
                현재 잔액
              </div>
              <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px' }}>
                ${balance.toLocaleString()}
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.3)',
                fontSize: '14px'
              }}>
                <div>
                  <div style={{ opacity: 0.9 }}>총 납부(도네이션 포함)</div>
                  <div style={{ fontWeight: '600', marginTop: '4px' }}>
                    ${totalPayments.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ opacity: 0.9 }}>총 회비</div>
                  <div style={{ fontWeight: '600', marginTop: '4px' }}>
                    ${totalCharges.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--primary-green)'
              }}>
                거래 내역
              </h3>

              {userTransactions.length === 0 ? (
                <div style={{ 
                  padding: '40px',
                  textAlign: 'center',
                  opacity: 0.7
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>$</div>
                  <p>아직 거래 내역이 없습니다</p>
                </div>
              ) : (
                <div>
                  {userTransactions.map(transaction => {
                    // 라운딩 이름 추출
                    const bookingName = transaction.booking ? 
                      (transaction.booking.title || transaction.booking.courseName) : '-';
                    
                    return (
                      <div 
                        key={transaction.id}
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ 
                          width: '80px',
                          fontWeight: '600',
                          flexShrink: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {getTransactionLabel(transaction)}
                        </div>
                        <div style={{ 
                          flex: '1',
                          minWidth: '0',
                          opacity: 0.7,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {bookingName}
                        </div>
                        <div style={{ 
                          width: '70px',
                          flexShrink: 0,
                          opacity: 0.7,
                          textAlign: 'center'
                        }}>
                          {new Date(transaction.date).toLocaleDateString('ko-KR', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div style={{
                          width: '80px',
                          fontSize: '15px',
                          fontWeight: '700',
                          color: getTransactionColor(transaction),
                          textAlign: 'right',
                          flexShrink: 0
                        }}>
                          {getTransactionSign(transaction)}
                          ${transaction.amount.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '16px', background: '#f8f9fa' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--primary-green)' }}>
                ⓘ 납부 안내
              </div>
              <p style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.8, margin: 0 }}>
                참가비 납부는 관리자에게 문의해주세요. 
                납부 완료 후 관리자가 처리하면 자동으로 잔액에 반영됩니다.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                필터
              </h3>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <select
                  value={ledgerFilter.type}
                  onChange={(e) => setLedgerFilter({ ...ledgerFilter, type: e.target.value })}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="all">전체</option>
                  <option value="charge">참가비 발생</option>
                  <option value="payment">납부</option>
                  <option value="expense">클럽 지출</option>
                  <option value="donation">도네이션</option>
                </select>
                
                <select
                  value={ledgerFilter.memberId}
                  onChange={(e) => setLedgerFilter({ ...ledgerFilter, memberId: e.target.value })}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="all">전체 회원</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} {member.nickname && `(${member.nickname})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card">
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--primary-green)'
              }}>
                통합 장부
              </h3>

              {allTransactions.filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId).length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  opacity: 0.7
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
                  <p>조건에 맞는 거래가 없습니다</p>
                </div>
              ) : (
                <div>
                  {allTransactions
                    .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                    .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                    .map(transaction => {
                      const typeLabel = 
                        transaction.type === 'charge' ? '참가비 발생' :
                        transaction.type === 'payment' ? '납부' :
                        transaction.type === 'expense' ? '클럽 지출' : '도네이션';
                      
                      const typeColor =
                        transaction.type === 'charge' ? 'var(--alert-red)' :
                        transaction.type === 'payment' ? 'var(--success-green)' :
                        transaction.type === 'expense' ? 'var(--alert-red)' : 'var(--success-green)';

                      const sign = 
                        transaction.type === 'payment' || transaction.type === 'donation' ? '+' : '-';

                      const bgColor = 
                        transaction.type === 'payment' || transaction.type === 'donation' 
                          ? 'rgba(40, 167, 69, 0.05)' 
                          : 'rgba(220, 53, 69, 0.05)';

                      const member = members.find(m => m.id === transaction.memberId);

                      return (
                        <div 
                          key={transaction.id}
                          style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: bgColor
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '6px'
                            }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: typeColor,
                                color: 'white'
                              }}>
                                {typeLabel}
                              </span>
                              {member && (
                                <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                  {member.name} {member.nickname && `(${member.nickname})`}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.7 }}>
                              {new Date(transaction.createdAt).toLocaleDateString('ko-KR')}
                            </div>
                            {transaction.description && (
                              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                                {transaction.description}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '18px',
                              fontWeight: '700',
                              color: typeColor
                            }}>
                              {sign}${transaction.amount.toLocaleString()}
                            </div>
                            {transaction.balanceAfter !== undefined && (
                              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                                잔액: ${transaction.balanceAfter.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Fees;
