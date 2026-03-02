import * as React from 'react';
import { cn } from '../lib/cn';

type OvertimeMeterProps = {
  label: string;
  hours: number;
  limit: number;
  warningAt?: number;
} & React.HTMLAttributes<HTMLDivElement>;

export function OvertimeMeter({
  label,
  hours,
  limit,
  warningAt = 35,
  className,
  ...props
}: OvertimeMeterProps) {
  const percent = Math.min(100, Math.round((hours / limit) * 100));
  const tone =
    hours >= limit
      ? 'bg-coral'
      : hours >= warningAt
        ? 'bg-amber-400'
        : 'bg-emerald-400';

  return (
    <div className={cn('space-y-2', className)} {...props}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink/70">{label}</span>
        <span className="text-ink/70">
          {hours}h / {limit}h
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-sand/60">
        <div
          className={cn('h-2 rounded-full', tone)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
