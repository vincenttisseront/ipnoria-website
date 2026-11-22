<script setup lang="ts">
definePageMeta({ middleware: 'account' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const errorText = useAccountError()
type Step = { result: 'ok' | 'ko' | 'skip' | '', note: string }
type C = { id: string, title: Record<string, string>, body: Record<string, string>, steps: Array<Record<string, string>>, version: string | null, startsOn: string | null, endsOn: string | null, mySteps: Step[] | null, outcome: string | null, comment: string | null, submittedAt: string | null }
const { data: c, error: loadErr } = await useFetch<C>(() => `/api/beta/campaigns/${route.params.id}`)
if (loadErr.value) {
  const to = testerRedirect(loadErr.value)
  if (to) await navigateTo(localePath(to), { replace: true })
  else throw createError({ statusCode: 404, fatal: true })
}
const pick = (o?: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
useSeoMeta({ title: () => pick(c.value?.title), robots: 'noindex' })
const closed = computed(() => Boolean(c.value?.endsOn && c.value.endsOn < new Date().toISOString().slice(0, 10)))
const steps = ref<Step[]>((c.value?.steps ?? []).map((_, i) => ({ result: c.value?.mySteps?.[i]?.result ?? '', note: c.value?.mySteps?.[i]?.note ?? '' })))
const outcome = ref(c.value?.outcome ?? '')
const comment = ref(c.value?.comment ?? '')
const busy = ref(false)
const error = ref('')
const saved = ref(Boolean(c.value?.submittedAt))
const done = computed(() => steps.value.filter(s => s.result).length)
async function submit() {
  error.value = ''
  if (steps.value.some(s => !s.result) || !outcome.value) { error.value = t('beta.campaign.incomplete'); return }
  busy.value = true
  try {
    await $fetch(`/api/beta/campaigns/${c.value!.id}/result`, { method: 'PUT', body: { steps: steps.value, outcome: outcome.value, comment: comment.value } })
    saved.value = true
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = false }
}
const newReport = computed(() => ({ path: localePath('beta-espace'), query: { onglet: 'signalements', nouveau: '1' } }))
</script>

<template>
  <div v-if="c" class="wrap py-14 md:py-20">
    <NuxtLink :to="{ path: localePath('beta-espace'), query: { onglet: 'campagnes' } }" class="text-sm text-muted no-underline hover:text-fg">{{ t('beta.campaign.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ pick(c.title) }}</h1>
    <p class="mt-3 text-muted"><template v-if="c.version">{{ t('beta.reports.version') }} {{ c.version }}</template><template v-if="c.endsOn">, {{ t('beta.campaign.until', { d: c.endsOn }) }}</template></p>
    <p v-if="pick(c.body)" class="measure mt-6 whitespace-pre-line text-[1.05rem]">{{ pick(c.body) }}</p>

    <form class="mt-10 max-w-3xl" @submit.prevent="submit">
      <p class="text-sm text-muted" aria-live="polite">{{ t('beta.campaign.progress', { done, total: steps.length }) }}</p>
      <ol class="mt-4 space-y-4">
        <li v-for="(s, i) in c.steps" :key="i" class="panel p-5">
          <p class="font-medium">{{ i + 1 }}. {{ pick(s) }}</p>
          <div class="mt-3 flex flex-wrap gap-2" role="radiogroup" :aria-label="t('beta.campaign.resultFor', { n: i + 1 })">
            <button
              v-for="opt in (['ok', 'ko', 'skip'] as const)" :key="opt" type="button" role="radio" :aria-checked="steps[i]!.result === opt" :disabled="closed"
              class="rounded-lg border px-3 py-1.5 text-sm" :class="steps[i]!.result === opt ? (opt === 'ok' ? 'border-ok bg-ok/10 text-ok' : opt === 'ko' ? 'border-alert bg-alert/10 text-alert' : 'border-line-strong bg-raised') : 'border-line text-muted hover:text-fg'"
              @click="steps[i]!.result = opt"
            >{{ t(`beta.campaign.results.${opt}`) }}</button>
          </div>
          <label :for="`cs-${i}`" class="sr-only">{{ t('beta.campaign.note') }}</label>
          <input :id="`cs-${i}`" v-model="steps[i]!.note" class="field mt-3 py-2 text-sm" maxlength="500" :placeholder="t('beta.campaign.note')" :disabled="closed">
          <NuxtLink v-if="steps[i]!.result === 'ko'" :to="newReport" class="link mt-2 inline-block text-sm">{{ t('beta.campaign.report') }}</NuxtLink>
        </li>
      </ol>
      <fieldset class="mt-8">
        <legend class="field-label">{{ t('beta.campaign.outcome') }}</legend>
        <div class="flex flex-wrap gap-4">
          <label v-for="o in ['success', 'partial', 'failure']" :key="o" class="flex items-center gap-2"><input v-model="outcome" type="radio" name="outcome" :value="o" class="size-4 accent-[#5b8cff]" :disabled="closed">{{ t(`beta.campaign.outcomes.${o}`) }}</label>
        </div>
      </fieldset>
      <div class="mt-6">
        <label for="cs-comment" class="field-label">{{ t('beta.campaign.comment') }}</label>
        <textarea id="cs-comment" v-model="comment" class="field min-h-24" maxlength="3000" :disabled="closed" />
      </div>
      <p v-if="error" role="alert" class="mt-4 field-error">{{ error }}</p>
      <p v-if="saved && !error" role="status" class="mt-4 text-sm text-ok">{{ t('beta.campaign.saved') }}</p>
      <p v-if="closed" class="mt-4 text-sm text-muted">{{ t('beta.campaign.closed') }}</p>
      <button v-else type="submit" class="btn btn-primary mt-6" :disabled="busy"><span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('beta.campaign.submit') }}</button>
    </form>
  </div>
</template>
