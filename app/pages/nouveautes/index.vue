<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

interface Item { version: string, title: string, publishedAt: string | null, releaseUrl: string | null, html: string }
const { data } = await useFetch<{ total: number, page: number, pages: number, items: Item[] }>('/api/releases', { query: { page } })
useSeoMeta({ title: () => t('releases.title'), description: () => t('releases.lead') })
useHead({ link: [{ rel: 'alternate', type: 'application/rss+xml', title: 'Ipnoria', href: '/rss.xml' }] })

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
</script>

<template>
  <div class="wrap pt-14">
    <h1 class="text-display">{{ t('releases.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('releases.lead') }}</p>
    <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <a href="/rss.xml" class="link inline-flex items-center gap-1.5"><AppIcon name="activity" :size="14" />{{ t('releases.rss') }}</a>
      <a href="#newsletter" class="link">{{ t('releases.emailAlerts') }}</a>
      <span v-if="locale === 'en'" class="text-muted">{{ t('releases.inFrench') }}</span>
    </div>

    <ol v-if="data" class="mt-14 space-y-16">
      <li v-for="r in data.items" :key="r.version" class="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <div>
          <NuxtLink :to="localePath({ name: 'nouveautes-version', params: { version: r.version } })" class="font-mono text-lg text-fg no-underline hover:text-accent">{{ r.version }}</NuxtLink>
          <p v-if="r.publishedAt" class="mt-1 text-sm text-muted">{{ fmt(r.publishedAt) }}</p>
        </div>
        <article class="min-w-0">
          <h2 class="text-xl font-semibold tracking-tight">{{ r.title || `Ipnoria ${r.version}` }}</h2>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="prose-doc mt-4" lang="fr" v-html="r.html" />
        </article>
      </li>
    </ol>

    <nav v-if="data && data.pages > 1" :aria-label="t('releases.pagination')" class="mt-16 flex justify-between border-t border-line pt-6">
      <NuxtLink v-if="data.page > 1" :to="{ query: { page: data.page - 1 } }" class="btn btn-secondary">{{ t('releases.newer') }}</NuxtLink>
      <span v-else />
      <NuxtLink v-if="data.page < data.pages" :to="{ query: { page: data.page + 1 } }" class="btn btn-secondary">{{ t('releases.older') }}</NuxtLink>
    </nav>

    <NewsletterSignup id="newsletter" class="mt-20" />
  </div>
</template>
