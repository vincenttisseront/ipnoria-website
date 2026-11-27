<script setup lang="ts">
const { locale } = useI18n()
const { data } = await useFetch<{ fr: string, en: string } | null>('/api/announcement', { default: () => null })
const text = computed(() => {
  const d = data.value
  if (!d) return ''
  const primary = locale.value === 'en' ? d.en : d.fr
  return primary.trim() || (locale.value === 'en' ? d.fr : d.en).trim()
})
</script>

<template>
  <p v-if="text" role="status" class="border-b border-line bg-surface px-4 py-3 text-center text-sm text-fg">{{ text }}</p>
</template>
