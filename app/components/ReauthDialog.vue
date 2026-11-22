<script setup lang="ts">
import { startAuthentication } from '@simplewebauthn/browser'

// Confirmer son identité (mot de passe, code ou clé d'accès) avant une action sensible. Boîte de dialogue maison.
const { t } = useI18n()
const { state } = useReauth()
const { user } = useAccount()
const errorText = useAccountError()
const password = ref('')
const code = ref('')
const busy = ref<'' | 'form' | 'passkey'>('')
const error = ref('')
const mode = ref<'password' | 'code'>('password')
const first = ref<HTMLInputElement>()

watch(() => state.value.open, async (open) => {
  if (!open) return
  password.value = ''; code.value = ''; error.value = ''
  mode.value = user.value?.hasPassword ? 'password' : 'code'
  await nextTick(); first.value?.focus()
})
function close(ok: boolean) {
  const r = state.value.resolve
  state.value = { open: false, resolve: null }
  r?.(ok)
}
async function submit() {
  busy.value = 'form'; error.value = ''
  try {
    await $fetch('/api/account/reauth', { method: 'POST', body: mode.value === 'password' ? { password: password.value } : { code: code.value } })
    close(true)
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = '' }
}
async function withPasskey() {
  busy.value = 'passkey'; error.value = ''
  try {
    const optionsJSON = await $fetch<Parameters<typeof startAuthentication>[0]['optionsJSON']>('/api/account/passkeys/auth/options', { method: 'POST' })
    const response = await startAuthentication({ optionsJSON })
    await $fetch('/api/account/passkeys/auth/verify', { method: 'POST', body: { response } })
    close(true)
  }
  catch (err) { error.value = (err as Error)?.name === 'NotAllowedError' ? t('account.err.passkey_cancelled') : errorText(err) }
  finally { busy.value = '' }
}
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(false) }
</script>

<template>
  <Teleport to="body">
    <div v-if="state.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @keydown="onKey" @mousedown.self="close(false)">
      <div role="dialog" aria-modal="true" aria-labelledby="reauth-title" class="panel w-full max-w-md p-6 shadow-2xl">
        <h2 id="reauth-title" class="text-lg font-semibold tracking-tight">{{ t('account.reauth.title') }}</h2>
        <p class="mt-2 text-sm text-muted">{{ t('account.reauth.lead') }}</p>
        <form class="mt-5 space-y-4" @submit.prevent="submit">
          <div v-if="mode === 'password'">
            <label for="ra-pw" class="field-label">{{ t('account.password') }}</label>
            <input id="ra-pw" ref="first" v-model="password" type="password" class="field" autocomplete="current-password" required>
          </div>
          <div v-else>
            <label for="ra-code" class="field-label">{{ t('account.mfa.codeLabel') }}</label>
            <input id="ra-code" ref="first" v-model="code" class="field font-mono" inputmode="numeric" autocomplete="one-time-code" required>
          </div>
          <p v-if="error" role="alert" class="field-error">{{ error }}</p>
          <div class="flex flex-wrap gap-2">
            <button type="submit" class="btn btn-primary" :disabled="!!busy">
              <span v-if="busy === 'form'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.reauth.confirm') }}
            </button>
            <button type="button" class="btn btn-secondary" @click="close(false)">{{ t('account.cancel') }}</button>
          </div>
        </form>
        <div v-if="(user?.passkeys ?? 0) > 0 || (user?.totp && user?.hasPassword)" class="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
          <button v-if="(user?.passkeys ?? 0) > 0" type="button" class="link inline-flex items-center gap-2" :disabled="!!busy" @click="withPasskey">
            <span v-if="busy === 'passkey'" class="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ t('account.reauth.passkey') }}
          </button>
          <button v-if="user?.totp && user?.hasPassword" type="button" class="link" @click="mode = mode === 'password' ? 'code' : 'password'; nextTick(() => first?.focus())">
            {{ mode === 'password' ? t('account.reauth.useCode') : t('account.reauth.usePassword') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
