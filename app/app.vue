<script setup lang="ts">
const { t } = useI18n()
const head = useLocaleHead({ seo: true })
const config = useRuntimeConfig()

useHead({
  htmlAttrs: { lang: () => head.value.htmlAttrs?.lang },
  link: () => [...(head.value.link || [])],
  meta: () => [...(head.value.meta || [])],
  titleTemplate: (title?: string) => (title ? `${title} | DDI-Buntu` : t('meta.title')),
})

useSeoMeta({
  description: () => t('meta.description'),
  ogSiteName: 'DDI-Buntu',
  ogType: 'website',
  ogImage: `${config.public.siteUrl}/img/console-ipam-reseaux-sombre.png`,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
