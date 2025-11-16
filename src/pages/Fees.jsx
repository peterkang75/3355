import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

function Fees() {
  const navigate = useNavigate();
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
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-dark)',
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
          <div style={{ fontSize: '14px', fontWeight: '500' }}>
            환영합니다 {user.nickname || user.name}님
          </div>
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
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{
          background: balance < 0 
            ? 'linear-gradient(135deg, var(--alert-red) 0%, var(--alert-red) 100%)'
            : 'linear-gradient(135deg, var(--success-green) 0%, var(--success-green) 100%)',
          border: '2px solid var(--border-color)',
          color: 'var(--text-light)',
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
                ${totalPaid.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ opacity: 0.9 }}>미수금</div>
              <div style={{ fontWeight: '600', marginTop: '4px' }}>
                ${Math.abs(balance).toLocaleString()}
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
              opacity: 0.7
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>$</div>
              <p>아직 회비 내역이 없습니다</p>
            </div>
          ) : (
            <div>
              {userFees.map(transaction => (
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
                      {transaction.title}
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.7 }}>
                      {new Date(transaction.date).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: transaction.type === 'income' ? 'var(--alert-red)' : 'var(--success-green)',
                      marginBottom: '4px'
                    }}>
                      {transaction.type === 'income' ? '-' : '+'}
                      ${transaction.amount.toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: transaction.status === 'paid' ? 'var(--success-green)' : 'var(--alert-red)',
                      color: 'var(--text-light)',
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

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>
            ⓘ 납부 안내
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.7 }}>
            회비 납부는 관리자에게 문의해주세요. 
            납부 완료 후 관리자가 처리하면 자동으로 잔액에 반영됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Fees;
