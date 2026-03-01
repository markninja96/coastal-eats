import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../lib/cn';

const icons = {
  info: Info,
  warn: AlertTriangle,
  success: CheckCircle2,
};

type InlineAlertProps = {
  tone?: keyof typeof icons;
  title: string;
  description?: string;
  actions?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function InlineAlert({
  tone = 'info',
  title,
  description,
  actions,
  className,
  ...props
}: InlineAlertProps) {
  const Icon = icons[tone];

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-white/15 bg-sand/70 p-4 text-sm text-ink/80',
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-white/10 p-2 text-ink/80">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-ink">{title}</p>
          {description ? <p className="text-ink/60">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
