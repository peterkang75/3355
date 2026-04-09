import React, { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import apiService from '../services/api';
import { useSocket } from './SocketContext';

const AuthContext = createContext();

const checkRequiredFields = (member) => {
  if (!member) return false;
  const requiredFields = ['name', 'nickname', 'birthYear'];
  return requiredFields.every(field => member[field] && String(member[field]).trim() !== '');
};

const ROLE_HIERARCHY = ['관리자', '방장', '운영진', '클럽운영진', '회원'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requiresProfileComplete, setRequiresProfileComplete] = useState(false);
  const [clubLogo, setClubLogo] = useState(null);
  const [featurePermissions, setFeaturePermissions] = useState({});
  const [featureSettings, setFeatureSettings] = useState({ pickWinnerEnabled: true });

  const socket = useSocket();
  const debounceRef = useRef(null);

  // 초기 앱 로드: 회원 목록 + 설정 (로그인 검증에 필요)
  useEffect(() => {
    const initApp = async () => {
      try {
        localStorage.removeItem('golfMembers');
        localStorage.removeItem('golfPosts');
        localStorage.removeItem('golfBookings');
        localStorage.removeItem('golfFees');
      } catch (e) {}

      const savedUser = localStorage.getItem('golfUser');
      let savedUserId = null;

      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          savedUserId = userData.id;
          setUser(userData);
        } catch (e) {
          localStorage.removeItem('golfUser');
        }
      }

      try {
        const [membersData, settingsData] = await Promise.all([
          apiService.fetchMembers().catch(() => []),
          apiService.fetchSettings().catch(() => []),
        ]);

        if (settingsData?.length > 0) {
          const logoSetting = settingsData.find(s => s.feature === 'clubLogo');
          if (logoSetting?.value) setClubLogo(logoSetting.value);

          const permissionsObj = {};
          settingsData.filter(s => s.minRole).forEach(s => {
            permissionsObj[s.feature] = s.minRole;
          });
          setFeaturePermissions(permissionsObj);

          const pickWinnerSetting = settingsData.find(s => s.feature === 'pickWinnerEnabled');
          if (pickWinnerSetting) {
            setFeatureSettings(prev => ({ ...prev, pickWinnerEnabled: pickWinnerSetting.enabled !== false }));
          }
        }

        if (membersData?.length > 0) {
          setMembers(membersData);

          if (savedUserId) {
            let currentUser = membersData.find(m => m.id === savedUserId);

            if (!currentUser && savedUser) {
              try {
                const savedUserData = JSON.parse(savedUser);
                if (savedUserData.phone) {
                  currentUser = membersData.find(m => m.phone === savedUserData.phone);
                  if (currentUser) console.log('회원 ID 동기화: 전화번호로 매칭됨', currentUser.id);
                }
              } catch (e) {}
            }

            if (currentUser) {
              setUser(currentUser);
              try { localStorage.setItem('golfUser', JSON.stringify(currentUser)); } catch (e) {}

              // 사진 포함 프로필 백그라운드 로드
              fetch(`/api/members/${currentUser.id}`)
                .then(r => r.ok ? r.json() : null)
                .then(fullUser => {
                  if (fullUser) {
                    setUser(prev => ({ ...prev, photo: fullUser.photo }));
                    try {
                      const stored = JSON.parse(localStorage.getItem('golfUser') || '{}');
                      localStorage.setItem('golfUser', JSON.stringify({ ...stored, photo: fullUser.photo }));
                    } catch (e) {}
                  }
                })
                .catch(() => {});
            }
          }
        }
      } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // 소켓: members:updated
  useEffect(() => {
    if (!socket) return;

    const handleMembersUpdated = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const membersData = await apiService.fetchMembers();
          if (membersData) {
            setMembers(membersData);
            const savedUser = localStorage.getItem('golfUser');
            if (savedUser) {
              try {
                const userData = JSON.parse(savedUser);
                const updatedUser = membersData.find(m => m.id === userData.id);
                if (updatedUser) {
                  setUser(updatedUser);
                  localStorage.setItem('golfUser', JSON.stringify(updatedUser));
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }, 300);
    };

    socket.on('members:updated', handleMembersUpdated);
    return () => socket.off('members:updated', handleMembersUpdated);
  }, [socket]);

  // 앱 복귀 시 회원 데이터 갱신
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const membersData = await apiService.fetchMembers();
        if (membersData) {
          setMembers(membersData);
          const savedUser = localStorage.getItem('golfUser');
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser);
              const updatedUser = membersData.find(m => m.id === userData.id);
              if (updatedUser) {
                setUser(updatedUser);
                localStorage.setItem('golfUser', JSON.stringify(updatedUser));
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('golfUser', JSON.stringify(userData));
    setRequiresProfileComplete(!checkRequiredFields(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('golfUser');
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('golfUser', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRequiresProfileComplete = useCallback(() => {
    setRequiresProfileComplete(false);
  }, []);

  const refreshMembers = useCallback(async () => {
    try {
      const membersData = await apiService.fetchMembers();
      if (membersData) {
        setMembers(membersData);
        setUser(prev => {
          if (!prev) return prev;
          const updated = membersData.find(m => m.id === prev.id);
          if (updated) {
            try { localStorage.setItem('golfUser', JSON.stringify(updated)); } catch (e) {}
            return updated;
          }
          return prev;
        });
      }
    } catch (e) {}
  }, []);

  const updateClubLogo = useCallback(async (logoData) => {
    try {
      await apiService.updateSetting('clubLogo', { value: logoData });
      setClubLogo(logoData);
      return true;
    } catch (e) {
      console.error('로고 업데이트 실패:', e);
      return false;
    }
  }, []);

  const isAdmin = useCallback(() =>
    user?.role === '관리자' || user?.role === '방장', [user?.role]);

  const isOperator = useCallback(() =>
    ['관리자', '방장', '운영진', '클럽운영진'].includes(user?.role), [user?.role]);

  const isMember = useCallback(() => user?.role === '회원', [user?.role]);

  const hasFeaturePermission = useCallback((featureId) => {
    if (!user) return false;
    if (user.isAdmin) return true;
    const requiredRole = featurePermissions[featureId] || '관리자';
    const userIdx = ROLE_HIERARCHY.indexOf(user.role);
    const reqIdx = ROLE_HIERARCHY.indexOf(requiredRole);
    if (userIdx === -1) return false;
    return userIdx <= reqIdx;
  }, [user, featurePermissions]);

  const value = useMemo(() => ({
    user,
    members,
    loading,
    requiresProfileComplete,
    clubLogo,
    featurePermissions,
    featureSettings,
    login,
    logout,
    updateUser,
    clearRequiresProfileComplete,
    refreshMembers,
    updateClubLogo,
    isAdmin,
    isOperator,
    isMember,
    hasFeaturePermission,
    checkRequiredFields,
  }), [
    user, members, loading, requiresProfileComplete, clubLogo,
    featurePermissions, featureSettings,
    login, logout, updateUser, clearRequiresProfileComplete,
    refreshMembers, updateClubLogo,
    isAdmin, isOperator, isMember, hasFeaturePermission,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
