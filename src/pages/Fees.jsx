import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import CrownIcon from '../components/CrownIcon';
import api from '../services/api';

function Fees() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
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

  const totalCharges = transactions
    .filter(t => t.type === 'charge')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = transactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const getTransactionLabel = (transaction) => {
    if (transaction.type === 'charge') {
      return transaction.bookingId ? '라운딩 회비' : '회비 발생';
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

      <div className="page-content">
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
            회비 납부는 관리자에게 문의해주세요. 
            납부 완료 후 관리자가 처리하면 자동으로 잔액에 반영됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Fees;
