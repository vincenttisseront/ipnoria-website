<script setup lang="ts">
import { quoted } from '#shared/references'
import type { PublicReference } from '#shared/references'

// Étude de cas d'un client : contexte et résultat (paragraphes), témoignage, fiche synthétique.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { data: r, error } = await useFetch<PublicReference>(() => `/api/references/${route.params.slug}`)
if (error.value || !r.value) throw createError({ statusCode: 404, fatal: true })
const pick = (o?: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
const paragraphs = computed(() => pick(r.value!.story).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean))
useSeoMeta({ title: () => t('refs.storyTitle', { name: r.value!.name }), description: () => (pick(r.value!.quote) || paragraphs.value[0] || '').slice(0, 160) })
</script>

<template>
  <div v-if="r" class="wrap py-14 md:py-20">
    <NuxtLink :to="localePath('references')" class="text-sm text-muted no-underline hover:text-fg">{{ t('refs.back') }}</NuxtLink>
    <div class="mt-8 flex flex-wrap items-center gap-6">
      <ReferenceLogo :reference="r" size="lg" />
      <div>
        <h1 class="text-h2">{{ r.name }}</h1>
        <p class="mt-2 text-muted">{{ [t(`refs.sectors.${r.sector}`), pick(r.size), r.location].filter(Boolean).join(', ') }}</p>
      </div>
    </div>

    <div class="mt-12 grid gap-12 lg:grid-cols-[1fr_18rem]">
      <div class="min-w-0">
        <blockquote v-if="pick(r.quote)" class="border-l-2 border-accent pl-6">
          <p class="text-xl leading-relaxed tracking-tight">{{ quoted(pick(r.quote), locale) }}</p>
          <footer v-if="r.quoteAuthor" class="mt-3 text-muted">{{ r.quoteAuthor }}<template v-if="pick(r.quoteRole)">, {{ pick(r.quoteRole) }}</template></footer>
        </blockquote>
        <div class="measure mt-10 space-y-5 text-[1.05rem] leading-relaxed">
          <p v-for="(p, i) in paragraphs" :key="i" class="whitespace-pre-line">{{ p }}</p>
        </div>
      </div>
      <aside class="panel h-fit p-6" :aria-label="t('refs.facts')">
        <dl class="space-y-4 text-sm">
          <div><dt class="text-muted">{{ t('refs.sector') }}</dt><dd class="mt-0.5 font-medium">{{ t(`refs.sectors.${r.sector}`) }}</dd></div>
          <div v-if="pick(r.size)"><dt class="text-muted">{{ t('refs.size') }}</dt><dd class="mt-0.5 font-medium">{{ pick(r.size) }}</dd></div>
          <div v-if="r.location"><dt class="text-muted">{{ t('refs.location') }}</dt><dd class="mt-0.5 font-medium">{{ r.location }}</dd></div>
          <div v-if="r.services.length">
            <dt class="text-muted">{{ t('refs.services') }}</dt>
            <dd class="mt-1.5 flex flex-wrap gap-1.5"><span v-for="s in r.services" :key="s" class="rounded-md bg-raised px-2 py-0.5 font-mono text-[0.75rem]">{{ t(`refs.serviceNames.${s}`) }}</span></dd>
          </div>
          <div v-if="r.website"><dt class="text-muted">{{ t('refs.website') }}</dt><dd class="mt-0.5"><a :href="r.website" class="link break-all" rel="noopener nofollow" target="_blank">{{ r.website.replace(/^https:\/\//, '') }}</a></dd></div>
        </dl>
      </aside>
    </div>
    <div class="mt-16 flex flex-wrap gap-3 border-t border-line pt-10">
      <NuxtLink :to="localePath('rendez-vous')" class="btn btn-primary">{{ t('booking.cta') }}</NuxtLink>
      <NuxtLink :to="localePath('references')" class="btn btn-secondary">{{ t('refs.others') }}</NuxtLink>
    </div>
  </div>
</template>
