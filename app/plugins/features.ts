// Charge l'état des éléments publics avant le rendu, pour masquer liens et pages ensemble.
export default defineNuxtPlugin(async () => {
  const features = useState<Record<string, boolean>>('site-features', () => ({}))
  try {
    features.value = await $fetch<Record<string, boolean>>('/api/features')
  }
  catch { /* réseau indisponible : les éléments restent visibles */ }
})
