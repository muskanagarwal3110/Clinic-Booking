import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Must be a valid email');

export const registerSchema = z.object({
  email,
  password: z.string().min(8, 'Must be at least 8 characters').max(72, 'Must be at most 72 characters'),
  name: z.string().trim().min(1, 'Required').max(120),
  role: z.enum(['clinic', 'patient'], { message: "Must be 'clinic' or 'patient'" }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Required'),
});
