import { apiFetch } from './api';

export type Location = {
  id: string;
  name: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  timezone: string;
};

export async function listLocations(options?: { signal?: AbortSignal }) {
  const response = await apiFetch<Location[]>('/api/locations', {
    signal: options?.signal,
  });
  return response ?? [];
}

export async function createLocation(input: {
  name: string;
  city?: string;
  region?: string;
  country?: string;
  timezone: string;
}) {
  const response = await apiFetch<Location>('/api/locations', {
    method: 'POST',
    body: input,
  });
  if (!response) throw new Error('Empty location response');
  return response;
}
