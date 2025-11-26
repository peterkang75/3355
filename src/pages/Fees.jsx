import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CrownIcon from '../components/CrownIcon';
import apiService from '../services/api';

function Fees() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, members, userTransactions } = useApp();
  const [activeTab, setActiveTab] = useState('personal');
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReceiptModal, setShowReceiptModal] = useState(null);
  const [clubBalance, setClubBalance] = useState(0);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const MAX_PAGES = 10;

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
      const [transactionsData, balanceData, outstandingData] = await Promise.all([
        apiService.fetchTransactions(),
        apiService.fetchClubBalance(),
        apiService.fetchOutstandingBalances()
      ]);
      setAllTransactions(transactionsData || []);
      setClubBalance(balanceData?.balance || 0);
      setOutstandingCount(outstandingData?.length || 0);
      setCurrentPage(1);
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
  
  const totalExpenses = userTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalPayments + totalCredits - totalCharges - totalExpenses;

  const getTransactionLabel = (transaction) => {
    if (transaction.type === 'donation') {
      return '도네이션';
    }
    if (transaction.type === 'credit') {
      // description을 그대로 표시 (예: "크레딧처리")
      return transaction.description || '크레딧처리';
    }
    if (transaction.type === 'expense') {
      // description에서 "환불" 추출
      if (transaction.description) {
        const parts = transaction.description.split(' - ');
        if (parts[0].includes('환불')) {
          return '환불';
        }
      }
      return '환불';
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
    if (transaction.type === 'expense') return 'var(--alert-red)';
    return 'var(--text-primary)';
  };

  const getTransactionSign = (transaction) => {
    if (transaction.type === 'charge') return '-';
    if (transaction.type === 'payment') return '+';
    if (transaction.type === 'donation') return '+';
    if (transaction.type === 'credit') return '+';
    if (transaction.type === 'expense') return '-';
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
            background: activeTab === 'personal' ? '#193C40' : 'transparent',
            color: activeTab === 'personal' ? 'white' : 'var(--text-dark)',
            border: 'none',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'personal' ? '3px solid #122a2d' : '3px solid transparent',
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
            background: activeTab === 'club' ? '#223B3F' : 'transparent',
            color: activeTab === 'club' ? 'white' : 'var(--text-dark)',
            border: 'none',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            borderBottom: activeTab === 'club' ? '3px solid #1a2d30' : '3px solid transparent',
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
              background: balance >= 0 ? '#2E5902' : '#D96941',
              color: 'white',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.9 }}>
                현재 잔액
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '10px' }}>
                ${balance.toLocaleString()}
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.3)',
                fontSize: '12px'
              }}>
                <div>
                  <div style={{ opacity: 0.9 }}>총 납부(도네이션 포함)</div>
                  <div style={{ fontWeight: '600', marginTop: '2px' }}>
                    ${totalPayments.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ opacity: 0.9 }}>총 회비</div>
                  <div style={{ fontWeight: '600', marginTop: '2px' }}>
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
            <div style={{
              background: 'linear-gradient(135deg, #223B3F, #2d4f54)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>클럽 잔액</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: 'white' }}>
                  ${clubBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>미수금 회원</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: 'white' }}>
                  {outstandingCount}명
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
                최근 거래내역
              </h3>

              {(() => {
                const filteredTransactions = allTransactions.filter(t => t.type !== 'charge');
                const totalPages = Math.min(Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE), MAX_PAGES);
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                if (filteredTransactions.length === 0) {
                  return (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      opacity: 0.7
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
                      <p>거래내역이 없습니다</p>
                    </div>
                  );
                }

                return (
                  <>
                    <div>
                      {paginatedTransactions.map(transaction => {
                        const isOtherIncome = transaction.description?.startsWith('기타 - ');
                        const otherItemName = isOtherIncome ? transaction.description.replace('기타 - ', '') : null;
                        
                        const typeLabel = 
                          isOtherIncome ? otherItemName :
                          transaction.type === 'payment' ? '납부' :
                          transaction.type === 'expense' ? '클럽 지출' : '도네이션';
                        
                        const typeColor =
                          transaction.type === 'payment' ? 'var(--success-green)' :
                          transaction.type === 'expense' ? 'var(--alert-red)' : 'var(--success-green)';

                        const sign = 
                          transaction.type === 'payment' || transaction.type === 'donation' ? '+' : '-';

                        const bgColor = 
                          transaction.type === 'payment' || transaction.type === 'donation' 
                            ? 'rgba(40, 167, 69, 0.05)' 
                            : 'rgba(220, 53, 69, 0.05)';

                        const member = members.find(m => m.id === transaction.memberId);

                        const roundingName = transaction.booking 
                          ? `${transaction.booking.courseName} (${new Date(transaction.booking.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })})`
                          : null;

                        return (
                          <div 
                            key={transaction.id}
                            onClick={() => transaction.receiptImage && setShowReceiptModal(transaction.receiptImage)}
                            style={{
                              padding: '16px',
                              borderBottom: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: bgColor,
                              cursor: transaction.receiptImage ? 'pointer' : 'default'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '6px',
                                flexWrap: 'wrap'
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
                                {transaction.receiptImage && (
                                  <span style={{ fontSize: '11px', opacity: 0.7 }}>📎</span>
                                )}
                              </div>
                              {roundingName && (
                                <div style={{ 
                                  fontSize: '13px', 
                                  fontWeight: '600',
                                  color: 'var(--primary-green)',
                                  marginBottom: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <span>⛳</span> {roundingName}
                                </div>
                              )}
                              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                {new Date(transaction.createdAt).toLocaleDateString('ko-KR')}
                              </div>
                              {transaction.description && !isOtherIncome && (
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
                                {sign}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '16px',
                        flexWrap: 'wrap'
                      }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{
                              width: '36px',
                              height: '36px',
                              border: 'none',
                              borderRadius: '8px',
                              background: currentPage === page ? 'var(--primary-green)' : '#e9ecef',
                              color: currentPage === page ? 'white' : 'var(--text-dark)',
                              fontWeight: '600',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {showReceiptModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowReceiptModal(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '90%',
              maxHeight: '90%',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowReceiptModal(null)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'var(--primary-green)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>영수증</h3>
            <img 
              src={showReceiptModal} 
              alt="영수증" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '70vh',
                borderRadius: '8px'
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Fees;
