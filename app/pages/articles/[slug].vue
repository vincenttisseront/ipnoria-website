<script setup lang="ts">
import { ARTICLES, articleBySlug } from '#shared/articles'
import { termById } from '#shared/glossary'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')
const article = computed(() => articleBySlug(lang.value, String(route.params.slug)))
if (!article.value) throw createError({ statusCode: 404, fatal: true })
const setI18nParams = useSetI18nParams()
setI18nParams({ fr: { slug: article.value.slug.fr }, en: { slug: article.value.slug.en } })
const fmt = (d: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(d))
const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
useSeoMeta({ title: () => article.value!.title[lang.value], description: () => article.value!.description[lang.value], ogType: 'article', articlePublishedTime: () => article.value!.date })
useOgImage('article', () => article.value?.id)
useBreadcrumbs(() => [{ name: t('articles.title'), path: localePath('articles') }, { name: article.value!.title[lang.value], path: route.path }])
useJsonLd(() => ({
  '@type': 'TechArticle', 'headline': article.value!.title[lang.value], 'description': article.value!.description[lang.value],
  'datePublished': article.value!.date, 'inLanguage': lang.value, 'mainEntityOfPage': `${site}${route.path}`,
  'image': `${site}/og/article/${article.value!.id}.png?lang=${lang.value}`,
  'author': { '@type': 'Organization', 'name': 'Ipnoria' }, 'publisher': { '@type': 'Organization', 'name': 'Ipnoria', 'logo': { '@type': 'ImageObject', 'url': `${site}/favicon.svg` } },
}))
const terms = computed(() => article.value!.related.glossary.map(id => termById(lang.value, id)).filter(Boolean))
const others = computed(() => ARTICLES.filter(a => a.id !== article.value!.id))
</script>

<template>
  <article v-if="article" class="wrap py-14 md:py-20">
    <NuxtLink :to="localePath('articles')" class="text-sm text-muted no-underline hover:text-fg">{{ t('articles.back') }}</NuxtLink>
    <h1 class="mt-6 max-w-4xl text-h2">{{ article.title[lang] }}</h1>
    <p class="mt-4 text-sm text-muted">{{ fmt(article.date) }}, {{ t('articles.minutes', { n: article.minutes }) }}</p>
    <p class="measure mt-6 text-lg text-muted">{{ article.description[lang] }}</p>
    <div class="mt-12 grid gap-12 lg:grid-cols-[1fr_18rem]">
      <div class="measure">
        <section v-for="(s, i) in article.sections[lang]" :key="i" class="mt-10 first:mt-0">
          <h2 class="text-xl font-semibold tracking-tight">{{ s.h }}</h2>
          <p v-for="(p, j) in s.p" :key="j" class="mt-4 text-[1.05rem] leading-relaxed">{{ p }}</p>
        </section>
        <div class="mt-12 flex flex-wrap gap-3">
          <NuxtLink v-for="l in article.related.links" :key="l.name" :to="localePath({ name: l.name, params: l.params })" class="btn btn-secondary">{{ l.label[lang] }}</NuxtLink>
        </div>
      </div>
      <aside class="space-y-8">
        <section v-if="terms.length" aria-labelledby="ar-terms">
          <h2 id="ar-terms" class="text-sm font-semibold">{{ t('articles.terms') }}</h2>
          <ul class="mt-3 flex flex-wrap gap-2">
            <li v-for="x in terms" :key="x!.id"><NuxtLink :to="localePath({ name: 'glossaire-terme', params: { terme: x!.id } })" class="inline-block rounded-full border border-line px-3 py-1 text-sm text-fg no-underline hover:border-accent/60">{{ x!.term }}</NuxtLink></li>
          </ul>
        </section>
        <section aria-labelledby="ar-others">
          <h2 id="ar-others" class="text-sm font-semibold">{{ t('articles.others') }}</h2>
          <ul class="mt-3 space-y-3 text-sm">
            <li v-for="o in others" :key="o.id"><NuxtLink :to="localePath({ name: 'articles-slug', params: { slug: o.slug[lang] } })" class="link">{{ o.title[lang] }}</NuxtLink></li>
          </ul>
        </section>
        <NuxtLink :to="localePath('beta')" class="block rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm no-underline">
          <span class="font-semibold text-fg">{{ t('articles.betaTitle') }}</span><span class="mt-1 block text-muted">{{ t('articles.betaText') }}</span>
        </NuxtLink>
      </aside>
    </div>
  </article>
</template>
