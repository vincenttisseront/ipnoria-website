<script setup lang="ts">
import type { IdeaStatus } from '#shared/account'

defineProps<{ status: IdeaStatus }>()
const { t } = useI18n()
const TONE: Record<IdeaStatus, string> = {
  proposed: 'border-line-strong text-muted',
  review: 'border-warn/50 text-warn',
  planned: 'border-accent/50 text-accent',
  progress: 'border-accent bg-accent-soft text-accent',
  shipped: 'border-ok/50 bg-ok/10 text-ok',
  declined: 'border-line text-muted line-through decoration-1',
  duplicate: 'border-line text-muted',
}
</script>

<template>
  <span class="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium" :class="TONE[status]">{{ t(`ideas.status.${status}`) }}</span>
</template>
