// Une page masquée depuis l'administration répond 404, dans les deux langues.
const RULES: Array<[RegExp, string]> = [
  [/^\/(?:en\/)?contact(?:\/|$)/, 'contact'],
  [/^\/(?:en\/)?(?:rendez-vous|book-a-demo)(?:\/|$)/, 'booking'],
  [/^\/(?:en\/)?demo(?:\/|$)/, 'demo'],
]

export default defineNuxtRouteMiddleware((to) => {
  const features = useState<Record<string, boolean>>('site-features', () => ({}))
  for (const [pattern, key] of RULES) {
    if (pattern.test(to.path) && features.value[key] === false) {
      return abortNavigation(createError({ statusCode: 404, statusMessage: 'Not found' }))
    }
  }
})
