<script setup lang="ts">
import { REFERENCE_SECTORS } from '#shared/account'
import { quoted } from '#shared/references'
import type { PublicReference } from '#shared/references'

// « Ils utilisent Ipnoria » : références publiées avec l'accord des clients, filtrables par secteur.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { on } = useSiteFeatures()
const route = useRoute()
const router = useRouter()
useSeoMeta({ title: () => t('refs.title'), description: () => t('refs.lead') })
useOgImage('page', () => 'references')
const { data: refs } = await useFetch<PublicReference[]>('/api/references', { default: () => [] })
const sectors = computed(() => REFERENCE_SECTORS.filter(s => refs.value?.some(r => r.sector === s)))
const sector = ref(typeof route.query.secteur === 'string' ? route.query.secteur : '')
watch(sector, v => router.replace({ query: v ? { secteur: v } : {} }))
const shown = computed(() => (refs.value ?? []).filter(r => !sector.value || r.sector === sector.value))
const pick = (o: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
</script>

<template>
  <div class="wrap py-14 md:py-20">
    <div class="max-w-2xl">
      <h1 class="text-h2">{{ t('refs.title') }}</h1>
      <p class="mt-4 text-lg text-muted">{{ t('refs.lead') }}</p>
    </div>

    <div v-if="sectors.length > 1" role="radiogroup" :aria-label="t('refs.filter')" class="mt-10 flex flex-wrap gap-1">
      <button type="button" role="radio" :aria-checked="!sector" class="rounded-full border px-3 py-1.5 text-sm" :class="!sector ? 'border-accent/60 bg-accent-soft text-fg' : 'border-line text-muted hover:text-fg'" @click="sector = ''">{{ t('refs.all') }}</button>
      <button
        v-for="s in sectors" :key="s" type="button" role="radio" :aria-checked="sector === s"
        class="rounded-full border px-3 py-1.5 text-sm" :class="sector === s ? 'border-accent/60 bg-accent-soft text-fg' : 'border-line text-muted hover:text-fg'"
        @click="sector = s"
      >{{ t(`refs.sectors.${s}`) }}</button>
    </div>

    <ul v-if="shown.length" class="mt-8 grid gap-4 md:grid-cols-2">
      <li v-for="r in shown" :key="r.id" class="panel flex flex-col p-6">
        <div class="flex items-start gap-5">
          <ReferenceLogo :reference="r" />
          <div class="min-w-0">
            <h2 class="text-lg font-semibold tracking-tight">{{ r.name }}</h2>
            <p class="mt-1 text-sm text-muted">{{ [t(`refs.sectors.${r.sector}`), pick(r.size), r.location].filter(Boolean).join(', ') }}</p>
          </div>
        </div>
        <blockquote v-if="pick(r.quote)" class="mt-5 flex-1 border-l-2 border-accent/60 pl-4">
          <p class="text-[1.02rem] leading-relaxed">{{ quoted(pick(r.quote), locale) }}</p>
          <footer v-if="r.quoteAuthor" class="mt-2 text-sm text-muted">{{ r.quoteAuthor }}<template v-if="pick(r.quoteRole)">, {{ pick(r.quoteRole) }}</template></footer>
        </blockquote>
        <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <ul class="flex flex-wrap gap-1.5" :aria-label="t('refs.services')">
            <li v-for="s in r.services" :key="s" class="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.75rem] text-muted">{{ t(`refs.serviceNames.${s}`) }}</li>
          </ul>
          <NuxtLink v-if="r.hasStory" :to="localePath({ name: 'references-slug', params: { slug: r.slug } })" class="link text-sm">{{ t('refs.readStory') }}</NuxtLink>
        </div>
      </li>
    </ul>
    <div v-else class="panel mt-10 max-w-xl p-7">
      <p class="font-medium">{{ t('refs.emptyTitle') }}</p>
      <p class="mt-2 text-muted">{{ t('refs.emptyText') }}</p>
    </div>

    <section v-if="on('contact')" class="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-10">
      <div class="max-w-xl">
        <h2 class="text-lg font-semibold tracking-tight">{{ t('refs.joinTitle') }}</h2>
        <p class="mt-1 text-muted">{{ t('refs.joinText') }}</p>
      </div>
      <NuxtLink :to="localePath('contact')" class="btn btn-secondary">{{ t('refs.joinCta') }}</NuxtLink>
    </section>
  </div>
</template>
