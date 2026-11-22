<script setup lang="ts">
import { REFERENCE_SECTORS, REFERENCE_SERVICES } from '#shared/account'
import { CURRENT_STACK, HOURS, HYPERVISORS, ORG_SIZES, applicationSchema } from '#shared/beta'

// Programme bêta : présentation, questions fréquentes, candidature et suivi, remerciements publics.
const { t, tm, rt } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { user, ensure } = useAccount()
const errorText = useAccountError()
const pow = usePow()
await ensure()

type State = { application: null | { status: string, referralCode: string | null, referred: number, decisionNote: string | null }, agreementAccepted: boolean, tester: boolean }
const { data, refresh } = await useFetch<{ enabled: boolean, state: State | null, credits: Array<{ name: string, org: string | null }>, testers: number }>('/api/beta/status')
const st = computed(() => data.value?.state ?? null)

const faq = computed(() => (tm('beta.faq') as Array<{ q: unknown, a: unknown }>).map(x => ({ q: rt(x.q as never), a: rt(x.a as never) })))
useSeoMeta({ title: () => t('beta.title'), description: () => t('beta.lead'), ogTitle: () => t('beta.title'), ogDescription: () => t('beta.lead') })
useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      'mainEntity': faq.value.map(f => ({ '@type': 'Question', 'name': f.q, 'acceptedAnswer': { '@type': 'Answer', 'text': f.a } })),
    }),
  }],
})

// Parrainage : le code du lien (?ref=) est gardé pour la candidature, même après connexion
const refCode = useCookie<string | null>('beta_ref', { maxAge: 30 * 86400, sameSite: 'lax' })
if (typeof route.query.ref === 'string' && /^[a-z0-9]{6,16}$/.test(route.query.ref)) refCode.value = route.query.ref

const form = reactive({
  sector: '' as string, orgSize: '' as string, hypervisor: '' as string, currentStack: [] as string[], activeDirectory: false, wifi8021x: false,
  services: [] as string[], hours: '' as string, motivation: '', publicCredit: false,
})
const invalid = ref<string[]>([])
const busy = ref(false)
const error = ref('')
const sent = ref(false)
const showForm = computed(() => user.value?.emailVerified && (!st.value?.application || st.value.application.status === 'pending'))
onMounted(() => { if (showForm.value) pow.prepare() })
watch(showForm, (v) => { if (v) pow.prepare() })

async function apply() {
  error.value = ''
  const body = { ...form, ref: refCode.value ?? '' }
  const p = applicationSchema.safeParse(body)
  invalid.value = p.success ? [] : [...new Set(p.error.issues.map(i => String(i.path[0])))]
  if (!p.success) { await nextTick(); document.getElementById(`ba-${invalid.value[0]}`)?.focus(); return }
  busy.value = true
  try {
    await $fetch('/api/beta/apply', { method: 'POST', body: { ...p.data, pow: await pow.get() } })
    sent.value = true; await refresh()
  }
  catch (err) { error.value = errorText(err); pow.prepare() }
  finally { busy.value = false }
}
const has = (f: string) => invalid.value.includes(f)
const referralLink = computed(() => st.value?.application?.referralCode ? `${useRequestURL().origin}${localePath('beta')}?ref=${st.value.application.referralCode}` : '')
const copied = ref(false)
async function copyLink() {
  try { await navigator.clipboard.writeText(referralLink.value); copied.value = true; setTimeout(() => (copied.value = false), 1800) }
  catch { /* sélection manuelle possible */ }
}
const signInTo = computed(() => ({ path: localePath('compte-connexion'), query: { next: `${localePath('beta')}#candidature` } }))
const signUpTo = computed(() => ({ path: localePath('compte-inscription'), query: { next: `${localePath('beta')}#candidature` } }))
const benefits = computed(() => tm('beta.benefits') as unknown[])
const expectations = computed(() => tm('beta.expect') as unknown[])
const steps = computed(() => tm('beta.process') as unknown[])
</script>

