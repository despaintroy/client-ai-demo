import { type FC } from 'react';

interface ProgressBarProps {
  progress: number; // value between 0 and 1
}

const ProgressBar: FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
      <div
        className="h-full bg-blue-400 transition-all duration-300"
        style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }}
      />
    </div>
  );
};

export default ProgressBar;
