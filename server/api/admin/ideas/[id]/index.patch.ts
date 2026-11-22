import { adminIdeaSchema } from '#shared/account'

// Modération d'une idée : statut (avec note envoyée aux votants), doublon (les voix passent à l'idée cible),
// masquage, correction du titre et du texte dans chaque langue.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const d = await readJson(event, adminIdeaSchema)
  const db = useDb()
  const cur = (await db.query('SELECT status, title, body FROM ideas WHERE id = $1', [id])).rows[0]
  if (!cur) throw createError({ statusCode: 404 })
  let status = d.status ?? cur.status
  if (d.duplicateOf) {
    if (String(d.duplicateOf) === id) throw fail(400, 'self_duplicate')
    const target = await db.query('SELECT 1 FROM ideas WHERE id = $1', [d.duplicateOf])
    if (!target.rowCount) throw fail(400, 'unknown_target')
    status = 'duplicate'
    await db.query(
      'INSERT INTO idea_votes (idea_id, user_id, created_at) SELECT $2, user_id, created_at FROM idea_votes WHERE idea_id = $1 ON CONFLICT DO NOTHING', [id, d.duplicateOf],
    )
  }
  const clean = (o?: { fr?: string, en?: string }) => o && Object.fromEntries(Object.entries(o).filter(([, v]) => v))
  await db.query(
    `UPDATE ideas SET status = $2, duplicate_of = $3, hidden = COALESCE($4, hidden),
            title = COALESCE($5, title), body = COALESCE($6, body), updated_at = now() WHERE id = $1`,
    [id, status, status === 'duplicate' ? (d.duplicateOf ?? null) : null, d.hidden ?? null,
      d.title ? { ...cur.title, ...clean(d.title) } : null, d.body ? { ...cur.body, ...clean(d.body) } : null],
  )
  let notified = 0
  if (status !== cur.status) {
    await db.query('INSERT INTO idea_status_events (idea_id, status, note) VALUES ($1, $2, NULLIF($3, \'\'))', [id, status, d.note])
    notified = await notifyStatusChange(id, status, d.note)
  }
  return { ok: true, notified }
})
