<script setup lang="ts">
import { quoted } from '#shared/references'
import type { PublicReference } from '#shared/references'

// Bandeau de références (accueil, pages « Pour qui ») : logos, et un témoignage mis en avant.
// Invisible tant qu'aucune référence n'est publiée.
const props = defineProps<{ sector?: string, title?: string }>()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { data: refs } = await useFetch<PublicReference[]>('/api/references', { key: 'refs-strip', default: () => [] })
const list = computed(() => (refs.value ?? []).filter(r => !props.sector || r.sector === props.sector).slice(0, 8))
const pick = (o: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
const featured = computed(() => list.value.find(r => pick(r.quote)))
</script>

<template>
  <section v-if="list.length" aria-labelledby="refs-strip-title">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h2 id="refs-strip-title" class="text-h2">{{ title ?? t('refs.stripTitle') }}</h2>
      <NuxtLink :to="localePath('references')" class="link text-sm">{{ t('refs.seeAll') }}</NuxtLink>
    </div>
    <ul class="mt-10 flex flex-wrap gap-3">
      <li v-for="r in list" :key="r.id">
        <NuxtLink v-if="r.hasStory" :to="localePath({ name: 'references-slug', params: { slug: r.slug } })" class="block rounded-xl transition-transform hover:-translate-y-0.5"><ReferenceLogo :reference="r" /></NuxtLink>
        <ReferenceLogo v-else :reference="r" />
      </li>
    </ul>
    <figure v-if="featured" class="mt-10 max-w-3xl border-l-2 border-accent/60 pl-6">
      <blockquote class="text-lg leading-relaxed">{{ quoted(pick(featured.quote), locale) }}</blockquote>
      <figcaption class="mt-3 text-sm text-muted">{{ featured.quoteAuthor }}<template v-if="pick(featured.quoteRole)">, {{ pick(featured.quoteRole) }}</template>, {{ featured.name }}</figcaption>
    </figure>
  </section>
</template>
