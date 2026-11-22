import type { H3Event } from 'h3'
import { deriveKey, randomToken, seal, sha256, unseal } from './account-crypto'
import { breachCount, deviceLabel, passwordProblem } from './account-password'

// Sessions des comptes utilisateurs : jeton aléatoire dans un cookie HttpOnly, empreinte en base.
// Une session « mfa_pending » n'a passé que le premier facteur : elle ne donne accès qu'à l'étape MFA.

export const SESSION_COOKIE = 'ipn_sess'
const SESSION_DAYS = 30
const PENDING_MINUTES = 10
export const REAUTH_MINUTES = 15

export interface AccountUser {
  id: string
  email: string
  emailVerified: boolean
  displayName: string
  organization: string | null
  locale: 'fr' | 'en'
  notifyStatus: boolean
  notifyComments: boolean
  hasPassword: boolean
  totp: boolean
  github: boolean
  passkeys: number
  createdAt: string
}
export interface AccountSession { id: string, user: AccountUser, mfaPending: boolean, reauthAt: Date }

export function accountsEnabled(): boolean {
  return hasDb() && hasSmtp() && String(useRuntimeConfig().accounts.secret).length >= 32
}
export function requireAccounts(): void {
  if (!accountsEnabled()) throw createError({ statusCode: 503, statusMessage: 'Accounts unavailable' })
}

export const totpKey = () => deriveKey(String(useRuntimeConfig().accounts.secret), 'totp')
export const sealTotp = (secret: Buffer) => seal(secret, totpKey())
export const unsealTotp = (s: string) => unseal(s, totpKey())

const secureCookie = () => useRuntimeConfig().public.siteUrl.startsWith('https://')

function device(event: H3Event) {
  const ua = getRequestHeader(event, 'user-agent') ?? ''
  return { label: deviceLabel(ua), hash: sha256(`${useRuntimeConfig().ipHashSalt}:ua:${ua}`) }
}

/** Ouvre une session (nouveau jeton à chaque connexion : pas de fixation de session). */
export async function createSession(event: H3Event, userId: string, opts: { mfaPending?: boolean } = {}): Promise<{ newDevice: boolean }> {
  await destroySession(event)
  const token = randomToken()
  const d = device(event)
  const db = useDb()
  const seen = await db.query('SELECT 1 FROM user_sessions WHERE user_id = $1 AND device_hash = $2 LIMIT 1', [userId, d.hash])
  const known = await db.query(
    `SELECT 1 FROM user_events WHERE user_id = $1 AND device = $2
        AND kind IN ('register', 'register_github', 'login', 'login_passkey', 'login_github', 'login_recovery') LIMIT 1`, [userId, d.label],
  )
  const expires = opts.mfaPending ? `now() + interval '${PENDING_MINUTES} minutes'` : `now() + interval '${SESSION_DAYS} days'`
  await db.query(
    `INSERT INTO user_sessions (user_id, token_hash, mfa_pending, device, device_hash, ip_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, ${expires})`,
    [userId, sha256(token), Boolean(opts.mfaPending), d.label, d.hash, clientIpHash(event)],
  )
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true, secure: secureCookie(), sameSite: 'lax', path: '/',
    maxAge: opts.mfaPending ? PENDING_MINUTES * 60 : SESSION_DAYS * 86400,
  })
  event.context.account = undefined
  return { newDevice: !seen.rowCount && !known.rowCount }
}

export async function destroySession(event: H3Event): Promise<void> {
  const token = getCookie(event, SESSION_COOKIE)
  if (token) await useDb().query('DELETE FROM user_sessions WHERE token_hash = $1', [sha256(token)])
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  event.context.account = undefined
}

const USER_SQL = `
  u.id::text, u.email, u.email_verified_at IS NOT NULL AS "emailVerified", u.display_name AS "displayName",
  u.organization, u.locale, u.notify_status AS "notifyStatus", u.notify_comments AS "notifyComments",
  u.password_hash IS NOT NULL AS "hasPassword", u.totp_secret_enc IS NOT NULL AS totp, u.github_id IS NOT NULL AS github,
  (SELECT count(*)::int FROM user_passkeys p WHERE p.user_id = u.id) AS passkeys, u.created_at AS "createdAt"`

export async function loadUser(id: string): Promise<AccountUser | null> {
  const r = await useDb().query(`SELECT ${USER_SQL} FROM users u WHERE u.id = $1`, [id])
  return r.rows[0] ?? null
}

