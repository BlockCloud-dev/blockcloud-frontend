import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../router/routes';
import { useAuth } from '../stores/authStore';

/**
 * OAuth2 로그인 성공 후 리다이렉트되는 페이지
 * URL 파라미터에서 토큰과 사용자 정보를 추출하여 로그인 처리
 */
const LoginSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        console.log('🔄 OAuth2 콜백 처리 시작...');

        // URL 파라미터에서 토큰과 사용자 정보 추출
        const accessToken = searchParams.get('access');
        const userParam = searchParams.get('user');

        console.log('📋 URL 파라미터 확인:', {
          hasAccessToken: !!accessToken,
          hasUserParam: !!userParam,
          accessTokenLength: accessToken?.length || 0,
          userParamLength: userParam?.length || 0
        });

        if (!accessToken || !userParam) {
          throw new Error('로그인 정보가 누락되었습니다. (토큰 또는 사용자 정보가 없음)');
        }

        // URL 디코딩 및 JSON 파싱
        const userJson = decodeURIComponent(userParam);
        console.log('📝 디코딩된 사용자 JSON:', userJson);

        const user = JSON.parse(userJson);
        console.log('👤 파싱된 사용자 정보:', {
          id: user?.id,
          name: user?.name,
          email: user?.email,
          provider: user?.provider
        });

        // AuthStore를 통해 OAuth 콜백 처리
        await handleOAuthCallback(accessToken, user);

        console.log('✅ AuthStore OAuth 콜백 처리 완료');

        // 성공 상태로 변경
        setStatus('success');

        // 1초 후 대시보드로 이동
        setTimeout(() => {
          console.log('🎯 대시보드로 이동...');
          navigate(ROUTES.DASHBOARD, { replace: true });
        }, 1000);

      } catch (error) {
        console.error('❌ OAuth2 콜백 처리 실패:', error);

        const message = error instanceof Error ? error.message : 'OAuth2 로그인 처리 중 오류가 발생했습니다.';
        setErrorMessage(message);
        setStatus('error');

        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          navigate(ROUTES.LOGIN, { replace: true });
        }, 3000);
      }
    };

    processOAuthCallback();
  }, [searchParams, navigate, handleOAuthCallback]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 처리 중...</h2>
          <p className="text-gray-600">Google 로그인 정보를 확인하고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 성공!</h2>
          <p className="text-gray-600">대시보드로 이동하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인 처리 실패</h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <p className="text-sm text-gray-500">로그인 페이지로 돌아갑니다...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginSuccessPage;
