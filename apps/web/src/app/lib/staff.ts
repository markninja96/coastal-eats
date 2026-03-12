import { apiFetch } from './api';

export type StaffMember = {
  id: string;
  name: string;
  email: string;
};

export async function listStaff(locationId?: string) {
  const query = locationId ? `?${new URLSearchParams({ locationId })}` : '';
  const response = await apiFetch<StaffMember[]>(`/api/staff${query}`);
  return response ?? [];
}
