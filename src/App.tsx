
import { useState } from 'react';
import './app.css';
import CodeViewer from './components/CodeViewer';
import MyBlocklyEditor from './components/Block';

function App() {
  const [hclCode, setHclCode] = useState<string>('');

  const handleCodeChange = (code: string) => {
    setHclCode(code);
  };

  return (
    <div className="Container">

      <MyBlocklyEditor onCodeChange={handleCodeChange} />

      <CodeViewer code={hclCode} />

    </div>
  );
}

export default App
