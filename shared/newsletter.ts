import { z } from 'zod'

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  consent: z.literal(true),
  locale: z.enum(['fr', 'en']).default('fr'),
  website: z.string().max(0).optional().default(''),
  startedAt: z.number().int().positive(),
})
export type NewsletterInput = z.input<typeof newsletterSchema>
