// Toutes les idées pour la modération, y compris masquées, avec le nombre de commentaires masqués.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const r = await useDb().query(
    `SELECT ${IDEA_SELECT}, u.email AS "authorEmail",
            (SELECT count(*)::int FROM idea_comments c WHERE c.idea_id = i.id AND c.hidden) AS "hiddenComments"
       FROM ideas i LEFT JOIN users u ON u.id = i.author_id ORDER BY i.created_at DESC LIMIT 500`,
  )
  return r.rows
})
