import * as React from 'react';
import { cn } from '../lib/cn';

type PresenceItem = {
  name: string;
  role?: string;
  location?: string;
};

type PresenceListProps = {
  items: PresenceItem[];
} & React.HTMLAttributes<HTMLDivElement>;

export function PresenceList({
  items,
  className,
  ...props
}: PresenceListProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {items.map((item) => (
        <div
          key={`${item.name}-${item.location ?? ''}`}
          className="flex items-center justify-between rounded-2xl bg-sand/70 px-4 py-2 text-sm"
        >
          <div>
            <p className="text-ink">{item.name}</p>
            <p className="text-xs text-ink/60">
              {item.role ?? 'Staff'} · {item.location ?? 'On duty'}
            </p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
      ))}
    </div>
  );
}
