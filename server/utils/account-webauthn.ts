import type { H3Event } from 'h3'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { fail } from './account'
import { randomToken, sha256 } from './account-crypto'

// Clés d'accès (WebAuthn) : le défi est gardé en base 5 minutes, lié au navigateur par un cookie de flux.
const FLOW_COOKIE = 'ipn_wa'

export function rp() {
  const url = new URL(useRuntimeConfig().public.siteUrl)
  return { rpID: url.hostname, origin: url.origin, rpName: 'Ipnoria' }
}

export async function saveChallenge(event: H3Event, challenge: string, kind: 'register' | 'login', userId: string | null, cookiePath = '/api/account/passkeys') {
  const flow = randomToken()
  const db = useDb()
  await db.query('DELETE FROM webauthn_challenges WHERE expires_at < now()')
  await db.query(
    `INSERT INTO webauthn_challenges (flow_hash, challenge, user_id, kind, expires_at) VALUES ($1, $2, $3, $4, now() + interval '5 minutes')`,
    [sha256(flow), challenge, userId, kind],
  )
  setCookie(event, FLOW_COOKIE, flow, { httpOnly: true, secure: rp().origin.startsWith('https://'), sameSite: 'strict', path: cookiePath, maxAge: 300 })
}

/** Reprend le défi du flux (usage unique). */
export async function takeChallenge(event: H3Event, kind: 'register' | 'login', cookiePath = '/api/account/passkeys'): Promise<{ challenge: string, userId: string | null } | null> {
  const flow = getCookie(event, FLOW_COOKIE)
  deleteCookie(event, FLOW_COOKIE, { path: cookiePath })
  if (!flow) return null
  const r = await useDb().query(
    `DELETE FROM webauthn_challenges WHERE flow_hash = $1 AND kind = $2 AND expires_at > now() RETURNING challenge, user_id::text AS "userId"`,
    [sha256(flow), kind],
  )
  return r.rows[0] ?? null
}

/** Vérifie une assertion de clé d'accès (usage unique du défi) et renvoie l'identifiant du compte. */
export async function consumePasskeyLogin(event: H3Event, response: AuthenticationResponseJSON | undefined, cookiePath = '/api/account/passkeys'): Promise<string> {
  const ch = await takeChallenge(event, 'login', cookiePath)
  if (!ch || !response?.id) throw fail(400, 'challenge_expired')
  const db = useDb()
  const k = (await db.query(
    `SELECT p.id::text, p.user_id::text AS "userId", p.public_key, p.counter, p.transports FROM user_passkeys p WHERE p.credential_id = $1`,
    [response.id],
  )).rows[0]
  if (!k || (ch.userId && ch.userId !== k.userId)) throw fail(401, 'passkey_invalid')
  const { rpID, origin } = rp()
  let v
  try {
    v = await verifyAuthenticationResponse({
      response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false,
      credential: { id: response.id, publicKey: new Uint8Array(Buffer.from(k.public_key, 'base64url')), counter: Number(k.counter), transports: k.transports ? k.transports.split(',') : undefined },
    })
  }
  catch { throw fail(401, 'passkey_invalid') }
  if (!v.verified) throw fail(401, 'passkey_invalid')
  await db.query('UPDATE user_passkeys SET counter = $2, last_used_at = now() WHERE id = $1', [k.id, v.authenticationInfo.newCounter])
  return k.userId as string
}
