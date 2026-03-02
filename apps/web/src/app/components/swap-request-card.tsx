import * as React from 'react';
import { Badge } from './badge';
import { Card, CardBody, CardHeader } from './card';
import { CountdownTag } from './countdown-tag';

type SwapRequestCardProps = {
  requester: string;
  shift: string;
  status: 'pending' | 'accepted' | 'approved' | 'rejected' | 'cancelled';
  type: 'swap' | 'drop';
  expiresIn?: string;
  note?: string;
  actions?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function SwapRequestCard({
  requester,
  shift,
  status,
  type,
  expiresIn,
  note,
  actions,
  className,
  ...props
}: SwapRequestCardProps) {
  return (
    <Card className={className} {...props}>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status === 'approved' ? 'accent' : 'muted'}>
              {status}
            </Badge>
            <Badge variant="muted">{type}</Badge>
          </div>
          <h3 className="font-display text-lg">{requester}</h3>
          <p className="text-sm text-ink/60">{shift}</p>
        </div>
        {expiresIn ? (
          <CountdownTag
            label={`Expires in ${expiresIn}`}
            tone={status === 'pending' ? 'warning' : 'neutral'}
          />
        ) : null}
      </CardHeader>
      {note || actions ? (
        <CardBody className="mt-4 flex flex-col gap-3">
          {note ? <p className="text-sm text-ink/70">{note}</p> : null}
          {actions ? <div>{actions}</div> : null}
        </CardBody>
      ) : null}
    </Card>
  );
}
