import * as React from 'react';
import { Select } from './select';
import { buildTimezoneOffsetMap } from '../lib/timezones';

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

type TimezoneSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  value?: string;
  onChange?: (value: string) => void;
};

export function TimezoneSelect(props: TimezoneSelectProps) {
  const { value, className, ...rest } = props;
  const onValueChange = props.onChange;
  const nativeOnChange =
    rest.onChange as React.SelectHTMLAttributes<HTMLSelectElement>['onChange'];
  const [timezones] = React.useState(() => getTimezones());
  const [offsets] = React.useState(() => buildTimezoneOffsetMap(timezones));

  return (
    <Select
      className={className}
      value={value}
      onChange={(event) => {
        nativeOnChange?.(event);
        onValueChange?.(event.target.value);
      }}
      {...rest}
    >
      <option value="">Select timezone</option>
      {timezones.map((zone) => (
        <option key={zone} value={zone}>
          {offsets[zone] ? `${zone} (${offsets[zone]})` : zone}
        </option>
      ))}
    </Select>
  );
}
