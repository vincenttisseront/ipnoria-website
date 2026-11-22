<script setup lang="ts">
// Impression ou PDF : la boîte d'impression du navigateur propose « Enregistrer au format PDF »
const { t } = useI18n()
const print = () => window.print()
</script>

<template>
  <button type="button" class="btn btn-secondary no-print" @click="print">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
    {{ t('print.button') }}
  </button>
</template>
