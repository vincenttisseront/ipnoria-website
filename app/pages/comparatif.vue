<script setup lang="ts">
import { COMPARISON, type Mark } from '#shared/comparison'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const rows = computed(() => COMPARISON[locale.value === 'en' ? 'en' : 'fr'])
useSeoMeta({ title: () => t('compare.title'), description: () => t('compare.lead') })

const markIcon: Record<Mark, string> = { yes: 'text-ok', partial: 'text-warn', no: 'text-muted' }
</script>

<template>
  <div class="wrap pt-14">
    <h1 class="text-display">{{ t('compare.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('compare.lead') }}</p>

    <div class="panel mt-12 overflow-x-auto">
      <table class="w-full min-w-[40rem] border-collapse text-left text-[0.95rem]">
        <caption class="sr-only">{{ t('compare.caption') }}</caption>
        <thead>
          <tr class="border-b border-line">
            <th scope="col" class="px-5 py-4 font-medium text-muted">{{ t('compare.feature') }}</th>
            <th scope="col" class="w-44 px-5 py-4 font-medium">{{ t('compare.windows') }}</th>
            <th scope="col" class="w-44 bg-accent-soft px-5 py-4 font-semibold">Ipnoria</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.feature" class="border-b border-line last:border-0">
            <th scope="row" class="px-5 py-4 align-top font-normal">
              <span class="text-fg">{{ r.feature }}</span>
              <span v-if="r.note" class="mt-1 block text-sm text-muted">{{ r.note }}</span>
            </th>
            <td v-for="col in (['windows', 'ddi'] as const)" :key="col" class="px-5 py-4 align-top" :class="col === 'ddi' ? 'bg-accent-soft' : ''">
              <span class="inline-flex items-center gap-2" :class="markIcon[r[col]]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                  <path v-if="r[col] === 'yes'" d="M20 6 9 17l-5-5" />
                  <path v-else-if="r[col] === 'partial'" d="M5 12h14" />
                  <path v-else d="M18 6 6 18M6 6l12 12" />
                </svg>
                <span class="text-sm">{{ t(`compare.mark.${r[col]}`) }}</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="measure mt-5 text-sm text-muted">{{ t('compare.footnote') }}</p>

    <div class="mt-12 flex flex-wrap gap-3">
      <NuxtLink :to="localePath('guides')" class="btn btn-primary"><AppIcon name="book" :size="16" />{{ t('guides.title') }}</NuxtLink>
      <NuxtLink :to="localePath('contact')" class="btn btn-secondary"><AppIcon name="mail" :size="16" />{{ t('cta.button') }}</NuxtLink>
    </div>
  </div>
</template>
