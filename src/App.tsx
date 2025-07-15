import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useAuthStore } from './stores/authStore';

/**
 * BlockCloud 메인 애플리케이션 컴포넌트
 * React Router를 사용한 멀티 페이지 구조
 */
function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // 앱 시작 시 인증 상태 초기화
    initialize();
  }, [initialize]);

  return <RouterProvider router={router} />;
}

export default App;
