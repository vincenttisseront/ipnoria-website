<script setup lang="ts">
// Page d'arrivée des liens reçus par e-mail (confirmation, désinscription)
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const state = computed(() => {
  const s = String(route.query.etat ?? '')
  return s === 'confirme' || s === 'desinscrit' ? s : 'invalide'
})
useSeoMeta({ title: () => t('newsletter.title'), robots: 'noindex' })
</script>

<template>
  <div class="wrap max-w-2xl pt-20">
    <span
      class="inline-flex size-11 items-center justify-center rounded-xl"
      :class="state === 'invalide' ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'"
    ><AppIcon :name="state === 'invalide' ? 'undo' : 'check'" :size="22" /></span>
    <h1 class="mt-6 text-h2">{{ t(`newsletter.state.${state}.title`) }}</h1>
    <p class="mt-4 text-lg text-muted">{{ t(`newsletter.state.${state}.text`) }}</p>
    <div class="mt-8 flex flex-wrap gap-3">
      <NuxtLink :to="localePath('nouveautes')" class="btn btn-primary">{{ t('releases.title') }}</NuxtLink>
      <NuxtLink :to="localePath('/')" class="btn btn-secondary">{{ t('error.back') }}</NuxtLink>
    </div>
  </div>
</template>
