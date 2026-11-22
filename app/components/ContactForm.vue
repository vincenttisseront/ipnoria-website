<script setup lang="ts">
import { CONTACT_TOPICS, contactSchema, invalidFields, type ContactField, type ContactTopic } from '#shared/contact'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const form = reactive({
  name: '',
  email: '',
  company: '',
  topic: '' as ContactTopic | '',
  message: '',
  consent: false,
  website: '', // piège à robots, invisible pour un humain
})
const startedAt = ref(0)
onMounted(() => { startedAt.value = Date.now() })

const errors = ref<Set<ContactField>>(new Set())
const status = ref<'idle' | 'sending' | 'sent' | 'rate' | 'server'>('idle')
const summary = ref<HTMLElement | null>(null)
const fieldRefs: Partial<Record<ContactField, HTMLElement | null>> = {}

const has = (f: ContactField) => errors.value.has(f)
const describedBy = (f: ContactField, hint?: string) =>
  [hint, has(f) ? `err-${f}` : ''].filter(Boolean).join(' ') || undefined

function payload() {
  return { ...form, locale: locale.value, startedAt: startedAt.value || Date.now() }
}

async function submit() {
  const parsed = contactSchema.safeParse(payload())
  if (!parsed.success) {
    errors.value = new Set(invalidFields(parsed.error))
    status.value = 'idle'
    await nextTick()
    const first = [...errors.value][0]
    ;(first ? fieldRefs[first] : summary.value)?.focus()
    return
  }
  errors.value = new Set()
  status.value = 'sending'
  try {
    await $fetch('/api/contact', { method: 'POST', body: payload() })
    status.value = 'sent'
  }
  catch (e: unknown) {
    const err = e as { statusCode?: number, data?: { data?: { fields?: ContactField[] } } }
    if (err.statusCode === 429) status.value = 'rate'
    else if (err.statusCode === 400 && err.data?.data?.fields?.length) {
      errors.value = new Set(err.data.data.fields)
      status.value = 'idle'
    }
    else status.value = 'server'
    await nextTick()
    summary.value?.focus()
  }
}

function again() {
  Object.assign(form, { name: '', email: '', company: '', topic: '', message: '', consent: false, website: '' })
  startedAt.value = Date.now()
  status.value = 'idle'
}
</script>

<template>
  <div class="panel p-6 sm:p-8">
    <div v-if="status === 'sent'" class="py-6" role="status">
      <p class="text-h3 font-semibold text-ok">{{ t('contact.sent') }}</p>
      <button type="button" class="btn btn-secondary mt-6" @click="again">{{ t('contact.sendAnother') }}</button>
    </div>

    <form v-else novalidate class="space-y-5" @submit.prevent="submit">
      <div
        v-if="errors.size || status === 'rate' || status === 'server'"
        ref="summary"
        tabindex="-1"
        role="alert"
        class="rounded-md border-l-4 border-alert bg-bg px-4 py-3 text-alert"
      >
        {{ status === 'rate' ? t('contact.errors.rate') : status === 'server' ? t('contact.errors.server') : t('contact.errors.summary') }}
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label for="c-name" class="field-label">{{ t('contact.name') }}</label>
          <input
            id="c-name" :ref="el => (fieldRefs.name = el as HTMLElement)" v-model="form.name"
            class="field" type="text" name="name" autocomplete="name" maxlength="100" required
            :aria-invalid="has('name')" :aria-describedby="describedBy('name')"
          >
          <p v-if="has('name')" id="err-name" class="field-error">{{ t('contact.errors.name') }}</p>
        </div>
        <div>
          <label for="c-email" class="field-label">{{ t('contact.email') }}</label>
          <input
            id="c-email" :ref="el => (fieldRefs.email = el as HTMLElement)" v-model="form.email"
            class="field" type="email" name="email" autocomplete="email" inputmode="email" maxlength="254" required
            :aria-invalid="has('email')" :aria-describedby="describedBy('email')"
          >
          <p v-if="has('email')" id="err-email" class="field-error">{{ t('contact.errors.email') }}</p>
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label for="c-company" class="field-label">
            {{ t('contact.company') }} <span class="font-normal text-muted">({{ t('contact.optional') }})</span>
          </label>
          <input
            id="c-company" :ref="el => (fieldRefs.company = el as HTMLElement)" v-model="form.company"
            class="field" type="text" name="company" autocomplete="organization" maxlength="120"
            :aria-invalid="has('company')" :aria-describedby="describedBy('company')"
          >
          <p v-if="has('company')" id="err-company" class="field-error">{{ t('contact.errors.company') }}</p>
        </div>
        <div>
          <label for="c-topic" class="field-label">{{ t('contact.topic') }}</label>
          <select
            id="c-topic" :ref="el => (fieldRefs.topic = el as HTMLElement)" v-model="form.topic"
            class="field" name="topic" required
            :aria-invalid="has('topic')" :aria-describedby="describedBy('topic')"
          >
            <option value="" disabled>—</option>
            <option v-for="tp in CONTACT_TOPICS" :key="tp" :value="tp">{{ t(`contact.topics.${tp}`) }}</option>
          </select>
          <p v-if="has('topic')" id="err-topic" class="field-error">{{ t('contact.errors.topic') }}</p>
        </div>
      </div>

      <div>
        <label for="c-message" class="field-label">{{ t('contact.message') }}</label>
        <p id="c-message-hint" class="mb-2 text-sm text-muted">{{ t('contact.messageHint') }}</p>
        <textarea
          id="c-message" :ref="el => (fieldRefs.message = el as HTMLElement)" v-model="form.message"
          class="field min-h-40 resize-y" name="message" rows="7" maxlength="5000" required
          :aria-invalid="has('message')" :aria-describedby="describedBy('message', 'c-message-hint')"
        />
        <p v-if="has('message')" id="err-message" class="field-error">{{ t('contact.errors.message') }}</p>
      </div>

      <!-- Piège à robots : hors écran, ignoré par les lecteurs d'écran et le remplissage automatique -->
      <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label for="c-website">Website</label>
        <input id="c-website" v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off">
      </div>

      <div>
        <div class="flex items-start gap-3">
          <input
            id="c-consent" :ref="el => (fieldRefs.consent = el as HTMLElement)" v-model="form.consent"
            type="checkbox" name="consent" class="mt-1 size-5 shrink-0 accent-[#5b8cff]" required
            :aria-invalid="has('consent')" :aria-describedby="describedBy('consent')"
          >
          <label for="c-consent">
            {{ t('contact.consent') }}
            <NuxtLink :to="localePath('confidentialite')" class="link">{{ t('contact.consentLink') }}</NuxtLink>
          </label>
        </div>
        <p v-if="has('consent')" id="err-consent" class="field-error">{{ t('contact.errors.consent') }}</p>
      </div>

      <button type="submit" class="btn btn-primary" :disabled="status === 'sending'" :aria-busy="status === 'sending'">
        <span
          v-if="status === 'sending'"
          class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg"
          aria-hidden="true"
        />
        {{ status === 'sending' ? t('contact.sending') : t('contact.submit') }}
      </button>
    </form>
  </div>
</template>
