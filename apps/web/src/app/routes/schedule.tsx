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

const WEEKLY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MIN_START_MINUTES = 30;
const MIN_DURATION_MINUTES = 30;
const WARN_DURATION_MINUTES = 8 * 60;
const MAX_DURATION_MINUTES = 12 * 60;

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

const formatWeekLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(date);

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

const formatDay = (value: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
    new Date(value),
  );

const formatShiftDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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

const getShiftValidation = (shift: {
  startAt: string;
  endAt: string;
  headcount: number;
  requiredSkillId: string;
}) => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const now = new Date();
  const minStart = addMinutes(now, MIN_START_MINUTES);

  const start = shift.startAt ? new Date(shift.startAt) : null;
  const end = shift.endAt ? new Date(shift.endAt) : null;

  if (!shift.startAt) {
    errors.startAt = 'Start time is required.';
  } else if (!start || Number.isNaN(start.getTime())) {
    errors.startAt = 'Start time is invalid.';
  } else if (start < minStart) {
    errors.startAt = 'Start time must be at least 30 minutes from now.';
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
      errors.endAt = 'Shift must be at least 30 minutes.';
    } else if (diffMinutes > MAX_DURATION_MINUTES) {
      errors.endAt = 'Shift cannot exceed 12 hours.';
    } else if (diffMinutes > WARN_DURATION_MINUTES) {
      warnings.duration = 'Shift exceeds 8 hours.';
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
  const [assignInputs, setAssignInputs] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<AssignmentError | null>(null);
  const shiftValidation = useMemo(
    () => getShiftValidation(newShift),
    [newShift],
  );
  const minStartAt = toDateTimeInput(addMinutes(new Date(), MIN_START_MINUTES));
  const minEndAt = newShift.startAt
    ? toDateTimeInput(
        addMinutes(new Date(newShift.startAt), MIN_DURATION_MINUTES),
      )
    : minStartAt;

  const weekStartDate = useMemo(
    () => new Date(`${weekStart}T00:00:00`),
    [weekStart],
  );
  const weekEndDate = useMemo(() => {
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStartDate]);

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

  const locations = locationsQuery.data ?? [];
  const skills = skillsQuery.data ?? [];
  const activeLocationId = locationId || locations[0]?.id || '';

  const staffQuery = useQuery({
    queryKey: ['staff', activeLocationId],
    queryFn: () => listStaff(activeLocationId),
    enabled: Boolean(canFetch && activeLocationId),
  });

  const shiftsQuery = useQuery({
    queryKey: [
      'shifts',
      activeLocationId,
      weekStartDate.toISOString(),
      weekEndDate.toISOString(),
    ],
    queryFn: () =>
      listShifts({
        locationId: activeLocationId,
        start: weekStartDate.toISOString(),
        end: weekEndDate.toISOString(),
      }),
    enabled: Boolean(canFetch && activeLocationId),
  });

  const createMutation = useMutation({
    mutationFn: (input: ShiftInput) => createShift(input),
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
      void queryClient.invalidateQueries({
        queryKey: [
          'shifts',
          activeLocationId,
          weekStartDate.toISOString(),
          weekEndDate.toISOString(),
        ],
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (shiftId: string) => publishShift(shiftId),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: [
          'shifts',
          activeLocationId,
          weekStartDate.toISOString(),
          weekEndDate.toISOString(),
        ],
      }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (shiftId: string) => unpublishShift(shiftId),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: [
          'shifts',
          activeLocationId,
          weekStartDate.toISOString(),
          weekEndDate.toISOString(),
        ],
      }),
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { shiftId: string; staffId: string }) =>
      assignShift(payload.shiftId, payload.staffId),
    onSuccess: () => {
      setConflict(null);
    },
    onError: (error) => {
      const parsed = parseAssignmentError(error);
      if (parsed) setConflict(parsed);
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
  const weekLabel = formatWeekLabel(weekStartDate);
  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );
  const staffByShift = useMemo(() => {
    const map = new Map<string, ShiftStaff[]>();
    shifts.forEach((shift, index) => {
      const data = staffAvailabilityQueries[index]?.data as
        | ShiftStaff[]
        | undefined;
      map.set(shift.id, data ?? []);
    });
    return map;
  }, [shifts, staffAvailabilityQueries]);
  const shiftBlocks = shifts.map((shift) => {
    const assignedCount = shift.assignments?.length ?? 0;
    return {
      id: shift.id,
      day: formatDay(shift.startAt),
      start: formatTime(shift.startAt),
      end: formatTime(shift.endAt),
      title: shift.title || 'Shift',
      meta: `${assignedCount} of ${shift.headcount} filled`,
      status: shift.status,
    };
  });

  const draftShifts = shifts.filter((shift) => shift.status === 'draft');
  const publishWeekDisabled = !draftShifts.length || publishMutation.isPending;
  const canLoad = Boolean(canFetch && activeLocationId);
  const showEmpty = canLoad && !shifts.length && !shiftsQuery.isLoading;
  const createDisabled =
    createMutation.isPending ||
    !activeLocationId ||
    !newShift.title.trim() ||
    !newShift.requiredSkillId;

  const handleCreate = () => {
    setShowValidation(true);
    const validation = getShiftValidation(newShift);
    if (Object.keys(validation.errors).length) return;
    const location = activeLocationId;
    if (!location || !newShift.startAt || !newShift.endAt) return;
    createMutation.mutate({
      locationId: location,
      startAt: newShift.startAt,
      endAt: newShift.endAt,
      headcount: Number(newShift.headcount) || 1,
      requiredSkillId: newShift.requiredSkillId,
      title: newShift.title.trim(),
      notes: newShift.notes || null,
    });
  };

  const handlePublishWeek = () => {
    if (!draftShifts.length) return;
    draftShifts.forEach((shift) => publishMutation.mutate(shift.id));
  };

  const handleAssign = (shiftId: string) => {
    const staffId = assignInputs[shiftId];
    if (!staffId) return;
    assignMutation.mutate({ shiftId, staffId });
  };

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
            <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
              Location
            </label>
            <select
              className="w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink"
              value={activeLocationId}
              onChange={(event) => setLocationId(event.target.value)}
            >
              <option value="">Select a location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {formatTimezoneDisplay(location.timezone)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
              Week starting
            </label>
            <Input
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
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Start time
              </label>
              <Input
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
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                End time
              </label>
              <Input
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
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Headcount
              </label>
              <Input
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
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Required skill
              </label>
              <select
                className="w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink"
                value={newShift.requiredSkillId}
                onChange={(event) =>
                  setNewShift((prev) => ({
                    ...prev,
                    requiredSkillId: event.target.value,
                  }))
                }
                onInput={() => setLastCreateWarning('')}
              >
                <option value="">Select a skill</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
              {showValidation && shiftValidation.errors.requiredSkillId ? (
                <p className="text-xs text-rose-200/90">
                  {shiftValidation.errors.requiredSkillId}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Shift title
              </label>
              <Input
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
              <label className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Notes
              </label>
              <Textarea
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
          {shiftValidation.warnings.duration ? (
            <div className="mt-3">
              <Badge className="bg-amber-500/20 text-amber-200">
                {shiftValidation.warnings.duration}
              </Badge>
            </div>
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

      <div className="grid gap-6">
        {shifts.map((shift) => {
          const durationMinutes = getDurationMinutes(
            shift.startAt,
            shift.endAt,
          );
          const warning =
            durationMinutes > WARN_DURATION_MINUTES
              ? 'Shift exceeds 8 hours'
              : undefined;
          const shiftStaff = staffByShift.get(shift.id) ?? staff;
          const selectableStaff = shiftStaff.filter(
            (member) =>
              !('availability' in member) ||
              member.availability !== 'unavailable',
          );
          return (
            <ShiftCard
              key={shift.id}
              title={shift.title || 'Shift'}
              timeRange={`${formatShiftDate(shift.startAt)} · ${formatTime(shift.startAt)} - ${formatTime(shift.endAt)} · ${formatShiftDuration(
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
                    onClick={() => publishMutation.mutate(shift.id)}
                    disabled={publishMutation.isPending}
                  >
                    <UploadCloud className="h-4 w-4" />
                    Publish
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20"
                    onClick={() => unpublishMutation.mutate(shift.id)}
                    disabled={unpublishMutation.isPending}
                  >
                    <Undo2 className="h-4 w-4" />
                    Unpublish
                  </Button>
                )
              }
              assignments={
                shift.assignments?.map((assignment) => ({
                  name: assignment.staffName,
                  status:
                    assignment.status === 'assigned' ? 'assigned' : 'pending',
                })) ?? []
              }
              actions={
                <div className="w-full space-y-3">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-ink/50">
                      Assign staff
                    </label>
                    <select
                      className="w-full rounded-2xl border border-white/15 bg-mist/80 px-4 py-2 text-sm text-ink"
                      value={assignInputs[shift.id] ?? ''}
                      disabled={!selectableStaff.length}
                      onChange={(event) =>
                        setAssignInputs((prev) => ({
                          ...prev,
                          [shift.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {selectableStaff.length
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
                  {staffByShift.get(shift.id)?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {staffByShift
                        .get(shift.id)
                        ?.slice(0, 5)
                        .map((member) => (
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
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleAssign(shift.id)}
                      disabled={assignMutation.isPending}
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
