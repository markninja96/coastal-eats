export const MAX_PASSWORD_UTF8_BYTES = 72;
export const MIN_PASSWORD_CHARS = 8;

export const isPasswordWithinPolicy = (value: string) =>
  value.length >= MIN_PASSWORD_CHARS &&
  new TextEncoder().encode(value).length <= MAX_PASSWORD_UTF8_BYTES;

export const passwordPolicyMessage = `Password must be at least ${MIN_PASSWORD_CHARS} characters and short enough to fit our maximum length (up to ${MAX_PASSWORD_UTF8_BYTES} characters' worth of storage; some symbols like emoji count as more than one character).`;
