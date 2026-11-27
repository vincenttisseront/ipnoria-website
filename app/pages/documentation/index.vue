<script setup lang="ts">
import { DOCS, DOC_GROUPS } from '#shared/docs'
import { githubLinks } from '#shared/links'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { on } = useSiteFeatures()
useSeoMeta({ title: () => t('docs.title'), description: () => t('docs.lead') })

const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')
const groups = computed(() => DOC_GROUPS.map(g => ({ key: g, items: DOCS.filter(d => d.group === g) })))
const docLink = (slug: string, hash = '') => `${localePath({ name: 'documentation-slug', params: { slug } })}${hash ? `#${hash}` : ''}`

// Recherche plein texte (côté serveur), relancée 250 ms après la dernière frappe
interface Hit { slug: string, docTitle: string, heading: string, anchor: string, snippet: string }
const q = ref('')
const hits = ref<Hit[]>([])
const searching = ref(false)
const searched = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(q, (value) => {
  clearTimeout(timer)
  if (value.trim().length < 2) { hits.value = []; searched.value = false; return }
  timer = setTimeout(async () => {
    searching.value = true
    try {
      hits.value = (await $fetch<{ results: Hit[] }>('/api/docs/search', { query: { q: value, locale: lang.value } })).results
    }
    catch { hits.value = [] }
    finally { searching.value = false; searched.value = true }
  }, 250)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="wrap pt-14">
    <h1 class="text-display">{{ t('docs.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('docs.lead') }}</p>
    <p v-if="lang === 'en'" class="measure mt-3 text-muted">{{ t('docs.langNote') }}</p>

    <div class="mt-10 max-w-2xl">
      <label for="doc-search" class="field-label">{{ t('docs.searchLabel') }}</label>
      <div class="relative">
        <input
          id="doc-search" v-model="q" type="search" class="field !pr-10" autocomplete="off"
          :placeholder="t('docs.searchPlaceholder')" aria-describedby="doc-search-status"
        >
        <span
          v-if="searching"
          class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line-strong border-t-accent"
          aria-hidden="true"
        />
      </div>
      <p id="doc-search-status" class="sr-only" aria-live="polite">
        {{ searched ? t('docs.searchCount', { n: hits.length }) : '' }}
      </p>
      <ul v-if="hits.length" class="panel mt-3 divide-y divide-line overflow-hidden">
        <li v-for="h in hits" :key="`${h.slug}-${h.anchor}`">
          <NuxtLink :to="docLink(h.slug, h.anchor)" class="block px-4 py-3 no-underline hover:bg-raised">
            <span class="block text-[0.8rem] text-muted">{{ h.docTitle }}</span>
            <span class="block font-medium text-fg">{{ h.heading || h.docTitle }}</span>
            <span class="mt-1 block text-sm text-muted">{{ h.snippet }}</span>
          </NuxtLink>
        </li>
      </ul>
      <p v-else-if="searched && !searching" class="mt-3 text-sm text-muted">{{ t('docs.searchEmpty') }}</p>
    </div>

    <div class="mt-16 space-y-14">
      <section v-for="g in groups" :key="g.key" class="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <h2 class="text-[1.6rem] font-semibold tracking-tight">{{ t(`docs.groups.${g.key}`) }}</h2>
        <ul class="divide-y divide-line border-y border-line">
          <li v-for="d in g.items" :key="d.slug">
            <NuxtLink :to="docLink(d.slug)" class="group grid gap-1 py-4 no-underline sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
              <span>
                <span class="block font-semibold text-fg group-hover:text-accent">{{ d.title[lang] }}</span>
                <span class="mt-1 block text-[0.95rem] text-muted">{{ d.summary[lang] }}</span>
              </span>
              <span v-if="lang === 'en' && !d.pathEn" class="text-[0.8rem] text-muted">{{ t('docs.inFrench') }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <div class="mt-16 grid gap-4 md:grid-cols-2">
      <NuxtLink :to="localePath('nouveautes')" class="panel block p-6 no-underline hover:border-line-strong">
        <span class="font-semibold text-fg">{{ t('releases.title') }}</span>
        <span class="mt-1 block text-[0.95rem] text-muted">{{ t('releases.lead') }}</span>
      </NuxtLink>
      <NuxtLink :to="localePath('guides')" class="panel block p-6 no-underline hover:border-line-strong">
        <span class="font-semibold text-fg">{{ t('guides.title') }}</span>
        <span class="mt-1 block text-[0.95rem] text-muted">{{ t('guides.lead') }}</span>
      </NuxtLink>
    </div>

    <div class="panel mt-4 p-7">
      <p class="font-semibold">{{ t('docs.help') }}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <a :href="githubLinks.newIssue" class="btn btn-secondary" rel="noopener"><AppIcon name="bug" :size="16" />{{ t('docs.helpIssue') }}</a>
        <NuxtLink v-if="on('contact')" :to="localePath('contact')" class="btn btn-primary"><AppIcon name="mail" :size="16" />{{ t('docs.helpContact') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
