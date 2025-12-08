import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CrownIcon from '../components/CrownIcon';
import apiService from '../services/api';

function Fees() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, members, userTransactions, bookings } = useApp();
  const [activeTab, setActiveTab] = useState('personal');
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showReceiptModal, setShowReceiptModal] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [clubBalance, setClubBalance] = useState(0);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [paymentGuideText, setPaymentGuideText] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    date: '',
    description: '',
    category: '',
    memo: '',
    bookingId: '',
    receiptImage: '',
    receiptImages: []
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(null);
  const [creditActionAmount, setCreditActionAmount] = useState('');
  const [creditActionMemo, setCreditActionMemo] = useState('');
  const [creditActionLoading, setCreditActionLoading] = useState(false);
  const [selectedChargeId, setSelectedChargeId] = useState(null);
  const ITEMS_PER_PAGE = 10;
  const MAX_PAGES = 10;
  
  const canManageFees = user?.isAdmin || user?.canManageFees;

  useEffect(() => {
    if (location.state?.reset) {
      setActiveTab('personal');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    loadPaymentGuide();
  }, []);

  useEffect(() => {
    if (activeTab === 'personal') {
      setLoading(false);
    } else {
      loadLedgerData();
    }
  }, [user.id, activeTab]);

  const loadPaymentGuide = async () => {
    try {
      const settings = await apiService.fetchSettings();
      const guideSetting = settings.find(s => s.feature === 'paymentGuideText');
      if (guideSetting && guideSetting.value) {
        setPaymentGuideText(guideSetting.value);
      }
    } catch (error) {
      console.error('납부안내 로드 실패:', error);
    }
  };

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

  const handleOpenEditModal = (transaction) => {
    setEditingTransaction(transaction);
    const images = transaction.receiptImages || [];
    setEditFormData({
      amount: transaction.amount.toString(),
      date: transaction.date || new Date(transaction.createdAt).toISOString().split('T')[0],
      description: transaction.description || '',
      category: transaction.category || '',
      memo: transaction.memo || '',
      bookingId: transaction.bookingId || '',
      receiptImage: transaction.receiptImage || '',
      receiptImages: Array.isArray(images) ? images : []
    });
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
    setEditFormData({
      amount: '',
      date: '',
      description: '',
      category: '',
      memo: '',
      bookingId: '',
      receiptImage: '',
      receiptImages: []
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (editingTransaction?.type === 'expense') {
          setEditFormData(prev => ({ 
            ...prev, 
            receiptImages: [...prev.receiptImages, reader.result] 
          }));
        } else {
          setEditFormData(prev => ({ ...prev, receiptImage: reader.result }));
        }
        setImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      setImageUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    if (editingTransaction?.type === 'expense' && typeof index === 'number') {
      setEditFormData(prev => ({
        ...prev,
        receiptImages: prev.receiptImages.filter((_, i) => i !== index)
      }));
    } else {
      setEditFormData(prev => ({ ...prev, receiptImage: '' }));
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;

    if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = {
        amount: parseFloat(editFormData.amount),
        date: editFormData.date,
        description: editFormData.description,
        bookingId: editFormData.bookingId || null
      };

      if (editingTransaction.type === 'expense') {
        updateData.category = editFormData.category || null;
        updateData.memo = editFormData.memo || null;
        updateData.receiptImages = editFormData.receiptImages;
      } else {
        updateData.receiptImage = editFormData.receiptImage || null;
      }

      await apiService.updateTransaction(editingTransaction.id, updateData);

      await loadLedgerData();
      handleCloseEditModal();
      alert('거래내역이 수정되었습니다.');
    } catch (error) {
      console.error('거래 수정 실패:', error);
      alert('거래 수정에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const totalCharges = userTransactions
    .filter(t => t.type === 'charge')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = userTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalCredits = userTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = userTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalPayments + totalCredits - totalCharges - totalExpenses;

  const unpaidCharges = userTransactions.filter(t => {
    if (t.type !== 'charge') return false;
    const paidForBooking = userTransactions
      .filter(pt => pt.type === 'payment' && pt.bookingId === t.bookingId)
      .reduce((sum, pt) => sum + pt.amount, 0);
    return paidForBooking < t.amount;
  });

  const totalUnpaid = unpaidCharges.reduce((sum, t) => sum + t.amount, 0) - 
    userTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
  
  const actualUnpaid = Math.max(0, -balance);

  const creditBalance = balance > 0 ? balance : 0;

  const handleCreditToDonation = async () => {
    if (creditActionLoading) return;
    const amount = parseFloat(creditActionAmount);
    if (!amount || amount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }
    if (amount > creditBalance) {
      alert('크레딧 잔액보다 큰 금액은 입력할 수 없습니다.');
      return;
    }

    setCreditActionLoading(true);
    try {
      await apiService.creditToDonation(user.memberId, amount, creditActionMemo);
      alert(`$${amount.toLocaleString()}가 클럽에 도네이션되었습니다.`);
      setShowCreditModal(null);
      setCreditActionAmount('');
      setCreditActionMemo('');
      window.location.reload();
    } catch (error) {
      console.error('도네이션 실패:', error);
      alert(error.message || '도네이션 처리에 실패했습니다.');
    } finally {
      setCreditActionLoading(false);
    }
  };

  const handleCreditToPayment = async () => {
    if (creditActionLoading) return;
    const amount = parseFloat(creditActionAmount);
    if (!amount || amount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }
    if (amount > creditBalance) {
      alert('크레딧 잔액보다 큰 금액은 입력할 수 없습니다.');
      return;
    }
    if (amount > actualUnpaid) {
      alert('미수금보다 큰 금액은 입력할 수 없습니다.');
      return;
    }

    setCreditActionLoading(true);
    try {
      await apiService.creditToPayment(user.memberId, amount, selectedChargeId, creditActionMemo);
      alert(`$${amount.toLocaleString()}가 미수금 납부에 사용되었습니다.`);
      setShowCreditModal(null);
      setCreditActionAmount('');
      setCreditActionMemo('');
      setSelectedChargeId(null);
      window.location.reload();
    } catch (error) {
      console.error('미수금 납부 실패:', error);
      alert(error.message || '미수금 납부 처리에 실패했습니다.');
    } finally {
      setCreditActionLoading(false);
    }
  };

  const getTransactionLabel = (transaction) => {
    if (transaction.type === 'donation') {
      return '도네이션';
    }
    if (transaction.type === 'credit') {
      return transaction.description || '크레딧처리';
    }
    if (transaction.type === 'expense') {
      if (transaction.category) {
        return transaction.category;
      }
      if (transaction.description) {
        const parts = transaction.description.split(' - ');
        if (parts[0].includes('환불')) {
          return '환불';
        }
        return parts[0];
      }
      return '클럽 지출';
    }
    if (transaction.type === 'charge') {
      return '회비 청구';
    }
    if (transaction.type === 'payment') {
      if (transaction.description && transaction.description.includes('환불')) {
        return '회비 환불';
      }
      const paymentDesc = transaction.description || '회비 납부';
      if (paymentDesc.includes(' - ')) {
        return paymentDesc.split(' - ')[0];
      } else if (paymentDesc.includes(' (')) {
        return paymentDesc.split(' (')[0];
      }
      return paymentDesc;
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

            {(creditBalance > 0 || actualUnpaid > 0) && (
              <div className="card" style={{ 
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                border: '1px solid #dee2e6'
              }}>
                <h3 style={{ 
                  fontSize: '15px', 
                  fontWeight: '700',
                  marginBottom: '12px',
                  color: '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '16px' }}>💳</span> 크레딧 활용
                </h3>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    flex: 1,
                    background: creditBalance > 0 ? '#d4edda' : '#f8f9fa',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>사용 가능 크레딧</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: creditBalance > 0 ? '#28a745' : '#999' }}>
                      ${creditBalance.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    flex: 1,
                    background: actualUnpaid > 0 ? '#f8d7da' : '#f8f9fa',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>미납 금액</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: actualUnpaid > 0 ? '#dc3545' : '#999' }}>
                      ${actualUnpaid.toLocaleString()}
                    </div>
                  </div>
                </div>

                {creditBalance > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setShowCreditModal('donation');
                        setCreditActionAmount(creditBalance.toString());
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: 'linear-gradient(135deg, #17a2b8, #138496)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>🎁</span> 클럽에 기부
                    </button>
                    {actualUnpaid > 0 && (
                      <button
                        onClick={() => {
                          setShowCreditModal('payment');
                          const payAmount = Math.min(creditBalance, actualUnpaid);
                          setCreditActionAmount(payAmount.toString());
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          background: 'linear-gradient(135deg, #28a745, #218838)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>💰</span> 미납금 납부
                      </button>
                    )}
                  </div>
                )}

                {creditBalance === 0 && actualUnpaid > 0 && (
                  <div style={{
                    padding: '10px',
                    background: '#fff3cd',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#856404',
                    textAlign: 'center'
                  }}>
                    미납금이 있습니다. 납부 안내를 확인해주세요.
                  </div>
                )}
              </div>
            )}

            <div className="card">
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--primary-green)'
              }}>
                거래 내역
              </h3>

              {(() => {
                const allUserTransactions = userTransactions;
                const chargeTransactions = userTransactions.filter(t => t.type === 'charge' && t.booking);
                
                if (allUserTransactions.length === 0) {
                  return (
                    <div style={{ 
                      padding: '40px',
                      textAlign: 'center',
                      opacity: 0.7
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>$</div>
                      <p>아직 거래 내역이 없습니다</p>
                    </div>
                  );
                }
                
                return (
                  <div>
                    {allUserTransactions.map(transaction => {
                      let bookingName = '-';
                      if (transaction.booking) {
                        bookingName = transaction.booking.title || transaction.booking.courseName || '-';
                      } else if (transaction.type === 'payment' && chargeTransactions.length > 0) {
                        const recentCharge = chargeTransactions[0];
                        bookingName = recentCharge.booking.title || recentCharge.booking.courseName || '-';
                      }
                      
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
                            width: '90px',
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
                            width: '55px',
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
                            width: '75px',
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
                );
              })()}
            </div>

            {paymentGuideText && (
              <div className="card" style={{ padding: '16px', background: '#f8f9fa' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--primary-green)' }}>
                  ⓘ 납부 안내
                </div>
                <p style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {paymentGuideText}
                </p>
              </div>
            )}
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
                        
                        const isGuestTransaction = transaction.description?.includes('(외부게스트:');
                        const guestName = isGuestTransaction 
                          ? transaction.description.match(/\(외부게스트:\s*([^)]+)\)/)?.[1] 
                          : null;
                        
                        let typeLabel = '';
                        if (isOtherIncome) {
                          typeLabel = otherItemName;
                        } else if (transaction.type === 'payment') {
                          const paymentDesc = transaction.description || '회비 납부';
                          if (paymentDesc.includes(' - ')) {
                            typeLabel = paymentDesc.split(' - ')[0];
                          } else if (paymentDesc.includes(' (')) {
                            typeLabel = paymentDesc.split(' (')[0];
                          } else {
                            typeLabel = paymentDesc;
                          }
                        } else if (transaction.type === 'expense') {
                          typeLabel = transaction.category || transaction.description || '클럽 지출';
                        } else {
                          typeLabel = '도네이션';
                        }
                        
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
                            onClick={() => {
                              if (transaction.receiptImages && transaction.receiptImages.length > 0) {
                                setGalleryImages(transaction.receiptImages);
                                setGalleryIndex(0);
                              } else if (transaction.receiptImage) {
                                setShowReceiptModal(transaction.receiptImage);
                              }
                            }}
                            style={{
                              padding: '16px',
                              borderBottom: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: bgColor,
                              cursor: (transaction.receiptImage || (transaction.receiptImages && transaction.receiptImages.length > 0)) ? 'pointer' : 'default'
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
                                {isGuestTransaction && guestName ? (
                                  <span style={{ 
                                    fontSize: '13px', 
                                    fontWeight: '600',
                                    color: '#4A90A4',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    {guestName}
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      background: '#87CEEB',
                                      color: '#1a3a4a',
                                      padding: '2px 6px',
                                      borderRadius: '4px'
                                    }}>
                                      외부게스트
                                    </span>
                                  </span>
                                ) : member && (
                                  <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                    {member.name} {member.nickname && `(${member.nickname})`}
                                  </span>
                                )}
                                {(transaction.receiptImage || (transaction.receiptImages && transaction.receiptImages.length > 0)) && (
                                  <span style={{ fontSize: '11px', opacity: 0.7 }}>
                                    📎{transaction.receiptImages?.length > 1 ? ` ${transaction.receiptImages.length}` : ''}
                                  </span>
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
                              {transaction.description && !isOtherIncome && transaction.type !== 'payment' && (
                                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                                  {transaction.description}
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: typeColor
                              }}>
                                {sign}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              </div>
                              {canManageFees && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(transaction);
                                  }}
                                  style={{
                                    background: 'var(--primary-green)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                  수정
                                </button>
                              )}
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

      {galleryImages.length > 0 && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setGalleryImages([]);
            setGalleryIndex(0);
          }}
        >
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ color: 'white', fontSize: '14px' }}>
              {galleryIndex + 1} / {galleryImages.length}
            </span>
            <button
              onClick={() => {
                setGalleryImages([]);
                setGalleryIndex(0);
              }}
              style={{
                background: 'var(--primary-green)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
          
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              maxWidth: '100%',
              maxHeight: '80vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {galleryImages.length > 1 && (
              <button
                onClick={() => setGalleryIndex(prev => prev > 0 ? prev - 1 : galleryImages.length - 1)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  fontSize: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ‹
              </button>
            )}
            
            <img 
              src={galleryImages[galleryIndex]} 
              alt={`영수증 ${galleryIndex + 1}`}
              style={{ 
                maxWidth: 'calc(100vw - 160px)', 
                maxHeight: '75vh',
                borderRadius: '8px',
                objectFit: 'contain'
              }} 
            />
            
            {galleryImages.length > 1 && (
              <button
                onClick={() => setGalleryIndex(prev => prev < galleryImages.length - 1 ? prev + 1 : 0)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  fontSize: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ›
              </button>
            )}
          </div>
          
          {galleryImages.length > 1 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px'
            }}>
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex(index);
                  }}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: 'none',
                    background: index === galleryIndex ? 'var(--primary-green)' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {editingTransaction && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={handleCloseEditModal}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>거래내역 수정</h3>
              <button
                onClick={handleCloseEditModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  금액 ($)
                </label>
                <input
                  type="number"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="금액 입력"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  날짜
                </label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  라운딩 선택
                </label>
                <select
                  value={editFormData.bookingId}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, bookingId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    background: 'white'
                  }}
                >
                  <option value="">라운딩 선택 안함</option>
                  {bookings
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(booking => (
                      <option key={booking.id} value={booking.id}>
                        {booking.title || booking.courseName} ({new Date(booking.date).toLocaleDateString('ko-KR')})
                      </option>
                    ))
                  }
                </select>
              </div>

              {editingTransaction?.type === 'expense' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      지출항목 *
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['골프장 그린피', '점심값', '음료수', '상품', '회식비', '환불'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setEditFormData(prev => ({ 
                            ...prev, 
                            category: cat,
                            description: cat 
                          }))}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: editFormData.category === cat ? '600' : '500',
                            background: editFormData.category === cat ? '#E59879' : '#f0f0f0',
                            color: editFormData.category === cat ? 'white' : 'var(--text-dark)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      메모 (선택)
                    </label>
                    <textarea
                      value={editFormData.memo}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, memo: e.target.value }))}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                      placeholder="메모 입력 (선택)"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                    설명
                  </label>
                  <input
                    type="text"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="설명 입력 (선택)"
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  이미지 (영수증) {editingTransaction?.type === 'expense' && <span style={{ fontWeight: '400', color: '#666' }}>- 여러 장 가능</span>}
                </label>
                {editingTransaction?.type === 'expense' ? (
                  <div>
                    {editFormData.receiptImages.length > 0 && (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        {editFormData.receiptImages.map((img, index) => (
                          <div key={index} style={{ position: 'relative' }}>
                            <img 
                              src={img} 
                              alt={`영수증 ${index + 1}`}
                              onClick={() => setShowReceiptModal(img)}
                              style={{ 
                                width: '100%', 
                                height: '80px', 
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                              }} 
                            />
                            <button
                              onClick={() => handleRemoveImage(index)}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'var(--alert-red)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '22px',
                                height: '22px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#f9f9f9'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      {imageUploading ? (
                        <span style={{ color: '#666' }}>업로드 중...</span>
                      ) : (
                        <span style={{ color: '#666' }}>📷 이미지 추가</span>
                      )}
                    </label>
                  </div>
                ) : (
                  editFormData.receiptImage ? (
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={editFormData.receiptImage} 
                        alt="영수증" 
                        style={{ 
                          width: '100%', 
                          maxHeight: '150px', 
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }} 
                      />
                      <button
                        onClick={() => handleRemoveImage()}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'var(--alert-red)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          fontSize: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: '#f9f9f9'
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      {imageUploading ? (
                        <span style={{ color: '#666' }}>업로드 중...</span>
                      ) : (
                        <span style={{ color: '#666' }}>📷 이미지 업로드</span>
                      )}
                    </label>
                  )
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={handleCloseEditModal}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#e9ecef',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleUpdateTransaction}
                  disabled={isUpdating}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: isUpdating ? '#ccc' : 'var(--primary-green)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isUpdating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isUpdating ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '360px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              marginBottom: '20px',
              color: showCreditModal === 'donation' ? '#17a2b8' : '#28a745',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{showCreditModal === 'donation' ? '🎁' : '💰'}</span>
              {showCreditModal === 'donation' ? '클럽에 기부하기' : '미납금 납부하기'}
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{
                background: '#e3f2fd',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#1976d2', marginBottom: '4px' }}>
                  현재 크레딧 잔액
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1565c0' }}>
                  ${creditBalance.toLocaleString()}
                </div>
              </div>

              {showCreditModal === 'payment' && (
                <div style={{
                  background: '#ffebee',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '4px' }}>
                    미납 금액
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#b71c1c' }}>
                    ${actualUnpaid.toLocaleString()}
                  </div>
                </div>
              )}

              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                {showCreditModal === 'donation' ? '기부 금액' : '납부 금액'}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>$</span>
                <input
                  type="number"
                  value={creditActionAmount}
                  onChange={(e) => setCreditActionAmount(e.target.value)}
                  max={showCreditModal === 'payment' ? Math.min(creditBalance, actualUnpaid) : creditBalance}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 28px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}
                />
              </div>
              <div style={{
                display: 'flex',
                gap: '6px',
                marginTop: '8px'
              }}>
                {showCreditModal === 'donation' ? (
                  <>
                    <button
                      onClick={() => setCreditActionAmount(Math.floor(creditBalance * 0.5).toString())}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#f1f3f5',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      50%
                    </button>
                    <button
                      onClick={() => setCreditActionAmount(creditBalance.toString())}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#f1f3f5',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      전액
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setCreditActionAmount(Math.min(creditBalance, actualUnpaid).toString())}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#d4edda',
                        border: '1px solid #c3e6cb',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        color: '#155724'
                      }}
                    >
                      최대 납부 가능액
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                메모 (선택)
              </label>
              <input
                type="text"
                value={creditActionMemo}
                onChange={(e) => setCreditActionMemo(e.target.value)}
                placeholder={showCreditModal === 'donation' ? '기부 사유 입력' : '납부 메모 입력'}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowCreditModal(null);
                  setCreditActionAmount('');
                  setCreditActionMemo('');
                  setSelectedChargeId(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#e9ecef',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={showCreditModal === 'donation' ? handleCreditToDonation : handleCreditToPayment}
                disabled={creditActionLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: creditActionLoading ? '#ccc' : 
                    (showCreditModal === 'donation' ? 'linear-gradient(135deg, #17a2b8, #138496)' : 'linear-gradient(135deg, #28a745, #218838)'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: creditActionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {creditActionLoading ? '처리 중...' : (showCreditModal === 'donation' ? '기부하기' : '납부하기')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fees;
