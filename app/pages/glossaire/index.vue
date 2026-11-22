<script setup lang="ts">
import { GLOSSARY } from '#shared/glossary'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')
const terms = computed(() => [...GLOSSARY[lang.value]].sort((a, b) => a.term.localeCompare(b.term, lang.value)))
useSeoMeta({ title: () => t('glossary.title'), description: () => t('glossary.lead') })
useOgImage('page', () => 'glossary')
useBreadcrumbs(() => [{ name: t('glossary.title'), path: localePath('glossaire') }])
const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
useJsonLd(() => ({
  '@type': 'DefinedTermSet', 'name': t('glossary.title'), 'inLanguage': lang.value,
  'hasDefinedTerm': terms.value.map(x => ({ '@type': 'DefinedTerm', 'name': x.term, 'description': x.short, 'url': `${site}${localePath({ name: 'glossaire-terme', params: { terme: x.id } })}` })),
}))
const q = ref('')
const shown = computed(() => {
  const f = q.value.trim().toLowerCase()
  return f ? terms.value.filter(x => `${x.term} ${x.short}`.toLowerCase().includes(f)) : terms.value
})
</script>

<template>
  <div class="wrap py-14 md:py-20">
    <h1 class="text-h2">{{ t('glossary.title') }}</h1>
    <p class="measure mt-4 text-lg text-muted">{{ t('glossary.lead') }}</p>
    <div class="relative mt-10 max-w-sm">
      <label for="gl-q" class="sr-only">{{ t('glossary.filter') }}</label>
      <input id="gl-q" v-model="q" type="search" class="field pl-9" :placeholder="t('glossary.filter')">
      <AppIcon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
    <dl class="mt-8 grid gap-x-10 gap-y-2 md:grid-cols-2">
      <div v-for="x in shown" :key="x.id" class="border-t border-line py-4">
        <dt><NuxtLink :to="localePath({ name: 'glossaire-terme', params: { terme: x.id } })" class="font-semibold text-fg no-underline hover:text-accent">{{ x.term }}</NuxtLink></dt>
        <dd class="mt-1 text-[0.95rem] text-muted">{{ x.short }}</dd>
      </div>
    </dl>
    <p v-if="!shown.length" class="mt-6 text-muted">{{ t('glossary.none') }}</p>
  </div>
</template>
