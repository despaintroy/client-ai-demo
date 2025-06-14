import { type FC, useState } from 'react';
import ProgressBar from './components/ProgressBar';
import {
  type ChatCompletionMessageParam,
  CreateMLCEngine,
  prebuiltAppConfig,
} from '@mlc-ai/web-llm';

console.log(prebuiltAppConfig.model_list.map((m) => m.model_id).join('\n'));

const OPTIONS = [
  { label: 'Fast — Phi-3.5-mini', value: 'Phi-3.5-mini-instruct-q4f16_1-MLC' },
  { label: 'Balanced — Mistral 7B', value: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC' },
  { label: 'Best — Hermes 3 (8B)', value: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC' },
];

const SYSTEM_PROMPT =
  'You are a helpful chat assistant. Do not use Markdown, HTML, or any other formatting. Use only plain text.';

type AppState =
  | { status: 'idle' }
  | { status: 'loadingModel'; progress: number; loadingMessage: string }
  | { status: 'replying'; output: string }
  | { status: 'done'; output: string };

const App: FC = () => {
  const [state, setState] = useState<AppState>({ status: 'idle' });
  const [selectedModel, setSelectedModel] = useState(OPTIONS[0].value);
  const [inputValue, setInputValue] = useState('');

  const handleGenerate = async () => {
    setState({ status: 'loadingModel', progress: 0, loadingMessage: '' });

    const engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (info) => {
        setState({ status: 'loadingModel', progress: info.progress, loadingMessage: info.text });
      },
    });

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: inputValue },
    ];

    let reply = '';
    setState({ status: 'replying', output: reply });

    const chunks = await engine.chat.completions.create({
      messages,
      temperature: 0.5,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of chunks) {
      reply += chunk.choices[0]?.delta.content || '';
      setState({ status: 'replying', output: reply });
    }

    const fullReply = await engine.getMessage(selectedModel);
    setState({ status: 'done', output: fullReply });
  };

  const isWaiting = state.status === 'loadingModel' || state.status === 'replying';

  return (
    <div className="max-w-6xl mx-auto my-3 px-4">
      <select
        className="block border border-gray-400 mb-2 w-full"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        disabled={isWaiting}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="block border border-gray-400 mb-2 w-full"
        disabled={isWaiting}
      />
      <button
        onClick={handleGenerate}
        className="bg-blue-900 text-white rounded hover:bg-blue-800 cursor-pointer py-1 px-3 mb-2"
        disabled={isWaiting}
      >
        {isWaiting ? 'Loading...' : 'Generate'}
      </button>
      {state.status === 'loadingModel' && (
        <>
          <ProgressBar progress={state.progress} />
          <div className="text-sm text-gray-500 mb-2">{state.loadingMessage}</div>
        </>
      )}
      {(state.status === 'done' || state.status === 'replying') && (
        <div className="mt-4 whitespace-pre-wrap border p-2 min-h-[2rem] bg-gray-50 rounded">
          {state.output}
        </div>
      )}
    </div>
  );
};

export default App;
