<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('tools.title'), description: () => t('tools.lead') })
useOgImage('page', () => 'tools')

const tools = [
  { name: 'outils-checklist', key: 'checklist', icon: 'check' },
  { name: 'outils-dimensionnement', key: 'sizing', icon: 'server' },
  { name: 'outils-import-dhcp', key: 'dhcp', icon: 'import' },
  { name: 'outils-sous-reseaux', key: 'subnets', icon: 'network' },
] as const
</script>

<template>
  <div class="wrap pt-14">
    <h1 class="text-display">{{ t('tools.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('tools.lead') }}</p>
    <ul class="mt-12 grid gap-4 md:grid-cols-2">
      <li v-for="tool in tools" :key="tool.key">
        <NuxtLink :to="localePath(tool.name)" class="panel block h-full p-7 no-underline hover:border-line-strong">
          <span class="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><AppIcon :name="tool.icon" /></span>
          <span class="mt-4 block text-xl font-semibold tracking-tight text-fg">{{ t(`tools.${tool.key}.title`) }}</span>
          <span class="mt-2 block text-muted">{{ t(`tools.${tool.key}.lead`) }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p class="mt-8 text-sm text-muted">{{ t('tools.privacy') }}</p>
  </div>
</template>
