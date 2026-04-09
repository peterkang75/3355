import React, { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import apiService from '../services/api';
import { calculateHandicap } from '../utils/handicap';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const FinanceContext = createContext();

export function FinanceProvider({ children }) {
  const [fees, setFees] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [scores, setScores] = useState([]);

  const { user, updateUser } = useAuth();
  const socket = useSocket();
  const debounceRef = useRef(null);

  // 초기 로드: fees (백그라운드)
  useEffect(() => {
    apiService.fetchFees().catch(() => []).then(data => {
      if (data?.length > 0) setFees(data);
    });
  }, []);

  // user 변경 시 거래내역 + 스코어 로드
  useEffect(() => {
    if (!user?.id) {
      setUserTransactions([]);
      setScores([]);
      return;
    }

    const loadUserData = async () => {
      try {
        const [transactionsData, scoresData] = await Promise.all([
          apiService.fetchMemberTransactions(user.id).catch(() => []),
          apiService.fetchScores(user.id).catch(() => []),
        ]);

        setUserTransactions(transactionsData || []);

        if (scoresData?.length > 0) {
          const parsed = scoresData.map(s => ({
            ...s,
            holes: s.holes ? JSON.parse(s.holes) : [],
          }));
          setScores(parsed);

          // 핸디캡 계산 후 user 업데이트
          const handicapData = calculateHandicap(user, parsed);
          updateUser({
            calculatedHandicap: handicapData.value,
            handicapType: handicapData.type,
            handicapExplanation: handicapData.explanation,
          });
        } else {
          setScores([]);
        }
      } catch (e) {}
    };

    loadUserData();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 소켓: transactions:updated
  useEffect(() => {
    if (!socket) return;

    const handleTransactionsUpdated = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!user?.id) return;
        try {
          const data = await apiService.fetchMemberTransactions(user.id);
          if (data) setUserTransactions(data);
        } catch (e) {}
      }, 300);
    };

    socket.on('transactions:updated', handleTransactionsUpdated);
    return () => socket.off('transactions:updated', handleTransactionsUpdated);
  }, [socket, user?.id]);

  const addFee = useCallback(async (feeData) => {
    const fee = await apiService.createFee(feeData);
    setFees(prev => [fee, ...prev]);
    return fee;
  }, []);

  const payFee = useCallback((feeId) => {
    setFees(prev => {
      const fee = prev.find(f => f.id === feeId);
      if (fee?.type === 'income') {
        updateUser({ balance: (user?.balance || 0) + fee.amount });
      }
      return prev;
    });
  }, [user?.balance, updateUser]);

  const saveScore = useCallback(async (scoreData) => {
    const score = await apiService.createScore({
      ...scoreData,
      holes: JSON.stringify(scoreData.holes),
    });

    const parsed = { ...score, holes: JSON.parse(score.holes) };
    setScores(prev => {
      const next = [...prev, parsed];
      // 핸디캡 재계산
      if (user) {
        const handicapData = calculateHandicap(user, next);
        updateUser({
          calculatedHandicap: handicapData.value,
          handicapType: handicapData.type,
          handicapExplanation: handicapData.explanation,
        });
      }
      return next;
    });

    return score;
  }, [user, updateUser]);

  const refreshFees = useCallback(async () => {
    try {
      const data = await apiService.fetchFees();
      if (data) setFees(data);
    } catch (e) {}
  }, []);

  const refreshUserTransactions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await apiService.fetchMemberTransactions(user.id);
      if (data) setUserTransactions(data);
    } catch (e) {}
  }, [user?.id]);

  const value = useMemo(() => ({
    fees,
    userTransactions,
    scores,
    addFee,
    payFee,
    saveScore,
    refreshFees,
    refreshUserTransactions,
  }), [fees, userTransactions, scores, addFee, payFee, saveScore, refreshFees, refreshUserTransactions]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
