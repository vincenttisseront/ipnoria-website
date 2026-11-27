import { codeSchema } from '#shared/account'

// Second facteur après le mot de passe : code TOTP ou code de secours. Cinq échecs ferment l'étape.
export default defineEventHandler(async (event) => {
  const pending = await requireAdminPending(event)
  const { code } = await readJson(event, codeSchema)
  const ok = await checkSecondFactor(pending.userId, code)
  const db = useDb()
  if (!ok) {
    const r = await db.query('UPDATE users SET failed_logins = failed_logins + 1 WHERE id = $1 RETURNING failed_logins', [pending.userId])
    await recordEvent(event, { id: pending.userId, email: pending.email, locale: pending.locale }, 'mfa_failed')
    if (r.rows[0].failed_logins >= 5) {
      await db.query(`UPDATE users SET locked_until = now() + interval '5 minutes' WHERE id = $1`, [pending.userId])
      await clearAdminLogin(event)
      throw fail(429, 'locked', { minutes: 5 })
    }
    throw fail(401, 'invalid_code')
  }
  await db.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [pending.userId])
  await openAdminSession(event, pending)
  await noteLoginDevice(event, { id: pending.userId, email: pending.email, locale: pending.locale }, ok === 'recovery' ? 'login_recovery' : 'login')
  await adminAudit(event, pending, 'login', 'session', null, { factor: ok })
  return { ok: true }
})
