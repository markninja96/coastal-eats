import {
  isPasswordWithinPolicy,
  passwordPolicyMessage,
} from '@coastal-eats/shared';
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .refine(
    (password) => isPasswordWithinPolicy(password),
    passwordPolicyMessage,
  );
