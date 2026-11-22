<script setup lang="ts">
import { GUIDES } from '#shared/guides'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const guides = computed(() => GUIDES[locale.value === 'en' ? 'en' : 'fr'])
useSeoMeta({ title: () => t('guides.title'), description: () => t('guides.lead') })
</script>

<template>
  <div class="wrap pt-14">
    <h1 class="text-display">{{ t('guides.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('guides.lead') }}</p>
    <ul class="mt-12 grid gap-4 md:grid-cols-2">
      <li v-for="g in guides" :key="g.slug">
        <NuxtLink :to="localePath({ name: 'guides-slug', params: { slug: g.slug } })" class="panel block h-full p-7 no-underline hover:border-line-strong">
          <span class="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <AppIcon :name="g.slug === 'nps' ? 'wifi' : 'server'" />
          </span>
          <span class="mt-4 block text-xl font-semibold tracking-tight text-fg">{{ g.title }}</span>
          <span class="mt-2 block text-muted">{{ g.summary }}</span>
          <span class="mt-4 block text-sm text-accent">{{ t('guides.steps', { n: g.steps.length }) }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p class="mt-8 text-sm text-muted">
      <NuxtLink :to="localePath('comparatif')" class="link">{{ t('compare.title') }}</NuxtLink>
    </p>
  </div>
</template>
