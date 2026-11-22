import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'

export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  const body = (await readBody(event)) as { response?: RegistrationResponseJSON, name?: string }
  const name = String(body?.name ?? '').trim().slice(0, 60) || 'Clé d\'accès'
  const ch = await takeChallenge(event, 'register')
  if (!ch || ch.userId !== s.user.id || !body?.response) throw fail(400, 'challenge_expired')
  const { rpID, origin } = rp()
  let v
  try {
    v = await verifyRegistrationResponse({ response: body.response, expectedChallenge: ch.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false })
  }
  catch { throw fail(400, 'passkey_invalid') }
  if (!v.verified || !v.registrationInfo) throw fail(400, 'passkey_invalid')
  const c = v.registrationInfo.credential
  const db = useDb()
  const first = !(await hasSecondFactor(s.user.id))
  try {
    await db.query(
      'INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, transports, name) VALUES ($1, $2, $3, $4, $5, $6)',
      [s.user.id, c.id, Buffer.from(c.publicKey).toString('base64url'), c.counter, (c.transports ?? []).join(','), name],
    )
  }
  catch (err) {
    if ((err as { code?: string }).code === '23505') throw fail(409, 'passkey_exists')
    throw err
  }
  await recordEvent(event, s.user, 'passkey_added')
  return { ok: true, recoveryCodes: first ? await ensureRecoveryCodes(s.user.id) : null }
})
