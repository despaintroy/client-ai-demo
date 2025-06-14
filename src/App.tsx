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
  const [engineState, setEngineState] = useState<EngineState>({
    status: 'loadingModel',
    selectedModel: OPTIONS[0].value,
    progress: 0,
    loadingMessage: '',
  });
  // New: message history state
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([
    { role: 'system', content: SYSTEM_PROMPT },
  ]);
  // New: track if model is replying
  const [isReplying, setIsReplying] = useState(false);

  const initEngine = useCallback(async (selectedModel: string, signal: AbortSignal) => {
    setIsReplying(false);
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

  // New: handle sending a message and updating history, with streaming output
  const handleSend = async () => {
    if (engineState.status !== 'ready' || !inputValue.trim()) return;
    const { engine } = engineState;
    const userMessage: ChatCompletionMessageParam = { role: 'user', content: inputValue };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsReplying(true);
    let reply = '';
    // Add a placeholder assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    const chunks = await engine.chat.completions.create({
      messages: newMessages,
      temperature: 0.5,
      stream: true,
      stream_options: { include_usage: true },
    });
    for await (const chunk of chunks) {
      reply += chunk.choices[0]?.delta.content || '';
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
          updated[lastIndex] = { ...updated[lastIndex], content: reply };
        }
        return updated;
      });
    }
    setIsReplying(false);
  };

  return (
    <div className="max-w-6xl mx-auto my-3 px-4">
      <div className="mb-4 border rounded p-2 min-h-[200px] bg-gray-50">
        {/* Chat history */}
        {messages
          .filter((m) => m.role !== 'system')
          .map((msg, idx) => {
            const { content } = msg;
            return (
              <div key={idx} className="mb-2">
                <b>{msg.role === 'user' ? 'You' : 'Assistant'}:</b>{' '}
                {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
              </div>
            );
          })}
        {/* No need for isReplying placeholder, streaming output is shown live */}
      </div>
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="block border border-gray-400 mb-2 w-full"
        disabled={isReplying}
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
          setMessages([{ role: 'system', content: SYSTEM_PROMPT }]);
        }}
        disabled={isReplying}
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
        onClick={handleSend}
        className="bg-blue-900 text-white rounded hover:bg-blue-800 cursor-pointer py-1 px-3 mb-2"
        disabled={engineState.status === 'loadingModel' || isReplying || !inputValue.trim()}
      >
        {(() => {
          if (engineState.status === 'loadingModel') return `Loading model...`;
          if (isReplying) return 'Generating reply...';
          return 'Send';
        })()}
      </button>
    </div>
  );
};

export default App;
