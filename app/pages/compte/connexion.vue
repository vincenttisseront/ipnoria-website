<script setup lang="ts">
import { startAuthentication } from '@simplewebauthn/browser'

// Connexion : mot de passe, clé d'accès ou GitHub ; puis second facteur si le compte en a un.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { state, ensure, refresh, logout } = useAccount()
const errorText = useAccountError()
await ensure()
if (state.value && !state.value.enabled) throw createError({ statusCode: 404, fatal: true })
useSeoMeta({ title: () => t('account.signIn.title'), robots: 'noindex' })

const next = computed(() => {
  const n = route.query.next
  return typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : localePath('compte')
})
if (state.value?.user) await navigateTo(next.value, { replace: true })

const step = ref<'password' | 'mfa'>(state.value?.mfaPending || route.query.etape === 'mfa' ? 'mfa' : 'password')
const email = ref('')
const password = ref('')
const code = ref('')
const busy = ref<'' | 'form' | 'passkey'>('')
const error = ref('')
const errorBox = ref<HTMLElement>()
const codeInput = ref<HTMLInputElement>()
const githubMsg = computed(() => {
  const g = route.query.github
  return typeof g === 'string' && ['erreur', 'sans-email', 'compte-existant'].includes(g) ? t(`account.signIn.github.${g}`) : ''
})

async function done() {
  await refresh()
  await navigateTo(next.value)
}
async function show(err: unknown) {
  error.value = errorText(err)
  await nextTick(); errorBox.value?.focus()
}
async function submitPassword() {
  busy.value = 'form'; error.value = ''
  try {
    const r = await $fetch<{ mfa: boolean }>('/api/account/login', { method: 'POST', body: { email: email.value, password: password.value } })
    if (r.mfa) { step.value = 'mfa'; password.value = ''; await nextTick(); codeInput.value?.focus() }
    else await done()
  }
  catch (err) { await show(err) }
  finally { busy.value = '' }
}
async function submitCode() {
  busy.value = 'form'; error.value = ''
  try {
    await $fetch('/api/account/login/mfa', { method: 'POST', body: { code: code.value } })
    await done()
  }
  catch (err) {
    if (apiErrorCode(err) === 'no_pending_login' || apiErrorCode(err) === 'locked') step.value = 'password'
    await show(err)
  }
  finally { busy.value = '' }
}
async function passkey() {
  busy.value = 'passkey'; error.value = ''
  try {
    const optionsJSON = await $fetch<Parameters<typeof startAuthentication>[0]['optionsJSON']>('/api/account/passkeys/auth/options', { method: 'POST' })
    const response = await startAuthentication({ optionsJSON })
    await $fetch('/api/account/passkeys/auth/verify', { method: 'POST', body: { response } })
    await done()
  }
  catch (err) {
    if ((err as Error)?.name === 'NotAllowedError' || (err as Error)?.name === 'AbortError') error.value = t('account.err.passkey_cancelled')
    else await show(err)
  }
  finally { busy.value = '' }
}
async function cancelMfa() {
  await logout()
  step.value = 'password'; code.value = ''; error.value = ''
}
const githubHref = computed(() => `/api/account/github/start?locale=${locale.value}&next=${encodeURIComponent(next.value)}`)
</script>

<template>
  <div class="wrap py-16 md:py-20">
    <div class="mx-auto max-w-md">
      <h1 class="text-h2">{{ step === 'mfa' ? t('account.mfa.title') : t('account.signIn.title') }}</h1>
      <p class="mt-3 text-muted">{{ step === 'mfa' ? t('account.mfa.lead') : t('account.signIn.lead') }}</p>

      <p v-if="githubMsg" role="alert" class="mt-6 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">{{ githubMsg }}</p>
      <p v-if="error" ref="errorBox" role="alert" tabindex="-1" class="mt-6 rounded-lg border border-alert/40 bg-alert/10 px-4 py-3 text-sm">{{ error }}</p>

      <form v-if="step === 'password'" class="panel mt-8 space-y-5 p-6" @submit.prevent="submitPassword">
        <div>
          <label for="si-email" class="field-label">{{ t('account.email') }}</label>
          <input id="si-email" v-model="email" type="email" class="field" autocomplete="username webauthn" inputmode="email" maxlength="254" required>
        </div>
        <div>
          <div class="flex items-baseline justify-between gap-3">
            <label for="si-pw" class="field-label">{{ t('account.password') }}</label>
            <NuxtLink :to="localePath('compte-mot-de-passe-oublie')" class="text-sm text-muted hover:text-fg">{{ t('account.signIn.forgot') }}</NuxtLink>
          </div>
          <PasswordInput id="si-pw" v-model="password" autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary w-full" :disabled="!!busy">
          <span v-if="busy === 'form'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.signIn.submit') }}
        </button>
        <div class="flex items-center gap-3 text-sm text-muted" aria-hidden="true"><span class="h-px flex-1 bg-line" />{{ t('account.or') }}<span class="h-px flex-1 bg-line" /></div>
        <button type="button" class="btn btn-secondary w-full" :disabled="!!busy" @click="passkey">
          <span v-if="busy === 'passkey'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />
          <AppIcon v-else name="key" :size="16" />{{ t('account.signIn.passkey') }}
        </button>
        <a v-if="state?.github" :href="githubHref" class="btn btn-secondary w-full"><AppIcon name="github" :size="16" />{{ t('account.signIn.github.button') }}</a>
      </form>

      <form v-else class="panel mt-8 space-y-5 p-6" @submit.prevent="submitCode">
        <div>
          <label for="si-code" class="field-label">{{ t('account.mfa.codeLabel') }}</label>
          <input id="si-code" ref="codeInput" v-model="code" class="field font-mono tracking-widest" inputmode="numeric" autocomplete="one-time-code" maxlength="20" required aria-describedby="si-code-hint">
          <p id="si-code-hint" class="mt-1.5 text-sm text-muted">{{ t('account.mfa.codeHint') }}</p>
        </div>
        <button type="submit" class="btn btn-primary w-full" :disabled="!!busy">
          <span v-if="busy === 'form'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.mfa.submit') }}
        </button>
        <button type="button" class="btn btn-secondary w-full" :disabled="!!busy" @click="passkey">
          <span v-if="busy === 'passkey'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />
          <AppIcon v-else name="key" :size="16" />{{ t('account.mfa.passkey') }}
        </button>
        <button type="button" class="link text-sm" @click="cancelMfa">{{ t('account.mfa.cancel') }}</button>
      </form>

      <p v-if="step === 'password'" class="mt-6 text-center text-sm text-muted">
        {{ t('account.signIn.noAccount') }}
        <NuxtLink :to="{ path: localePath('compte-inscription'), query: route.query.next ? { next: route.query.next } : {} }" class="link">{{ t('account.signIn.create') }}</NuxtLink>
      </p>
    </div>
  </div>
</template>
