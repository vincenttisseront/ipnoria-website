// Messages reçus, du plus récent au plus ancien. Filtre : à traiter (défaut), traités, tous. Recherche sur le nom, l'adresse ou la société.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)
  const { sql, args } = inboxWhere(q.filtre, q.q)
  const db = useDb()
  const [{ rows }, { rows: [stats] }] = await Promise.all([
    db.query(`SELECT id, created_at, locale, name, email, company, topic, message, handled_at, replied_at, reply_body
                FROM contact_messages WHERE ${sql} ORDER BY created_at DESC LIMIT 200`, args),
    db.query<{ open: number, total: number, subscribers: number }>(
      `SELECT (SELECT count(*)::int FROM contact_messages WHERE handled_at IS NULL) AS open,
              (SELECT count(*)::int FROM contact_messages) AS total,
              (SELECT count(*)::int FROM newsletter_subscribers WHERE confirmed_at IS NOT NULL) AS subscribers`,
    ),
  ])
  return { messages: rows, stats }
})
