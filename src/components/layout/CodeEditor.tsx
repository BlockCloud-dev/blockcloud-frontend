import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Download, RotateCcw } from 'lucide-react';

const defaultHCLCode = `# Terraform HCL 코드가 여기에 생성됩니다
# 왼쪽에서 블록을 드래그해서 가운데에 배치하면 
# 자동으로 코드가 업데이트됩니다

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2"
}

# VPC 리소스 예시
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}`;

interface CodeEditorProps {
    generatedCode?: string;
}

export function CodeEditor({ generatedCode }: CodeEditorProps) {
    const [code, setCode] = useState(defaultHCLCode);
    const [isLoading, setIsLoading] = useState(true);
    const editorRef = useRef<any>(null);

    useEffect(() => {
        if (generatedCode) {
            setCode(generatedCode);
        }
    }, [generatedCode]);

    // 에디터 크기 조정을 위한 useEffect
    useEffect(() => {
        const handleResize = () => {
            if (editorRef.current) {
                editorRef.current.layout();
            }
        };

        window.addEventListener('resize', handleResize);
        // 탭 전환 시에도 레이아웃 재계산
        const timeoutId = setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        setIsLoading(false);
        // 마운트 후 레이아웃 재계산
        setTimeout(() => {
            editor.layout();
        }, 100);
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(code);
            // TODO: 토스트 메시지 추가
            console.log('코드가 클립보드에 복사되었습니다');
        } catch (error) {
            console.error('클립보드 복사 실패:', error);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'main.tf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setCode(defaultHCLCode);
    };

    return (
        <div
            style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
            className="bg-gray-800 border-l border-gray-600"
        >
            {/* 헤더 */}
            <div className="p-4 border-b border-gray-600 flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-lg font-semibold text-white">Terraform HCL</h2>
                    <p className="text-sm text-gray-400">자동 생성된 인프라 코드</p>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex space-x-2">
                    <button
                        onClick={handleCopyCode}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        title="클립보드에 복사"
                    >
                        <Copy className="w-4 h-4 text-gray-300" />
                    </button>
                    <button
                        onClick={handleDownload}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        title="파일 다운로드"
                    >
                        <Download className="w-4 h-4 text-gray-300" />
                    </button>
                    <button
                        onClick={handleReset}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        title="초기화"
                    >
                        <RotateCcw className="w-4 h-4 text-gray-300" />
                    </button>
                </div>
            </div>

            {/* 에디터 영역 */}
            <div style={{
                flex: 1,
                minHeight: 0,
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden'
            }}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
                        <div className="text-gray-400">에디터 로딩 중...</div>
                    </div>
                )}

                <Editor
                    height="100%"
                    width="100%"
                    defaultLanguage="hcl"
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    onMount={handleEditorDidMount}
                    theme="vs-dark"
                    loading={<div className="p-4 text-gray-400">Monaco Editor 로딩 중...</div>}
                    options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        folding: true,
                        selectOnLineNumbers: true,
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        scrollbar: {
                            vertical: 'auto',
                            horizontal: 'auto'
                        },
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        overviewRulerBorder: false,
                    }}
                />
            </div>
        </div>
    );
}
