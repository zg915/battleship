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
        className="px-3 py-1.5 bg-card border border-border rounded-md hover:bg-border disabled:opacity-40 text-sm text-foreground transition-colors"
      >
        &laquo;
      </button>
      <button
        onClick={() => onStepChange(Math.max(0, step - 1))}
        disabled={step === 0}
        className="px-3 py-1.5 bg-card border border-border rounded-md hover:bg-border disabled:opacity-40 text-sm text-foreground transition-colors"
      >
        &lsaquo;
      </button>

      <button
        onClick={onTogglePlay}
        className="px-4 py-1.5 bg-accent rounded-md hover:bg-accent-hover text-sm font-semibold font-heading text-white transition-colors"
      >
        {playing ? "Pause" : "Play"}
      </button>

      <button
        onClick={() => onStepChange(Math.min(totalSteps, step + 1))}
        disabled={step === totalSteps}
        className="px-3 py-1.5 bg-card border border-border rounded-md hover:bg-border disabled:opacity-40 text-sm text-foreground transition-colors"
      >
        &rsaquo;
      </button>
      <button
        onClick={() => onStepChange(totalSteps)}
        disabled={step === totalSteps}
        className="px-3 py-1.5 bg-card border border-border rounded-md hover:bg-border disabled:opacity-40 text-sm text-foreground transition-colors"
      >
        &raquo;
      </button>

      <span className="text-sm text-foreground/60 ml-2 font-mono">
        Move {step} / {totalSteps}
      </span>
    </div>
  );
}
