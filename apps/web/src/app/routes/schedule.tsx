import { useMemo, useState } from 'react';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { PageHeader } from '../components/page-header';
import { WeeklyGrid } from '../components/weekly-grid';
import { ShiftCard } from '../components/shift-card';
import { Button } from '../components/button';
import { Card, CardBody, CardHeader } from '../components/card';
import { ConflictBanner } from '../components/conflict-banner';
import { Undo2, UploadCloud } from 'lucide-react';
import { AvailabilityBadge } from '../components/availability-badge';
import { Input } from '../components/input';
import { Textarea } from '../components/textarea';
import { Badge } from '../components/badge';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { listLocations } from '../lib/locations';
import { listSkills } from '../lib/skills';
import { listStaff } from '../lib/staff';
import { formatTimezoneDisplay } from '../lib/timezones';
import {
  MAX_DURATION_MINUTES,
  getShiftMaxDurationMessage,
  getShiftMinDurationMessage,
  getShiftMinStartMessage,
  getShiftWarnDurationMessage,
  MIN_DURATION_MINUTES,
  MIN_START_MINUTES,
  WARN_DURATION_MINUTES,
} from '../lib/shifts.constants';
import {
  assignShift,
  createShift,
  listShifts,
  listShiftStaff,
  publishShift,
  unpublishShift,
  type AssignmentError,
  type ShiftStaff,
  type ShiftInput,
} from '../lib/shifts';

const WEEKLY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateInput = (value: Date) => value.toLocaleDateString('en-CA');

const toDateTimeInput = (value: Date) => {
  const pad = (input: number) => String(input).padStart(2, '0');
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const addMinutes = (value: Date, minutes: number) =>
  new Date(value.getTime() + minutes * 60000);

const toMinutePrecision = (value: Date) => {
  const next = new Date(value);
  if (next.getSeconds() > 0 || next.getMilliseconds() > 0) {
    next.setMinutes(next.getMinutes() + 1);
  }
  next.setSeconds(0, 0);
  return next;
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
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
    const utcDate = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );
    return utcDate - date.getTime();
  } catch (error) {
    console.warn(
      `Invalid time zone offset lookup for ${timeZone}: ${String(error)}`,
    );
    if (process.env.NODE_ENV !== 'production') {
      throw error;
    }
    return 0;
  }
};

const toTimeZoneDate = (value: string, timeZone: string) => {
  const base = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  const offsetMs = getTimeZoneOffsetMs(base, timeZone);
  return new Date(base.getTime() - offsetMs);
};

const toTimeZoneDateTime = (value: string, timeZone: string) => {
  const base = new Date(`${value}Z`);
  if (Number.isNaN(base.getTime())) return null;
  const offsetMs = getTimeZoneOffsetMs(base, timeZone);
  return new Date(base.getTime() - offsetMs);
};

const toTimeZoneDateTimeInput = (value: Date, timeZone: string) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(value);
    const values: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') values[part.type] = part.value;
    }
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  } catch {
    return toDateTimeInput(value);
  }
};

const addDaysToDateInput = (value: string, days: number) => {
  const base = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const formatShiftDuration = (startAt: string, endAt: string) => {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '';
  const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
  if (!diffMinutes) return '0 minutes';
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
  }
  if (diffMinutes >= 1440) {
    const days = Math.floor(diffMinutes / 1440);
    const remainingMinutes = diffMinutes % 1440;
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    const parts = [`${days} day${days === 1 ? '' : 's'}`];
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join(' ');
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (!minutes) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

const getDurationMinutes = (startAt: string, endAt: string) => {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
};

const startOfWeek = (value: Date) => {
  const date = new Date(value);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatWeekLabel = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(date);

const formatTime = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value));

const formatDay = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(
    new Date(value),
  );

const formatShiftDate = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(value));

