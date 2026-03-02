import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const pillVariants = cva(
  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
  {
    variants: {
      status: {
        assigned: 'bg-sand/70 text-ink/90',
        pending: 'bg-coral/20 text-coral',
        swap: 'bg-white/10 text-ink/70',
        unavailable: 'bg-white/5 text-ink/40 line-through',
      },
    },
    defaultVariants: {
      status: 'assigned',
    },
  },
);

type AssignmentPillProps = {
  name: string;
  role?: string;
} & VariantProps<typeof pillVariants> &
  React.HTMLAttributes<HTMLDivElement>;

export function AssignmentPill({
  name,
  role,
  status,
  className,
  ...props
}: AssignmentPillProps) {
  return (
    <div className={cn(pillVariants({ status }), className)} {...props}>
      <span>{name}</span>
      {role ? (
        <span className="text-[11px] font-medium text-ink/50">{role}</span>
      ) : null}
    </div>
  );
}
