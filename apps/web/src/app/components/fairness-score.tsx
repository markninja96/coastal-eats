import * as React from 'react';
import { cn } from '../lib/cn';

type FairnessScoreProps = {
  score: number;
  label?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function FairnessScore({
  score,
  label = 'Fairness score',
  className,
  ...props
}: FairnessScoreProps) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={cn('flex items-center gap-4', className)} {...props}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-sand/60 text-lg font-semibold text-ink">
        {clamped}
      </div>
      <div>
        <p className="text-sm text-ink/60">{label}</p>
        <p className="text-xs text-ink/40">
          Target 80+ for balanced premium shifts
        </p>
      </div>
    </div>
  );
}
