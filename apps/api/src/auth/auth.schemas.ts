import {
  isPasswordWithinLimit,
  passwordLimitMessage,
} from '@coastal-eats/shared';
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8)
  .refine((password) => isPasswordWithinLimit(password), passwordLimitMessage);
