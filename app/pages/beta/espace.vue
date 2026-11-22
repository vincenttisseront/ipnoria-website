<script setup lang="ts">
import { MODULES, SEVERITIES, reportSchema } from '#shared/beta'

// Espace testeur : versions (liens personnels 24 h), campagnes, mes signalements, problèmes connus.
definePageMeta({ middleware: 'account' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const errorText = useAccountError()
useSeoMeta({ title: () => t('beta.space.title'), robots: 'noindex' })

type Release = { id: string, version: string, title: Record<string, string>, notes: Record<string, string>, fileName: string, size: number | null, sha256: string | null, createdAt: string, url: string }
type Campaign = { id: string, title: Record<string, string>, version: string | null, startsOn: string | null, endsOn: string | null, stepCount: number, outcome: string | null, participants: number }
type Report = { id: string, version: string, module: string, severity: string, title: string, status: string, fixedIn: string | null, createdAt: string, replies: number }
const fetchOpts = { default: () => [] }
const { data: releases, error: relErr } = await useFetch<Release[]>('/api/beta/releases', fetchOpts)
if (relErr.value) {
  const to = testerRedirect(relErr.value)
  if (to) await navigateTo(localePath(to), { replace: true })
}
const { data: campaigns } = await useFetch<Campaign[]>('/api/beta/campaigns', fetchOpts)
const { data: reports, refresh: refreshReports } = await useFetch<Report[]>('/api/beta/reports', fetchOpts)
const { data: known } = await useFetch<Report[]>('/api/beta/known', fetchOpts)

const TABS = ['versions', 'campagnes', 'signalements', 'connus'] as const
const tab = ref<typeof TABS[number]>((TABS as readonly string[]).includes(String(route.query.onglet)) ? route.query.onglet as typeof TABS[number] : 'versions')
watch(tab, v => router.replace({ query: { onglet: v } }))
const pick = (o?: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
const fmt = (d: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(d))
const mb = (n: number | null) => n == null ? '' : n > 1e9 ? `${(n / 1e9).toFixed(2)} ${t('beta.space.gb')}` : `${(n / 1e6).toFixed(1)} ${t('beta.space.mb')}`

// Nouveau signalement
const showForm = ref(route.query.nouveau === '1')
const form = reactive({ version: releases.value?.[0]?.version ?? '', module: '', severity: '', title: '', steps: '', expected: '', actual: '', logs: '' })
const invalid = ref<string[]>([])
const busy = ref(false)
const error = ref('')
async function submit() {
  error.value = ''
  const p = reportSchema.safeParse(form)
  invalid.value = p.success ? [] : [...new Set(p.error.issues.map(i => String(i.path[0])))]
  if (!p.success) { await nextTick(); document.getElementById(`br-${invalid.value[0]}`)?.focus(); return }
  busy.value = true
  try {
    const r = await $fetch<{ id: string }>('/api/beta/reports', { method: 'POST', body: p.data })
    await refreshReports()
    await navigateTo(localePath({ name: 'beta-signalements-id', params: { id: r.id } }))
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = false }
}
const has = (f: string) => invalid.value.includes(f)
const SEV: Record<string, string> = { blocker: 'border-alert/50 text-alert', major: 'border-warn/50 text-warn', minor: 'border-line-strong text-muted', suggestion: 'border-accent/40 text-accent' }

const leaving = ref(false)
async function leave() {
  await $fetch('/api/beta/leave', { method: 'POST' })
  await navigateTo(localePath('beta'))
}
</script>

<template>
  <div class="wrap py-14 md:py-20">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-h2">{{ t('beta.space.title') }}</h1>
        <p class="mt-3 text-muted">{{ t('beta.space.lead') }}</p>
      </div>
      <button type="button" class="btn btn-primary" @click="tab = 'signalements'; showForm = true">{{ t('beta.reports.new') }}</button>
    </div>

    <div role="tablist" :aria-label="t('beta.space.title')" class="mt-10 flex gap-1 overflow-x-auto border-b border-line">
      <button
        v-for="x in TABS" :id="`tab-${x}`" :key="x" type="button" role="tab" :aria-selected="tab === x" :aria-controls="`panel-${x}`"
        class="-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm" :class="tab === x ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'"
        @click="tab = x"
      >{{ t(`beta.space.tabs.${x}`) }}</button>
    </div>

    <!-- Versions -->
    <div v-if="tab === 'versions'" id="panel-versions" role="tabpanel" aria-labelledby="tab-versions" class="mt-8 space-y-6">
      <p v-if="!releases?.length" class="text-muted">{{ t('beta.space.noRelease') }}</p>
      <article v-for="(r, i) in releases" :key="r.id" class="panel p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold">{{ r.version }}<span v-if="i === 0" class="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">{{ t('beta.space.latest') }}</span></h2>
            <p v-if="pick(r.title)" class="mt-1">{{ pick(r.title) }}</p>
            <p class="mt-1 text-sm text-muted">{{ fmt(r.createdAt) }}, {{ r.fileName }} {{ mb(r.size) }}</p>
          </div>
          <a :href="r.url" class="btn btn-primary" download data-umami-event="beta-download"><AppIcon name="download" :size="16" />{{ t('beta.space.download') }}</a>
        </div>
        <p v-if="r.sha256" class="mt-4 break-all font-mono text-[0.78rem] text-muted">SHA-256 {{ r.sha256 }}</p>
        <p v-if="pick(r.notes)" class="mt-4 whitespace-pre-line text-[0.95rem]">{{ pick(r.notes) }}</p>
        <p class="mt-4 text-sm text-muted">{{ t('beta.space.linkNote') }}</p>
      </article>
    </div>

    <!-- Campagnes -->
    <div v-else-if="tab === 'campagnes'" id="panel-campagnes" role="tabpanel" aria-labelledby="tab-campagnes" class="mt-8">
      <p v-if="!campaigns?.length" class="text-muted">{{ t('beta.space.noCampaign') }}</p>
      <ul class="divide-y divide-line border-y border-line">
        <li v-for="c in campaigns" :key="c.id" class="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <NuxtLink :to="localePath({ name: 'beta-campagnes-id', params: { id: c.id } })" class="font-semibold text-fg no-underline hover:text-accent">{{ pick(c.title) }}</NuxtLink>
            <p class="mt-1 text-sm text-muted">{{ t('beta.campaign.meta', { n: c.stepCount, p: c.participants }) }}<template v-if="c.endsOn">, {{ t('beta.campaign.until', { d: c.endsOn }) }}</template></p>
          </div>
          <span class="rounded-full border px-2.5 py-0.5 text-sm" :class="c.outcome ? 'border-ok/50 text-ok' : 'border-line-strong text-muted'">{{ c.outcome ? t(`beta.campaign.outcomes.${c.outcome}`) : t('beta.campaign.todo') }}</span>
        </li>
      </ul>
    </div>

    <!-- Signalements -->
    <div v-else-if="tab === 'signalements'" id="panel-signalements" role="tabpanel" aria-labelledby="tab-signalements" class="mt-8">
      <form v-if="showForm" class="panel mb-10 space-y-5 p-6" novalidate @submit.prevent="submit">
        <h2 class="text-lg font-semibold">{{ t('beta.reports.new') }}</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label for="br-version" class="field-label">{{ t('beta.reports.version') }}</label>
            <input id="br-version" v-model="form.version" class="field font-mono" maxlength="40" list="br-versions" required :aria-invalid="has('version')">
            <datalist id="br-versions"><option v-for="r in releases" :key="r.id" :value="r.version" /></datalist>
          </div>
          <div>
            <label for="br-module" class="field-label">{{ t('beta.reports.module') }}</label>
            <select id="br-module" v-model="form.module" class="field" required :aria-invalid="has('module')"><option value="" disabled>—</option><option v-for="m in MODULES" :key="m" :value="m">{{ t(`beta.modules.${m}`) }}</option></select>
          </div>
          <div>
            <label for="br-severity" class="field-label">{{ t('beta.reports.severity') }}</label>
            <select id="br-severity" v-model="form.severity" class="field" required :aria-invalid="has('severity')"><option value="" disabled>—</option><option v-for="s in SEVERITIES" :key="s" :value="s">{{ t(`beta.severities.${s}`) }}</option></select>
          </div>
        </div>
        <div>
          <label for="br-title" class="field-label">{{ t('beta.reports.titleLabel') }}</label>
          <input id="br-title" v-model="form.title" class="field" maxlength="140" required :aria-invalid="has('title')">
        </div>
        <div>
          <label for="br-steps" class="field-label">{{ t('beta.reports.steps') }}</label>
          <textarea id="br-steps" v-model="form.steps" class="field min-h-28" maxlength="6000" required :aria-invalid="has('steps')" :placeholder="t('beta.reports.stepsPlaceholder')" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label for="br-expected" class="field-label">{{ t('beta.reports.expected') }}</label><textarea id="br-expected" v-model="form.expected" class="field min-h-20" maxlength="3000" required :aria-invalid="has('expected')" /></div>
          <div><label for="br-actual" class="field-label">{{ t('beta.reports.actual') }}</label><textarea id="br-actual" v-model="form.actual" class="field min-h-20" maxlength="3000" required :aria-invalid="has('actual')" /></div>
        </div>
        <div>
          <label for="br-logs" class="field-label">{{ t('beta.reports.logs') }} <span class="font-normal text-muted">({{ t('contact.optional') }})</span></label>
          <textarea id="br-logs" v-model="form.logs" class="field min-h-28 font-mono text-[0.8rem]" maxlength="20000" spellcheck="false" aria-describedby="br-logs-hint" />
          <p id="br-logs-hint" class="mt-1.5 text-sm text-warn">{{ t('beta.reports.logsHint') }}</p>
        </div>
        <p v-if="invalid.length" role="alert" class="field-error">{{ t('account.err.invalid') }}</p>
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <div class="flex gap-2">
          <button type="submit" class="btn btn-primary" :disabled="busy"><span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('beta.reports.send') }}</button>
          <button type="button" class="btn btn-secondary" @click="showForm = false">{{ t('account.cancel') }}</button>
        </div>
      </form>
      <p v-if="!reports?.length" class="text-muted">{{ t('beta.reports.none') }}</p>
      <ul class="divide-y divide-line border-y border-line">
        <li v-for="r in reports" :key="r.id" class="flex flex-wrap items-center gap-3 py-4">
          <span class="rounded-full border px-2 py-0.5 text-xs" :class="SEV[r.severity]">{{ t(`beta.severities.${r.severity}`) }}</span>
          <NuxtLink :to="localePath({ name: 'beta-signalements-id', params: { id: r.id } })" class="min-w-0 flex-1 font-medium text-fg no-underline hover:text-accent">{{ r.title }}</NuxtLink>
          <span class="text-sm text-muted">{{ t(`beta.modules.${r.module}`) }}, {{ r.version }}</span>
          <span class="text-sm">{{ t(`beta.reportStatus.${r.status}`) }}<template v-if="r.replies">, {{ t('beta.reports.replies', { n: r.replies }) }}</template></span>
        </li>
      </ul>
    </div>

    <!-- Problèmes connus -->
    <div v-else id="panel-connus" role="tabpanel" aria-labelledby="tab-connus" class="mt-8">
      <p v-if="!known?.length" class="text-muted">{{ t('beta.space.noKnown') }}</p>
      <ul class="divide-y divide-line border-y border-line">
        <li v-for="r in known" :key="r.id" class="flex flex-wrap items-center gap-3 py-4">
          <span class="rounded-full border px-2 py-0.5 text-xs" :class="SEV[r.severity]">{{ t(`beta.severities.${r.severity}`) }}</span>
          <span class="min-w-0 flex-1" :class="r.status === 'fixed' ? 'text-muted line-through' : 'font-medium'">{{ r.title }}</span>
          <span class="text-sm text-muted">{{ t(`beta.modules.${r.module}`) }}, {{ r.version }}</span>
          <span class="text-sm">{{ r.status === 'fixed' && r.fixedIn ? t('beta.reports.fixedIn', { v: r.fixedIn }) : t(`beta.reportStatus.${r.status}`) }}</span>
        </li>
      </ul>
    </div>

    <div class="mt-16 border-t border-line pt-8 text-sm text-muted">
      <NuxtLink :to="localePath('beta-accord')" class="link">{{ t('beta.agreement.title') }}</NuxtLink>
      <span class="mx-3" aria-hidden="true">&ensp;</span>
      <button v-if="!leaving" type="button" class="hover:text-alert" @click="leaving = true">{{ t('beta.space.leave') }}</button>
      <span v-else>{{ t('beta.space.leaveConfirm') }} <button type="button" class="text-alert" @click="leave">{{ t('beta.space.leaveYes') }}</button> <button type="button" class="ml-2" @click="leaving = false">{{ t('account.cancel') }}</button></span>
    </div>
  </div>
</template>
