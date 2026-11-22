export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const r = await useDb().query('DELETE FROM user_sessions WHERE user_id = $1 AND id <> $2', [s.user.id, s.id])
  if (r.rowCount) await recordEvent(event, s.user, 'sessions_revoked')
  return { ok: true, count: r.rowCount }
})
