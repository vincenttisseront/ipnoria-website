import { z } from 'zod'

// Schémas partagés client / serveur : comptes et demandes de fonctionnalités
// eslint-disable-next-line no-control-regex
const SINGLE_LINE = /^[^\u0000-\u001F\u007F]*$/
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

export const emailField = z.string().trim().toLowerCase().max(254).pipe(z.email())
export const passwordField = z.string().min(12).max(128)
const locale = z.enum(['fr', 'en'])
const name = z.string().trim().min(2).max(60).regex(SINGLE_LINE)
const multiline = (min: number, max: number) => z.string().trim().min(min).max(max).refine(s => !CONTROL_CHARS.test(s))

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  displayName: name,
  locale,
  consent: z.literal(true),
  website: z.string().max(0).optional().default(''),
  startedAt: z.number().int().positive(),
})

export const loginSchema = z.object({ email: emailField, password: z.string().min(1).max(128) })
export const codeSchema = z.object({ code: z.string().trim().min(6).max(20) })
export const forgotSchema = z.object({ email: emailField, locale })
export const resetSchema = z.object({ token: z.string().min(20).max(100), password: passwordField })
export const changePasswordSchema = z.object({ current: z.string().max(128).optional(), password: passwordField })
export const changeEmailSchema = z.object({ email: emailField })
export const reauthSchema = z.object({ password: z.string().max(128).optional(), code: z.string().trim().max(20).optional() })
export const profileSchema = z.object({
  displayName: name,
  organization: z.string().trim().max(120).regex(SINGLE_LINE).optional().default(''),
  locale,
  notifyStatus: z.boolean(),
  notifyComments: z.boolean(),
})
export const passkeyNameSchema = z.object({ name: z.string().trim().min(1).max(60).regex(SINGLE_LINE) })
export const deleteAccountSchema = z.object({ email: emailField })

export const IDEA_STATUSES = ['proposed', 'review', 'planned', 'progress', 'shipped', 'declined', 'duplicate'] as const
export type IdeaStatus = typeof IDEA_STATUSES[number]
export const ideaSchema = z.object({
  title: z.string().trim().min(8).max(120).regex(SINGLE_LINE),
  body: multiline(30, 4000),
  locale,
})
export const commentSchema = z.object({ body: multiline(2, 3000) })
export const adminIdeaSchema = z.object({
  status: z.enum(IDEA_STATUSES).optional(),
  note: z.string().trim().max(2000).optional().default(''),
  duplicateOf: z.number().int().positive().nullable().optional(),
  hidden: z.boolean().optional(),
  title: z.object({ fr: z.string().trim().max(120).optional(), en: z.string().trim().max(120).optional() }).optional(),
  body: z.object({ fr: z.string().trim().max(4000).optional(), en: z.string().trim().max(4000).optional() }).optional(),
})

export type PublicUser = {
  id: string, email: string, emailVerified: boolean, displayName: string, organization: string | null, locale: 'fr' | 'en'
  notifyStatus: boolean, notifyComments: boolean, hasPassword: boolean, totp: boolean, github: boolean, passkeys: number, createdAt: string
}
