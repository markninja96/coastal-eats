import { MAX_PASSWORD_UTF8_BYTES } from '@coastal-eats/shared';
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8)
  .refine(
    (password) =>
      Buffer.byteLength(password, 'utf8') <= MAX_PASSWORD_UTF8_BYTES,
    `password must be at most ${MAX_PASSWORD_UTF8_BYTES} bytes when UTF-8 encoded`,
  );
