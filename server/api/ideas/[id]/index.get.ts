// Détail d'une idée : texte, votes, commentaires visibles, historique des statuts, idée cible si doublon.
export default defineEventHandler(async (event) => {
  if (!hasDb()) throw createError({ statusCode: 404 })
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^\d{1,12}$/.test(id)) throw createError({ statusCode: 404 })
  const s = accountsEnabled() ? await getAccountSession(event) : null
  const me = s && !s.mfaPending ? s.user.id : null
  const db = useDb()
  const r = await db.query(
    `SELECT ${IDEA_SELECT}, EXISTS (SELECT 1 FROM idea_votes v WHERE v.idea_id = i.id AND v.user_id = $2) AS voted,
            COALESCE(i.author_id = $2, false) AS mine
       FROM ideas i LEFT JOIN users u ON u.id = i.author_id WHERE i.id = $1`, [id, me],
  )
  const idea = r.rows[0]
  if (!idea || idea.hidden) throw createError({ statusCode: 404 })
  const [comments, history, dup] = await Promise.all([
    db.query(
      `SELECT c.id::text, c.body, c.team, c.created_at AS "createdAt", c.edited_at AS "editedAt",
              CASE WHEN c.team THEN NULL ELSE u.display_name END AS "authorName", COALESCE(c.user_id = $2, false) AS mine
         FROM idea_comments c LEFT JOIN users u ON u.id = c.user_id
        WHERE c.idea_id = $1 AND NOT c.hidden ORDER BY c.created_at`, [id, me],
    ),
    db.query('SELECT status, note, created_at AS at FROM idea_status_events WHERE idea_id = $1 ORDER BY created_at', [id]),
    idea.duplicateOf ? db.query('SELECT id::text, title FROM ideas WHERE id = $1 AND NOT hidden', [idea.duplicateOf]) : null,
  ])
  const { hidden: _h, ...rest } = idea
  return { ...rest, comments: comments.rows, history: history.rows, duplicate: dup?.rows[0] ?? null }
})
