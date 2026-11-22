export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  const db = useDb()
  await db.query('UPDATE users SET totp_secret_enc = NULL, totp_pending_enc = NULL, totp_last_step = NULL, updated_at = now() WHERE id = $1', [s.user.id])
  // Plus aucun second facteur : les codes de secours n'ont plus d'objet
  if (!(await hasSecondFactor(s.user.id))) await db.query('DELETE FROM user_recovery_codes WHERE user_id = $1', [s.user.id])
  await recordEvent(event, s.user, 'totp_disabled')
  return { ok: true }
})
