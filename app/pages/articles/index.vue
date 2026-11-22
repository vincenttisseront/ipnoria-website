<script setup lang="ts">
import { ARTICLES } from '#shared/articles'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')
const list = computed(() => [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date)))
const fmt = (d: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(d))
useSeoMeta({ title: () => t('articles.title'), description: () => t('articles.lead') })
useOgImage('page', () => 'articles')
useBreadcrumbs(() => [{ name: t('articles.title'), path: localePath('articles') }])
</script>

<template>
  <div class="wrap py-14 md:py-20">
    <h1 class="text-h2">{{ t('articles.title') }}</h1>
    <p class="measure mt-4 text-lg text-muted">{{ t('articles.lead') }}</p>
    <ul class="mt-12 divide-y divide-line border-y border-line">
      <li v-for="a in list" :key="a.id" class="py-7">
        <p class="text-sm text-muted">{{ fmt(a.date) }}, {{ t('articles.minutes', { n: a.minutes }) }}</p>
        <h2 class="mt-2 text-xl font-semibold tracking-tight"><NuxtLink :to="localePath({ name: 'articles-slug', params: { slug: a.slug[lang] } })" class="text-fg no-underline hover:text-accent">{{ a.title[lang] }}</NuxtLink></h2>
        <p class="measure mt-2 text-muted">{{ a.description[lang] }}</p>
      </li>
    </ul>
  </div>
</template>
