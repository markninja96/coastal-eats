export class ApiError extends Error {
  status: number;
  body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string | null;
};

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export function apiUrl(path: string) {
  if (!path.startsWith('/')) return `${API_BASE}/${path}`;
  return `${API_BASE}${path}`;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}) {
  const { body, token, headers, ...rest } = options;
  const response = await fetch(apiUrl(path), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : null),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || 'Request failed', response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
