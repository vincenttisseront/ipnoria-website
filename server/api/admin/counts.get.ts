// Compteurs de la navigation : messages à traiter, démonstrations à venir.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDb()
  const [{ rows: [messages] }, { rows: [bookings] }] = await Promise.all([
    db.query<{ n: number }>(`SELECT count(*)::int AS n FROM contact_messages WHERE handled_at IS NULL`),
    db.query<{ n: number }>(`SELECT count(*)::int AS n FROM bookings WHERE status = 'confirmed' AND starts_at > now()`),
  ])
  return { messages: messages?.n ?? 0, bookings: bookings?.n ?? 0 }
})
