import Editor, { useMonaco } from '@monaco-editor/react'
import { useEffect } from 'react';

interface CodeViewerProps {
    code?: string;
}

const CodeViewer = ({ code = '' }: CodeViewerProps) => {
    const monaco = useMonaco();

    useEffect(() => {
        if (!monaco) return;

    }, [monaco])

    return (
        <div className="CodeViewer">
            <Editor
                width="100%"
                height="100%"
                theme='vs-dark'
                language='hcl'
                value={code}
                options={{
                    minimap: {
                        enabled: false
                    },
                    insertSpaces: true,
                    readOnly: false,
                    automaticLayout: true
                }}
            />
        </div>
    )
}

export default CodeViewer;