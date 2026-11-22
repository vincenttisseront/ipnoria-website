export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { public: { analytics } } = useRuntimeConfig()
  return { sources: await socialSources(), limits: NETWORK_LIMITS, statsUrl: analytics.src ? String(analytics.src).replace(/\/script\.js$/, '') : '' }
})
