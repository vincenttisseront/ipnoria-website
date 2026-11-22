import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const body = (await readBody(event)) as { response?: AuthenticationResponseJSON }
  const ch = await takeChallenge(event, 'login')
  if (!ch || !body?.response?.id) throw fail(400, 'challenge_expired')
  const db = useDb()
  const k = (await db.query(
    `SELECT p.id::text, p.user_id::text AS "userId", p.public_key, p.counter, p.transports FROM user_passkeys p WHERE p.credential_id = $1`, [body.response.id],
  )).rows[0]
  if (!k || (ch.userId && ch.userId !== k.userId)) throw fail(401, 'passkey_invalid')
  const { rpID, origin } = rp()
  let v
  try {
    v = await verifyAuthenticationResponse({
      response: body.response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false,
      credential: { id: body.response.id, publicKey: new Uint8Array(Buffer.from(k.public_key, 'base64url')), counter: Number(k.counter), transports: k.transports ? k.transports.split(',') : undefined },
    })
  }
  catch { throw fail(401, 'passkey_invalid') }
  if (!v.verified) throw fail(401, 'passkey_invalid')
  await db.query('UPDATE user_passkeys SET counter = $2, last_used_at = now() WHERE id = $1', [k.id, v.authenticationInfo.newCounter])

  const user = await loadUser(k.userId)
  if (!user) throw fail(401, 'passkey_invalid')
  const s = await getAccountSession(event)
  if (s && !s.mfaPending && s.user.id === user.id) {
    await markReauth(s.id) // confirmation d'identité
    return { ok: true, reauth: true }
  }
  // Connexion (sans mot de passe, ou second facteur après le mot de passe)
  await db.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [user.id])
  const { newDevice } = await createSession(event, user.id)
  await recordEvent(event, user, 'login_passkey')
  if (newDevice) await recordEvent(event, user, 'login_new_device')
  return { ok: true }
})
