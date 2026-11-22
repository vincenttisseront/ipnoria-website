export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const r = await useDb().query(
    `SELECT id::text, device, created_at AS "createdAt", last_seen_at AS "lastSeenAt", id = $2 AS current
       FROM user_sessions WHERE user_id = $1 AND NOT mfa_pending AND expires_at > now() ORDER BY last_seen_at DESC`,
    [s.user.id, s.id],
  )
  return r.rows
})
