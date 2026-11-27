/** Vrai tant que l'élément n'a pas été explicitement masqué. */
export function useSiteFeatures() {
  const features = useState<Record<string, boolean>>('site-features', () => ({}))
  const on = (key: string) => features.value[key] !== false
  async function refresh() {
    try { features.value = await $fetch<Record<string, boolean>>('/api/features') }
    catch { /* conserve l'état déjà affiché */ }
  }
  return { features, on, refresh }
}
