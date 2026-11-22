export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { verified: true })
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^\d{1,12}$/.test(id)) throw createError({ statusCode: 404 })
  const db = useDb()
  await db.query('DELETE FROM idea_votes WHERE idea_id = $1 AND user_id = $2', [id, s.user.id])
  const n = await db.query('SELECT count(*)::int AS n FROM idea_votes WHERE idea_id = $1', [id])
  return { ok: true, voted: false, votes: n.rows[0].n }
})
