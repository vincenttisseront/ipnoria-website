// Données structurées (schema.org, JSON-LD) et images d'aperçu par page.

const siteBase = () => useRuntimeConfig().public.siteUrl.replace(/\/$/, '')

/** Ajoute un bloc JSON-LD à la page (recalculé quand ses données changent). */
export function useJsonLd(data: () => Record<string, unknown> | null) {
  useHead({ script: [{ type: 'application/ld+json', innerHTML: () => { const d = data(); return d ? JSON.stringify({ '@context': 'https://schema.org', ...d }) : '' } }] })
}

/** Fil d'Ariane pour les moteurs de recherche : accueil, puis les niveaux donnés (chemins locaux). */
export function useBreadcrumbs(items: () => Array<{ name: string, path: string }>) {
  const base = siteBase() // lu ici : le contexte Nuxt n'existe plus quand l'en-tête est calculé
  const { t } = useI18n()
  const localePath = useLocalePath()
  useJsonLd(() => ({
    '@type': 'BreadcrumbList',
    'itemListElement': [{ name: t('nav.home'), path: localePath('/') }, ...items()].map((it, i) => ({
      '@type': 'ListItem', 'position': i + 1, 'name': it.name, 'item': `${base}${it.path}`,
    })),
  }))
}

/** Image d'aperçu générée pour la page (réseaux sociaux, messageries). */
export function useOgImage(kind: string, key: () => string | undefined) {
  const base = siteBase()
  const { locale } = useI18n()
  const url = computed(() => key() ? `${base}/og/${kind}/${encodeURIComponent(key()!)}.png?lang=${locale.value}` : undefined)
  useSeoMeta({ ogImage: () => url.value, twitterImage: () => url.value, ogImageWidth: 1200, ogImageHeight: 630, twitterCard: 'summary_large_image' })
}
