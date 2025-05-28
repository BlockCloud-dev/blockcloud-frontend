import React, { useState, useRef } from 'react';
import { Save, FolderOpen, Download, FileText, Zap } from 'lucide-react';
import type { DroppedBlock, Connection } from '../../types/blocks';
import {
    saveProject,
    downloadProject,
    downloadTerraformCode,
    loadProjectFromFile,
    saveProjectToLocalStorage,
    loadProjectFromLocalStorage,
    getSavedProjects,
    createProjectTemplate,
    type ProjectData
} from '../../utils/projectManager';

interface ProjectManagerProps {
    blocks: DroppedBlock[];
    connections: Connection[];
    generatedCode: string;
    onLoadProject: (projectData: ProjectData) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
    blocks,
    connections,
    generatedCode,
    onLoadProject
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<'save' | 'load' | 'templates' | 'export'>('save');
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [savedProjects] = useState(getSavedProjects());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveProject = () => {
        if (!projectName.trim()) {
            alert('프로젝트 이름을 입력해주세요.');
            return;
        }

        const projectData = saveProject(
            projectName.trim(),
            blocks,
            connections,
            projectDescription.trim()
        );

        // localStorage에 저장
        const key = `project_${Date.now()}`;
        if (saveProjectToLocalStorage(projectData, key)) {
            alert('프로젝트가 저장되었습니다.');
            setIsModalOpen(false);
            setProjectName('');
            setProjectDescription('');
        } else {
            alert('프로젝트 저장에 실패했습니다.');
        }
    };

