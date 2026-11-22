<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const localePath = useLocalePath()
const notFound = computed(() => props.error.statusCode === 404)
useSeoMeta({ title: () => (notFound.value ? t('error.notFoundTitle') : t('error.genericTitle')), robots: 'noindex' })
</script>

<template>
  <NuxtLayout>
    <div class="wrap measure py-20">
      <p class="font-mono text-lg text-muted">{{ error.statusCode }}</p>
      <h1 class="mt-2 text-display">{{ notFound ? t('error.notFoundTitle') : t('error.genericTitle') }}</h1>
      <p class="mt-5 text-lg text-muted">{{ notFound ? t('error.notFoundText') : t('error.genericText') }}</p>
      <NuxtLink :to="localePath('/')" class="btn btn-primary mt-8" @click="clearError()">{{ t('error.back') }}</NuxtLink>
    </div>
  </NuxtLayout>
</template>
