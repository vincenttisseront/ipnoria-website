<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const items = computed(() => [
  { to: localePath('compte'), label: t('account.nav.profile') },
  { to: localePath('compte-securite'), label: t('account.nav.security') },
  { to: localePath('compte-sessions'), label: t('account.nav.sessions') },
  { to: localePath('compte-donnees'), label: t('account.nav.data') },
])
</script>

<template>
  <nav :aria-label="t('account.nav.label')" class="flex gap-1 overflow-x-auto border-b border-line">
    <NuxtLink
      v-for="i in items" :key="i.to" :to="i.to"
      class="-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm no-underline transition-colors"
      :class="route.path === i.to ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'"
      :aria-current="route.path === i.to ? 'page' : undefined"
    >{{ i.label }}</NuxtLink>
  </nav>
</template>
