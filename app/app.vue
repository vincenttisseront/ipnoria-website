<script setup lang="ts">
const { t } = useI18n()
const head = useLocaleHead({ seo: true })
const config = useRuntimeConfig()
const route = useRoute()
const { choice: theme } = useTheme()

useHead({
  htmlAttrs: { 'lang': () => head.value.htmlAttrs?.lang, 'data-theme': () => (theme.value === 'system' ? undefined : theme.value) },
  link: () => [...(head.value.link || []), { rel: 'alternate', type: 'application/rss+xml', title: 'Ipnoria', href: '/rss.xml' }],
  meta: () => [...(head.value.meta || [])],
  titleTemplate: (title?: string) => (title ? `${title} | Ipnoria` : t('meta.title')),
})

// Image d'aperçu par section (générées par tools/og_images.py) ; à défaut, l'image de l'accueil
const ogKey = computed(() => {
  const p = route.path.replace(/^\/en(?=\/|$)/, '') || '/'
  if (p.startsWith('/documentation') || p.startsWith('/docs')) return 'docs'
  if (p.startsWith('/comparatif') || p.startsWith('/comparison')) return 'comparatif'
  if (p.startsWith('/guides')) return 'guides'
  if (p.startsWith('/nouveautes') || p.startsWith('/releases')) return 'nouveautes'
  if (p.startsWith('/contact')) return 'contact'
  return 'accueil'
})
useSeoMeta({
  description: () => t('meta.description'),
  ogSiteName: 'Ipnoria',
  ogType: 'website',
  ogImage: () => `${config.public.siteUrl.replace(/\/$/, '')}/og/${ogKey.value}.png`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
})

// Statistiques sans cookie (Umami auto-hébergé), seulement si configurées ; « Do Not Track » respecté
const analytics = config.public.analytics
if (analytics.src && analytics.websiteId) {
  useHead({
    script: [{ src: analytics.src, defer: true, 'data-website-id': analytics.websiteId, 'data-do-not-track': 'true' }],
  })
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
