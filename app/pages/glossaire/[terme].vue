<script setup lang="ts">
import { ARTICLES } from '#shared/articles'
import { GLOSSARY, termById } from '#shared/glossary'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')
const term = computed(() => termById(lang.value, String(route.params.terme)))
if (!term.value) throw createError({ statusCode: 404, fatal: true })
const related = computed(() => term.value!.related.map(id => termById(lang.value, id)).filter(Boolean))
const articles = computed(() => ARTICLES.filter(a => a.related.glossary.includes(term.value!.id)))
useSeoMeta({ title: () => t('glossary.termTitle', { term: term.value!.term }), description: () => term.value!.short })
useOgImage('term', () => term.value?.id)
useBreadcrumbs(() => [{ name: t('glossary.title'), path: localePath('glossaire') }, { name: term.value!.term, path: route.path }])
const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
useJsonLd(() => ({
  '@type': 'DefinedTerm', 'name': term.value!.term, 'description': `${term.value!.short} ${term.value!.body}`, 'inLanguage': lang.value,
  'inDefinedTermSet': `${site}${localePath('glossaire')}`,
}))
const index = computed(() => GLOSSARY[lang.value].findIndex(x => x.id === term.value!.id))
</script>

<template>
  <div v-if="term" class="wrap py-14 md:py-20">
    <NuxtLink :to="localePath('glossaire')" class="text-sm text-muted no-underline hover:text-fg">{{ t('glossary.back') }}</NuxtLink>
    <h1 class="mt-6 text-display">{{ term.term }}</h1>
    <p class="measure mt-5 text-xl leading-relaxed">{{ term.short }}</p>
    <div class="mt-12 grid gap-12 lg:grid-cols-[1fr_18rem]">
      <div class="measure space-y-8">
        <p class="text-[1.05rem] leading-relaxed text-muted">{{ term.body }}</p>
        <section class="rounded-xl border border-accent/40 bg-accent-soft p-5" aria-labelledby="gl-ipn">
          <h2 id="gl-ipn" class="font-semibold">{{ t('glossary.inIpnoria') }}</h2>
          <p class="mt-2">{{ term.ipnoria }}</p>
        </section>
        <section v-if="articles.length" aria-labelledby="gl-art">
          <h2 id="gl-art" class="font-semibold">{{ t('glossary.articles') }}</h2>
          <ul class="mt-3 space-y-2">
            <li v-for="a in articles" :key="a.id"><NuxtLink :to="localePath({ name: 'articles-slug', params: { slug: a.slug[lang] } })" class="link">{{ a.title[lang] }}</NuxtLink></li>
          </ul>
        </section>
      </div>
      <aside v-if="related.length" aria-labelledby="gl-rel">
        <h2 id="gl-rel" class="text-sm font-semibold">{{ t('glossary.related') }}</h2>
        <ul class="mt-3 space-y-3">
          <li v-for="r in related" :key="r!.id">
            <NuxtLink :to="localePath({ name: 'glossaire-terme', params: { terme: r!.id } })" class="block rounded-lg border border-line p-3 no-underline hover:border-accent/60">
              <span class="font-medium text-fg">{{ r!.term }}</span><span class="mt-1 block text-sm text-muted">{{ r!.short }}</span>
            </NuxtLink>
          </li>
        </ul>
      </aside>
    </div>
    <nav class="mt-16 flex justify-between gap-4 border-t border-line pt-6 text-sm" :aria-label="t('glossary.title')">
      <NuxtLink v-if="index > 0" :to="localePath({ name: 'glossaire-terme', params: { terme: GLOSSARY[lang][index - 1]!.id } })" class="link">← {{ GLOSSARY[lang][index - 1]!.term }}</NuxtLink><span v-else />
      <NuxtLink v-if="index < GLOSSARY[lang].length - 1" :to="localePath({ name: 'glossaire-terme', params: { terme: GLOSSARY[lang][index + 1]!.id } })" class="link">{{ GLOSSARY[lang][index + 1]!.term }} →</NuxtLink>
    </nav>
  </div>
</template>
