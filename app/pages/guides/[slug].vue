<script setup lang="ts">
import { guideBySlug } from '#shared/guides'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const guide = computed(() => guideBySlug(locale.value === 'en' ? 'en' : 'fr', String(route.params.slug)))
if (!guide.value) throw createError({ statusCode: 404, fatal: true })
useSeoMeta({ title: () => guide.value?.title ?? '', description: () => guide.value?.summary ?? '' })

const copied = ref<number | null>(null)
async function copy(i: number, code: string) {
  try { await navigator.clipboard.writeText(code); copied.value = i; setTimeout(() => (copied.value = null), 1800) }
  catch { /* sélection manuelle possible */ }
}
</script>

<template>
  <div v-if="guide" class="wrap max-w-3xl pt-12">
    <NuxtLink :to="localePath('guides')" class="text-sm text-muted no-underline hover:text-fg">{{ t('guides.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ guide.title }}</h1>
    <p class="mt-5 text-lg text-muted">{{ guide.intro }}</p>

    <!-- Une vraie séquence : numérotée -->
    <ol class="mt-12 space-y-10">
      <li v-for="(s, i) in guide.steps" :key="s.title" class="grid grid-cols-[2.25rem_1fr] gap-x-4">
        <span class="flex size-8 items-center justify-center rounded-full border border-line-strong text-sm font-medium" aria-hidden="true">{{ i + 1 }}</span>
        <div class="min-w-0">
          <h2 class="pt-0.5 text-lg font-semibold tracking-tight">{{ s.title }}</h2>
          <p class="mt-2 text-muted">{{ s.text }}</p>
          <p v-if="s.warn" class="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-fg">{{ s.warn }}</p>
          <div v-if="s.code" class="mt-3 overflow-hidden rounded-xl border border-line-strong bg-[#05070c]">
            <div class="flex items-center justify-between border-b border-line px-4 py-2">
              <span class="text-[0.75rem] text-muted">PowerShell</span>
              <button type="button" class="flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[0.75rem] text-muted hover:text-fg" @click="copy(i, s.code)">
                <AppIcon :name="copied === i ? 'check' : 'copy'" :size="13" />
                <span aria-live="polite">{{ copied === i ? t('quickstart.copied') : t('quickstart.copy') }}</span>
              </button>
            </div>
            <pre class="overflow-x-auto p-4 font-mono text-[0.8rem] leading-6 text-fg"><code>{{ s.code }}</code></pre>
          </div>
        </div>
      </li>
    </ol>
    <p class="mt-12 border-t border-line pt-6 text-muted">{{ guide.outro }}</p>
    <div class="mt-8 flex flex-wrap gap-3">
      <NuxtLink :to="localePath('contact')" class="btn btn-primary"><AppIcon name="mail" :size="16" />{{ t('guides.help') }}</NuxtLink>
      <NuxtLink :to="localePath('comparatif')" class="btn btn-secondary">{{ t('compare.title') }}</NuxtLink>
    </div>
  </div>
</template>
