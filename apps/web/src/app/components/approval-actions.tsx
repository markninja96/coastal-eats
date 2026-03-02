import * as React from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';

type ApprovalActionsProps = {
  onApprove?: () => void;
  onReject?: () => void;
  approveLabel?: string;
  rejectLabel?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function ApprovalActions({
  onApprove,
  onReject,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  className,
  ...props
}: ApprovalActionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} {...props}>
      <Button size="sm" onClick={onApprove}>
        {approveLabel}
      </Button>
      <Button size="sm" variant="outline" onClick={onReject}>
        {rejectLabel}
      </Button>
    </div>
  );
}
