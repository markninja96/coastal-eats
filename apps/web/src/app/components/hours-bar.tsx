import * as React from 'react';
import { cn } from '../lib/cn';

type HoursBarProps = {
  assigned: number;
  desired: number;
} & React.HTMLAttributes<HTMLDivElement>;

export function HoursBar({
  assigned,
  desired,
  className,
  ...props
}: HoursBarProps) {
  const max = Math.max(assigned, desired, 1);
  const assignedPercent = Math.round((assigned / max) * 100);
  const desiredPercent = Math.round((desired / max) * 100);

  return (
    <div className={cn('space-y-2', className)} {...props}>
      <div className="flex items-center justify-between text-xs text-ink/60">
        <span>Assigned {assigned}h</span>
        <span>Desired {desired}h</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-sand/60">
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-coral/70"
          style={{ width: `${desiredPercent}%` }}
        />
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-emerald-400/70"
          style={{ width: `${assignedPercent}%` }}
        />
      </div>
    </div>
  );
}
