// Retirer une clé d'accès, sauf si c'est le dernier moyen de se connecter.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { recent: true })
  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) throw createError({ statusCode: 400 })
  if (!s.user.hasPassword && !s.user.github && s.user.passkeys <= 1) throw fail(400, 'last_sign_in_method')
  const db = useDb()
  const r = await db.query('DELETE FROM user_passkeys WHERE id = $1 AND user_id = $2', [id, s.user.id])
  if (!r.rowCount) throw createError({ statusCode: 404 })
  if (!(await hasSecondFactor(s.user.id))) await db.query('DELETE FROM user_recovery_codes WHERE user_id = $1', [s.user.id])
  await recordEvent(event, s.user, 'passkey_removed')
  return { ok: true }
})
