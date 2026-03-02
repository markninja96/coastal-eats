import * as React from 'react';
import { cn } from '../lib/cn';

type ShiftBlock = {
  id: string;
  day: string;
  start: string;
  end: string;
  title: string;
  meta?: string;
  status?: 'draft' | 'published';
};

type WeeklyGridProps = {
  days: string[];
  shifts: ShiftBlock[];
} & React.HTMLAttributes<HTMLDivElement>;

export function WeeklyGrid({
  days,
  shifts,
  className,
  ...props
}: WeeklyGridProps) {
  return (
    <div
      className={cn('rounded-3xl border border-white/15 bg-mist/90', className)}
      {...props}
    >
      <div
        className="grid gap-px border-b border-white/10 text-xs text-ink/60"
        style={{
          gridTemplateColumns: `repeat(${days.length + 1}, minmax(0, 1fr))`,
        }}
      >
        <div className="p-3">Time</div>
        {days.map((day) => (
          <div key={day} className="p-3 text-center font-medium text-ink/70">
            {day}
          </div>
        ))}
      </div>
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${days.length + 1}, minmax(0, 1fr))`,
        }}
      >
        <div className="space-y-6 p-4 text-xs text-ink/50">
          {['8 AM', '12 PM', '4 PM', '8 PM'].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        {days.map((day) => (
          <div key={day} className="space-y-3 p-3">
            {shifts
              .filter((shift) => shift.day === day)
              .map((shift) => (
                <div
                  key={shift.id}
                  className={cn(
                    'rounded-2xl border border-white/10 bg-sand/70 p-3 text-xs text-ink/80',
                    shift.status === 'published' &&
                      'border-coral/40 bg-coral/10',
                  )}
                >
                  <p className="font-semibold text-ink">{shift.title}</p>
                  <p className="text-ink/60">
                    {shift.start} - {shift.end}
                  </p>
                  {shift.meta ? (
                    <p className="text-ink/50">{shift.meta}</p>
                  ) : null}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
