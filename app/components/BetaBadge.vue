<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <span class="ml-1.5 inline-flex items-center rounded-full border border-accent/40 bg-accent-soft px-1.5 py-px align-middle text-[0.7rem] font-medium text-accent" :title="t('beta.badgeTitle')">{{ t('beta.badge') }}</span>
</template>
