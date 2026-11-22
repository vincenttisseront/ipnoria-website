<script setup lang="ts">
import { DOCS } from '#shared/docs'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug))
const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')

interface DocPayload { slug: string, title: string, html: string, toc: Array<{ id: string, title: string, level: number }>, frenchOnly: boolean, sourceUrl: string }
const { data: doc, error } = await useFetch<DocPayload>(() => `/api/docs/${slug.value}`, { query: { locale: lang } })
if (error.value) throw createError({ statusCode: error.value.statusCode ?? 404, fatal: true })

const entry = computed(() => DOCS.find(d => d.slug === slug.value))
useSeoMeta({ title: () => doc.value?.title ?? '', description: () => entry.value?.summary[lang.value] ?? '' })
</script>

<template>
  <div v-if="doc" class="wrap pt-12">
    <NuxtLink :to="localePath('documentation')" class="text-sm text-muted no-underline hover:text-fg">{{ t('docs.back') }}</NuxtLink>
    <div class="mt-6 grid gap-12 lg:grid-cols-[1fr_15rem]">
      <article class="min-w-0">
        <p v-if="doc.frenchOnly" class="mb-8 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm" lang="en">{{ t('docs.frenchOnlyNotice') }}</p>
        <!-- HTML produit côté serveur par markdown-it avec html: false (aucun HTML brut du dépôt n'est rendu) -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="prose-doc" :lang="doc.frenchOnly ? 'fr' : undefined" v-html="doc.html" />
        <p class="mt-12 border-t border-line pt-6 text-sm">
          <a :href="doc.sourceUrl" class="link inline-flex items-center gap-1.5" rel="noopener">{{ t('docs.viewSource') }}<AppIcon name="external" :size="13" /></a>
        </p>
      </article>
      <aside v-if="doc.toc.length > 2" class="hidden lg:block">
        <nav :aria-label="t('docs.onThisPage')" class="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto">
          <p class="text-sm font-medium">{{ t('docs.onThisPage') }}</p>
          <ul class="mt-3 space-y-1.5 border-l border-line text-[0.85rem]">
            <li v-for="h in doc.toc" :key="h.id" :class="h.level === 3 ? 'pl-6' : 'pl-3'">
              <a :href="`#${h.id}`" class="text-muted no-underline hover:text-fg">{{ h.title }}</a>
            </li>
          </ul>
        </nav>
      </aside>
    </div>
  </div>
</template>
