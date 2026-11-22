<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const version = computed(() => String(route.params.version))

interface Rel { version: string, title: string, publishedAt: string | null, releaseUrl: string | null, html: string, newer: string | null, older: string | null }
const { data: rel, error } = await useFetch<Rel>(() => `/api/releases/${version.value}`)
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, fatal: true })
useSeoMeta({ title: () => `Ipnoria ${version.value}`, description: () => rel.value?.title ?? '' })
useOgImage('release', () => version.value)
useBreadcrumbs(() => [{ name: t('releases.title'), path: localePath('nouveautes') }, { name: `Ipnoria ${version.value}`, path: route.path }])

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const to = (v: string) => localePath({ name: 'nouveautes-version', params: { version: v } })
</script>

<template>
  <div v-if="rel" class="wrap max-w-3xl pt-12">
    <NuxtLink :to="localePath('nouveautes')" class="text-sm text-muted no-underline hover:text-fg">{{ t('releases.back') }}</NuxtLink>
    <p class="mt-8 font-mono text-muted">{{ rel.version }}<span v-if="rel.publishedAt">, {{ fmt(rel.publishedAt) }}</span></p>
    <h1 class="mt-2 text-h2">{{ rel.title || `Ipnoria ${rel.version}` }}</h1>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="prose-doc mt-8" lang="fr" v-html="rel.html" />
    <a v-if="rel.releaseUrl" :href="rel.releaseUrl" class="btn btn-secondary mt-10" rel="noopener"><AppIcon name="download" :size="16" />{{ t('releases.download') }}</a>
    <nav :aria-label="t('releases.pagination')" class="mt-14 flex justify-between border-t border-line pt-6 text-sm">
      <NuxtLink v-if="rel.older" :to="to(rel.older)" class="link">{{ t('releases.olderOne', { v: rel.older }) }}</NuxtLink>
      <span v-else />
      <NuxtLink v-if="rel.newer" :to="to(rel.newer)" class="link">{{ t('releases.newerOne', { v: rel.newer }) }}</NuxtLink>
    </nav>
  </div>
</template>
