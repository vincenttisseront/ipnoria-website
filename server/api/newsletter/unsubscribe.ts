// Désinscription : lien du pied des e-mails (GET), ou désinscription en un clic des messageries (POST, RFC 8058).
// L'adresse est effacée (pas seulement marquée) : rien n'est conservé.
export default defineEventHandler(async (event) => {
  const method = event.method
  if (method !== 'GET' && method !== 'POST') throw createError({ statusCode: 405 })
  const token = String(getQuery(event).token ?? '')
  const invalid = () => (method === 'POST' ? { ok: false } : sendRedirect(event, '/newsletter?etat=invalide', 303))
  if (!hasDb() || !/^[\w-]{43}$/.test(token)) return invalid()
  const { rows: [row] } = await useDb().query<{ locale: string }>(
    'DELETE FROM newsletter_subscribers WHERE token_hash = $1 RETURNING locale',
    [hashToken(token)],
  )
  if (!row) return invalid()
  return method === 'POST' ? { ok: true } : sendRedirect(event, `${row.locale === 'en' ? '/en' : ''}/newsletter?etat=desinscrit`, 303)
})
