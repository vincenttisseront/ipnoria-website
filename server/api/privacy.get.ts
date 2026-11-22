// Durée de conservation réellement appliquée par la purge, affichée sur la page « Confidentialité »
export default defineEventHandler(() => ({
  retentionDays: Math.max(1, Math.floor(Number(useRuntimeConfig().contactRetentionDays))),
}))
