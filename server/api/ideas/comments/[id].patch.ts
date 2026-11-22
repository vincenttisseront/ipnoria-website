import { commentSchema } from '#shared/account'

export default defineEventHandler(async (event) => {
  const s = await requireUser(event, { verified: true })
  const { body } = await readJson(event, commentSchema)
  const r = await useDb().query(
    'UPDATE idea_comments SET body = $3, edited_at = now() WHERE id = $1 AND user_id = $2 AND NOT team RETURNING edited_at AS "editedAt"',
    [getRouterParam(event, 'id'), s.user.id, body],
  )
  if (!r.rowCount) throw createError({ statusCode: 404 })
  return { ok: true, editedAt: r.rows[0].editedAt }
})
