export default defineEventHandler(async (event) => {
  const s = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) throw createError({ statusCode: 400 })
  if (id === s.id) { await destroySession(event); return { ok: true, self: true } }
  await useDb().query('DELETE FROM user_sessions WHERE id = $1 AND user_id = $2', [id, s.user.id])
  return { ok: true }
})
