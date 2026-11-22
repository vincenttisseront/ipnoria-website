<script setup lang="ts">
import type { ThemeChoice } from '~/composables/useTheme'

const { t } = useI18n()
const { choice, set } = useTheme()
const options: Array<{ value: ThemeChoice, icon: string }> = [
  { value: 'system', icon: 'M2 5h20v12H2zM8 21h8M12 17v4' },
  { value: 'light', icon: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4' },
  { value: 'dark', icon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' },
]
</script>

<template>
  <div role="radiogroup" :aria-label="t('theme.label')" class="flex items-center rounded-lg border border-line p-0.5">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      :aria-checked="choice === o.value"
      :title="t(`theme.${o.value}`)"
      class="rounded-md p-1.5 transition-colors"
      :class="choice === o.value ? 'bg-raised text-fg' : 'text-muted hover:text-fg'"
      @click="set(o.value)"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="o.icon" /></svg>
      <span class="sr-only">{{ t(`theme.${o.value}`) }}</span>
    </button>
  </div>
</template>
