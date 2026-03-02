import * as React from 'react';
import { Badge } from './badge';

type PremiumShiftTagProps = {
  label?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export function PremiumShiftTag({
  label = 'Premium',
  ...props
}: PremiumShiftTagProps) {
  return (
    <Badge variant="accent" {...props}>
      {label}
    </Badge>
  );
}
