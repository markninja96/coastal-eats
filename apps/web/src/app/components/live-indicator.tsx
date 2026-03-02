import * as React from 'react';
import { cn } from '../lib/cn';

type LiveIndicatorProps = {
  label?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export function LiveIndicator({
  label = 'Live',
  className,
  ...props
}: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200',
        className,
      )}
      {...props}
    >
      <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
      {label}
    </span>
  );
}
