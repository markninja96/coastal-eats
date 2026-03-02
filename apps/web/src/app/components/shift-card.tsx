import * as React from 'react';
import { CalendarClock, MapPin, Users } from 'lucide-react';
import { Badge } from './badge';
import { Card, CardBody, CardHeader } from './card';
import { AssignmentPill } from './assignment-pill';

type ShiftAssignment = {
  name: string;
  role?: string;
  status?: 'assigned' | 'pending' | 'swap' | 'unavailable';
};

type ShiftCardProps = {
  title: string;
  timeRange: string;
  location: string;
  headcount: string;
  status?: 'draft' | 'published';
  assignments?: ShiftAssignment[];
  actions?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function ShiftCard({
  title,
  timeRange,
  location,
  headcount,
  status = 'draft',
  assignments = [],
  actions,
  className,
  ...props
}: ShiftCardProps) {
  return (
    <Card className={className} {...props}>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={status === 'published' ? 'accent' : 'muted'}>
              {status}
            </Badge>
            <h3 className="font-display text-xl">{title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink/70">
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              {timeRange}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {location}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              {headcount}
            </span>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </CardHeader>
      {assignments.length ? (
        <CardBody className="mt-6 flex flex-wrap gap-2">
          {assignments.map((assignment) => (
            <AssignmentPill
              key={`${assignment.name}-${assignment.role ?? ''}`}
              name={assignment.name}
              role={assignment.role}
              status={assignment.status}
            />
          ))}
        </CardBody>
      ) : null}
    </Card>
  );
}
