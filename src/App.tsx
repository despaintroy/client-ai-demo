import { type FC, useCallback, useEffect, useState } from 'react';
import ProgressBar from './components/ProgressBar';
import {
  type ChatCompletionMessageParam,
  CreateMLCEngine,
  MLCEngine,
  prebuiltAppConfig,
} from '@mlc-ai/web-llm';

console.log(prebuiltAppConfig.model_list.map((m) => m.model_id).join('\n'));

const OPTIONS = [
  { label: 'Fast — Phi 3.5 mini', value: 'Phi-3.5-mini-instruct-q4f16_1-MLC' },
  { label: 'Balanced — Mistral 7B', value: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC' },
  { label: 'Best — Hermes 3 (8B)', value: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC' },
];

const SYSTEM_PROMPT =
  'You are a helpful chat assistant. Output your response as plain text. Do not use rich text formatting. Do not use markdown.';

type ReplyState =
  | { status: 'idle' }
  | { status: 'replying'; output: string }
  | { status: 'done'; output: string };

type EngineState =
  | {
      status: 'loadingModel';
      selectedModel: string;
      progress: number;
      loadingMessage: string;
    }
  | {
      status: 'ready';
      selectedModel: string;
      engine: MLCEngine;
    }
  | {
      status: 'error';
      selectedModel: string;
      message: string;
    };

const App: FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [replyState, setReplyState] = useState<ReplyState>({ status: 'idle' });
  const [engineState, setEngineState] = useState<EngineState>({
    status: 'loadingModel',
    selectedModel: OPTIONS[0].value,
    progress: 0,
    loadingMessage: '',
  });

  const initEngine = useCallback(async (selectedModel: string, signal: AbortSignal) => {
    setReplyState({ status: 'idle' });
    setEngineState({
      status: 'loadingModel',
      selectedModel,
      progress: 0,
      loadingMessage: '',
    });

    try {
      const engine = await CreateMLCEngine(selectedModel, {
        initProgressCallback: (info) => {
          if (!signal.aborted) {
            setEngineState({
              status: 'loadingModel',
              selectedModel,
              progress: info.progress,
              loadingMessage: info.text,
            });
          }
        },
      });

      if (!signal.aborted) {
        setEngineState({
          status: 'ready',
          selectedModel,
          engine,
        });
      }
    } catch {
      if (!signal.aborted) {
        setEngineState({
          status: 'error',
          selectedModel,
          message: 'Failed to load model. Please try again.',
        });
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    initEngine(engineState.selectedModel, controller.signal);
    return () => controller.abort();
  }, [engineState.selectedModel, initEngine]);

  const handleGenerate = async () => {
    if (engineState.status !== 'ready') return;

    const { engine, selectedModel } = engineState;

    setReplyState({ status: 'replying', output: '' });
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: inputValue },
    ];
    let reply = '';
    setReplyState({ status: 'replying', output: reply });
    const chunks = await engine.chat.completions.create({
      messages,
      temperature: 0.5,
      stream: true,
      stream_options: { include_usage: true },
    });
    for await (const chunk of chunks) {
      reply += chunk.choices[0]?.delta.content || '';
      setReplyState({ status: 'replying', output: reply });
    }
    const fullReply = await engine.getMessage(selectedModel);
    setReplyState({ status: 'done', output: fullReply });
  };

  return (
    <div className="max-w-6xl mx-auto my-3 px-4">
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="block border border-gray-400 mb-2 w-full"
        disabled={replyState.status === 'replying'}
      />
      <select
        className="block border border-gray-400 mb-2 w-full"
        value={engineState.selectedModel}
        onChange={(e) => {
          setEngineState({
            status: 'loadingModel',
            progress: 0,
            loadingMessage: '',
            selectedModel: e.target.value,
          });
        }}
        disabled={replyState.status === 'replying'}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {engineState.status === 'loadingModel' && (
        <>
          <ProgressBar progress={engineState.progress} />
          <div className="text-sm text-gray-500 mb-2">{engineState.loadingMessage}</div>
        </>
      )}
      {engineState.status === 'error' && (
        <div className="text-red-500 mb-2">{engineState.message}</div>
      )}
      <button
        onClick={handleGenerate}
        className="bg-blue-900 text-white rounded hover:bg-blue-800 cursor-pointer py-1 px-3 mb-2"
        disabled={
          engineState.status === 'loadingModel' ||
          replyState.status === 'replying' ||
          !inputValue.trim()
        }
      >
        {(() => {
          if (engineState.status === 'loadingModel') return `Loading model...`;
          if (replyState.status === 'replying') return 'Generating reply...';
          return 'Generate Reply';
        })()}
      </button>
      {(replyState.status === 'done' || replyState.status === 'replying') && (
        <div className="mt-4 whitespace-pre-wrap border p-2 min-h-[2rem] bg-gray-50 rounded">
          {replyState.output}
        </div>
      )}
    </div>
  );
};

export default App;
