// Activité récente du compte (90 derniers jours, 50 événements)
export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const r = await useDb().query(
    `SELECT kind, device, created_at AS at FROM user_events
      WHERE user_id = $1 AND created_at > now() - interval '90 days' ORDER BY created_at DESC LIMIT 50`, [s.user.id],
  )
  return r.rows
})
