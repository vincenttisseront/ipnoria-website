import { reauthSchema } from '#shared/account'

// Confirmer son identité avant une action sensible : mot de passe, ou code du second facteur.
// (Par clé d'accès : /api/account/passkeys/auth/*.) Valable 15 minutes.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const { password, code } = await readJson(event, reauthSchema)
  let ok = false
  if (password) {
    const row = (await useDb().query('SELECT password_hash FROM users WHERE id = $1', [s.user.id])).rows[0]
    ok = await verifyPassword(row.password_hash, password)
  }
  else if (code) ok = Boolean(await checkSecondFactor(s.user.id, code))
  if (!ok) {
    await recordEvent(event, s.user, 'reauth_failed')
    throw fail(401, password ? 'wrong_password' : 'invalid_code')
  }
  await markReauth(s.id)
  return { ok: true }
})
