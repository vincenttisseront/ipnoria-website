<script setup lang="ts">
const { t } = useI18n()
const { data } = await useFetch<{ retentionDays: number }>('/api/privacy', { default: () => ({ retentionDays: 365 }) })
useSeoMeta({ title: () => t('privacy.title') })
</script>

<template>
  <article class="wrap measure pt-14">
    <h1 class="text-display">{{ t('privacy.title') }}</h1>
    <p class="mt-6 text-lg">{{ t('privacy.intro') }}</p>

    <h2 class="mt-12 text-[1.6rem]">{{ t('privacy.cookieTitle') }}</h2>
    <p class="mt-3">{{ t('privacy.cookie') }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('privacy.formTitle') }}</h2>
    <p class="mt-3">{{ t('privacy.form', { days: data.retentionDays }) }}</p>
    <p class="mt-3">{{ t('privacy.ip') }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('privacy.newsletterTitle') }}</h2>
    <p class="mt-3">{{ t('privacy.newsletter') }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('privacy.votesTitle') }}</h2>
    <p class="mt-3">{{ t('privacy.votes') }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('privacy.bookingTitle') }}</h2>
    <p class="mt-3">{{ t('privacy.booking') }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('privacy.toolsTitle') }}</h2>
    <p class="mt-3">{{ t('privacy.tools') }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('privacy.analyticsTitle') }}</h2>
    <p class="mt-3">{{ t('privacy.analytics') }}</p>

    <h2 class="mt-10 text-[1.6rem]">{{ t('privacy.rightsTitle') }}</h2>
    <p class="mt-3">{{ t('privacy.rights') }}</p>
  </article>
</template>
