import { commentSchema } from '#shared/account'

// Commenter : adresse vérifiée, 30 commentaires par heure au plus. L'auteur de l'idée est prévenu.
export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { verified: true })
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^\d{1,12}$/.test(id)) throw createError({ statusCode: 404 })
  const { body } = await readJson(event, commentSchema)
  const db = useDb()
  const idea = (await db.query('SELECT hidden FROM ideas WHERE id = $1', [id])).rows[0]
  if (!idea || idea.hidden) throw createError({ statusCode: 404 })
  const recent = await db.query(`SELECT count(*)::int AS n FROM idea_comments WHERE user_id = $1 AND created_at > now() - interval '1 hour'`, [s.user.id])
  if (recent.rows[0].n >= 30) throw fail(429, 'too_many_comments')
  const r = await db.query('INSERT INTO idea_comments (idea_id, user_id, body) VALUES ($1, $2, $3) RETURNING id::text, created_at AS "createdAt"', [id, s.user.id, body])
  await notifyComment(id, s.user.id, s.user.displayName, body)
  return { ok: true, comment: { ...r.rows[0], body, team: false, authorName: s.user.displayName, mine: true, editedAt: null } }
})
