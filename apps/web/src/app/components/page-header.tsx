import * as React from 'react';
import { cn } from '../lib/cn';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)} {...props}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-sm uppercase tracking-[0.2em] text-ink/40">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl text-ink md:text-4xl">{title}</h1>
        {subtitle ? <p className="max-w-2xl text-ink/70">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
