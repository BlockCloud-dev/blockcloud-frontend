import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../router/routes';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center px-6">
        {/* 로고 및 제목 */}
        <div className="mb-8">
          <img
            src="/BlockCloud-logo.png"
            alt="BlockCloud"
            className="w-24 h-24 mx-auto mb-6"
          />
          <h1 className="text-5xl font-bold text-white mb-4">
            BlockCloud
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            3D 시각적 인터페이스로 AWS 인프라를 설계하고 Terraform 코드를 자동 생성하세요
          </p>
        </div>

        {/* 주요 기능 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-4">🧱</div>
            <h3 className="text-xl font-semibold text-white mb-2">드래그 & 드롭</h3>
            <p className="text-blue-200">직관적인 3D 인터페이스로 AWS 리소스를 배치하세요</p>
          </div>

          <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">실시간 코드 생성</h3>
            <p className="text-blue-200">배치와 동시에 Terraform HCL 코드가 자동 생성됩니다</p>
          </div>

          <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-2">AWS 모범 사례</h3>
            <p className="text-blue-200">스마트 배치로 AWS 아키텍처 규칙을 자동 적용합니다</p>
          </div>
        </div>

        {/* CTA 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={ROUTES.LOGIN}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            시작하기
          </Link>

          <Link
            to={ROUTES.DASHBOARD}
            className="px-8 py-3 border-2 border-white text-white hover:bg-white hover:text-blue-900 font-semibold rounded-lg transition-colors"
          >
            데모 보기
          </Link>
        </div>

        {/* 푸터 */}
        <div className="mt-16 text-blue-300 text-sm">
          <p>© 2025 BlockCloud. 모든 권리 보유.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
