export const MAX_PASSWORD_UTF8_BYTES = 72;
export const MIN_PASSWORD_CHARS = 8;

export const isPasswordWithinPolicy = (value: string) =>
  value.length >= MIN_PASSWORD_CHARS &&
  new TextEncoder().encode(value).length <= MAX_PASSWORD_UTF8_BYTES;

// Note: MAX_PASSWORD_UTF8_BYTES (72) is the bcrypt limit for UTF-8 encoded passwords
export const passwordPolicyMessage = `Password must be at least ${MIN_PASSWORD_CHARS} characters and at most ${MAX_PASSWORD_UTF8_BYTES} bytes when encoded (emoji and special characters may use multiple bytes each).`;
