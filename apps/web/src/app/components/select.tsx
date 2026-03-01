import * as React from 'react';
import { cn } from '../lib/cn';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = 'Select';
