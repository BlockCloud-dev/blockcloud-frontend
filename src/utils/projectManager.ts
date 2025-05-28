import { Vector3 } from 'three';
import type { DroppedBlock, Connection } from '../types/blocks';

export interface ProjectData {
    name: string;
    description?: string;
    version: string;
    createdAt: string;
    updatedAt: string;
    blocks: DroppedBlock[];
    connections: Connection[];
    metadata?: {
        totalBlocks: number;
        totalConnections: number;
        lastModified: string;
    };
}

export const PROJECT_VERSION = '1.0.0';

// 프로젝트 데이터 검증
export const validateProjectData = (data: any): data is ProjectData => {
    return (
        data &&
        typeof data.name === 'string' &&
        typeof data.version === 'string' &&
        Array.isArray(data.blocks) &&
        Array.isArray(data.connections) &&
        typeof data.createdAt === 'string' &&
        typeof data.updatedAt === 'string'
    );
};

// 프로젝트를 JSON으로 저장
export const saveProject = (
    name: string,
    blocks: DroppedBlock[],
    connections: Connection[],
    description?: string
): ProjectData => {
    const now = new Date().toISOString();

    const projectData: ProjectData = {
        name,
        description,
        version: PROJECT_VERSION,
        createdAt: now,
        updatedAt: now,
        blocks,
        connections,
        metadata: {
            totalBlocks: blocks.length,
            totalConnections: connections.length,
            lastModified: now
        }
    };

    return projectData;
};

// 프로젝트를 파일로 다운로드
export const downloadProject = (projectData: ProjectData) => {
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};

// Terraform 코드를 파일로 다운로드
export const downloadTerraformCode = (code: string, projectName: string = 'infrastructure') => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.tf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};

// 파일에서 프로젝트 로드
export const loadProjectFromFile = (file: File): Promise<ProjectData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const data = JSON.parse(jsonString);

                if (validateProjectData(data)) {
                    resolve(data);
                } else {
                    reject(new Error('Invalid project file format'));
                }
            } catch (error) {
                reject(new Error('Failed to parse project file'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read project file'));
        };

        reader.readAsText(file);
    });
};

// localStorage에 프로젝트 저장
export const saveProjectToLocalStorage = (projectData: ProjectData, key: string = 'current_project') => {
    try {
        localStorage.setItem(key, JSON.stringify(projectData));
        return true;
    } catch (error) {
        console.error('Failed to save project to localStorage:', error);
        return false;
    }
};

// localStorage에서 프로젝트 로드
export const loadProjectFromLocalStorage = (key: string = 'current_project'): ProjectData | null => {
    try {
        const jsonString = localStorage.getItem(key);
        if (!jsonString) return null;

        const data = JSON.parse(jsonString);
        if (validateProjectData(data)) {
            return data;
        }
        return null;
    } catch (error) {
        console.error('Failed to load project from localStorage:', error);
        return null;
    }
};

// 저장된 프로젝트 목록 가져오기
export const getSavedProjects = (): { key: string; name: string; updatedAt: string }[] => {
    const projects: { key: string; name: string; updatedAt: string }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('project_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key) || '');
                if (validateProjectData(data)) {
                    projects.push({
                        key,
                        name: data.name,
                        updatedAt: data.updatedAt
                    });
                }
            } catch (error) {
                // 잘못된 프로젝트 데이터는 무시
            }
        }
    }

    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

// 프로젝트 템플릿 생성
export const createProjectTemplate = (templateType: 'basic' | '3-tier' | 'microservices'): ProjectData => {
    const now = new Date().toISOString();

    switch (templateType) {
        case '3-tier':
            return {
                name: '3-Tier Architecture',
                description: 'Classic 3-tier web application architecture with VPC, subnets, load balancer, and EC2 instances',
                version: PROJECT_VERSION,
                createdAt: now,
                updatedAt: now,
                blocks: [
                    {
                        id: 'vpc-template',
                        type: 'vpc',
                        name: 'Main VPC',
                        position: new Vector3(0, 0.1, 0),
                        timestamp: Date.now(),
                        properties: {
                            name: 'main-vpc',
                            cidrBlock: '10.0.0.0/16',
                            enableDnsSupport: true,
                            enableDnsHostnames: true
                        },
                        size: [6, 0.2, 6]
                    },
                    {
                        id: 'subnet-web',
                        type: 'subnet',
                        name: 'Web Subnet',
                        position: new Vector3(-2, 0.25, -2),
                        timestamp: Date.now(),
                        properties: {
                            name: 'web-subnet',
                            cidrBlock: '10.0.1.0/24',
                            availabilityZone: 'ap-northeast-2a'
                        },
                        size: [2, 0.3, 2]
                    },
                    {
                        id: 'subnet-app',
                        type: 'subnet',
                        name: 'App Subnet',
                        position: new Vector3(0, 0.25, 0),
                        timestamp: Date.now(),
                        properties: {
                            name: 'app-subnet',
                            cidrBlock: '10.0.2.0/24',
                            availabilityZone: 'ap-northeast-2a'
                        },
                        size: [2, 0.3, 2]
                    },
                    {
                        id: 'subnet-db',
                        type: 'subnet',
                        name: 'DB Subnet',
                        position: new Vector3(2, 0.25, 2),
                        timestamp: Date.now(),
                        properties: {
                            name: 'db-subnet',
                            cidrBlock: '10.0.3.0/24',
                            availabilityZone: 'ap-northeast-2a'
                        },
                        size: [2, 0.3, 2]
                    }
                ],
                connections: [],
                metadata: {
                    totalBlocks: 4,
                    totalConnections: 0,
                    lastModified: now
                }
            };

        case 'microservices':
            return {
                name: 'Microservices Architecture',
                description: 'Container-based microservices architecture with load balancer and multiple services',
                version: PROJECT_VERSION,
                createdAt: now,
                updatedAt: now,
                blocks: [
                    {
                        id: 'vpc-micro',
                        type: 'vpc',
                        name: 'Microservices VPC',
                        position: new Vector3(0, 0.1, 0),
                        timestamp: Date.now(),
                        properties: {
                            name: 'microservices-vpc',
                            cidrBlock: '10.0.0.0/16',
                            enableDnsSupport: true,
                            enableDnsHostnames: true
                        },
                        size: [8, 0.2, 6]
                    },
                    {
                        id: 'lb-main',
                        type: 'load-balancer',
                        name: 'Main Load Balancer',
                        position: new Vector3(0, 1.1, -2),
                        timestamp: Date.now(),
                        properties: {
                            name: 'main-alb',
                            loadBalancerType: 'application'
                        },
                        size: [3, 1, 1]
                    }
                ],
                connections: [],
                metadata: {
                    totalBlocks: 2,
                    totalConnections: 0,
                    lastModified: now
                }
            };

        default: // basic
            return {
                name: 'Basic Template',
                description: 'Simple starting template with VPC and subnet',
                version: PROJECT_VERSION,
                createdAt: now,
                updatedAt: now,
                blocks: [
                    {
                        id: 'vpc-basic',
                        type: 'vpc',
                        name: 'Basic VPC',
                        position: new Vector3(0, 0.1, 0),
                        timestamp: Date.now(),
                        properties: {
                            name: 'basic-vpc',
                            cidrBlock: '10.0.0.0/16',
                            enableDnsSupport: true,
                            enableDnsHostnames: true
                        },
                        size: [4, 0.2, 4]
                    }
                ],
                connections: [],
                metadata: {
                    totalBlocks: 1,
                    totalConnections: 0,
                    lastModified: now
                }
            };
    }
};
