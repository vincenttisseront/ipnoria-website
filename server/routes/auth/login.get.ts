import * as client from 'openid-client'

export default defineEventHandler(async (event) => {
  if (!oidcEnabled()) throw createError({ statusCode: 404 })
  const config = await oidcConfig()
  const verifier = client.randomPKCECodeVerifier()
  const state = client.randomState()
  const nonce = client.randomNonce()
  const flow = await useFlowSession(event)
  await flow.update({ verifier, state, nonce })

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl(),
    scope: useRuntimeConfig().oidc.scopes || 'openid email profile',
    code_challenge: await client.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    state,
    nonce,
    // Demande explicite d'un niveau d'authentification avec second facteur, si le fournisseur le gère
    ...(useRuntimeConfig().oidc.mfaAcr ? { acr_values: String(useRuntimeConfig().oidc.mfaAcr) } : {}),
  })
  return sendRedirect(event, url.href, 302)
})
