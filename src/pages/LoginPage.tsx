import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ROUTES } from "../router/routes";
import { useAuth } from "../stores/authStore";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || ROUTES.DASHBOARD;

  const {
    loginWithGoogle,
    loginWithEmail,
    isLoading: authLoading,
    error,
    clearError,
  } = useAuth();

  const [emailForm, setEmailForm] = useState({
    email: "test@blockcloud.dev",
    password: "test123",
  });

  const handleGoogleLogin = async () => {
    clearError();
    const toastId = toast.loading("로그인 중입니다…");
    try {
      await loginWithGoogle();
      toast.success("로그인 되었습니다.", { id: toastId });
      navigate(redirectPath);
    } catch (err) {
      console.error("Google 로그인 실패:", err);
      toast.error("로그인에 실패했습니다.", { id: toastId });
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const toastId = toast.loading("로그인 중입니다…");
    try {
      await loginWithEmail(emailForm);
      toast.success("로그인 되었습니다.", { id: toastId });
      navigate(redirectPath);
    } catch (err) {
      console.error("이메일 로그인 실패:", err);
      toast.error("로그인에 실패했습니다.", { id: toastId });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isLoading = authLoading;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="/BlockCloud-logo.png"
            alt="BlockCloud"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            BlockCloud에 로그인
          </h2>
          <p className="text-gray-600">3D 인프라 빌더를 시작하세요</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? "로그인 중..." : "Google로 로그인"}
          </button>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">또는</span>
            </div>
          </div>

          {/* 이메일 로그인 폼 */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={emailForm.email}
                onChange={handleEmailChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="test@blockcloud.dev"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={emailForm.password}
                onChange={handleEmailChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="test123"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "로그인 중..." : "이메일로 로그인"}
            </button>
          </form>

          {/* 테스트 계정 안내 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>테스트 계정:</strong>
              <br />
              이메일: test@blockcloud.dev
              <br />
              비밀번호: test123
            </p>
          </div>
        </div>

        {/* 하단 링크 */}
        <div className="text-center text-sm">
          <p className="text-gray-600">
            계정이 없으신가요?{" "}
            <Link
              to={ROUTES.REGISTER}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              회원가입
            </Link>
          </p>
          <p className="mt-2">
            <Link
              to={ROUTES.HOME}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 홈으로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
