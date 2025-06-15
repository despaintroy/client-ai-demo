import { type FC, useCallback, useEffect, useState } from 'react';
import {
  type ChatCompletionMessageParam,
  CreateMLCEngine,
  MLCEngine,
  prebuiltAppConfig,
} from '@mlc-ai/web-llm';
import Messages from './modules/Messages';
import ModelSelector from './modules/ModelSelector';
import { OPTIONS } from './constants';
import { clsx } from 'clsx';

console.log(prebuiltAppConfig.model_list.map((m) => m.model_id).join('\n'));

const SYSTEM_PROMPT =
  'You are a helpful chat assistant. ' +
  'You may use markdown for formatting responses. ' +
  'Do not include links to any external resources. ';

export type EngineState =
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
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([
    { role: 'system', content: SYSTEM_PROMPT },
  ]);
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
      temperature: 0.4,
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

  const onChangeModel = useCallback((model: string) => {
    setEngineState({
      status: 'loadingModel',
      progress: 0,
      loadingMessage: '',
      selectedModel: model,
    });
    setMessages([{ role: 'system', content: SYSTEM_PROMPT }]);
  }, []);

  const disabledSubmit = engineState.status === 'loadingModel' || isReplying;

  return (
    <div className="max-w-6xl mx-auto px-4">
      <Messages messages={messages} />
      <textarea
        value={inputValue}
        rows={2}
        onChange={(e) => setInputValue(e.target.value)}
        className="block border border-stone-600 mb-2 w-full focus:outline-none rounded resize-none focus:border-stone-400 text-stone-300 p-2"
        disabled={isReplying}
      />
      <div className="flex justify-between items-start">
        <ModelSelector
          engineState={engineState}
          onChangeModel={onChangeModel}
          disabled={isReplying}
        />
        <button
          onClick={handleSend}
          className={clsx(
            'bg-stone-400 text-stone-900 rounded cursor-pointer py-1 px-3 mb-2',
            disabledSubmit ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-500'
          )}
          disabled={disabledSubmit}
        >
          {(() => {
            if (engineState.status === 'loadingModel') return `Loading model...`;
            if (isReplying) return 'Generating reply...';
            return 'Send';
          })()}
        </button>
      </div>
    </div>
  );
};

export default App;
