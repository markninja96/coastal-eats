import * as React from 'react';
import { cn } from '../lib/cn';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function EmptyState({
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-mist/80 p-8 text-center',
        className,
      )}
      {...props}
    >
      <h3 className="font-display text-xl text-ink">{title}</h3>
      {description ? (
        <p className="text-sm text-ink/60">{description}</p>
      ) : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
