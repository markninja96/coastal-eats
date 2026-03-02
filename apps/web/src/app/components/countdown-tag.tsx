import * as React from 'react';
import { cn } from '../lib/cn';

type CountdownTagProps = {
  label: string;
  tone?: 'neutral' | 'warning' | 'urgent';
} & React.HTMLAttributes<HTMLSpanElement>;

const toneClasses: Record<NonNullable<CountdownTagProps['tone']>, string> = {
  neutral: 'bg-white/10 text-ink/70',
  warning: 'bg-amber-500/20 text-amber-200',
  urgent: 'bg-coral/20 text-coral',
};

export function CountdownTag({
  label,
  tone = 'neutral',
  className,
  ...props
}: CountdownTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}
