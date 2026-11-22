<script setup lang="ts">
const { t } = useI18n()
const legal = useRuntimeConfig().public.legal
useSeoMeta({ title: () => t('legal.title'), robots: 'noindex, follow' })
</script>

<template>
  <article class="wrap measure pt-14">
    <h1 class="text-display">{{ t('legal.title') }}</h1>

    <h2 class="mt-12 text-[1.6rem]">{{ t('legal.publisherTitle') }}</h2>
    <p class="mt-3">{{ t('legal.publisher', { name: legal.publisher }) }}</p>
    <p class="mt-1">{{ t('legal.director', { name: legal.publisher }) }}</p>
    <p class="mt-1">{{ t('legal.address', { address: legal.address || t('legal.todo') }) }}</p>
    <p class="mt-1">{{ t('legal.email', { email: legal.email || t('legal.todo') }) }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('legal.hostTitle') }}</h2>
    <p class="mt-3">{{ t('legal.host', { host: legal.host || t('legal.todo') }) }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('legal.ipTitle') }}</h2>
    <p class="mt-3">{{ t('legal.ip') }}</p>
  </article>
</template>