const parseAssignmentError = (error: unknown): AssignmentError | null => {
  if (!(error instanceof ApiError)) return null;
  if (!error.body) return null;
  try {
    const parsed = JSON.parse(error.body) as AssignmentError;
    if (!parsed || typeof parsed.message !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

const getShiftValidation = (
  shift: {
    startAt: string;
    endAt: string;
    headcount: number;
    requiredSkillId: string;
  },
  activeTimezone: string,
) => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const now = new Date();
  const minStart = toMinutePrecision(addMinutes(now, MIN_START_MINUTES));

  const start = shift.startAt
    ? toTimeZoneDateTime(shift.startAt, activeTimezone)
    : null;
  const end = shift.endAt
    ? toTimeZoneDateTime(shift.endAt, activeTimezone)
    : null;

  if (!shift.startAt) {
    errors.startAt = 'Start time is required.';
  } else if (!start || Number.isNaN(start.getTime())) {
    errors.startAt = 'Start time is invalid.';
  } else if (start < minStart) {
    errors.startAt = getShiftMinStartMessage();
  }

  if (!shift.endAt) {
    errors.endAt = 'End time is required.';
  } else if (!end || Number.isNaN(end.getTime())) {
    errors.endAt = 'End time is invalid.';
  }

  if (
    start &&
    end &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime())
  ) {
    const diffMinutes = (end.getTime() - start.getTime()) / 60000;
    if (diffMinutes <= 0) {
      errors.endAt = 'End time must be after start time.';
    } else if (diffMinutes < MIN_DURATION_MINUTES) {
      errors.endAt = getShiftMinDurationMessage();
    } else if (diffMinutes > MAX_DURATION_MINUTES) {
      errors.endAt = getShiftMaxDurationMessage();
    } else if (diffMinutes > WARN_DURATION_MINUTES) {
      warnings.duration = getShiftWarnDurationMessage();
    }
  }

  if (!Number.isInteger(shift.headcount) || shift.headcount < 1) {
    errors.headcount = 'Headcount must be at least 1.';
  }

  if (!shift.requiredSkillId) {
    errors.requiredSkillId = 'Required skill is mandatory.';
  }

  return { errors, warnings };
};

export function ScheduleRoute() {
  const { status } = useAuth();
  const canFetch = status === 'ready';
  const queryClient = useQueryClient();
  const [locationId, setLocationId] = useState('');
  const [weekStart, setWeekStart] = useState(() =>
    toDateInput(startOfWeek(new Date())),
  );
  const [newShift, setNewShift] = useState({
    startAt: '',
    endAt: '',
    headcount: 1,
    requiredSkillId: '',
    title: '',
    notes: '',
  });
  const [showValidation, setShowValidation] = useState(false);
  const [lastCreateWarning, setLastCreateWarning] = useState('');
  const [createError, setCreateError] = useState('');
  const [publishError, setPublishError] = useState('');
  const [unpublishError, setUnpublishError] = useState('');
  const [assignInputs, setAssignInputs] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<AssignmentError | null>(null);
  const [isPublishingBatch, setIsPublishingBatch] = useState(false);

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => listLocations(),
    enabled: canFetch,
  });

  const skillsQuery = useQuery({
    queryKey: ['skills'],
    queryFn: () => listSkills(),
    enabled: canFetch,
  });

  const locations = locationsQuery.data;
  const skills = skillsQuery.data;
  const locationsError = locationsQuery.isError;
  const skillsError = skillsQuery.isError;
  const activeLocationId = locationId || locations?.[0]?.id || '';
  const activeLocation = useMemo(
    () => locations?.find((location) => location.id === activeLocationId),
    [locations, activeLocationId],
  );
  const activeTimezone =
    activeLocation?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';

  const minStartAt = toTimeZoneDateTimeInput(
    toMinutePrecision(addMinutes(new Date(), MIN_START_MINUTES)),
    activeTimezone,
  );
  const minEndAt = newShift.startAt
    ? (() => {
        const startAt = toTimeZoneDateTime(newShift.startAt, activeTimezone);
        if (!startAt) return minStartAt;
        return toTimeZoneDateTimeInput(
          addMinutes(startAt, MIN_DURATION_MINUTES),
          activeTimezone,
        );
      })()
    : minStartAt;

  const shiftValidation = useMemo(
    () => getShiftValidation(newShift, activeTimezone),
    [newShift, activeTimezone],
  );

  const weekStartDate = useMemo(() => {
    if (!weekStart) return null;
    return toTimeZoneDate(weekStart, activeTimezone);
  }, [weekStart, activeTimezone]);
  const weekEndDate = useMemo(() => {
    if (!weekStart) return null;
    const nextWeekStart = addDaysToDateInput(weekStart, 7);
    if (!nextWeekStart) return null;
    return toTimeZoneDate(nextWeekStart, activeTimezone);
  }, [weekStart, activeTimezone]);
  const weekStartIso = weekStartDate?.toISOString() ?? '';
  const weekEndIso = weekEndDate?.toISOString() ?? '';

  const staffQuery = useQuery({
    queryKey: ['staff', activeLocationId],
    queryFn: () => listStaff(activeLocationId),
    enabled: Boolean(canFetch && activeLocationId),
  });

  const shiftsQuery = useQuery({
    queryKey: ['shifts', activeLocationId, weekStartIso, weekEndIso],
    queryFn: () =>
      listShifts({
        locationId: activeLocationId,
        start: weekStartIso,
        end: weekEndIso,
      }),
    enabled: Boolean(
      canFetch && activeLocationId && weekStartDate && weekEndDate,
    ),
  });

  const createMutation = useMutation({
    mutationFn: (input: ShiftInput) => createShift(input),
    onMutate: () => {
      setCreateError('');
    },
    onSuccess: (response) => {
      const warnings = response?.warnings ?? [];
      setLastCreateWarning(
        warnings.length
          ? warnings.map((warning) => warning.message).join(' ')
          : '',
      );
      setNewShift({
        startAt: '',
        endAt: '',
        headcount: 1,
        requiredSkillId: '',
        title: '',
        notes: '',
      });
      setShowValidation(false);
      setCreateError('');
      void queryClient.invalidateQueries({
        queryKey: ['shifts'],
      });
    },
    onError: (error) => {
      let message = 'Unable to create shift. Please try again.';
      if (error instanceof ApiError && error.body) {
        try {
          const parsed = JSON.parse(error.body) as { message?: string };
          if (parsed?.message) message = parsed.message;
        } catch {
          message = error.message || message;
        }
      } else if (error instanceof Error) {
        message = error.message || message;
      }
      setCreateError(message);
    },
  });

  const invalidateShifts = () =>
    queryClient.invalidateQueries({
      queryKey: ['shifts'],
    });

  const publishMutation = useMutation({
    mutationFn: (shiftId: string) => publishShift(shiftId),
    onSuccess: () => setPublishError(''),
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to publish shift. Please try again.';
      setPublishError(message);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (shiftId: string) => unpublishShift(shiftId),
    onSuccess: () => setUnpublishError(''),
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to unpublish shift. Please try again.';
      setUnpublishError(message);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { shiftId: string; staffId: string }) =>
      assignShift(payload.shiftId, payload.staffId),
    onSuccess: (_response, payload) => {
      setConflict(null);
      setAssignInputs((prev) => {
        const next = { ...prev };
        delete next[payload.shiftId];
        return next;
      });
      void invalidateShifts();
      void queryClient.invalidateQueries({ queryKey: ['shift-staff'] });
    },
    onError: (error) => {
      const parsed = parseAssignmentError(error);
      if (parsed) {
        setConflict(parsed);
        return;
      }
      console.error('Failed to assign shift', error);
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to assign - network or unexpected response';
      setConflict({ message: fallbackMessage });
    },
  });

  const shifts = shiftsQuery.data ?? [];
  const staff = staffQuery.data ?? [];
  const staffAvailabilityQueries = useQueries({
    queries: shifts.map((shift) => ({
      queryKey: ['shift-staff', shift.id],
      queryFn: () => listShiftStaff(shift.id) as Promise<ShiftStaff[]>,
      enabled: Boolean(canFetch && shift.id),
    })),
  });
  const weekLabel = weekStartDate
    ? formatWeekLabel(weekStartDate, activeTimezone)
    : 'Invalid week';
  const locationMap = useMemo(
    () => new Map((locations ?? []).map((location) => [location.id, location])),
    [locations],
  );
  const staffByShift = useMemo(() => {
    const map = new Map<
      string,
      {
        data?: ShiftStaff[];
        error?: unknown;
      }
    >();
    shifts.forEach((shift, index) => {
      const query = staffAvailabilityQueries[index];
      if (!query) return;
      const data = query.data as ShiftStaff[] | undefined;
      map.set(shift.id, {
        data: data ?? undefined,
        error: query.isError ? query.error : undefined,
      });
    });
    return map;
  }, [shifts, staffAvailabilityQueries]);
  const shiftBlocks = shifts.map((shift) => {
    const assignedCount = shift.assignments?.length ?? 0;
    return {
      id: shift.id,
      day: formatDay(shift.startAt, activeTimezone),
      start: formatTime(shift.startAt, activeTimezone),
      end: formatTime(shift.endAt, activeTimezone),
      title: shift.title || 'Shift',
      meta: `${assignedCount} of ${shift.headcount} filled`,
      status: shift.status,
    };
  });

  const draftShifts = shifts.filter((shift) => shift.status === 'draft');
  const publishWeekDisabled =
    !draftShifts.length || publishMutation.isPending || isPublishingBatch;
  const canLoad = Boolean(canFetch && activeLocationId);
  const hasValidWeek = Boolean(weekStartDate && weekEndDate);
  const showEmpty =
    canLoad &&
    hasValidWeek &&
    !shifts.length &&
    !shiftsQuery.isLoading &&
    !shiftsQuery.isError;
  const createDisabled =
    createMutation.isPending ||
    !activeLocationId ||
    !newShift.title.trim() ||
    !newShift.requiredSkillId;

  const handleCreate = () => {
    setCreateError('');
    setShowValidation(true);
    const validation = getShiftValidation(newShift, activeTimezone);
    if (Object.keys(validation.errors).length) return;
    const location = activeLocationId;
    if (!location || !newShift.startAt || !newShift.endAt) return;
    const startAt = toTimeZoneDateTime(newShift.startAt, activeTimezone);
    const endAt = toTimeZoneDateTime(newShift.endAt, activeTimezone);
    if (!startAt || !endAt) return;
    createMutation.mutate({
      locationId: location,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      headcount: Number(newShift.headcount) || 1,
      requiredSkillId: newShift.requiredSkillId,
      title: newShift.title.trim(),
      notes: newShift.notes || null,
    });
  };

  const handlePublishWeek = async () => {
    if (!draftShifts.length) return;
    setIsPublishingBatch(true);
    setPublishError('');
    try {
      const results = await Promise.allSettled(
        draftShifts.map((shift) => publishMutation.mutateAsync(shift.id)),
      );
      const failures = results
        .map((result, index) => ({ result, shift: draftShifts[index] }))
        .filter((entry) => entry.result.status === 'rejected');
      if (failures.length) {
        const details = failures
          .map(({ shift, result }) => {
            const reason =
              result.status === 'rejected' && result.reason instanceof Error
                ? result.reason.message
                : 'Unknown error';
            return `${shift.id}: ${reason}`;
          })
          .join('; ');
        setPublishError(`Failed to publish shifts: ${details}`);
      }
    } finally {
      setIsPublishingBatch(false);
      void invalidateShifts();
    }
  };

  const handleAssign = (shiftId: string) => {
    const staffId = assignInputs[shiftId];
    if (!staffId) return;
    assignMutation.mutate({ shiftId, staffId });
  };

  const locationSelectId = 'schedule-location';
  const weekStartId = 'schedule-week-start';
  const createStartId = 'create-shift-start';
  const createEndId = 'create-shift-end';
  const createHeadcountId = 'create-shift-headcount';
  const createSkillId = 'create-shift-skill';
  const createTitleId = 'create-shift-title';
  const createNotesId = 'create-shift-notes';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Scheduling"
        title="Weekly schedule"
        subtitle="Build, publish, and adjust shifts with live conflict checks."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handlePublishWeek}
              disabled={publishWeekDisabled}
            >
              Publish week
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Filters</h2>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label
              htmlFor={locationSelectId}
              className="text-xs uppercase tracking-[0.2em] text-ink/50"
            >
              Location
            </label>
            <select
              id={locationSelectId}
              className="w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink"
              value={activeLocationId}
              disabled={locationsQuery.isLoading || locationsError}
              onChange={(event) => setLocationId(event.target.value)}
            >
              <option value="">Select a location</option>
              {(locations ?? []).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ·{' '}
                  {formatTimezoneDisplay(
                    location.timezone,
                    weekStartDate ?? undefined,
                  )}
                </option>
              ))}
            </select>
            {locationsError ? (
              <p className="text-xs text-rose-200/90">
                Unable to load locations.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label
              htmlFor={weekStartId}
              className="text-xs uppercase tracking-[0.2em] text-ink/50"
            >
              Week starting
            </label>
            <Input
              id={weekStartId}
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Create shift</h2>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor={createStartId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Start time
              </label>
              <Input
                id={createStartId}
                type="datetime-local"
                value={newShift.startAt}
                min={minStartAt}
                onChange={(event) =>
                  setNewShift((prev) => ({
                    ...prev,
                    startAt: event.target.value,
                  }))
                }
                onInput={() => setLastCreateWarning('')}
              />
              {showValidation && shiftValidation.errors.startAt ? (
                <p className="text-xs text-rose-200/90">
                  {shiftValidation.errors.startAt}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label
                htmlFor={createEndId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                End time
              </label>
              <Input
                id={createEndId}
                type="datetime-local"
                value={newShift.endAt}
                min={minEndAt}
                onChange={(event) =>
                  setNewShift((prev) => ({
                    ...prev,
                    endAt: event.target.value,
                  }))
                }
                onInput={() => setLastCreateWarning('')}
              />
              {showValidation && shiftValidation.errors.endAt ? (
                <p className="text-xs text-rose-200/90">
                  {shiftValidation.errors.endAt}
                </p>
              ) : null}
              {shiftValidation.warnings.duration ? (
                <p className="text-xs text-amber-200/90">
                  {shiftValidation.warnings.duration}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label
                htmlFor={createHeadcountId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Headcount
              </label>
              <Input
                id={createHeadcountId}
                type="number"
                min={1}
                step={1}
                value={newShift.headcount}
                onChange={(event) =>
                  setNewShift((prev) => ({
                    ...prev,
                    headcount: Number(event.target.value),
                  }))
                }
                onInput={() => setLastCreateWarning('')}
                placeholder="Headcount"
              />
              {showValidation && shiftValidation.errors.headcount ? (
                <p className="text-xs text-rose-200/90">
                  {shiftValidation.errors.headcount}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label
                htmlFor={createSkillId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Required skill
              </label>
              <select
                id={createSkillId}
                className="w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink"
                value={newShift.requiredSkillId}
                disabled={skillsQuery.isLoading || skillsError}
                onChange={(event) =>
                  setNewShift((prev) => ({
                    ...prev,
                    requiredSkillId: event.target.value,
                  }))
                }
                onInput={() => setLastCreateWarning('')}
              >
                <option value="">Select a skill</option>
                {(skills ?? []).map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
              {skillsError ? (
                <p className="text-xs text-rose-200/90">
                  Unable to load skills.
                </p>
              ) : null}
              {showValidation && shiftValidation.errors.requiredSkillId ? (
                <p className="text-xs text-rose-200/90">
                  {shiftValidation.errors.requiredSkillId}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label
                htmlFor={createTitleId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Shift title
              </label>
              <Input
                id={createTitleId}
                value={newShift.title}
                onChange={(event) =>
                  setNewShift((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                onInput={() => setLastCreateWarning('')}
                placeholder="Shift title"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor={createNotesId}
                className="text-xs uppercase tracking-[0.2em] text-ink/50"
              >
                Notes
              </label>
              <Textarea
                id={createNotesId}
                value={newShift.notes}
                onChange={(event) =>
                  setNewShift((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                onInput={() => setLastCreateWarning('')}
                placeholder="Notes for the team"
              ></Textarea>
            </div>
          </div>

          <Button onClick={handleCreate} disabled={createDisabled}>
            Create shift
          </Button>
          {createError ? (
            <p className="mt-3 text-xs text-rose-200/90">{createError}</p>
          ) : null}
          {lastCreateWarning ? (
            <div className="mt-3">
              <Badge className="bg-amber-500/10 text-amber-200">
                Last created shift: {lastCreateWarning}
              </Badge>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-2xl">Week of {weekLabel}</h2>
        </CardHeader>
        <CardBody>
          <WeeklyGrid days={WEEKLY_DAYS} shifts={shiftBlocks} />
        </CardBody>
      </Card>

      {!activeLocationId ? (
        <Card>
          <CardBody className="text-sm text-ink/60">
            Select a location to load shifts for the week.
          </CardBody>
        </Card>
      ) : null}

      {shiftsQuery.isLoading ? (
        <Card>
          <CardBody className="text-sm text-ink/60">Loading shifts...</CardBody>
        </Card>
      ) : null}

      {shiftsQuery.isError ? (
        <Card>
          <CardBody className="text-sm text-ink/60">
            Unable to load shifts. Check the location ID or try again.
          </CardBody>
        </Card>
      ) : null}

      {showEmpty ? (
        <Card>
          <CardBody className="text-sm text-ink/60">
            No shifts found for this week.
          </CardBody>
        </Card>
      ) : null}

      {conflict ? (
        <ConflictBanner
          title={conflict.message}
          description={
            conflict.violations?.[0]?.message ||
            'Assignment violates scheduling constraints.'
          }
          rule={conflict.violations?.[0]?.code || 'Constraint'}
          suggestions={
            conflict.suggestions?.map((suggestion) => ({
              name: suggestion.name,
              detail: suggestion.detail,
            })) ?? []
          }
        />
      ) : null}

      {publishError ? (
        <Card>
          <CardBody className="text-sm text-rose-200/90">
            {publishError}
          </CardBody>
        </Card>
      ) : null}

      {unpublishError ? (
        <Card>
          <CardBody className="text-sm text-rose-200/90">
            {unpublishError}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6">
        {shifts.map((shift, index) => {
          const durationMinutes = getDurationMinutes(
            shift.startAt,
            shift.endAt,
          );
          const warning =
            durationMinutes > WARN_DURATION_MINUTES
              ? getShiftWarnDurationMessage()
              : undefined;
          const availabilityLoading =
            staffAvailabilityQueries[index]?.isLoading ?? false;
          const availabilityEntry = staffByShift.get(shift.id);
          const availabilityError = availabilityEntry?.error;
          const availabilityData = availabilityEntry?.data;
          const availabilityExtraCount = availabilityData
            ? Math.max(0, availabilityData.length - 5)
            : 0;
          const shiftStaff = availabilityLoading
            ? []
            : (availabilityData ?? staff);
          const selectableStaff = shiftStaff.filter(
            (member) =>
              !('availability' in member) ||
              member.availability !== 'unavailable',
          );
          return (
            <ShiftCard
              key={shift.id}
              title={shift.title || 'Shift'}
              timeRange={`${formatShiftDate(shift.startAt, activeTimezone)} · ${formatTime(shift.startAt, activeTimezone)} - ${formatTime(shift.endAt, activeTimezone)} · ${formatShiftDuration(
                shift.startAt,
                shift.endAt,
              )}`}
              location={
                locationMap.get(shift.locationId)?.name ??
                `Location ${shift.locationId.slice(0, 8)}`
              }
              headcount={`${shift.assignments?.length ?? 0} of ${shift.headcount} filled`}
              status={shift.status}
              warning={warning}
              statusAction={
                shift.status === 'draft' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20"
                    onClick={() =>
                      publishMutation.mutate(shift.id, {
                        onSuccess: () => void invalidateShifts(),
                      })
                    }
                    disabled={publishMutation.isPending || isPublishingBatch}
                  >
                    <UploadCloud className="h-4 w-4" />
                    Publish
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20"
                    onClick={() =>
                      unpublishMutation.mutate(shift.id, {
                        onSuccess: () => void invalidateShifts(),
                      })
                    }
                    disabled={unpublishMutation.isPending || isPublishingBatch}
                  >
                    <Undo2 className="h-4 w-4" />
                    Unpublish
                  </Button>
                )
              }
              assignments={
                shift.assignments?.map((assignment) => ({
                  id: assignment.id,
                  name: assignment.staffName,
                  status:
                    assignment.status === 'assigned' ? 'assigned' : 'pending',
                })) ?? []
              }
              actions={
                <div className="w-full space-y-3">
                  <div className="space-y-2">
                    <label
                      htmlFor={`assign-staff-${shift.id}`}
                      className="text-[10px] uppercase tracking-[0.2em] text-ink/50"
                    >
                      Assign staff
                    </label>
                    <select
                      id={`assign-staff-${shift.id}`}
                      className="w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink"
                      value={assignInputs[shift.id] ?? ''}
                      disabled={availabilityLoading || !selectableStaff.length}
                      onChange={(event) =>
                        setAssignInputs((prev) => ({
                          ...prev,
                          [shift.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {availabilityLoading
                          ? 'Loading availability...'
                          : availabilityError
                            ? 'Availability unavailable'
                            : selectableStaff.length
                              ? 'Select staff'
                              : 'No available staff'}
                      </option>
                      {selectableStaff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {`${member.name}${'email' in member ? ` · ${member.email}` : ''}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {availabilityError && !availabilityLoading ? (
                    <p className="text-xs text-rose-200/90">
                      Availability check failed; showing all staff.
                    </p>
                  ) : null}
                  {availabilityData?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {availabilityData.slice(0, 5).map((member) => (
                        <AvailabilityBadge
                          key={member.id}
                          status={
                            member.availability === 'available'
                              ? 'available'
                              : 'unavailable'
                          }
                          label={
                            member.availability === 'available'
                              ? `${member.name} available`
                              : `${member.name} unavailable`
                          }
                        />
                      ))}
                      {availabilityExtraCount > 0 ? (
                        <AvailabilityBadge
                          key={`availability-overflow-${shift.id}`}
                          status="partial"
                          label={`+${availabilityExtraCount} more`}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleAssign(shift.id)}
                      disabled={
                        assignMutation.isPending || !assignInputs[shift.id]
                      }
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
