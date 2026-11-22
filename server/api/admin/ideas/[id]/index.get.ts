export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const db = useDb()
  const r = await db.query(`SELECT ${IDEA_SELECT}, u.email AS "authorEmail" FROM ideas i LEFT JOIN users u ON u.id = i.author_id WHERE i.id = $1`, [id])
  if (!r.rowCount) throw createError({ statusCode: 404 })
  const c = await db.query(
    `SELECT c.id::text, c.body, c.team, c.hidden, c.created_at AS "createdAt", u.display_name AS "authorName", u.email AS "authorEmail"
       FROM idea_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.idea_id = $1 ORDER BY c.created_at`, [id],
  )
  const h = await db.query('SELECT status, note, created_at AS at FROM idea_status_events WHERE idea_id = $1 ORDER BY created_at', [id])
  return { ...r.rows[0], comments: c.rows, history: h.rows }
})
