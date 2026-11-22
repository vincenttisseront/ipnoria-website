import { z } from 'zod'

// Schéma unique du formulaire de contact : utilisé par la page (validation immédiate) et par l'API (validation qui fait foi).
export const CONTACT_TOPICS = ['demo', 'question', 'feedback', 'partnership', 'other'] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

// Caractères de contrôle interdits (hors tabulation et retours à la ligne) : évite l'injection d'en-têtes dans l'e-mail de notification
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
// Une ligne : aucun retour à la ligne non plus
// eslint-disable-next-line no-control-regex
const SINGLE_LINE = /^[^\u0000-\u001F\u007F]*$/

const singleLine = (min: number, max: number) =>
  z.string().trim().min(min).max(max).regex(SINGLE_LINE)

export const contactSchema = z.object({
  name: singleLine(2, 100),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  company: z.string().trim().max(120).regex(SINGLE_LINE).optional().default(''),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(10).max(5000).refine(v => !CONTROL_CHARS.test(v)),
  consent: z.literal(true),
  locale: z.enum(['fr', 'en']).default('fr'),
  // Pièges à robots : champ caché qui doit rester vide, et délai minimal de remplissage
  website: z.string().max(0).optional().default(''),
  startedAt: z.number().int().positive(),
})

export type ContactInput = z.input<typeof contactSchema>
export type ContactData = z.output<typeof contactSchema>
export type ContactField = 'name' | 'email' | 'company' | 'topic' | 'message' | 'consent'

export const CONTACT_FIELDS: readonly ContactField[] = ['name', 'email', 'company', 'topic', 'message', 'consent']

/** Champs en erreur, dans l'ordre du formulaire (les champs pièges ne sont jamais révélés). */
export function invalidFields(error: z.ZodError): ContactField[] {
  const bad = new Set(error.issues.map(i => String(i.path[0])))
  return CONTACT_FIELDS.filter(f => bad.has(f))
}

/** Délai minimal entre l'affichage du formulaire et l'envoi : un humain met plus de 3 secondes. */
export const MIN_FILL_MS = 3000
