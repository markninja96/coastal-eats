import * as React from 'react';
import { cn } from '../lib/cn';

type NotificationItemProps = {
  title: string;
  body: string;
  time: string;
  unread?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function NotificationItem({
  title,
  body,
  time,
  unread = false,
  className,
  ...props
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-mist/80 p-4 text-sm',
        unread && 'border-coral/40 bg-coral/10',
        className,
      )}
      {...props}
    >
      <div className="space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-ink/60">{body}</p>
      </div>
      <span className="text-xs text-ink/50">{time}</span>
    </div>
  );
}
