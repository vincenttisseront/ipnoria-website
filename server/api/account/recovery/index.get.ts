export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const r = await useDb().query('SELECT count(*) FILTER (WHERE used_at IS NULL)::int AS remaining, count(*)::int AS total FROM user_recovery_codes WHERE user_id = $1', [s.user.id])
  return r.rows[0]
})
