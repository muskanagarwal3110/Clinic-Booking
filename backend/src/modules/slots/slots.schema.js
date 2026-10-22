import { z } from 'zod';

export const createSlotSchema = z
  .object({
    startsAt: z.coerce.date({ message: 'Must be a valid ISO date-time' }),
    endsAt: z.coerce.date({ message: 'Must be a valid ISO date-time' }),
  })
  .superRefine((v, ctx) => {
    if (v.startsAt <= new Date())
      ctx.addIssue({ path: ['startsAt'], code: 'custom', message: 'Must be in the future' });
    if (v.endsAt <= v.startsAt)
      ctx.addIssue({ path: ['endsAt'], code: 'custom', message: 'Must be after startsAt' });
    const mins = (v.endsAt - v.startsAt) / 60000;
    if (mins < 5 || mins > 480)
      ctx.addIssue({
        path: ['endsAt'],
        code: 'custom',
        message: 'Duration must be 5 minutes to 8 hours',
      });
  });

export const listSlotsSchema = z.object({
  clinicId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  availableOnly: z.enum(['true', 'false']).default('true'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export const listBookedSlotsSchema = listSlotsSchema.omit({ availableOnly: true });

export const mineSlotsSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
