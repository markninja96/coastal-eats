import { apiFetch } from './api';

export type StaffMember = {
  id: string;
  name: string;
  email: string;
};

export async function listStaff(
  locationId?: string,
  options?: { signal?: AbortSignal },
) {
  const query = locationId ? `?${new URLSearchParams({ locationId })}` : '';
  const response = await apiFetch<StaffMember[]>(`/api/staff${query}`, {
    signal: options?.signal,
  });
  return response ?? [];
}
