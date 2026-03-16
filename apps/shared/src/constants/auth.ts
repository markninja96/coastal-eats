export const MAX_PASSWORD_UTF8_BYTES = 72;

export const isPasswordWithinLimit = (value: string) =>
  new TextEncoder().encode(value).length <= MAX_PASSWORD_UTF8_BYTES;

export const passwordLimitMessage = `password must be at most ${MAX_PASSWORD_UTF8_BYTES} bytes when UTF-8 encoded`;
