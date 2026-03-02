import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const availabilityVariants = cva(
  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
  {
    variants: {
      status: {
        available: 'bg-emerald-500/20 text-emerald-200',
        unavailable: 'bg-white/10 text-ink/60',
        partial: 'bg-amber-500/20 text-amber-200',
      },
    },
    defaultVariants: {
      status: 'available',
    },
  },
);

type AvailabilityBadgeProps = VariantProps<typeof availabilityVariants> & {
  label: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export function AvailabilityBadge({
  label,
  status,
  className,
  ...props
}: AvailabilityBadgeProps) {
  return (
    <span
      className={cn(availabilityVariants({ status }), className)}
      {...props}
    >
      {label}
    </span>
  );
}
