<script setup lang="ts">
import { newsletterSchema } from '#shared/newsletter'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const email = ref('')
const consent = ref(false)
const website = ref('')
const startedAt = ref(0)
onMounted(() => { startedAt.value = Date.now() })

const status = ref<'idle' | 'sending' | 'sent' | 'error' | 'rate' | 'unavailable'>('idle')
const invalid = ref<Set<string>>(new Set())

async function submit() {
  const body = { email: email.value, consent: consent.value, website: website.value, locale: locale.value, startedAt: startedAt.value || Date.now() }
  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) { invalid.value = new Set(parsed.error.issues.map(i => String(i.path[0]))); return }
  invalid.value = new Set()
  status.value = 'sending'
  try { await $fetch('/api/newsletter', { method: 'POST', body }); status.value = 'sent' }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    status.value = code === 429 ? 'rate' : code === 503 ? 'unavailable' : 'error'
  }
}
</script>

<template>
  <section class="panel p-7 sm:p-9" aria-labelledby="nl-title">
    <div class="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div>
        <h2 id="nl-title" class="text-xl font-semibold tracking-tight">{{ t('newsletter.title') }}</h2>
        <p class="mt-2 text-muted">{{ t('newsletter.lead') }}</p>
      </div>
      <p v-if="status === 'sent'" role="status" class="rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 text-ok">{{ t('newsletter.sent') }}</p>
      <form v-else novalidate @submit.prevent="submit">
        <div class="flex flex-col gap-3 sm:flex-row">
          <label for="nl-email" class="sr-only">{{ t('contact.email') }}</label>
          <input
            id="nl-email" v-model="email" type="email" class="field" autocomplete="email" inputmode="email" maxlength="254"
            :placeholder="t('newsletter.placeholder')" :aria-invalid="invalid.has('email')" :aria-describedby="invalid.has('email') ? 'nl-err' : undefined"
          >
          <button type="submit" class="btn btn-primary shrink-0" :disabled="status === 'sending'">
            <span v-if="status === 'sending'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
            {{ t('newsletter.submit') }}
          </button>
        </div>
        <p v-if="invalid.has('email')" id="nl-err" class="field-error">{{ t('contact.errors.email') }}</p>
        <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off">
        </div>
        <div class="mt-3 flex items-start gap-2.5 text-sm">
          <input id="nl-consent" v-model="consent" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-[#5b8cff]" :aria-invalid="invalid.has('consent')">
          <label for="nl-consent" class="text-muted">{{ t('newsletter.consent') }} <NuxtLink :to="localePath('confidentialite')" class="link">{{ t('contact.consentLink') }}</NuxtLink></label>
        </div>
        <p v-if="invalid.has('consent')" class="field-error">{{ t('contact.errors.consent') }}</p>
        <p v-if="['error', 'rate', 'unavailable'].includes(status)" role="alert" class="field-error">{{ t(`newsletter.errors.${status}`) }}</p>
      </form>
    </div>
  </section>
</template>
