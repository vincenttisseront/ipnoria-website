// Lien de confirmation d'un vote (7 jours, usage unique)
export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token ?? '')
  const fail = (locale = 'fr') => sendRedirect(event, `${locale === 'en' ? '/en/roadmap' : '/feuille-de-route'}?vote=invalide`, 303)
  if (!hasDb() || !/^[\w-]{43}$/.test(token)) return fail()
  const { rows: [row] } = await useDb().query<{ item: string, locale: string }>(
    `UPDATE roadmap_votes SET confirmed_at = now(), token_hash = NULL
      WHERE token_hash = $1 AND confirmed_at IS NULL AND created_at > now() - interval '7 days'
      RETURNING item, locale`,
    [hashToken(token)],
  )
  if (!row) return fail()
  return sendRedirect(event, `${row.locale === 'en' ? '/en/roadmap' : '/feuille-de-route'}?vote=confirme#${row.item}`, 303)
})
