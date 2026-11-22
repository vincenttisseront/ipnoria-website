import { randomToken } from '../../../utils/account-crypto'

// Départ vers GitHub. ?link=1 : lier GitHub au compte connecté ; ?next= : page de retour (chemin local).
export default defineEventHandler(async (event) => {
  if (!githubEnabled()) throw createError({ statusCode: 404 })
  const q = getQuery(event)
  const link = q.link === '1'
  if (link) {
    const s = await getAccountSession(event)
    if (!s || s.mfaPending) return sendRedirect(event, '/compte/connexion', 303)
    if (Date.now() - new Date(s.reauthAt).getTime() > REAUTH_MINUTES * 60_000) return sendRedirect(event, '/compte/securite?github=reauth', 303)
  }
  const state = randomToken()
  const flow = await useGithubFlow(event)
  await flow.update({ state, link, next: safeNext(q.next), locale: q.locale === 'en' ? 'en' : 'fr' })
  const url = new URL('https://github.com/login/oauth/authorize')
  url.search = new URLSearchParams({
    client_id: String(useRuntimeConfig().accounts.githubClientId),
    redirect_uri: githubCallbackUrl(),
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  }).toString()
  return sendRedirect(event, url.toString(), 303)
})
