import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * 뒤로가기 - 단일 소스
 *
 * 화면마다 `navigate('/booking')`처럼 목적지를 박아두면, 같은 화면에 여러 경로로
 * 들어올 수 있는 순간 어긋난다. (예: 조편성은 방장시트·라운딩시트·플레이·참가자관리
 * 네 곳에서 열리는데 뒤로가기는 항상 /booking으로 갔다)
 *
 * 그래서 기본은 브라우저 히스토리의 바로 이전 항목으로 돌아간다.
 * 다만 링크를 직접 열거나 새로고침한 경우엔 이전 항목이 없어 앱 밖으로 나가버리므로,
 * 그때만 fallback 경로로 보낸다.
 *
 * @param {string} fallback - 히스토리가 없을 때 갈 곳
 */
export default function useGoBack(fallback = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo;

  return useCallback(() => {
    // 보낸 화면이 복귀 지점을 지정한 경우 그것을 우선한다.
    // 관리자 화면처럼 "어느 하위 화면에 있었는지"를 주소가 아니라 메모리에 들고 있으면,
    // 단순히 히스토리를 되감아도 그 화면이 초기 상태로 되살아나기 때문이다.
    if (returnTo?.path) {
      navigate(returnTo.path, { state: returnTo.state, replace: true });
      return;
    }
    // react-router는 히스토리의 첫 진입점에 key='default'를 준다.
    // 이 경우 navigate(-1)은 앱을 벗어나므로 폴백으로 대체한다.
    if (location.key === 'default') navigate(fallback, { replace: true });
    else navigate(-1);
  }, [navigate, location.key, fallback, returnTo]);
}
