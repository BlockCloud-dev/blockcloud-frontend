import { useState, useEffect, type JSX } from 'react';
import { BlocklyWorkspace } from 'react-blockly';
import './custom_blocks'
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';



interface MyBlocklyEditorProps {
    onCodeChange?: (code: string) => void;
}

const HCL_TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: 'HCL 기본 요소',
            colour: '#5C81A6',
            contents: [
                {
                    kind: 'block',
                    type: 'hcl_resource'
                },
                {
                    kind: 'block',
                    type: 'hcl_attribute'
                },
                {
                    kind: 'block',
                    type: 'hcl_variable'
                },
                {
                    kind: 'block',
                    type: 'hcl_output'
                },
                {
                    kind: 'block',
                    type: 'hcl_module'
                }
            ]
        },
    ]
};

const MyBlocklyEditor = ({ onCodeChange }: MyBlocklyEditorProps): JSX.Element => {
    const [xml, setXml] = useState<string>('');

    const handleChange = (newXml: string): void => {
        setXml(newXml);

        try {
            const workspace = Blockly.getMainWorkspace();
            if (workspace) {
                const code = javascriptGenerator.workspaceToCode(workspace);
                if (onCodeChange) {
                    onCodeChange(code);
                }
            }
        } catch (e) {
            console.error('HCL 코드 생성 중 오류 발생:', e);
        }
    };

    return (
        <div className="BlockhlyWrapper">
            <BlocklyWorkspace
                className="BlocklyWorkspace"
                toolboxConfiguration={HCL_TOOLBOX}
                workspaceConfiguration={{
                    grid: {
                        spacing: 20,
                        length: 3,
                        colour: '#ccc',
                        snap: true
                    },
                    zoom: {
                        controls: true,
                        wheel: true,
                        startScale: 1.0,
                        maxScale: 3,
                        minScale: 0.3,
                        scaleSpeed: 1.2
                    },
                    trashcan: true,
                    move: {
                        scrollbars: true,
                        drag: true,
                        wheel: true
                    }
                }}
                initialXml={xml}
                onXmlChange={handleChange}
            />
        </div>
    );
};

export default MyBlocklyEditor;