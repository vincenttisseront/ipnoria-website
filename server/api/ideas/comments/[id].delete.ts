export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const r = await useDb().query('DELETE FROM idea_comments WHERE id = $1 AND user_id = $2 AND NOT team', [getRouterParam(event, 'id'), s.user.id])
  if (!r.rowCount) throw createError({ statusCode: 404 })
  return { ok: true }
})
