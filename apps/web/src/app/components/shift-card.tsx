import * as React from 'react';
import { CalendarClock, MapPin, Users } from 'lucide-react';
import { Badge } from './badge';
import { Card, CardHeader } from './card';
import { AssignmentPill } from './assignment-pill';

type ShiftAssignment = {
  id: string;
  name: string;
  role?: string;
  status?: 'assigned' | 'pending' | 'swap' | 'unavailable';
};

type ShiftCardProps = {
  title: React.ReactNode;
  timeRange: string;
  location: string;
  headcount: string;
  warning?: string;
  status?: 'draft' | 'published';
  assignments?: ShiftAssignment[];
  statusAction?: React.ReactNode;
  actions?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function ShiftCard({
  title,
  timeRange,
  location,
  headcount,
  warning,
  status = 'draft',
  assignments = [],
  statusAction,
  actions,
  className,
  ...props
}: ShiftCardProps) {
  return (
    <Card className={className} {...props}>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status === 'published' ? 'accent' : 'muted'}>
              {status}
            </Badge>
            <h3 className="font-display text-xl">{title}</h3>
            {statusAction ? (
              <div className="ml-auto flex items-center gap-2">
                {statusAction}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink/70">
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              {timeRange}
            </span>
            {warning ? (
              <Badge className="bg-amber-500/20 text-amber-200">
                {warning}
              </Badge>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {location}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              {headcount}
            </span>
          </div>
          {assignments.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {assignments.map((assignment) => (
                <AssignmentPill
                  key={assignment.id}
                  name={assignment.name}
                  role={assignment.role}
                  status={assignment.status}
                />
              ))}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="w-full md:ml-auto md:w-[420px] md:shrink-0">
            {actions}
          </div>
        ) : null}
      </CardHeader>
    </Card>
  );
}
