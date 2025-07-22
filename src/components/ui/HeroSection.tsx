import React from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { useAuth } from "../../stores/authStore";

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD);
    } else {
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <section className="px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900">
            블록 기반 인프라 시각화
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            인프라 요소를 모듈식 블록으로 간편하게 구성하고, 한 번의 클릭으로
            배포하세요.
          </p>
          <div className="mt-6 flex space-x-4">
            <button
              onClick={handleStart}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-600"
            >
              시작하기
            </button>
          </div>
        </div>
        <div>
          <div className="bg-blue-50 rounded-2xl p-8 flex items-center justify-center shadow-lg">
            <img
              src="/intro.png"
              alt="클라우드 블록 일러스트"
              className="max-w-full max-h-64"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
