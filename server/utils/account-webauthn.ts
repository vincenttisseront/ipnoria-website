import type { H3Event } from 'h3'
import { randomToken, sha256 } from './account-crypto'

// Clés d'accès (WebAuthn) : le défi est gardé en base 5 minutes, lié au navigateur par un cookie de flux.
const FLOW_COOKIE = 'ipn_wa'

export function rp() {
  const url = new URL(useRuntimeConfig().public.siteUrl)
  return { rpID: url.hostname, origin: url.origin, rpName: 'Ipnoria' }
}

export async function saveChallenge(event: H3Event, challenge: string, kind: 'register' | 'login', userId: string | null) {
  const flow = randomToken()
  const db = useDb()
  await db.query('DELETE FROM webauthn_challenges WHERE expires_at < now()')
  await db.query(
    `INSERT INTO webauthn_challenges (flow_hash, challenge, user_id, kind, expires_at) VALUES ($1, $2, $3, $4, now() + interval '5 minutes')`,
    [sha256(flow), challenge, userId, kind],
  )
  setCookie(event, FLOW_COOKIE, flow, { httpOnly: true, secure: rp().origin.startsWith('https://'), sameSite: 'strict', path: '/api/account/passkeys', maxAge: 300 })
}

/** Reprend le défi du flux (usage unique). */
export async function takeChallenge(event: H3Event, kind: 'register' | 'login'): Promise<{ challenge: string, userId: string | null } | null> {
  const flow = getCookie(event, FLOW_COOKIE)
  deleteCookie(event, FLOW_COOKIE, { path: '/api/account/passkeys' })
  if (!flow) return null
  const r = await useDb().query(
    `DELETE FROM webauthn_challenges WHERE flow_hash = $1 AND kind = $2 AND expires_at > now() RETURNING challenge, user_id::text AS "userId"`,
    [sha256(flow), kind],
  )
  return r.rows[0] ?? null
}
