<script setup lang="ts">
import { bookingSchema } from '#shared/forms'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
useSeoMeta({ title: () => t('booking.title'), description: () => t('booking.lead') })

interface Slots { enabled: boolean, slots: string[], durationMin: number, timezone: string }
const { data, refresh } = await useFetch<Slots>('/api/booking/slots')

// Affichage dans le fuseau du visiteur (calculé dans le navigateur ; le serveur rend dans celui du site)
const tz = ref(data.value?.timezone ?? 'Europe/Paris')
onMounted(() => { tz.value = Intl.DateTimeFormat().resolvedOptions().timeZone || tz.value })
const loc = computed(() => (locale.value === 'en' ? 'en-GB' : 'fr-FR'))
const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz.value, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
const days = computed(() => {
  const map = new Map<string, string[]>()
  for (const s of data.value?.slots ?? []) map.set(dayKey(s), [...(map.get(dayKey(s)) ?? []), s])
  return [...map.entries()].map(([key, slots]) => ({ key, label: new Intl.DateTimeFormat(loc.value, { timeZone: tz.value, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(slots[0]!)), slots }))
})
const timeLabel = (iso: string) => new Intl.DateTimeFormat(loc.value, { timeZone: tz.value, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const fullLabel = (iso: string) => new Intl.DateTimeFormat(loc.value, { timeZone: tz.value, dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso))

const day = ref<string | null>(null)
watch(days, d => { if (!day.value && d.length) day.value = d[0]!.key }, { immediate: true })
const slot = ref<string | null>(null)

const form = reactive({ name: '', email: '', company: '', notes: '', consent: false, website: '' })
const startedAt = ref(0)
const pow = usePow()
onMounted(() => { startedAt.value = Date.now(); pow.prepare() })
const status = ref<'idle' | 'sending' | 'sent' | 'taken' | 'error' | 'rate'>('idle')
const invalid = ref<Set<string>>(new Set())
const booked = ref('')

async function submit() {
  const body = { ...form, slot: slot.value ?? '', locale: locale.value, startedAt: startedAt.value || Date.now() }
  const parsed = bookingSchema.safeParse(body)
  if (!parsed.success) { invalid.value = new Set(parsed.error.issues.map(i => String(i.path[0]))); return }
  invalid.value = new Set()
  status.value = 'sending'
  try {
    await $fetch('/api/booking', { method: 'POST', body: { ...body, pow: await pow.get() } })
    booked.value = slot.value!
    status.value = 'sent'
  }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    status.value = code === 409 ? 'taken' : code === 429 ? 'rate' : 'error'
    if (code === 409) { slot.value = null; await refresh() }
    pow.prepare()
  }
}

// Annulation depuis le lien de l'e-mail : confirmée par un bouton, jamais par la seule visite du lien
const cancelToken = computed(() => (typeof route.query.annuler === 'string' && /^[\w-]{43}$/.test(route.query.annuler) ? route.query.annuler : ''))
const cancelState = ref<'idle' | 'busy' | 'done' | 'missing'>('idle')
async function cancelBooking() {
  cancelState.value = 'busy'
  try { await $fetch('/api/booking/cancel', { method: 'POST', body: { token: cancelToken.value } }); cancelState.value = 'done'; await refresh() }
  catch { cancelState.value = 'missing' }
}
</script>

<template>
  <div class="wrap max-w-5xl pt-14">
    <h1 class="text-display">{{ t('booking.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('booking.lead') }}</p>

    <section v-if="cancelToken" class="panel mt-10 max-w-xl p-6">
      <template v-if="cancelState === 'done'"><p role="status" class="text-ok">{{ t('booking.cancelDone') }}</p></template>
      <template v-else-if="cancelState === 'missing'"><p role="alert">{{ t('booking.cancelMissing') }}</p></template>
      <template v-else>
        <p class="font-medium">{{ t('booking.cancelTitle') }}</p>
        <p class="mt-1 text-sm text-muted">{{ t('booking.cancelText') }}</p>
        <button type="button" class="btn btn-secondary mt-4 text-alert" :disabled="cancelState === 'busy'" @click="cancelBooking">
          <span v-if="cancelState === 'busy'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />
          {{ t('booking.cancelButton') }}
        </button>
      </template>
    </section>

    <div v-if="status === 'sent'" class="panel mt-10 max-w-xl p-7" role="status">
      <p class="text-h3 font-semibold text-ok">{{ t('booking.sent') }}</p>
      <p class="mt-2">{{ fullLabel(booked) }}</p>
      <p class="mt-2 text-muted">{{ t('booking.sentText') }}</p>
    </div>

    <div v-else-if="data && !data.enabled" class="panel mt-10 max-w-xl p-7">
      <p class="font-semibold">{{ t('booking.closedTitle') }}</p>
      <p class="mt-2 text-muted">{{ t('booking.closedText') }}</p>
      <NuxtLink :to="localePath('contact')" class="btn btn-primary mt-5"><AppIcon name="mail" :size="16" />{{ t('cta.button') }}</NuxtLink>
    </div>

    <div v-else-if="data" class="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <section class="min-w-0" :aria-label="t('booking.pick')">
        <h2 class="text-lg font-semibold tracking-tight">{{ t('booking.pick') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('booking.tz', { tz, min: data.durationMin }) }}</p>
        <p v-if="!days.length" class="mt-6 text-muted">{{ t('booking.none') }}</p>
        <div v-else class="mt-4 flex gap-2 overflow-x-auto pb-2" role="radiogroup" :aria-label="t('booking.day')">
          <button
            v-for="d in days" :key="d.key" type="button" role="radio" :aria-checked="day === d.key"
            class="shrink-0 rounded-lg border px-3 py-2 text-sm first-letter:uppercase" :class="day === d.key ? 'border-accent/60 bg-accent-soft' : 'border-line hover:border-line-strong'"
            @click="day = d.key; slot = null"
          >{{ d.label }}</button>
        </div>
        <div v-if="day" class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" :aria-label="t('booking.time')">
          <button
            v-for="s in days.find(d => d.key === day)?.slots ?? []" :key="s" type="button" role="radio" :aria-checked="slot === s"
            class="rounded-lg border px-3 py-2.5 font-mono text-sm" :class="slot === s ? 'border-accent bg-accent text-white' : 'border-line hover:border-line-strong'"
            @click="slot = s"
          >{{ timeLabel(s) }}</button>
        </div>
        <p v-if="invalid.has('slot')" class="field-error">{{ t('booking.errors.slot') }}</p>
        <p v-if="status === 'taken'" role="alert" class="field-error mt-3">{{ t('booking.errors.taken') }}</p>
      </section>

      <form class="panel space-y-4 p-6" novalidate @submit.prevent="submit">
        <p v-if="slot" class="rounded-lg bg-accent-soft px-3 py-2 text-sm">{{ fullLabel(slot) }}</p>
        <div>
          <label for="bk-name" class="field-label">{{ t('contact.name') }}</label>
          <input id="bk-name" v-model="form.name" class="field" autocomplete="name" maxlength="100" :aria-invalid="invalid.has('name')">
          <p v-if="invalid.has('name')" class="field-error">{{ t('contact.errors.name') }}</p>
        </div>
        <div>
          <label for="bk-email" class="field-label">{{ t('contact.email') }}</label>
          <input id="bk-email" v-model="form.email" type="email" class="field" autocomplete="email" :aria-invalid="invalid.has('email')">
          <p v-if="invalid.has('email')" class="field-error">{{ t('contact.errors.email') }}</p>
        </div>
        <div>
          <label for="bk-company" class="field-label">{{ t('contact.company') }} <span class="font-normal text-muted">({{ t('contact.optional') }})</span></label>
          <input id="bk-company" v-model="form.company" class="field" autocomplete="organization" maxlength="120">
        </div>
        <div>
          <label for="bk-notes" class="field-label">{{ t('booking.notes') }} <span class="font-normal text-muted">({{ t('contact.optional') }})</span></label>
          <textarea id="bk-notes" v-model="form.notes" class="field min-h-24" maxlength="2000" :placeholder="t('booking.notesHint')" />
        </div>
        <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true"><input v-model="form.website" type="text" tabindex="-1" autocomplete="off"></div>
        <label class="flex items-start gap-2.5 text-sm">
          <input v-model="form.consent" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-[var(--t-accent)]">
          <span class="text-muted">{{ t('booking.consent') }} <NuxtLink :to="localePath('confidentialite')" class="link">{{ t('contact.consentLink') }}</NuxtLink></span>
        </label>
        <p v-if="invalid.has('consent')" class="field-error">{{ t('contact.errors.consent') }}</p>
        <p v-if="status === 'error' || status === 'rate'" role="alert" class="field-error">{{ t(status === 'rate' ? 'contact.errors.rate' : 'booking.errors.server') }}</p>
        <button type="submit" class="btn btn-primary w-full" :disabled="status === 'sending'">
          <span v-if="status === 'sending'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
          {{ t('booking.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>
