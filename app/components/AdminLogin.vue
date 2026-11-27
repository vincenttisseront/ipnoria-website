<script setup lang="ts">
import { startAuthentication } from '@simplewebauthn/browser'

// Connexion locale de l'administration : mot de passe, puis second facteur obligatoire.
const props = defineProps<{ resume: 'mfa' | 'setup' | null, passkey: boolean }>()
const emit = defineEmits<{ ready: [] }>()

const step = ref<'password' | 'mfa' | 'setup' | 'codes'>(props.resume ?? 'password')
const email = ref('')
const password = ref('')
const code = ref('')
const passkeyOk = ref(props.passkey)
const totp = ref<{ svg: string, key: string } | null>(null)
const codes = ref<string[]>([])
const copied = ref(false)
const busy = ref<'' | 'form' | 'passkey' | 'copy'>('')
const error = ref('')
const errorBox = ref<HTMLElement>()
const codeInput = ref<HTMLInputElement>()

const qrSrc = computed(() => totp.value ? `data:image/svg+xml;base64,${btoa(totp.value.svg)}` : '')

const titles = {
  password: 'Connexion',
  mfa: 'Second facteur',
  setup: 'Activer le second facteur',
  codes: 'Codes de secours',
}
const leads = {
  password: 'Saisissez votre adresse et votre mot de passe.',
  mfa: 'Saisissez le code de l’application d’authentification, ou un code de secours.',
  setup: 'L’administration n’accepte pas ce compte tant qu’une application d’authentification n’est pas réglée.',
  codes: 'Conservez ces codes hors ligne. Chacun ne fonctionne qu’une fois. Ils ne seront plus affichés.',
}