/** Session courante (ou null). Prolonge la session au plus une fois par heure. */
export async function getAccountSession(event: H3Event): Promise<AccountSession | null> {
  if (event.context.account !== undefined) return event.context.account
  const token = getCookie(event, SESSION_COOKIE)
  if (!token || !accountsEnabled()) { event.context.account = null; return null }
  const db = useDb()
  const r = await db.query(
    `SELECT s.id::text AS sid, s.mfa_pending, s.reauth_at, s.last_seen_at < now() - interval '1 hour' AS stale, ${USER_SQL}
       FROM user_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  )
  const row = r.rows[0]
  if (!row) { deleteCookie(event, SESSION_COOKIE, { path: '/' }); event.context.account = null; return null }
  if (row.stale && !row.mfa_pending) {
    await db.query(`UPDATE user_sessions SET last_seen_at = now(), expires_at = now() + interval '${SESSION_DAYS} days' WHERE id = $1`, [row.sid])
    setCookie(event, SESSION_COOKIE, token, { httpOnly: true, secure: secureCookie(), sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 })
  }
  const { sid, mfa_pending, reauth_at, stale: _s, ...user } = row
  const session: AccountSession = { id: sid, user, mfaPending: mfa_pending, reauthAt: reauth_at }
  event.context.account = session
  return session
}

/** Exige une session complète ; pour les écritures, exige aussi la même origine. */
export async function requireUser(event: H3Event, opts: { verified?: boolean, recent?: boolean } = {}): Promise<AccountSession> {
  requireAccounts()
  if (event.method !== 'GET' && event.method !== 'HEAD') assertSameOrigin(event)
  const s = await getAccountSession(event)
  if (!s || s.mfaPending) throw createError({ statusCode: 401, statusMessage: 'Sign-in required' })
  if (opts.verified && !s.user.emailVerified) throw createError({ statusCode: 403, statusMessage: 'Email not verified', data: { code: 'unverified' } })
  if (opts.recent && Date.now() - new Date(s.reauthAt).getTime() > REAUTH_MINUTES * 60_000) {
    throw createError({ statusCode: 403, statusMessage: 'Recent sign-in required', data: { code: 'reauth' } })
  }
  return s
}

export async function markReauth(sessionId: string): Promise<void> {
  await useDb().query('UPDATE user_sessions SET reauth_at = now() WHERE id = $1', [sessionId])
}

/** Le compte a-t-il un second facteur (TOTP ou clé d'accès) ? */
export async function hasSecondFactor(userId: string): Promise<boolean> {
  const r = await useDb().query(
    `SELECT (totp_secret_enc IS NOT NULL) OR EXISTS (SELECT 1 FROM user_passkeys WHERE user_id = $1) AS mfa FROM users WHERE id = $1`, [userId],
  )
  return Boolean(r.rows[0]?.mfa)
}

/** Lien à usage unique envoyé par e-mail ; remplace les liens encore valides du même usage. */
export async function issueToken(userId: string, purpose: 'verify' | 'reset' | 'email', hours: number, data?: string): Promise<string> {
  const token = randomToken()
  const db = useDb()
  await db.query('UPDATE user_tokens SET used_at = now() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL', [userId, purpose])
  await db.query(
    `INSERT INTO user_tokens (user_id, purpose, token_hash, data, expires_at) VALUES ($1, $2, $3, $4, now() + make_interval(hours => $5))`,
    [userId, purpose, sha256(token), data ?? null, hours],
  )
  return token
}

/** Consomme un lien : renvoie l'utilisateur et la donnée associée, ou null s'il est inconnu, utilisé ou expiré. */
export async function consumeToken(token: string, purpose: 'verify' | 'reset' | 'email'): Promise<{ userId: string, data: string | null } | null> {
  if (!/^[\w-]{20,100}$/.test(token)) return null
  const r = await useDb().query(
    `UPDATE user_tokens SET used_at = now()
      WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id::text AS "userId", data`,
    [sha256(token), purpose],
  )
  return r.rows[0] ?? null
}

/** Chemin de retour sûr après connexion : chemin local seulement (pas d'URL externe, pas de //). */
export function safeNext(next: unknown, fallback = '/compte'): string {
  return typeof next === 'string' && /^\/(?![/\\])[\w\-./?=&#%]*$/.test(next) ? next : fallback
}

declare module 'h3' {
  interface H3EventContext { account?: AccountSession | null }
}

/** Corps JSON validé par un schéma zod ; 400 avec la liste des champs fautifs sinon. */
export async function readJson<T>(event: H3Event, schema: { safeParse: (v: unknown) => { success: true, data: T } | { success: false, error: { issues: Array<{ path: PropertyKey[] }> } } }): Promise<T> {
  if (!getRequestHeader(event, 'content-type')?.startsWith('application/json')) throw createError({ statusCode: 415 })
  const parsed = schema.safeParse((await readBody(event)) ?? {})
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: { fields: [...new Set(parsed.error.issues.map(i => String(i.path[0])))] } })
  }
  return parsed.data
}

/** Erreur métier lisible par l'interface : { code } dans data. */
export const fail = (statusCode: number, code: string, extra: Record<string, unknown> = {}) =>
  createError({ statusCode, statusMessage: code, data: { code, ...extra } })

/** Contrôle complet d'un nouveau mot de passe (règles locales puis fuites connues). */
export async function checkNewPassword(pw: string, email: string): Promise<void> {
  const problem = passwordProblem(pw, email)
  if (problem) throw fail(400, `password_${problem}`)
  if (String(useRuntimeConfig().accounts.breachCheck) !== 'false' && await breachCount(pw) > 0) throw fail(400, 'password_breached')
}
