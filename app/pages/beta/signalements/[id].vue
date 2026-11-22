<script setup lang="ts">
definePageMeta({ middleware: 'account' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const errorText = useAccountError()
type R = { id: string, version: string, module: string, severity: string, title: string, steps: string, expected: string, actual: string, logs: string | null, status: string, fixedIn: string | null, createdAt: string, comments: Array<{ id: string, team: boolean, body: string, createdAt: string }> }
const { data: r, error: loadErr } = await useFetch<R>(() => `/api/beta/reports/${route.params.id}`, { deep: true })
if (loadErr.value) {
  const to = testerRedirect(loadErr.value)
  if (to) await navigateTo(localePath(to), { replace: true })
  else throw createError({ statusCode: 404, fatal: true })
}
useSeoMeta({ title: () => r.value?.title ?? '', robots: 'noindex' })
const fmt = (d: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
const body = ref('')
const busy = ref(false)
const error = ref('')
async function send() {
  busy.value = true; error.value = ''
  try {
    const x = await $fetch<{ comment: R['comments'][number] }>(`/api/beta/reports/${r.value!.id}/comments`, { method: 'POST', body: { body: body.value } })
    r.value!.comments.push(x.comment); body.value = ''
    if (r.value!.status === 'need_info') r.value!.status = 'new'
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = false }
}
</script>

<template>
  <div v-if="r" class="wrap py-14 md:py-20">
    <NuxtLink :to="{ path: localePath('beta-espace'), query: { onglet: 'signalements' } }" class="text-sm text-muted no-underline hover:text-fg">{{ t('beta.reports.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ r.title }}</h1>
    <p class="mt-3 text-muted">{{ t(`beta.severities.${r.severity}`) }}, {{ t(`beta.modules.${r.module}`) }}, {{ r.version }}, {{ fmt(r.createdAt) }}</p>
    <p class="mt-4 inline-flex rounded-full border border-line-strong px-3 py-1 text-sm">{{ r.status === 'fixed' && r.fixedIn ? t('beta.reports.fixedIn', { v: r.fixedIn }) : t(`beta.reportStatus.${r.status}`) }}</p>
    <dl class="measure mt-10 space-y-6">
      <div><dt class="font-semibold">{{ t('beta.reports.steps') }}</dt><dd class="mt-1.5 whitespace-pre-line text-muted">{{ r.steps }}</dd></div>
      <div><dt class="font-semibold">{{ t('beta.reports.expected') }}</dt><dd class="mt-1.5 whitespace-pre-line text-muted">{{ r.expected }}</dd></div>
      <div><dt class="font-semibold">{{ t('beta.reports.actual') }}</dt><dd class="mt-1.5 whitespace-pre-line text-muted">{{ r.actual }}</dd></div>
      <div v-if="r.logs"><dt class="font-semibold">{{ t('beta.reports.logs') }}</dt><dd class="mt-1.5"><pre class="theme-dark max-h-80 overflow-auto rounded-xl border border-line bg-code p-4 font-mono text-[0.78rem] text-fg">{{ r.logs }}</pre></dd></div>
    </dl>
    <section class="mt-14 max-w-3xl" aria-labelledby="rc-title">
      <h2 id="rc-title" class="text-lg font-semibold">{{ t('beta.reports.exchange') }}</h2>
      <ul class="mt-5 space-y-4">
        <li v-for="c in r.comments" :key="c.id" class="rounded-xl border p-4" :class="c.team ? 'border-accent/40 bg-accent-soft' : 'border-line'">
          <p class="text-sm"><span class="font-medium">{{ c.team ? t('ideas.team') : t('beta.reports.you') }}</span><span class="text-muted">, {{ fmt(c.createdAt) }}</span></p>
          <p class="mt-2 whitespace-pre-line">{{ c.body }}</p>
        </li>
        <li v-if="!r.comments.length" class="text-muted">{{ t('beta.reports.noExchange') }}</li>
      </ul>
      <form class="mt-6 space-y-3" @submit.prevent="send">
        <label for="rc-body" class="field-label">{{ r.status === 'need_info' ? t('beta.reports.answer') : t('beta.reports.add') }}</label>
        <textarea id="rc-body" v-model="body" class="field min-h-28" maxlength="4000" required />
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="busy || body.trim().length < 2"><span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('ideas.send') }}</button>
      </form>
    </section>
  </div>
</template>
