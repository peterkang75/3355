import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CrownIcon from '../components/CrownIcon';
import api from '../services/api';

function Fees() {
  const navigate = useNavigate();
  const { user, members } = useApp();
  const [activeTab, setActiveTab] = useState('personal');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState({ type: 'all', memberId: 'all' });
  const [loading, setLoading] = useState(true);
  
  const [clubTab, setClubTab] = useState('income');
  const [clubBalance, setClubBalance] = useState(0);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState({
    categoryId: '',
    bookingId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (activeTab === 'personal') {
      loadPersonalData();
    } else {
      loadLedgerData();
    }
  }, [user.id, activeTab]);

  const loadPersonalData = async () => {
    try {
      setLoading(true);
      const [balanceData, transactionsData] = await Promise.all([
        api.fetchMemberBalance(user.id),
        api.fetchMemberTransactions(user.id)
      ]);
      setBalance(balanceData.balance);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load fee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      const [transactionsData, clubBalanceData, incomeCats, expenseCats, bookingsData] = await Promise.all([
        api.fetchTransactions(),
        api.fetchClubBalance(),
        api.fetchIncomeCategories(),
        api.fetchExpenseCategories(),
        api.fetchBookings()
      ]);
      setAllTransactions(transactionsData || []);
      setClubBalance(clubBalanceData.balance || 0);
      setIncomeCategories(incomeCats || []);
      setExpenseCategories(expenseCats || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('장부 데이터 로드 실패:', error);
      setAllTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCharges = transactions
    .filter(t => t.type === 'charge')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = transactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const getTransactionLabel = (transaction) => {
    if (transaction.type === 'charge') {
      return transaction.bookingId ? '라운딩 참가비' : '참가비 발생';
    }
    if (transaction.type === 'payment') {
      return '납부';
    }
    return '';
  };

  const getTransactionColor = (transaction) => {
    if (transaction.type === 'charge') return 'var(--alert-red)';
    if (transaction.type === 'payment') return 'var(--success-green)';
    return 'var(--text-primary)';
  };

  const getTransactionSign = (transaction) => {
    if (transaction.type === 'charge') return '-';
    if (transaction.type === 'payment') return '+';
    return '';
  };

  const handleOpenIncomeModal = (booking) => {
    if (!booking) return;
    
    setSelectedIncome({
      categoryId: incomeCategories[0]?.id || '',
      bookingId: booking.id,
      amount: booking.totalFee || '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowIncomeModal(true);
  };

  const handleCloseIncomeModal = () => {
    setShowIncomeModal(false);
    setSelectedIncome({
      categoryId: '',
      bookingId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleProcessIncome = async () => {
    try {
      if (!selectedIncome.categoryId || !selectedIncome.amount) {
        alert('입금항목과 금액을 입력해주세요.');
        return;
      }

      const category = incomeCategories.find(c => c.id === selectedIncome.categoryId);
      const booking = bookings.find(b => b.id === selectedIncome.bookingId);
      
      const transactionData = {
        type: 'club_income',
        amount: parseFloat(selectedIncome.amount),
        description: `${category?.name}${booking ? ` - ${booking.courseName}` : ''}`,
        date: selectedIncome.date,
        categoryId: selectedIncome.categoryId,
        bookingId: selectedIncome.bookingId || null
      };

      await api.createTransaction(transactionData);
      alert('클럽 입금이 처리되었습니다.');
      handleCloseIncomeModal();
      await loadLedgerData();
    } catch (error) {
      console.error('입금 처리 실패:', error);
      alert('입금 처리에 실패했습니다.');
    }
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
          모임 참가비 내역
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
                  <div style={{ opacity: 0.9 }}>총 납부</div>
                  <div style={{ fontWeight: '600', marginTop: '4px' }}>
                    ${totalPayments.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ opacity: 0.9 }}>총 참가비</div>
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

              {transactions.length === 0 ? (
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
                  {transactions.map(transaction => (
                    <div 
                      key={transaction.id}
                      style={{
                        padding: '16px',
                        borderBottom: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {getTransactionLabel(transaction)}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.7 }}>
                          {new Date(transaction.date).toLocaleDateString('ko-KR')}
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
                          color: getTransactionColor(transaction)
                        }}>
                          {getTransactionSign(transaction)}
                          ${transaction.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
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
            <div className="card" style={{
              background: clubBalance < 0 
                ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
                : 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
              color: 'white',
              padding: '24px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>
                클럽 잔액
              </div>
              <div style={{ fontSize: '36px', fontWeight: '700' }}>
                ${clubBalance.toLocaleString()}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '8px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => setClubTab('income')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: clubTab === 'income' ? 'var(--primary-green)' : 'transparent',
                  color: clubTab === 'income' ? 'white' : 'var(--text-dark)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                클럽 입금
              </button>
              <button
                onClick={() => setClubTab('expense')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: clubTab === 'expense' ? 'var(--primary-green)' : 'transparent',
                  color: clubTab === 'expense' ? 'white' : 'var(--text-dark)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                클럽 출금
              </button>
            </div>

            {clubTab === 'income' && (
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  클럽 입금 처리
                </h3>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      입금항목
                    </label>
                    <select
                      value={selectedIncome.categoryId}
                      onChange={(e) => setSelectedIncome({...selectedIncome, categoryId: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white'
                      }}
                    >
                      <option value="">선택하세요</option>
                      {incomeCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      라운딩 선택
                    </label>
                    <div style={{ display: 'grid', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                      {bookings.map(booking => (
                        <div
                          key={booking.id}
                          onClick={() => handleOpenIncomeModal(booking)}
                          style={{
                            padding: '12px',
                            background: 'var(--bg-green)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '2px solid transparent',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-green)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                                {booking.courseName}
                              </div>
                              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                {new Date(booking.date).toLocaleDateString('ko-KR')}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-green)' }}>
                                ${booking.totalFee?.toLocaleString() || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {clubTab === 'expense' && (
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  클럽 출금 처리
                </h3>
                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.7 }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
                  <p>출금 처리 기능은 준비 중입니다</p>
                </div>
              </div>
            )}

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

      {showIncomeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={handleCloseIncomeModal}>
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                입금 처리
              </h3>
              <button
                onClick={handleCloseIncomeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: 'var(--text-dark)'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  입금항목
                </label>
                <select
                  value={selectedIncome.categoryId}
                  onChange={(e) => setSelectedIncome({...selectedIncome, categoryId: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="">선택하세요</option>
                  {incomeCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  라운딩
                </label>
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-green)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  {bookings.find(b => b.id === selectedIncome.bookingId) ? (
                    <>
                      <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                        {bookings.find(b => b.id === selectedIncome.bookingId).courseName}
                      </div>
                      <div style={{ fontSize: '13px', opacity: 0.7 }}>
                        {new Date(bookings.find(b => b.id === selectedIncome.bookingId).date).toLocaleDateString('ko-KR')}
                      </div>
                    </>
                  ) : (
                    <div style={{ opacity: 0.5 }}>라운딩 선택 안됨</div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  금액
                </label>
                <input
                  type="number"
                  value={selectedIncome.amount}
                  onChange={(e) => setSelectedIncome({...selectedIncome, amount: e.target.value})}
                  placeholder="금액 입력"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                {bookings.find(b => b.id === selectedIncome.bookingId)?.totalFee && (
                  <button
                    onClick={() => setSelectedIncome({
                      ...selectedIncome,
                      amount: bookings.find(b => b.id === selectedIncome.bookingId).totalFee
                    })}
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: 'var(--bg-green)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    전체 금액: ${bookings.find(b => b.id === selectedIncome.bookingId).totalFee.toLocaleString()}
                  </button>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  날짜
                </label>
                <input
                  type="date"
                  value={selectedIncome.date}
                  onChange={(e) => setSelectedIncome({...selectedIncome, date: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCloseIncomeModal}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleProcessIncome}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                입금 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fees;