    const handleLoadFromFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const projectData = await loadProjectFromFile(file);
            onLoadProject(projectData);
            setIsModalOpen(false);
            alert('프로젝트가 로드되었습니다.');
        } catch (error) {
            alert('프로젝트 파일을 로드할 수 없습니다: ' + (error as Error).message);
        }

        // 파일 입력 초기화
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleLoadFromLocalStorage = (key: string) => {
        const projectData = loadProjectFromLocalStorage(key);
        if (projectData) {
            onLoadProject(projectData);
            setIsModalOpen(false);
            alert('프로젝트가 로드되었습니다.');
        } else {
            alert('프로젝트를 로드할 수 없습니다.');
        }
    };

    const handleDownloadProject = () => {
        if (blocks.length === 0) {
            alert('저장할 블록이 없습니다.');
            return;
        }

        const projectData = saveProject(
            projectName || 'Unnamed Project',
            blocks,
            connections,
            projectDescription
        );

        downloadProject(projectData);
    };

    const handleDownloadTerraform = () => {
        if (!generatedCode.trim()) {
            alert('생성된 Terraform 코드가 없습니다.');
            return;
        }

        downloadTerraformCode(generatedCode, projectName || 'infrastructure');
    };

    const handleLoadTemplate = (templateType: 'basic' | '3-tier' | 'microservices') => {
        const templateData = createProjectTemplate(templateType);
        onLoadProject(templateData);
        setIsModalOpen(false);
        alert(`${templateData.name} 템플릿이 로드되었습니다.`);
    };

    const sectionButtons = [
        { id: 'save', icon: Save, label: '저장' },
        { id: 'load', icon: FolderOpen, label: '불러오기' },
        { id: 'templates', icon: Zap, label: '템플릿' },
        { id: 'export', icon: Download, label: '내보내기' }
    ];

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
                <Save className="w-4 h-4 mr-2" />
                프로젝트
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-600">
                            <h2 className="text-xl font-bold text-white">프로젝트 관리</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* 사이드바 */}
                            <div className="w-48 bg-gray-700 border-r border-gray-600">
                                <div className="p-4">
                                    {sectionButtons.map(({ id, icon: Icon, label }) => (
                                        <button
                                            key={id}
                                            onClick={() => setActiveSection(id as any)}
                                            className={`w-full flex items-center px-3 py-2 rounded-lg mb-2 transition-colors ${activeSection === id
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4 mr-2" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 메인 콘텐츠 */}
                            <div className="flex-1 p-6 overflow-y-auto">
                                {activeSection === 'save' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-white mb-4">프로젝트 저장</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                프로젝트 이름 *
                                            </label>
                                            <input
                                                type="text"
                                                value={projectName}
                                                onChange={(e) => setProjectName(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                                placeholder="예: 웹 서비스 인프라"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                설명
                                            </label>
                                            <textarea
                                                value={projectDescription}
                                                onChange={(e) => setProjectDescription(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 h-24 resize-none"
                                                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                                            />
                                        </div>
                                        <div className="bg-gray-700 p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-300 mb-2">현재 상태</h4>
                                            <div className="text-sm text-gray-400 space-y-1">
                                                <div>블록: {blocks.length}개</div>
                                                <div>연결: {connections.length}개</div>
                                                <div>마지막 수정: {new Date().toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSaveProject}
                                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            저장하기
                                        </button>
                                    </div>
                                )}

                                {activeSection === 'load' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-white mb-4">프로젝트 불러오기</h3>

                                        <div className="space-y-3">
                                            <button
                                                onClick={handleLoadFromFile}
                                                className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-colors"
                                            >
                                                <div className="text-center">
                                                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                                    <p className="text-gray-300 font-medium">파일에서 불러오기</p>
                                                    <p className="text-gray-500 text-sm">JSON 프로젝트 파일 선택</p>
                                                </div>
                                            </button>

                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".json"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </div>

                                        {savedProjects.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-gray-300 mb-3">저장된 프로젝트</h4>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                    {savedProjects.map((project) => (
                                                        <div
                                                            key={project.key}
                                                            className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                                                            onClick={() => handleLoadFromLocalStorage(project.key)}
                                                        >
                                                            <div className="font-medium text-white">{project.name}</div>
                                                            <div className="text-sm text-gray-400">
                                                                {new Date(project.updatedAt).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeSection === 'templates' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-white mb-4">프로젝트 템플릿</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div
                                                onClick={() => handleLoadTemplate('basic')}
                                                className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                                            >
                                                <h4 className="font-medium text-white mb-2">기본 템플릿</h4>
                                                <p className="text-sm text-gray-400 mb-3">
                                                    VPC와 서브넷으로 구성된 간단한 시작 템플릿
                                                </p>
                                                <div className="text-xs text-blue-400">
                                                    • VPC 1개
                                                </div>
                                            </div>

                                            <div
                                                onClick={() => handleLoadTemplate('3-tier')}
                                                className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                                            >
                                                <h4 className="font-medium text-white mb-2">3-계층 아키텍처</h4>
                                                <p className="text-sm text-gray-400 mb-3">
                                                    웹, 앱, 데이터베이스 계층으로 구성된 클래식 아키텍처
                                                </p>
                                                <div className="text-xs text-blue-400">
                                                    • VPC 1개 • 서브넷 3개
                                                </div>
                                            </div>

                                            <div
                                                onClick={() => handleLoadTemplate('microservices')}
                                                className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                                            >
                                                <h4 className="font-medium text-white mb-2">마이크로서비스</h4>
                                                <p className="text-sm text-gray-400 mb-3">
                                                    컨테이너 기반 마이크로서비스 아키텍처
                                                </p>
                                                <div className="text-xs text-blue-400">
                                                    • VPC 1개 • 로드밸런서 1개
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'export' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-white mb-4">내보내기</h3>

                                        <div className="space-y-3">
                                            <button
                                                onClick={handleDownloadProject}
                                                className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                                            >
                                                <div className="flex items-center">
                                                    <Download className="w-5 h-5 mr-3 text-blue-400" />
                                                    <div>
                                                        <div className="font-medium text-white">프로젝트 JSON 다운로드</div>
                                                        <div className="text-sm text-gray-400">현재 프로젝트를 JSON 파일로 저장</div>
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={handleDownloadTerraform}
                                                className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                                            >
                                                <div className="flex items-center">
                                                    <FileText className="w-5 h-5 mr-3 text-green-400" />
                                                    <div>
                                                        <div className="font-medium text-white">Terraform 코드 다운로드</div>
                                                        <div className="text-sm text-gray-400">생성된 HCL 코드를 .tf 파일로 저장</div>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="bg-gray-700 p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-300 mb-2">내보내기 정보</h4>
                                            <div className="text-sm text-gray-400 space-y-1">
                                                <div>생성된 코드 길이: {generatedCode.length} 문자</div>
                                                <div>총 리소스: {blocks.length}개</div>
                                                <div>연결: {connections.length}개</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
