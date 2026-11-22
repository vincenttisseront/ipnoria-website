// Messages reçus, du plus récent au plus ancien. Filtre : à traiter (défaut), traités, tous.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const filter = String(getQuery(event).filtre ?? 'ouverts')
  const where = filter === 'traites' ? 'handled_at IS NOT NULL' : filter === 'tous' ? 'TRUE' : 'handled_at IS NULL'
  const db = useDb()
  const [{ rows }, { rows: [stats] }] = await Promise.all([
    db.query(`SELECT id, created_at, locale, name, email, company, topic, message, handled_at, replied_at, reply_body
                FROM contact_messages WHERE ${where} ORDER BY created_at DESC LIMIT 200`),
    db.query<{ open: number, total: number, subscribers: number }>(
      `SELECT (SELECT count(*)::int FROM contact_messages WHERE handled_at IS NULL) AS open,
              (SELECT count(*)::int FROM contact_messages) AS total,
              (SELECT count(*)::int FROM newsletter_subscribers WHERE confirmed_at IS NOT NULL) AS subscribers`,
    ),
  ])
  return { messages: rows, stats }
})
