import { loginSchema } from '#shared/account'

// Connexion par mot de passe. Erreur identique pour une adresse inconnue ou un mauvais mot de passe.
// Verrou progressif par compte après 5 échecs (1, 2, 4… minutes, 60 au plus). Second facteur demandé s'il existe.
export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const { email, password } = await readJson(event, loginSchema)
  const db = useDb()
  const r = await db.query(
    `SELECT id::text, email, locale, password_hash, failed_logins, locked_until > now() AS locked,
            ceil(extract(epoch FROM locked_until - now()) / 60)::int AS wait
       FROM users WHERE lower(email) = $1`, [email],
  )
  const u = r.rows[0]
  if (u?.locked) throw fail(429, 'locked', { minutes: Math.max(1, u.wait) })
  const ok = await verifyPassword(u?.password_hash ?? null, password)
  if (!u || !ok) {
    if (u) {
      await db.query(
        `UPDATE users SET failed_logins = failed_logins + 1,
           locked_until = CASE WHEN failed_logins + 1 >= 5 THEN now() + make_interval(mins => LEAST(60, power(2, failed_logins + 1 - 5)::int)) END
         WHERE id = $1`, [u.id],
      )
      await recordEvent(event, u, 'login_failed')
    }
    throw fail(401, 'invalid_credentials')
  }
  await db.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [u.id])
  if (await hasSecondFactor(u.id)) {
    await createSession(event, u.id, { mfaPending: true })
    return { ok: true, mfa: true }
  }
  const { newDevice } = await createSession(event, u.id)
  await recordEvent(event, u, 'login')
  if (newDevice) await recordEvent(event, u, 'login_new_device')
  return { ok: true, mfa: false }
})
