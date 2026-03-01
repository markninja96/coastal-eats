import * as React from 'react';
import { cn } from '../lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink placeholder:text-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
