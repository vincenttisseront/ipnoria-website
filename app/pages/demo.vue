<script setup lang="ts">
// Démo publique : s'affiche dès que NUXT_PUBLIC_DEMO_URL est défini (instance en lecture seule, remise à zéro chaque nuit).
const { t } = useI18n()
const localePath = useLocalePath()
const { on } = useSiteFeatures()
const { demo } = useRuntimeConfig().public
useSeoMeta({ title: () => t('demo.pageTitle'), description: () => t('demo.pageLead') })
</script>

<template>
  <div class="wrap pt-14">
    <h1 class="text-display">{{ t('demo.pageTitle') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('demo.pageLead') }}</p>

    <div v-if="demo.url" class="panel mt-12 max-w-2xl p-7">
      <dl class="grid grid-cols-[8rem_1fr] gap-y-3 text-[0.95rem]">
        <dt class="text-muted">{{ t('demo.address') }}</dt>
        <dd class="font-mono">{{ demo.url }}</dd>
        <template v-if="demo.user">
          <dt class="text-muted">{{ t('demo.user') }}</dt>
          <dd class="font-mono">{{ demo.user }}</dd>
          <dt class="text-muted">{{ t('demo.password') }}</dt>
          <dd class="font-mono">{{ demo.password }}</dd>
        </template>
      </dl>
      <p class="mt-5 text-sm text-muted">{{ t('demo.nightlyReset') }}</p>
      <a :href="demo.url" class="btn btn-primary mt-6" rel="noopener"><AppIcon name="external" :size="16" />{{ t('demo.open') }}</a>
    </div>

    <div v-else class="panel mt-12 max-w-2xl p-7">
      <p class="font-semibold">{{ t('demo.soonTitle') }}</p>
      <p class="mt-2 text-muted">{{ t('demo.soonText') }}</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink v-if="on('booking')" :to="localePath('rendez-vous')" class="btn btn-primary"><AppIcon name="mail" :size="16" />{{ t('demo.private') }}</NuxtLink>
        <NuxtLink :to="localePath('visite')" class="btn btn-secondary">{{ t('demo.tour') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
