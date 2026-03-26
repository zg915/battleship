"use client";

interface ReplayControlsProps {
  step: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

export default function ReplayControls({
  step,
  totalSteps,
  onStepChange,
  playing,
  onTogglePlay,
}: ReplayControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onStepChange(0)}
        disabled={step === 0}
        className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40 text-sm"
      >
        &laquo;
      </button>
      <button
        onClick={() => onStepChange(Math.max(0, step - 1))}
        disabled={step === 0}
        className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40 text-sm"
      >
        &lsaquo;
      </button>

      <button
        onClick={onTogglePlay}
        className="px-4 py-1 bg-blue-600 rounded hover:bg-blue-500 text-sm font-semibold"
      >
        {playing ? "Pause" : "Play"}
      </button>

      <button
        onClick={() => onStepChange(Math.min(totalSteps, step + 1))}
        disabled={step === totalSteps}
        className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40 text-sm"
      >
        &rsaquo;
      </button>
      <button
        onClick={() => onStepChange(totalSteps)}
        disabled={step === totalSteps}
        className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40 text-sm"
      >
        &raquo;
      </button>

      <span className="text-sm text-slate-400 ml-2">
        Move {step} / {totalSteps}
      </span>
    </div>
  );
}
