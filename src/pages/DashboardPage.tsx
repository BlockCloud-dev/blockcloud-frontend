import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Settings } from 'lucide-react';
import { ROUTES, createProjectEditorRoute } from '../router/routes';
import { useAuth } from '../stores/authStore';

interface Project {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
  createdAt: string;
  blocksCount: number;
  connectionsCount: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      // TODO: Phase 3에서 실제 API 호출로 교체
      // const response = await fetch('/api/projects');
      // const data = await response.json();

      // 임시 목업 데이터
      const mockProjects: Project[] = [
        {
          id: 'project-1',
          name: '3-Tier Web Application',
          description: 'VPC, Subnet, EC2, RDS로 구성된 3계층 웹 애플리케이션',
          updatedAt: '2025-01-10T10:30:00Z',
          createdAt: '2025-01-05T14:20:00Z',
          blocksCount: 8,
          connectionsCount: 12
        },
        {
          id: 'project-2',
          name: 'Microservices Architecture',
          description: '컨테이너 기반 마이크로서비스 아키텍처',
          updatedAt: '2025-01-08T16:45:00Z',
          createdAt: '2025-01-02T09:15:00Z',
          blocksCount: 15,
          connectionsCount: 25
        },
        {
          id: 'project-3',
          name: 'Data Pipeline',
          description: 'S3, Lambda, Kinesis를 활용한 데이터 파이프라인',
          updatedAt: '2025-01-07T11:20:00Z',
          createdAt: '2024-12-28T13:30:00Z',
          blocksCount: 6,
          connectionsCount: 8
        }
      ];

      setProjects(mockProjects);
    } catch (error) {
      console.error('프로젝트 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = () => {
    navigate(ROUTES.PROJECT_NEW);
  };

  const handleOpenProject = (projectId: string) => {
    navigate(createProjectEditorRoute(projectId));
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <img src="/BlockCloud-logo.png" alt="BlockCloud" className="w-8 h-8 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">BlockCloud</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name || '사용자'}</p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
              </div>
            </div>

            <button
              onClick={() => navigate(ROUTES.SETTINGS)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 상단 액션 영역 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">내 프로젝트</h2>
            <p className="text-gray-600">AWS 인프라 프로젝트를 관리하고 편집하세요</p>
          </div>

          <button
            onClick={handleCreateProject}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            새 프로젝트
          </button>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 프로젝트 목록 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">프로젝트를 불러오는 중...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? '다른 키워드로 검색해보세요' : '첫 번째 AWS 인프라 프로젝트를 만들어보세요'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                새 프로젝트 만들기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleOpenProject(project.id)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {project.name}
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    AWS
                  </span>
                </div>

                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(project.updatedAt)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">
                      블록 {project.blocksCount}개
                    </span>
                    <span className="text-gray-600">
                      연결 {project.connectionsCount}개
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
