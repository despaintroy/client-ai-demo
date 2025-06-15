import { FC } from 'react';
import ProgressBar from '../components/ProgressBar';
import { EngineState } from '../App';
import { OPTIONS } from '../constants';

type ModelSelectorProps = {
  engineState: EngineState;
  onChangeModel: (model: string) => void;
  disabled: boolean;
};

const ModelSelector: FC<ModelSelectorProps> = (props) => {
  const { engineState, onChangeModel, disabled } = props;

  return (
    <div className="w-full max-w-md">
      <select
        className="block border border-stone-600 mb-2 w-full rounded px-2 py-1 bg-stone-700 text-stone-300 focus:outline-none"
        value={engineState.selectedModel}
        onChange={(e) => onChangeModel(e.target.value)}
        disabled={disabled}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-stone-700 text-white">
            {option.label}
          </option>
        ))}
      </select>
      {engineState.status === 'loadingModel' && (
        <>
          {engineState.progress > 0 && engineState.progress < 100 && (
            <ProgressBar progress={engineState.progress} />
          )}
          <div className="text-sm text-stone-400 mb-2">{engineState.loadingMessage}</div>
        </>
      )}
      {engineState.status === 'error' && (
        <div className="text-red-400 mb-2">{engineState.message}</div>
      )}
    </div>
  );
};

export default ModelSelector;
