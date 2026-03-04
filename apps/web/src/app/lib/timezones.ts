export function formatTimezoneOffset(
  timeZone: string,
  date = new Date(),
): string {
  const offsetMinutes = getTimezoneOffsetMinutes(date, timeZone);
  if (offsetMinutes === null) return '';
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const minutesPart = minutes ? `:${String(minutes).padStart(2, '0')}` : '';
  return `GMT${sign}${hours}${minutesPart}`;
}

export function formatTimezoneDisplay(
  timeZone: string,
  date = new Date(),
): string {
  const offset = formatTimezoneOffset(timeZone, date);
  if (!offset) return timeZone;
  return `${timeZone} (${offset})`;
}

export function buildTimezoneOffsetMap(
  timezones: string[],
  date = new Date(),
): Record<string, string> {
  return timezones.reduce<Record<string, string>>((acc, zone) => {
    const offset = formatTimezoneOffset(zone, date);
    if (offset) acc[zone] = offset;
    return acc;
  }, {});
}

function getTimezoneOffsetMinutes(date: Date, timeZone: string): number | null {
  if (!timeZone) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const values: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') values[part.type] = part.value;
    }
    const utcDate = new Date(
      `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`,
    );
    return Math.round((utcDate.getTime() - date.getTime()) / 60000);
  } catch {
    return null;
  }
}
