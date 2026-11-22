import * as client from 'openid-client'

export default defineEventHandler(async (event) => {
  if (!oidcEnabled()) throw createError({ statusCode: 404 })
  const flow = await useFlowSession(event)
  const { verifier, state, nonce } = flow.data
  await flow.clear()
  if (!verifier || !state || !nonce) return sendRedirect(event, '/admin?erreur=session', 302)

  let email: string
  let name: string
  try {
    const config = await oidcConfig()
    // L'URL reçue est reconstruite sur l'adresse publique du site (derrière le proxy, l'hôte interne n'est pas fiable)
    const current = new URL(callbackUrl())
    current.search = new URL(event.path, 'http://x').search
    const tokens = await client.authorizationCodeGrant(config, current, {
      pkceCodeVerifier: verifier,
      expectedState: state,
      expectedNonce: nonce,
      idTokenExpected: true,
    })
    const claims = tokens.claims()
    email = String(claims?.email ?? '').toLowerCase()
    name = String(claims?.name ?? claims?.preferred_username ?? email)
    if (claims?.email_verified === false) email = ''
  }
  catch (err) {
    console.warn('[auth] échec de la connexion OIDC :', (err as Error).message)
    return sendRedirect(event, '/admin?erreur=fournisseur', 302)
  }

  if (!email || !allowedAdmin(email)) {
    console.warn('[auth] accès refusé à un compte non autorisé')
    return sendRedirect(event, '/admin?erreur=refuse', 302)
  }
  const session = await useAdminSession(event)
  await session.update({ email, name })
  return sendRedirect(event, '/admin', 302)
})
