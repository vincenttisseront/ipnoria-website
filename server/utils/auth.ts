import type { H3Event } from 'h3'
import { fail } from './account'
import { hasDb, useDb } from './db'

// Espace d'administration : compte local (mot de passe Argon2id) puis second facteur du compte
// (TOTP, code de secours ou clé d'accès). Session chiffrée et signée (cookie HttpOnly, SameSite=Lax, 8 h).
// Accès réservé aux adresses de NUXT_ADMIN_EMAILS, relues à chaque requête. Le second facteur est obligatoire.

const PENDING_SECONDS = 10 * 60
const ADMIN_SECONDS = 8 * 3600

export function adminEmailList(): string[] {
  return String(useRuntimeConfig().adminEmails).split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

export function adminEnabled(): boolean {
  const { sessionPassword, accounts } = useRuntimeConfig()
  return hasDb()
    && String(sessionPassword).length >= 32
    && String(accounts.secret).length >= 32
    && adminEmailList().length > 0
}

export function allowedAdmin(email: string): boolean {
  return adminEmailList().includes(email.trim().toLowerCase())
}

const sessionOptions = (name: string, maxAge: number) => {
  const { sessionPassword, public: { siteUrl } } = useRuntimeConfig()
  return {
    name,
    password: String(sessionPassword),
    maxAge,
    cookie: { httpOnly: true, sameSite: 'lax' as const, secure: siteUrl.startsWith('https://'), path: '/' },
  }
}

export interface AdminData { email?: string, name?: string, userId?: string, epoch?: number }

/** Génération de session pour cette adresse. 0 si aucune clôture n'a eu lieu. */
export async function adminEpoch(email: string): Promise<number> {
  try {
    const r = await useDb().query<{ epoch: number }>('SELECT epoch FROM admin_session_epoch WHERE email = $1', [email.toLowerCase()])
    return Number(r.rows[0]?.epoch ?? 0)
  }
  catch { return 0 }
}
interface PendingData { userId?: string, email?: string }

export const useAdminSession = (event: H3Event) => useSession<AdminData>(event, sessionOptions('ipn_admin', ADMIN_SECONDS))
const useAdminPending = (event: H3Event) => useSession<PendingData>(event, sessionOptions('ipn_admin_mfa', PENDING_SECONDS))

export interface AdminIdentity { userId: string, email: string, displayName: string, locale: 'fr' | 'en' }

/** Mot de passe accepté : session courte qui n'ouvre aucune page d'administration. */
export async function beginAdminLogin(event: H3Event, user: { id: string, email: string }): Promise<void> {
  const session = await useAdminSession(event)
  await session.clear()
  const pending = await useAdminPending(event)
  await pending.update({ userId: user.id, email: user.email.toLowerCase() })
}

/** Session d'administration, seulement après un second facteur vérifié. */
export async function openAdminSession(event: H3Event, user: AdminIdentity): Promise<void> {
  const pending = await useAdminPending(event)
  await pending.clear()
  const session = await useAdminSession(event)
  const epoch = await adminEpoch(user.email)
  await session.update({ email: user.email, name: user.displayName || user.email, userId: user.userId, epoch })
}

export async function clearAdminLogin(event: H3Event): Promise<void> {
  await (await useAdminPending(event)).clear()
  await (await useAdminSession(event)).clear()
}

/** Étape en cours après le mot de passe, pour réafficher le formulaire si la page est rechargée. */
export async function adminPendingStep(event: H3Event): Promise<{ step: 'mfa' | 'setup', passkey: boolean } | null> {
  if (!adminEnabled()) return null
  const pending = await useAdminPending(event)
  const { userId, email } = pending.data
  if (!userId || !email || !allowedAdmin(email)) return null
  const row = (await useDb().query(
    `SELECT lower(email) AS email, totp_secret_enc IS NOT NULL AS totp,
            EXISTS (SELECT 1 FROM user_passkeys p WHERE p.user_id = users.id) AS passkey
       FROM users WHERE id = $1`,
    [userId],
  )).rows[0]
  if (!row || row.email !== email) return null
  return { step: row.totp || row.passkey ? 'mfa' : 'setup', passkey: Boolean(row.passkey) }
}

/** Session courte de connexion (mot de passe déjà accepté, second facteur pas encore). */
export async function requireAdminPending(event: H3Event): Promise<AdminIdentity> {
  if (!adminEnabled()) throw createError({ statusCode: 404 })
  assertSameOrigin(event)
  const pending = await useAdminPending(event)
  const { userId, email } = pending.data
  if (!userId || !email || !allowedAdmin(email)) throw fail(401, 'no_pending_login')
  const row = (await useDb().query(
    `SELECT id::text, lower(email) AS email, display_name AS "displayName", locale FROM users WHERE id = $1`,
    [userId],
  )).rows[0]
  if (!row || row.email !== email || !allowedAdmin(row.email)) {
    await pending.clear()
    throw fail(401, 'no_pending_login')
  }
  return { userId: row.id, email: row.email, displayName: row.displayName, locale: row.locale === 'en' ? 'en' : 'fr' }
}

/** Exige une session d'administration valide ; pour les écritures, exige aussi la même origine. */
export async function requireAdmin(event: H3Event): Promise<{ email: string, name: string }> {
  if (!adminEnabled()) throw createError({ statusCode: 404 })
  if (event.method !== 'GET' && event.method !== 'HEAD') assertSameOrigin(event)
  const session = await useAdminSession(event)
  const { email, name, userId, epoch } = session.data
  if (!email || !userId || !allowedAdmin(email)) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const row = (await useDb().query(
    `SELECT lower(email) AS email,
            (totp_secret_enc IS NOT NULL OR EXISTS (SELECT 1 FROM user_passkeys p WHERE p.user_id = users.id)) AS mfa
       FROM users WHERE id = $1`,
    [userId],
  )).rows[0]
  if (!row || row.email !== email.toLowerCase() || !row.mfa || !allowedAdmin(row.email)) {
    await session.clear()
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (Number(epoch ?? 0) !== await adminEpoch(email)) {
    await session.clear()
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return { email, name: name || email }
}
