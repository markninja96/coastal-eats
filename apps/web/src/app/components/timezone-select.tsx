import * as React from 'react';
import { Select } from './select';

const fallbackTimezones = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
];

function getTimezones(): string[] {
  if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
    // @ts-expect-error supportedValuesOf is not in TS lib yet for some versions
    return Intl.supportedValuesOf('timeZone') as string[];
  }
  return fallbackTimezones;
}

type TimezoneSelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function TimezoneSelect({
  value,
  onChange,
  className,
}: TimezoneSelectProps) {
  const [timezones] = React.useState(() => getTimezones());

  return (
    <Select
      className={className}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      <option value="">Select timezone</option>
      {timezones.map((zone) => (
        <option key={zone} value={zone}>
          {zone}
        </option>
      ))}
    </Select>
  );
}