function message(err: unknown): string {
  const codeName = apiErrorCode(err)
  if (codeName === 'locked') {
    const minutes = Math.max(1, Number(apiErrorExtra(err).minutes ?? 1))
    return `Trop d’essais. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
  }
  const known: Record<string, string> = {
    invalid_credentials: 'Adresse ou mot de passe incorrect.',
    invalid_code: 'Code refusé. Vérifiez l’heure de l’appareil, ou utilisez un code de secours.',
    no_pending_login: 'Cette étape a expiré. Recommencez avec le mot de passe.',
    no_pending_setup: 'Ce code n’est plus valable. Affichez-en un nouveau.',
    no_passkey: 'Ce compte n’a pas de clé d’accès. Utilisez un code.',
    passkey_invalid: 'La clé d’accès a été refusée.',
    challenge_expired: 'La demande a expiré. Recommencez.',
    mfa_already: 'Un second facteur est déjà actif. Saisissez son code.',
    rate: 'Trop d’essais depuis cette adresse. Patientez quelques minutes.',
  }
  return known[codeName] ?? 'La connexion a échoué. Réessayez.'
}
async function show(err: unknown) {
  error.value = message(err)
  await nextTick()
  errorBox.value?.focus()
}
async function startSetup() {
  busy.value = 'form'
  error.value = ''
  try { totp.value = await $fetch<{ svg: string, key: string }>('/api/admin/totp/setup', { method: 'POST' }) }
  catch (err) { await show(err) }
  finally { busy.value = '' }
}
onMounted(() => {
  if (step.value === 'setup') startSetup()
  else if (step.value === 'mfa') nextTick(() => codeInput.value?.focus())
})
async function submitPassword() {
  busy.value = 'form'
  error.value = ''
  try {
    const r = await $fetch<{ step: 'mfa' | 'setup', passkey: boolean }>('/api/admin/login', { method: 'POST', body: { email: email.value, password: password.value } })
    passkeyOk.value = r.passkey
    password.value = ''
    step.value = r.step
    if (r.step === 'setup') await startSetup()
    else { await nextTick(); codeInput.value?.focus() }
  }
  catch (err) { await show(err) }
  finally { if (step.value !== 'setup') busy.value = '' }
}
async function submitCode() {
  busy.value = 'form'
  error.value = ''
  try {
    if (step.value === 'setup') {
      const r = await $fetch<{ recoveryCodes: string[] | null }>('/api/admin/totp/enable', { method: 'POST', body: { code: code.value } })
      codes.value = r.recoveryCodes ?? []
      step.value = 'codes'
    }
    else {
      await $fetch('/api/admin/login/mfa', { method: 'POST', body: { code: code.value } })
      emit('ready')
    }
  }
  catch (err) {
    const name = apiErrorCode(err)
    if (step.value === 'mfa' && (name === 'no_pending_login' || name === 'locked')) step.value = 'password'
    if (name === 'no_pending_setup') totp.value = null
    await show(err)
  }
  finally { busy.value = '' }
}
async function signInWithPasskey() {
  busy.value = 'passkey'
  error.value = ''
  try {
    const optionsJSON = await $fetch<Parameters<typeof startAuthentication>[0]['optionsJSON']>('/api/admin/passkeys/options', { method: 'POST' })
    const response = await startAuthentication({ optionsJSON })
    await $fetch('/api/admin/passkeys/verify', { method: 'POST', body: { response } })
    emit('ready')
  }
  catch (err) {
    if ((err as Error)?.name === 'NotAllowedError' || (err as Error)?.name === 'AbortError') error.value = 'La clé d’accès a été annulée.'
    else {
      if (apiErrorCode(err) === 'no_pending_login') step.value = 'password'
      await show(err)
    }
  }
  finally { busy.value = '' }
}
async function cancel() {
  await $fetch('/auth/logout', { method: 'POST' }).catch(() => {})
  step.value = 'password'
  code.value = ''
  totp.value = null
  error.value = ''
}
async function copyCodes() {
  busy.value = 'copy'
  try {
    await navigator.clipboard.writeText(codes.value.join('\n'))
    copied.value = true
  }
  catch { error.value = 'La copie a échoué. Sélectionnez les codes pour les enregistrer.' }
  finally { busy.value = '' }
}
</script>

<template>
  <div class="panel max-w-xl p-7">
    <h1 class="text-xl font-semibold">{{ titles[step] }}</h1>
    <p class="mt-2 text-muted">{{ leads[step] }}</p>
    <p v-if="error" ref="errorBox" role="alert" tabindex="-1" class="mt-4 rounded-lg border-l-4 border-alert bg-bg px-4 py-3 text-alert">{{ error }}</p>

    <form v-if="step === 'password'" class="mt-6 space-y-5" @submit.prevent="submitPassword">
      <div>
        <label for="adm-email" class="field-label">Adresse e-mail</label>
        <input id="adm-email" v-model="email" type="email" class="field" autocomplete="username webauthn" inputmode="email" maxlength="254" required>
      </div>
      <div>
        <label for="adm-pw" class="field-label">Mot de passe</label>
        <PasswordInput id="adm-pw" v-model="password" autocomplete="current-password" />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="busy !== ''">
        <span v-if="busy === 'form'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
        Se connecter
      </button>
    </form>

    <form v-else-if="step === 'mfa'" class="mt-6 space-y-5" @submit.prevent="submitCode">
      <div>
        <label for="adm-code" class="field-label">Code</label>
        <input id="adm-code" ref="codeInput" v-model="code" class="field font-mono tracking-widest" inputmode="text" autocomplete="one-time-code" maxlength="20" required aria-describedby="adm-code-hint">
        <p id="adm-code-hint" class="mt-1.5 text-sm text-muted">Six chiffres, ou un code de secours.</p>
      </div>
      <button type="submit" class="btn btn-primary" :disabled="busy !== ''">
        <span v-if="busy === 'form'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
        Vérifier le code
      </button>
      <button v-if="passkeyOk" type="button" class="btn btn-secondary" :disabled="busy !== ''" @click="signInWithPasskey">
        <span v-if="busy === 'passkey'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />
        Utiliser une clé d’accès
      </button>
      <button type="button" class="link text-sm" @click="cancel">Recommencer</button>
    </form>

    <div v-else-if="step === 'setup'" class="mt-6">
      <p v-if="busy === 'form' && !totp" class="flex items-center gap-3 text-muted">
        <span class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />Préparation du second facteur
      </p>
      <button v-else-if="!totp" type="button" class="btn btn-primary" :disabled="busy !== ''" @click="startSetup">Afficher le code</button>
      <form v-else class="space-y-5" @submit.prevent="submitCode">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
          <img :src="qrSrc" width="176" height="176" class="rounded-lg bg-white p-1" alt="Code à scanner avec l’application d’authentification">
          <div class="min-w-0">
            <p class="text-sm text-muted">Scannez le code, ou saisissez la clé à la main.</p>
            <p class="mt-2 break-all font-mono text-sm">{{ totp.key }}</p>
          </div>
        </div>
        <div>
          <label for="adm-setup" class="field-label">Code affiché par l’application</label>
          <input id="adm-setup" v-model="code" class="field max-w-48 font-mono tracking-widest" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
        </div>
        <button type="submit" class="btn btn-primary" :disabled="busy !== ''">
          <span v-if="busy === 'form'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
          Activer et se connecter
        </button>
      </form>
    </div>

    <div v-else class="mt-6">
      <ul v-if="codes.length" class="grid grid-cols-2 gap-2 font-mono text-sm">
        <li v-for="c in codes" :key="c" class="rounded-lg border border-line bg-bg px-3 py-2">{{ c }}</li>
      </ul>
      <p v-else class="text-muted">Des codes de secours existent déjà pour ce compte. Régénérez-les depuis la page Sécurité du compte si vous ne les avez plus.</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <button v-if="codes.length" type="button" class="btn btn-secondary" :disabled="busy !== ''" @click="copyCodes">{{ copied ? 'Codes copiés' : 'Copier les codes' }}</button>
        <button type="button" class="btn btn-primary" @click="emit('ready')">J’ai enregistré les codes</button>
      </div>
    </div>
  </div>
</template>