<template>
  <div>
    <section class="wrap pt-16 md:pt-24">
      <p class="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-[0.8rem] text-muted">
        <span class="size-1.5 rounded-full bg-accent" aria-hidden="true" />{{ data?.testers ? t('beta.pill', { n: data.testers }) : t('beta.pillOpen') }}
      </p>
      <h1 class="mt-6 max-w-3xl text-display">{{ t('beta.title') }}</h1>
      <p class="mt-6 max-w-2xl text-lg text-muted">{{ t('beta.lead') }}</p>
      <div class="mt-9 flex flex-wrap gap-3">
        <a href="#candidature" class="btn btn-primary" data-umami-event="beta-cta">{{ t('beta.cta') }}</a>
        <NuxtLink :to="localePath('visite')" class="btn btn-secondary">{{ t('tour.cta') }}</NuxtLink>
      </div>
    </section>

    <section class="wrap grid gap-12 py-20 lg:grid-cols-2">
      <div>
        <h2 class="text-h2">{{ t('beta.benefitsTitle') }}</h2>
        <ul class="mt-8 space-y-5">
          <li v-for="(b, i) in benefits" :key="i" class="flex gap-3">
            <AppIcon name="check" :size="18" class="mt-1 shrink-0 text-ok" />
            <span>{{ rt(b as never) }}</span>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="text-h2">{{ t('beta.expectTitle') }}</h2>
        <ul class="mt-8 space-y-5">
          <li v-for="(b, i) in expectations" :key="i" class="flex gap-3">
            <span class="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted" aria-hidden="true" />
            <span>{{ rt(b as never) }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="wrap py-10">
      <h2 class="text-h2">{{ t('beta.processTitle') }}</h2>
      <ol class="mt-10 grid gap-6 md:grid-cols-4">
        <li v-for="(s, i) in steps" :key="i" class="border-t-2 border-line-strong pt-4">
          <p class="font-mono text-sm text-muted">{{ i + 1 }}</p>
          <p class="mt-1">{{ rt(s as never) }}</p>
        </li>
      </ol>
    </section>

    <!-- Candidature et suivi -->
    <section id="candidature" class="wrap scroll-mt-24 py-20" aria-labelledby="apply-title">
      <h2 id="apply-title" class="text-h2">{{ t('beta.applyTitle') }}</h2>
      <div class="mt-10 max-w-3xl">
        <div v-if="!data?.enabled" class="panel p-6 text-muted">{{ t('beta.closed') }}</div>
        <div v-else-if="!user" class="panel p-6">
          <p>{{ t('beta.needAccount') }}</p>
          <div class="mt-5 flex flex-wrap gap-3">
            <NuxtLink :to="signUpTo" class="btn btn-primary">{{ t('account.signIn.create') }}</NuxtLink>
            <NuxtLink :to="signInTo" class="btn btn-secondary">{{ t('account.signIn.submit') }}</NuxtLink>
          </div>
        </div>
        <div v-else-if="!user.emailVerified" class="panel p-6">
          <p>{{ t('account.err.unverified') }}</p>
          <NuxtLink :to="localePath('compte')" class="btn btn-primary mt-5">{{ t('account.verify.go') }}</NuxtLink>
        </div>
        <div v-else-if="st?.tester" class="panel space-y-5 p-6">
          <p class="font-medium">{{ t('beta.status.tester') }}</p>
          <NuxtLink :to="localePath('beta-espace')" class="btn btn-primary">{{ t('beta.openSpace') }}</NuxtLink>
          <div v-if="referralLink" class="border-t border-line pt-5">
            <p class="font-medium">{{ t('beta.referralTitle') }}</p>
            <p class="mt-1 text-sm text-muted">{{ t('beta.referralText', { n: st.application?.referred ?? 0 }) }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <input :value="referralLink" readonly class="field flex-1 font-mono text-sm" :aria-label="t('beta.referralTitle')" @focus="($event.target as HTMLInputElement).select()">
              <button type="button" class="btn btn-secondary" @click="copyLink"><AppIcon :name="copied ? 'check' : 'copy'" :size="16" />{{ copied ? t('account.recovery.copied') : t('account.recovery.copy') }}</button>
            </div>
          </div>
        </div>
        <div v-else-if="st?.application?.status === 'accepted'" class="panel p-6">
          <p class="font-medium">{{ t('beta.status.accepted') }}</p>
          <NuxtLink :to="localePath('beta-accord')" class="btn btn-primary mt-5">{{ t('beta.readAgreement') }}</NuxtLink>
        </div>
        <div v-else-if="st?.application && st.application.status !== 'pending'" class="panel p-6">
          <p class="font-medium">{{ t(`beta.status.${st.application.status}`) }}</p>
          <p v-if="st.application.decisionNote" class="mt-2 whitespace-pre-line text-muted">{{ st.application.decisionNote }}</p>
        </div>

        <form v-if="showForm" class="space-y-6" novalidate @submit.prevent="apply">
          <p v-if="st?.application?.status === 'pending' || sent" role="status" class="rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm">{{ t('beta.status.pending') }}</p>
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="ba-sector" class="field-label">{{ t('beta.form.sector') }}</label>
              <select id="ba-sector" v-model="form.sector" class="field" required :aria-invalid="has('sector')">
                <option value="" disabled>—</option><option v-for="s in REFERENCE_SECTORS" :key="s" :value="s">{{ t(`refs.sectors.${s}`) }}</option>
              </select>
            </div>
            <div>
              <label for="ba-orgSize" class="field-label">{{ t('beta.form.orgSize') }}</label>
              <select id="ba-orgSize" v-model="form.orgSize" class="field" required :aria-invalid="has('orgSize')">
                <option value="" disabled>—</option><option v-for="s in ORG_SIZES" :key="s" :value="s">{{ t(`beta.sizes.${s}`) }}</option>
              </select>
            </div>
            <div>
              <label for="ba-hypervisor" class="field-label">{{ t('beta.form.hypervisor') }}</label>
              <select id="ba-hypervisor" v-model="form.hypervisor" class="field" required :aria-invalid="has('hypervisor')">
                <option value="" disabled>—</option><option v-for="s in HYPERVISORS" :key="s" :value="s">{{ t(`beta.hypervisors.${s}`) }}</option>
              </select>
            </div>
            <div>
              <label for="ba-hours" class="field-label">{{ t('beta.form.hours') }}</label>
              <select id="ba-hours" v-model="form.hours" class="field" required :aria-invalid="has('hours')">
                <option value="" disabled>—</option><option v-for="s in HOURS" :key="s" :value="s">{{ t(`beta.hoursOpt.${s}`) }}</option>
              </select>
            </div>
          </div>
          <fieldset>
            <legend class="field-label">{{ t('beta.form.stack') }}</legend>
            <div class="grid gap-2 sm:grid-cols-2">
              <label v-for="s in CURRENT_STACK" :key="s" class="flex items-center gap-2 text-sm"><input v-model="form.currentStack" type="checkbox" :value="s" class="size-4 accent-[#5b8cff]">{{ t(`beta.stack.${s}`) }}</label>
            </div>
          </fieldset>
          <fieldset :aria-invalid="has('services')">
            <legend id="ba-services" tabindex="-1" class="field-label">{{ t('beta.form.services') }}</legend>
            <div class="flex flex-wrap gap-x-5 gap-y-2">
              <label v-for="s in REFERENCE_SERVICES" :key="s" class="flex items-center gap-2 text-sm"><input v-model="form.services" type="checkbox" :value="s" class="size-4 accent-[#5b8cff]">{{ t(`refs.serviceNames.${s}`) }}</label>
            </div>
            <p v-if="has('services')" class="field-error">{{ t('beta.form.servicesError') }}</p>
          </fieldset>
          <div class="flex flex-wrap gap-x-6 gap-y-2">
            <label class="flex items-center gap-2"><input v-model="form.activeDirectory" type="checkbox" class="size-4 accent-[#5b8cff]">{{ t('beta.form.ad') }}</label>
            <label class="flex items-center gap-2"><input v-model="form.wifi8021x" type="checkbox" class="size-4 accent-[#5b8cff]">{{ t('beta.form.wifi') }}</label>
          </div>
          <div>
            <label for="ba-motivation" class="field-label">{{ t('beta.form.motivation') }}</label>
            <textarea id="ba-motivation" v-model="form.motivation" class="field min-h-32" maxlength="2000" required :aria-invalid="has('motivation')" aria-describedby="ba-mot-hint" />
            <p id="ba-mot-hint" class="mt-1.5 text-sm" :class="has('motivation') ? 'text-alert' : 'text-muted'">{{ t('beta.form.motivationHint') }}</p>
          </div>
          <label class="flex items-start gap-3"><input v-model="form.publicCredit" type="checkbox" class="mt-1 size-5 shrink-0 accent-[#5b8cff]"><span>{{ t('beta.form.credit') }}</span></label>
          <p v-if="refCode" class="text-sm text-muted">{{ t('beta.form.referred') }}</p>
          <p v-if="error" role="alert" class="field-error">{{ error }}</p>
          <button type="submit" class="btn btn-primary" :disabled="busy" data-umami-event="beta-apply">
            <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
            {{ busy && pow.solving.value ? t('beta.form.checking') : st?.application ? t('beta.form.update') : t('beta.form.submit') }}
          </button>
        </form>
      </div>
    </section>

    <section class="wrap py-10" aria-labelledby="faq-title">
      <h2 id="faq-title" class="text-h2">{{ t('beta.faqTitle') }}</h2>
      <div class="mt-8 max-w-3xl divide-y divide-line border-y border-line">
        <details v-for="(f, i) in faq" :key="i" class="group py-4">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
            {{ f.q }}<span class="text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted">{{ f.a }}</p>
        </details>
      </div>
    </section>

    <section v-if="data?.credits.length" class="wrap py-20" aria-labelledby="thanks-title">
      <h2 id="thanks-title" class="text-h2">{{ t('beta.thanksTitle') }}</h2>
      <p class="mt-4 max-w-2xl text-muted">{{ t('beta.thanksText') }}</p>
      <ul class="mt-8 flex flex-wrap gap-2">
        <li v-for="(c, i) in data.credits" :key="i" class="rounded-full border border-line px-3 py-1.5 text-sm">{{ c.name }}<span v-if="c.org" class="text-muted">, {{ c.org }}</span></li>
      </ul>
    </section>
  </div>
</template>
