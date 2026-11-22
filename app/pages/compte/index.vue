<script setup lang="ts">
import { profileSchema } from '#shared/account'

const { t } = useI18n()
const route = useRoute()
const { withReauth } = useReauth()
const errorText = useAccountError()
definePageMeta({ middleware: 'account' })
const { state } = useAccount()
const { refresh } = useAccount()
useSeoMeta({ title: () => t('account.profile.title'), robots: 'noindex' })

const user = computed(() => state.value!.user!)
const form = reactive({ displayName: '', organization: '', locale: 'fr' as 'fr' | 'en', notifyStatus: true, notifyComments: true })
watchEffect(() => {
  const u = state.value?.user
  if (u) Object.assign(form, { displayName: u.displayName, organization: u.organization ?? '', locale: u.locale, notifyStatus: u.notifyStatus, notifyComments: u.notifyComments })
})
const saving = ref(false)
const saved = ref(false)
const error = ref('')
async function save() {
  error.value = ''; saved.value = false
  const p = profileSchema.safeParse(form)
  if (!p.success) { error.value = t('account.err.invalid'); return }
  saving.value = true
  try { await $fetch('/api/account/profile', { method: 'PATCH', body: p.data }); await refresh(); saved.value = true }
  catch (err) { error.value = errorText(err) }
  finally { saving.value = false }
}

const resend = ref<'' | 'busy' | 'sent'>('')
const resendError = ref('')
async function resendLink() {
  resend.value = 'busy'; resendError.value = ''
  try { await $fetch('/api/account/verify/resend', { method: 'POST' }); resend.value = 'sent' }
  catch (err) { resendError.value = errorText(err); resend.value = '' }
}

const newEmail = ref('')
const emailState = ref<'' | 'busy' | 'sent'>('')
const emailError = ref('')
async function changeEmail() {
  emailState.value = 'busy'; emailError.value = ''
  try {
    const r = await withReauth(() => $fetch('/api/account/email/change', { method: 'POST', body: { email: newEmail.value } }))
    emailState.value = r ? 'sent' : ''
  }
  catch (err) { emailError.value = errorText(err); emailState.value = '' }
}
const banner = computed(() => {
  const q = route.query
  if (q.verification === 'ok') return { ok: true, text: t('account.banner.verified') }
  if (q.verification === 'invalide') return { ok: false, text: t('account.banner.verifyInvalid') }
  if (q.email === 'ok') return { ok: true, text: t('account.banner.emailChanged') }
  if (q.email === 'invalide') return { ok: false, text: t('account.banner.emailInvalid') }
  if (q.bienvenue === '1') return { ok: true, text: t('account.banner.welcome') }
  return null
})
</script>

<template>
  <div class="wrap py-14">
    <h1 class="text-h2">{{ t('account.title') }}</h1>
    <AccountNav class="mt-8" />

    <p v-if="banner" role="status" class="mt-8 rounded-lg border px-4 py-3 text-sm" :class="banner.ok ? 'border-ok/40 bg-ok/10' : 'border-alert/40 bg-alert/10'">{{ banner.text }}</p>

    <section v-if="!user.emailVerified" class="mt-8 rounded-xl border border-warn/40 bg-warn/10 p-5" aria-labelledby="verify-title">
      <h2 id="verify-title" class="font-semibold">{{ t('account.verify.title') }}</h2>
      <p class="mt-1 text-sm text-muted">{{ t('account.verify.text', { email: user.email }) }}</p>
      <p v-if="resend === 'sent'" role="status" class="mt-3 text-sm text-ok">{{ t('account.verify.sent') }}</p>
      <p v-if="resendError" role="alert" class="mt-3 text-sm text-alert">{{ resendError }}</p>
      <button v-if="resend !== 'sent'" type="button" class="btn btn-secondary mt-4" :disabled="resend === 'busy'" @click="resendLink">
        <span v-if="resend === 'busy'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ t('account.verify.resend') }}
      </button>
    </section>

    <div class="mt-10 grid gap-10 lg:grid-cols-2">
      <form class="space-y-5" @submit.prevent="save">
        <h2 class="text-lg font-semibold tracking-tight">{{ t('account.profile.title') }}</h2>
        <div>
          <label for="pf-name" class="field-label">{{ t('account.displayName') }}</label>
          <input id="pf-name" v-model="form.displayName" class="field" autocomplete="name" maxlength="60" required aria-describedby="pf-name-hint">
          <p id="pf-name-hint" class="mt-1.5 text-sm text-muted">{{ t('account.displayNameHint') }}</p>
        </div>
        <div>
          <label for="pf-org" class="field-label">{{ t('account.organization') }} <span class="font-normal text-muted">({{ t('contact.optional') }})</span></label>
          <input id="pf-org" v-model="form.organization" class="field" autocomplete="organization" maxlength="120">
        </div>
        <div>
          <label for="pf-locale" class="field-label">{{ t('account.emailLanguage') }}</label>
          <select id="pf-locale" v-model="form.locale" class="field"><option value="fr">Français</option><option value="en">English</option></select>
        </div>
        <fieldset class="space-y-3">
          <legend class="field-label">{{ t('account.notifications.title') }}</legend>
          <label class="flex items-start gap-3"><input v-model="form.notifyStatus" type="checkbox" class="mt-1 size-5 shrink-0 accent-[#5b8cff]"><span>{{ t('account.notifications.status') }}</span></label>
          <label class="flex items-start gap-3"><input v-model="form.notifyComments" type="checkbox" class="mt-1 size-5 shrink-0 accent-[#5b8cff]"><span>{{ t('account.notifications.comments') }}</span></label>
        </fieldset>
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <div class="flex items-center gap-4">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.profile.save') }}
          </button>
          <p v-if="saved" role="status" class="text-sm text-ok">{{ t('account.profile.saved') }}</p>
        </div>
      </form>

      <form class="space-y-5" @submit.prevent="changeEmail">
        <h2 class="text-lg font-semibold tracking-tight">{{ t('account.email') }}</h2>
        <p class="text-sm text-muted">{{ t('account.emailCurrent') }} <span class="font-mono text-fg">{{ user.email }}</span></p>
        <div>
          <label for="pf-email" class="field-label">{{ t('account.emailNew') }}</label>
          <input id="pf-email" v-model="newEmail" type="email" class="field" autocomplete="email" inputmode="email" maxlength="254" required aria-describedby="pf-email-hint">
          <p id="pf-email-hint" class="mt-1.5 text-sm text-muted">{{ t('account.emailNewHint') }}</p>
        </div>
        <p v-if="emailError" role="alert" class="field-error">{{ emailError }}</p>
        <p v-if="emailState === 'sent'" role="status" class="text-sm text-ok">{{ t('account.emailSent') }}</p>
        <button type="submit" class="btn btn-secondary" :disabled="emailState === 'busy'">
          <span v-if="emailState === 'busy'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ t('account.emailChange') }}
        </button>
      </form>
    </div>
  </div>
</template>
