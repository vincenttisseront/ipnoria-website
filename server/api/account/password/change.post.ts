import { changePasswordSchema } from '#shared/account'

// Changer (ou définir) son mot de passe. Avec un mot de passe existant, il faut le donner ;
// sans (compte GitHub ou clé d'accès seule), une confirmation récente d'identité suffit.
// Les autres sessions sont fermées.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const { current, password } = await readJson(event, changePasswordSchema)
  const db = useDb()
  const row = (await db.query('SELECT password_hash FROM users WHERE id = $1', [s.user.id])).rows[0]
  if (row.password_hash) {
    if (!current || !(await verifyPassword(row.password_hash, current))) throw fail(400, 'wrong_password')
  }
  else if (Date.now() - new Date(s.reauthAt).getTime() > REAUTH_MINUTES * 60_000) throw fail(403, 'reauth')
  await checkNewPassword(password, s.user.email)
  await db.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [s.user.id, await hashPassword(password)])
  await db.query('DELETE FROM user_sessions WHERE user_id = $1 AND id <> $2', [s.user.id, s.id])
  await markReauth(s.id)
  await recordEvent(event, s.user, 'password_changed')
  return { ok: true }
})
