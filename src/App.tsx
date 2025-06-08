import type { FC } from 'react';
import { useRef, useState } from 'react';
import ProgressBar from './components/ProgressBar';

const App: FC = () => {
  const [progress, setProgress] = useState(0);
  const summarizerRef = useRef<Summarizer | null>(null);
  const outputDivRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const startInstall = async () => {
    if (!outputDivRef.current) return;

    outputDivRef.current.innerHTML = '';
    const summarizer = await Summarizer.create({
      sharedContext: undefined,
      type: 'tldr',
      length: 'long',
      format: 'plain-text',
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', (e) => {
          setProgress(e.loaded);
          console.log(`Downloaded ${Math.floor(e.loaded * 100)}%`);
        });
      },
    });
    summarizerRef.current = summarizer;
    console.log({ summarizer });

    const inputContent = inputRef.current?.value ?? '';
    const totalInputQuota = summarizer.inputQuota;
    const inputUsage = await summarizer.measureInputUsage(inputContent, {
      context: undefined,
      signal: undefined,
    });

    console.log({ totalInputQuota, inputUsage });

    outputDivRef.current.innerHTML = await summarizer.summarize(inputContent, {
      context: undefined,
      signal: undefined,
    });
  };

  return (
    <div className="max-w-6xl mx-auto my-3 px-4">
      <textarea ref={inputRef} className="block border border-gray-400 mb-2 w-full" />
      <button
        onClick={startInstall}
        className="bg-blue-900 text-white rounded hover:bg-blue-800 cursor-pointer py-1 px-3 mb-2"
      >
        Start Summary
      </button>
      <ProgressBar progress={progress} />
      <span>Loading... {progress * 100}%</span>
      <div ref={outputDivRef} className="mt-4" />
    </div>
  );
};

export default App;
