export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const r = await useDb().query(
    'SELECT id::text, name, created_at AS "createdAt", last_used_at AS "lastUsedAt" FROM user_passkeys WHERE user_id = $1 ORDER BY created_at', [s.user.id],
  )
  return r.rows
})
