import { z } from 'zod';

export const bookSchema = z.object({
  slotId: z.coerce.number({ message: 'Must be a number' }).int().positive(),
});
