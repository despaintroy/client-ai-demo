import { type FC, useEffect, useRef, useState } from 'react';
import ProgressBar from './components/ProgressBar';
import {
  type ChatCompletionMessageParam,
  CreateMLCEngine,
  prebuiltAppConfig,
} from '@mlc-ai/web-llm';

const App: FC = () => {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log({ prebuiltAppConfig });
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setProgress(0);

    const engine = await CreateMLCEngine('Llama-3.2-1B-Instruct-q4f16_1-MLC', {
      initProgressCallback: (info) => {
        setProgress(info.progress);
        if (loadingRef.current) loadingRef.current.innerHTML = info.text;
        console.log({ info });
      },
    });

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'Your job is to summarize provided press releases for a non-technical audience. Output should be plain text without any formatting.',
      },
      { role: 'user', content: inputRef.current?.value || '' },
    ];

    const reply = await engine.chat.completions.create({ messages });

    console.log({ reply });

    setOutput(reply.choices[0].message.content || '');
  };

  return (
    <div className="max-w-6xl mx-auto my-3 px-4">
      <textarea ref={inputRef} className="block border border-gray-400 mb-2 w-full" />
      <button
        onClick={handleGenerate}
        className="bg-blue-900 text-white rounded hover:bg-blue-800 cursor-pointer py-1 px-3 mb-2"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Generate'}
      </button>
      <ProgressBar progress={progress} />
      <div ref={loadingRef} className="text-sm text-gray-500 mb-2" />
      {loading && <span>Loading... {Math.floor(progress * 100)}%</span>}
      <div className="mt-4 whitespace-pre-wrap border p-2 min-h-[2rem] bg-gray-50 rounded">
        {output}
      </div>
    </div>
  );
};

export default App;
