import { z } from 'zod'

// Schémas partagés client / serveur des formulaires de vote et de rendez-vous
// eslint-disable-next-line no-control-regex
const SINGLE_LINE = /^[^\u0000-\u001F\u007F]*$/
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
const email = z.string().trim().toLowerCase().max(254).pipe(z.email())

export const voteSchema = z.object({
  item: z.string().regex(/^[a-z0-9-]{2,40}$/),
  email,
  consent: z.literal(true),
  locale: z.enum(['fr', 'en']).default('fr'),
  website: z.string().max(0).optional().default(''),
  startedAt: z.number().int().positive(),
})

export const bookingSchema = z.object({
  slot: z.iso.datetime(),
  name: z.string().trim().min(2).max(100).regex(SINGLE_LINE),
  email,
  company: z.string().trim().max(120).regex(SINGLE_LINE).optional().default(''),
  notes: z.string().trim().max(2000).refine(v => !CONTROL_CHARS.test(v)).optional().default(''),
  consent: z.literal(true),
  locale: z.enum(['fr', 'en']).default('fr'),
  website: z.string().max(0).optional().default(''),
  startedAt: z.number().int().positive(),
})
export type BookingInput = z.input<typeof bookingSchema>
