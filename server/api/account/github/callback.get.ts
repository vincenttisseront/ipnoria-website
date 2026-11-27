// Retour de GitHub : liaison au compte connecté, connexion d'un compte lié, ou création d'un compte.
// Une adresse déjà utilisée par un compte non lié n'est jamais rattachée d'office : il faut se connecter puis lier.
export default defineEventHandler(async (event) => {
  if (!githubEnabled()) throw createError({ statusCode: 404 })
  const flow = await useGithubFlow(event)
  const { state, link, next, locale = 'fr' } = flow.data
  await flow.clear()
  const base = locale === 'en' ? '/en/account' : '/compte'
  const signIn = locale === 'en' ? '/en/account/sign-in' : '/compte/connexion'
  const q = getQuery(event)
  if (!state || q.state !== state || typeof q.code !== 'string') return sendRedirect(event, `${signIn}?github=erreur`, 303)

  let gh
  try { gh = await githubIdentity(q.code) }
  catch (err) { console.error('[account] GitHub :', (err as Error).message); return sendRedirect(event, `${signIn}?github=erreur`, 303) }
  const db = useDb()
  const linked = (await db.query('SELECT id::text, email, locale FROM users WHERE github_id = $1', [gh.id])).rows[0]

  if (link) {
    const s = await getAccountSession(event)
    if (!s || s.mfaPending) return sendRedirect(event, signIn, 303)
    const sec = s.user.locale === 'en' ? '/en/account/security' : '/compte/securite'
    if (linked && linked.id !== s.user.id) return sendRedirect(event, `${sec}?github=deja-lie`, 303)
    await db.query('UPDATE users SET github_id = $2, updated_at = now() WHERE id = $1', [s.user.id, gh.id])
    await recordEvent(event, s.user, 'github_linked')
    return sendRedirect(event, `${sec}?github=lie`, 303)
  }

  let userId = linked?.id as string | undefined
  if (!userId) {
    if (!gh.email) return sendRedirect(event, `${signIn}?github=sans-email`, 303)
    const byEmail = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [gh.email])
    if (byEmail.rowCount || allowedAdmin(gh.email)) return sendRedirect(event, `${signIn}?github=compte-existant`, 303)
    const r = await db.query(
      `INSERT INTO users (email, email_verified_at, display_name, locale, github_id) VALUES ($1, now(), $2, $3, $4) RETURNING id::text`,
      [gh.email, gh.name.length >= 2 ? gh.name : `${gh.name}__`, locale, gh.id],
    )
    userId = r.rows[0].id as string
    await recordEvent(event, { id: userId, email: gh.email, locale }, 'register_github')
  }
  const user = (await loadUser(userId))!
  if (await hasSecondFactor(userId)) {
    await createSession(event, userId, { mfaPending: true })
    return sendRedirect(event, `${signIn}?etape=mfa&next=${encodeURIComponent(next ?? base)}`, 303)
  }
  const { newDevice } = await createSession(event, userId)
  await recordEvent(event, user, 'login_github')
  if (newDevice) await recordEvent(event, user, 'login_new_device')
  return sendRedirect(event, next && next !== '/compte' ? next : base, 303)
})
