import * as React from 'react';
import { cn } from '../lib/cn';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[120px] w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink placeholder:text-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
