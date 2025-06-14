import { type FC, useRef, useState } from 'react';
import ProgressBar from './components/ProgressBar';
import {
  type ChatCompletionMessageParam,
  CreateMLCEngine,
  prebuiltAppConfig,
} from '@mlc-ai/web-llm';

console.log(prebuiltAppConfig.model_list.map((m) => m.model_id).join('\n'));

const OPTIONS = [
  { label: 'Best — Hermes 3 (8B)', value: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC' },
  { label: 'Balanced — Mistral 7B', value: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC' },
  { label: 'Fast —Phi-3.5-mini', value: 'Phi-3.5-mini-instruct-q4f16_1-MLC' },
];

const App: FC = () => {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedModel, setSelectedModel] = useState(OPTIONS[0].value);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setProgress(0);
    setOutput('');

    const engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (info) => {
        setProgress(info.progress);
        if (loadingRef.current) loadingRef.current.innerHTML = info.text;
        console.log({ info });
      },
    });

    if (loadingRef.current) loadingRef.current.innerHTML = 'Replying...';

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'Your job is to be a helpful chat assistant.',
      },
      { role: 'user', content: inputRef.current?.value || '' },
    ];

    const reply = await engine.chat.completions.create({ messages });
    console.log({ reply });
    setOutput(reply.choices[0].message.content || '');
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto my-3 px-4">
      <select
        className="block border border-gray-400 mb-2 w-full"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        disabled={loading}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
      <div className="mt-4 whitespace-pre-wrap border p-2 min-h-[2rem] bg-gray-50 rounded">
        {output}
      </div>
    </div>
  );
};

export default App;
