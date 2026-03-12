import { apiFetch } from './api';

export type Shift = {
  id: string;
  locationId: string;
  startAt: string;
  endAt: string;
  requiredSkillId: string;
  headcount: number;
  status: 'draft' | 'published';
  title: string;
  notes?: string | null;
  publishedAt?: string | null;
  assignments?: AssignmentSummary[];
};

export type ShiftStaff = {
  id: string;
  name: string;
  availability: 'available' | 'unavailable';
  reason?: string;
};

export type Assignment = {
  id: string;
  shiftId: string;
  staffId: string;
  status: 'assigned' | 'cancelled';
  assignedBy: string;
  assignedAt: string;
  cancelledAt?: string | null;
};

type AssignmentSummary = {
  id: string;
  staffId: string;
  staffName: string;
  status: Assignment['status'];
};

export type ConstraintViolation = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type Suggestion = {
  id: string;
  name: string;
  detail?: string;
};

export type AssignmentError = {
  message: string;
  violations?: ConstraintViolation[];
  suggestions?: Suggestion[];
};

export type ShiftInput = {
  locationId: string;
  startAt: string;
  endAt: string;
  requiredSkillId: string;
  headcount: number;
  title: string;
  notes?: string | null;
};

export type ShiftWarning = {
  code: 'duration';
  message: string;
};

export type CreateShiftResponse = {
  shift: Shift;
  warnings?: ShiftWarning[];
};

type ListParams = {
  locationId: string;
  start?: string;
  end?: string;
};

export async function listShifts(params: ListParams) {
  const query = new URLSearchParams({
    locationId: params.locationId,
    ...(params.start ? { start: params.start } : {}),
    ...(params.end ? { end: params.end } : {}),
  });
  const response = await apiFetch<Shift[]>(`/api/shifts?${query.toString()}`);
  return response ?? [];
}

export async function createShift(input: ShiftInput) {
  const response = await apiFetch<CreateShiftResponse>('/api/shifts', {
    method: 'POST',
    body: input,
  });
  return ensureResponse(response, 'Empty shift response');
}

export async function updateShift(shiftId: string, input: Partial<ShiftInput>) {
  const encodedShiftId = encodeURIComponent(shiftId);
  const response = await apiFetch<Shift>(`/api/shifts/${encodedShiftId}`, {
    method: 'PATCH',
    body: input,
  });
  return ensureResponse(response, 'Empty shift response');
}

export async function publishShift(shiftId: string) {
  const encodedShiftId = encodeURIComponent(shiftId);
  const response = await apiFetch<Shift>(
    `/api/shifts/${encodedShiftId}/publish`,
    {
      method: 'POST',
    },
  );
  return ensureResponse(response, 'Empty shift response');
}

export async function unpublishShift(shiftId: string) {
  const encodedShiftId = encodeURIComponent(shiftId);
  const response = await apiFetch<Shift>(
    `/api/shifts/${encodedShiftId}/unpublish`,
    {
      method: 'POST',
    },
  );
  return ensureResponse(response, 'Empty shift response');
}

export async function assignShift(shiftId: string, staffId: string) {
  const encodedShiftId = encodeURIComponent(shiftId);
  const response = await apiFetch<Assignment>(
    `/api/shifts/${encodedShiftId}/assignments`,
    {
      method: 'POST',
      body: { staffId },
    },
  );
  return ensureResponse(response, 'Empty assignment response');
}

export async function listShiftStaff(shiftId: string) {
  const encodedShiftId = encodeURIComponent(shiftId);
  const response = await apiFetch<ShiftStaff[]>(
    `/api/shifts/${encodedShiftId}/staff`,
  );
  return response ?? [];
}

const ensureResponse = <T>(
  response: T | null | undefined,
  message: string,
): T => {
  if (response == null) throw new Error(message);
  return response;
};
