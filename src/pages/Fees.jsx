import React from 'react';
import { useApp } from '../contexts/AppContext';

function Fees() {
  const { user, fees } = useApp();

  const userFees = fees.filter(f => 
    f.appliesTo === 'all' || (Array.isArray(f.appliesTo) && f.appliesTo.includes(user.id))
  );

  const balance = user.balance || 0;

  const totalPaid = userFees
    .filter(f => f.type === 'income' && f.status === 'paid')
    .reduce((sum, f) => sum + f.amount, 0);

  return (
    <div>
      <div className="header">
        <h1>회비 관리</h1>
      </div>

      <div className="page-content">
        <div className="card" style={{
          background: balance < 0 
            ? 'linear-gradient(135deg, #e53e3e 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: 'white',
          padding: '24px'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>
            현재 잔액
          </div>
          <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px' }}>
            {balance.toLocaleString()}원
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
                {totalPaid.toLocaleString()}원
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ opacity: 0.9 }}>미수금</div>
              <div style={{ fontWeight: '600', marginTop: '4px' }}>
                {Math.abs(balance).toLocaleString()}원
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
            납부 내역
          </h3>

          {userFees.length === 0 ? (
            <div style={{ 
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
              <p>아직 회비 내역이 없습니다</p>
            </div>
          ) : (
            <div>
              {userFees.map(transaction => (
                <div 
                  key={transaction.id}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-green)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {transaction.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {new Date(transaction.date).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: transaction.type === 'income' ? '#e53e3e' : '#22c55e',
                      marginBottom: '4px'
                    }}>
                      {transaction.type === 'income' ? '-' : '+'}
                      {transaction.amount.toLocaleString()}원
                    </div>
                    <div style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: transaction.status === 'paid' ? '#22c55e' : '#e53e3e',
                      color: 'white',
                      display: 'inline-block'
                    }}>
                      {transaction.status === 'paid' ? '납부완료' : '미납'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ background: 'var(--bg-green)', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            💡 납부 안내
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#666' }}>
            회비 납부는 관리자에게 문의해주세요. 
            납부 완료 후 관리자가 처리하면 자동으로 잔액에 반영됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Fees;
