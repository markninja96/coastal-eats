import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '../lib/cn';

type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/15 bg-mist/90 p-4',
        className,
      )}
    >
      <DayPicker
        classNames={{
          months: 'flex flex-col gap-4',
          month: 'space-y-3',
          caption: 'flex justify-between items-center text-sm text-ink/80',
          nav: 'flex items-center gap-2',
          table: 'w-full border-collapse',
          head_cell: 'text-xs font-medium text-ink/60 p-2',
          row: 'flex w-full',
          cell: 'h-9 w-9 text-center text-sm text-ink/80',
          day: 'h-9 w-9 rounded-full hover:bg-sand/40',
          day_selected: 'bg-coral text-white hover:bg-coral',
          day_today: 'border border-coral/80 text-ink',
        }}
        {...props}
      />
    </div>
  );
}
