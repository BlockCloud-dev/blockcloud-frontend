import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { useAuth } from "../stores/authStore";

const LoginSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const accessToken = searchParams.get("access");
        const userEncoded = searchParams.get("user");

        if (!accessToken || !userEncoded) {
          throw new Error("액세스 토큰 또는 사용자 정보가 없습니다.");
        }

        // ✅ user 디코딩
        const user = JSON.parse(decodeURIComponent(userEncoded));

        // ✅ AuthStore에 저장
        await handleOAuthCallback(accessToken, user);

        // ✅ localStorage에도 저장 (선택적)
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("user", JSON.stringify(user));

        setStatus("success");

        // ✅ /dashboard로 이동
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }, 1000);
      } catch (err) {
        console.error("OAuth2 콜백 실패:", err);
        setErrorMessage("로그인 처리 중 오류가 발생했습니다.");
        setStatus("error");

        setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 3000);
      }
    };

    processOAuthCallback();
  }, [searchParams, navigate, handleOAuthCallback]);

  // ✅ 이하 UI 코드는 그대로 유지
  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            로그인 처리 중...
          </h2>
          <p className="text-gray-600">
            Google 로그인 정보를 확인하고 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            로그인 성공!
          </h2>
          <p className="text-gray-600">대시보드로 이동하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            로그인 처리 실패
          </h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <p className="text-sm text-gray-500">로그인 페이지로 돌아갑니다...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default LoginSuccessPage;
