import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8)
  .refine(
    (password) => Buffer.byteLength(password, 'utf8') <= 72,
    'password must be at most 72 bytes when UTF-8 encoded',
  );
