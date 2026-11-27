// Réponses types, réutilisables dans un message puis modifiées avant l'envoi.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { rows } = await useDb().query<{ id: string, title: string, body: string }>(
    `SELECT id::text, title, body FROM reply_templates ORDER BY title, id`,
  )
  return rows
})
