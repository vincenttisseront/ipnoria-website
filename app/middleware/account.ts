// Pages du compte : renvoie vers la connexion si personne n'est connecté (avec retour à la page demandée).
// Les composables sont lus avant tout await : le contexte Nuxt ne survit pas à une attente côté serveur.
export default defineNuxtRouteMiddleware(async (to) => {
  const nuxtApp = useNuxtApp()
  const localePath = useLocalePath()
  const { state, ensure } = useAccount()
  await ensure()
  if (state.value && !state.value.enabled) return nuxtApp.runWithContext(() => abortNavigation(createError({ statusCode: 404, statusMessage: 'Not found' })))
  if (!state.value?.user) return nuxtApp.runWithContext(() => navigateTo({ path: localePath('compte-connexion'), query: { next: to.fullPath } }, { replace: true }))
})
