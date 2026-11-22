import { codeSchema } from '#shared/account'

// Second facteur après le mot de passe : code de l'application d'authentification ou code de secours.
// (La clé d'accès passe par /api/account/passkeys/auth/*.) Cinq échecs ferment l'étape : retour au mot de passe.
export default defineEventHandler(async (event) => {
  requireAccounts()
  assertSameOrigin(event)
  const s = await getAccountSession(event)
  if (!s?.mfaPending) throw fail(401, 'no_pending_login')
  const { code } = await readJson(event, codeSchema)
  const ok = await checkSecondFactor(s.user.id, code)
  const db = useDb()
  if (!ok) {
    const r = await db.query(`UPDATE users SET failed_logins = failed_logins + 1 WHERE id = $1 RETURNING failed_logins`, [s.user.id])
    await recordEvent(event, s.user, 'mfa_failed')
    if (r.rows[0].failed_logins >= 5) {
      await db.query(`UPDATE users SET locked_until = now() + interval '5 minutes' WHERE id = $1`, [s.user.id])
      await destroySession(event)
      throw fail(429, 'locked', { minutes: 5 })
    }
    throw fail(401, 'invalid_code')
  }
  await db.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [s.user.id])
  const { newDevice } = await createSession(event, s.user.id)
  await recordEvent(event, s.user, ok === 'recovery' ? 'login_recovery' : 'login')
  if (newDevice) await recordEvent(event, s.user, 'login_new_device')
  return { ok: true, recovery: ok === 'recovery' }
})
