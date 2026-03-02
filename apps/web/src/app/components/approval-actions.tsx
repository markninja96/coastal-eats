import * as React from 'react';
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
  ...props
}: ApprovalActionsProps) {
  return (
    <div className="flex flex-wrap gap-2" {...props}>
      <Button size="sm" onClick={onApprove}>
        {approveLabel}
      </Button>
      <Button size="sm" variant="outline" onClick={onReject}>
        {rejectLabel}
      </Button>
    </div>
  );
}
