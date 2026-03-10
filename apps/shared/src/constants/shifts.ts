export const MIN_START_MINUTES = 30;
export const MIN_DURATION_MINUTES = 30;
export const WARN_DURATION_MINUTES = 8 * 60;
export const MAX_DURATION_MINUTES = 12 * 60;

const formatDuration = (minutes: number) => {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

export const getShiftMinStartMessage = () =>
  `Start time must be at least ${formatDuration(MIN_START_MINUTES)} from now.`;

export const getShiftMinDurationMessage = () =>
  `Shift must be at least ${formatDuration(MIN_DURATION_MINUTES)}.`;

export const getShiftWarnDurationMessage = () =>
  `Shift exceeds ${formatDuration(WARN_DURATION_MINUTES)}.`;

export const getShiftMaxDurationMessage = () =>
  `Shift cannot exceed ${formatDuration(MAX_DURATION_MINUTES)}.`;
