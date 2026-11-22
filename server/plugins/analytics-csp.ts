// Statistiques Umami (auto-hébergées, sans cookie) : quand NUXT_PUBLIC_ANALYTICS_SRC est défini, l'envoi des mesures vers
// son origine est autorisé dans la CSP, à l'exécution (l'image est construite une fois pour tous les domaines).
// Le script lui-même est chargé avec le nonce de la page (script-src 'strict-dynamic' 'nonce-…') : rien à ajouter pour lui.
export default defineNitroPlugin((nitro) => {
  const src = useRuntimeConfig().public.analytics.src
  if (!src) return
  let origin: string
  try { origin = new URL(src).origin }
  catch { console.error('[analytics] NUXT_PUBLIC_ANALYTICS_SRC invalide, statistiques désactivées'); return }

  nitro.hooks.hook('beforeResponse', (event) => {
    const csp = getResponseHeader(event, 'content-security-policy')
    if (typeof csp === 'string' && csp.includes('connect-src \'self\'') && !csp.includes(origin)) {
      setResponseHeader(event, 'content-security-policy', csp.replace('connect-src \'self\'', `connect-src 'self' ${origin}`))
    }
  })
})
