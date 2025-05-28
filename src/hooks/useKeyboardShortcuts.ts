import { useEffect } from 'react';

interface KeyboardShortcutsProps {
    onDelete?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onEscape?: () => void;
    onResize?: (axis: 'width' | 'height' | 'depth', delta: number) => void;
    onNewProject?: () => void;
    onSaveProject?: () => void;
    onLoadProject?: () => void;
    onToggleTab?: (tab: 'connections' | 'code' | 'properties') => void;
}

export function useKeyboardShortcuts({
    onDelete,
    onUndo,
    onRedo,
    onEscape,
    onResize,
    onNewProject,
    onSaveProject,
    onLoadProject,
    onToggleTab
}: KeyboardShortcutsProps = {}) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // 입력 필드에서 키 이벤트가 발생한 경우 무시
            const target = event.target as HTMLElement;
            const isInputElement = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.contentEditable === 'true' ||
                target.closest('[contenteditable="true"]') !== null;

            if (isInputElement) {
                // 입력 필드에서는 ESC만 허용 (다른 단축키는 무시)
                if (event.key === 'Escape') {
                    console.log('Clear selection');
                    onEscape?.();
                }
                return;
            }

            // Ctrl/Cmd + Z: 실행취소
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                console.log('Undo triggered');
                onUndo?.();
            }

            // Ctrl/Cmd + Shift + Z: 다시실행
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
                event.preventDefault();
                console.log('Redo triggered');
                onRedo?.();
            }

            // Ctrl/Cmd + N: 새 프로젝트
            if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
                event.preventDefault();
                console.log('New project triggered');
                onNewProject?.();
            }

            // Ctrl/Cmd + S: 프로젝트 저장
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                console.log('Save project triggered');
                onSaveProject?.();
            }

            // Ctrl/Cmd + O: 프로젝트 열기
            if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
                event.preventDefault();
                console.log('Load project triggered');
                onLoadProject?.();
            }

            // 탭 전환 (1, 2, 3)
            if (event.key === '1' && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                onToggleTab?.('connections');
            }
            if (event.key === '2' && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                onToggleTab?.('code');
            }
            if (event.key === '3' && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                onToggleTab?.('properties');
            }

            // Delete: 선택된 블록 삭제 (입력 필드가 아닐 때만)
            if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault(); // 기본 동작 방지
                console.log('Delete selected block');
                onDelete?.();
            }

            // ESC: 선택 해제
            if (event.key === 'Escape') {
                console.log('Clear selection');
                onEscape?.();
            }

            // 크기 조절 단축키 (VPC, Subnet 블록용)
            if (onResize) {
                const step = 0.5;

                // Shift + 화살표: 높이 조절 (위/아래)
                if (event.shiftKey && !event.ctrlKey) {
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        onResize('height', step);
                    } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        onResize('height', -step);
                    } else if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        onResize('width', -step);
                    } else if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        onResize('width', step);
                    }
                }

                // Ctrl + 화살표: 세로(깊이) 조절
                if (event.ctrlKey && !event.shiftKey) {
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        onResize('depth', step);
                    } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        onResize('depth', -step);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onDelete, onUndo, onRedo, onEscape, onResize]);
}
