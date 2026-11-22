// Voter (une voix par compte). Les idées closes (livrées, non retenues, doublons) ne prennent plus de voix.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { verified: true })
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^\d{1,12}$/.test(id)) throw createError({ statusCode: 404 })
  const db = useDb()
  const idea = (await db.query('SELECT status, hidden FROM ideas WHERE id = $1', [id])).rows[0]
  if (!idea || idea.hidden) throw createError({ statusCode: 404 })
  if (['shipped', 'declined', 'duplicate'].includes(idea.status)) throw fail(409, 'idea_closed')
  await db.query('INSERT INTO idea_votes (idea_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, s.user.id])
  const n = await db.query('SELECT count(*)::int AS n FROM idea_votes WHERE idea_id = $1', [id])
  return { ok: true, voted: true, votes: n.rows[0].n }
})
