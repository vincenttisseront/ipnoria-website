import { commentSchema } from '#shared/account'

// Réponse de l'équipe, signée « Équipe Ipnoria » sur le site.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const { body } = await readJson(event, commentSchema)
  const r = await useDb().query('INSERT INTO idea_comments (idea_id, team, body) VALUES ($1, true, $2) RETURNING id::text', [id, body])
  await notifyComment(id, null, 'Équipe Ipnoria / Ipnoria team', body)
  await adminAudit(event, admin, 'idea.reply', 'idea', id, {})
  return { ok: true, id: r.rows[0].id }
})
