import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import apiService from '../services/api';

export function useActivityTracker(user) {
  const location = useLocation();
  const lastPathRef = useRef(null);

  useEffect(() => {
    if (!user?.id || location.pathname === lastPathRef.current) {
      return;
    }

    lastPathRef.current = location.pathname;

    apiService.createActivityLog({
      memberId: user.id,
      memberName: user.nickname || user.name || 'Unknown',
      path: location.pathname,
      action: 'PAGE_VIEW',
      userAgent: navigator.userAgent
    });
  }, [location.pathname, user?.id, user?.name, user?.nickname]);
}

export default useActivityTracker;
