<script setup lang="ts">
import { startRegistration } from '@simplewebauthn/browser'

// Sécurité du compte : mot de passe, application d'authentification, clés d'accès, codes de secours, GitHub, activité.
const { t, locale } = useI18n()
const route = useRoute()
const { withReauth, ask } = useReauth()
const errorText = useAccountError()
definePageMeta({ middleware: 'account' })
const { state } = useAccount()
const { refresh } = useAccount()
useSeoMeta({ title: () => t('account.security.title'), robots: 'noindex' })
const user = computed(() => state.value!.user!)
const fmt = (d: string | null) => d ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)) : '—'

type Passkey = { id: string, name: string, createdAt: string, lastUsedAt: string | null }
type Ev = { kind: string, device: string, at: string }
const { data: passkeys, refresh: reloadPasskeys } = await useFetch<Passkey[]>('/api/account/passkeys', { default: () => [] })
const { data: recovery, refresh: reloadRecovery } = await useFetch<{ remaining: number, total: number }>('/api/account/recovery')
const { data: events, refresh: reloadEvents } = await useFetch<Ev[]>('/api/account/events', { default: () => [] })
async function reloadAll() { await Promise.all([refresh(), reloadPasskeys(), reloadRecovery(), reloadEvents()]) }

// Codes de secours montrés une seule fois
const codes = ref<string[] | null>(null)
const codesBox = ref<HTMLElement>()
async function showCodes(c: string[] | null | undefined) {
  if (!c?.length) return
  codes.value = c
  await nextTick(); codesBox.value?.focus()
}
const codesText = computed(() => codes.value ? `Ipnoria – ${t('account.recovery.title')}\n${user.value.email}\n\n${codes.value.join('\n')}\n` : '')
const codesHref = computed(() => `data:text/plain;charset=utf-8,${encodeURIComponent(codesText.value)}`)
const copiedCodes = ref(false)
async function copyCodes() {
  try { await navigator.clipboard.writeText(codesText.value); copiedCodes.value = true; setTimeout(() => (copiedCodes.value = false), 1800) }
  catch { /* sélection manuelle possible */ }
}

// Mot de passe
const pw = reactive({ current: '', password: '' })
const pwState = ref<'' | 'busy' | 'done'>('')
const pwError = ref('')
async function changePassword() {
  pwState.value = 'busy'; pwError.value = ''
  try {
    const r = await withReauth(() => $fetch('/api/account/password/change', { method: 'POST', body: user.value.hasPassword ? pw : { password: pw.password } }))
    if (r) { pwState.value = 'done'; pw.current = ''; pw.password = ''; await reloadAll() }
    else pwState.value = ''
  }
  catch (err) { pwError.value = errorText(err); pwState.value = '' }
}

// Application d'authentification
const totp = ref<{ svg: string, key: string } | null>(null)
const totpCode = ref('')
const totpBusy = ref<'' | 'setup' | 'enable' | 'disable'>('')
const totpError = ref('')
const confirmDisable = ref(false)
const qrSrc = computed(() => totp.value ? `data:image/svg+xml;base64,${btoa(totp.value.svg)}` : '')
async function setupTotp() {
  totpBusy.value = 'setup'; totpError.value = ''
  try { totp.value = (await withReauth(() => $fetch<{ svg: string, key: string }>('/api/account/totp/setup', { method: 'POST' }))) ?? null }
  catch (err) { totpError.value = errorText(err) }
  finally { totpBusy.value = '' }
}
async function enableTotp() {
  totpBusy.value = 'enable'; totpError.value = ''
  try {
    const r = await withReauth(() => $fetch<{ recoveryCodes: string[] | null }>('/api/account/totp/enable', { method: 'POST', body: { code: totpCode.value } }))
    if (r) { totp.value = null; totpCode.value = ''; await reloadAll(); await showCodes(r.recoveryCodes) }
  }
  catch (err) { totpError.value = errorText(err) }
  finally { totpBusy.value = '' }
}
async function disableTotp() {
  totpBusy.value = 'disable'; totpError.value = ''
  try { if (await withReauth(() => $fetch('/api/account/totp/disable', { method: 'POST' }))) { confirmDisable.value = false; await reloadAll() } }
  catch (err) { totpError.value = errorText(err) }
  finally { totpBusy.value = '' }
}

// Clés d'accès
const pkName = ref('')
const pkBusy = ref('')
const pkError = ref('')
const renaming = ref<string | null>(null)
const renameValue = ref('')
const confirmRemove = ref<string | null>(null)
onMounted(() => {
  const ua = navigator.userAgent
  pkName.value = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : t('account.passkeys.defaultName')
})
async function addPasskey() {
  pkBusy.value = 'add'; pkError.value = ''
  try {
    const optionsJSON = await withReauth(() => $fetch<Parameters<typeof startRegistration>[0]['optionsJSON']>('/api/account/passkeys/register/options', { method: 'POST' }))
    if (!optionsJSON) return
    const response = await startRegistration({ optionsJSON })
    const r = await $fetch<{ recoveryCodes: string[] | null }>('/api/account/passkeys/register/verify', { method: 'POST', body: { response, name: pkName.value } })
    await reloadAll(); await showCodes(r.recoveryCodes)
  }
  catch (err) {
    const name = (err as Error)?.name
    pkError.value = name === 'NotAllowedError' || name === 'AbortError' ? t('account.err.passkey_cancelled')
      : name === 'InvalidStateError' ? t('account.err.passkey_exists') : errorText(err)
  }
  finally { pkBusy.value = '' }
}
async function renamePasskey(id: string) {
  pkBusy.value = `rename-${id}`; pkError.value = ''
  try { await $fetch(`/api/account/passkeys/${id}`, { method: 'PATCH', body: { name: renameValue.value } }); renaming.value = null; await reloadPasskeys() }
  catch (err) { pkError.value = errorText(err) }
  finally { pkBusy.value = '' }
}
async function removePasskey(id: string) {
  pkBusy.value = `remove-${id}`; pkError.value = ''
  try { if (await withReauth(() => $fetch(`/api/account/passkeys/${id}`, { method: 'DELETE' }))) { confirmRemove.value = null; await reloadAll() } }
  catch (err) { pkError.value = errorText(err) }
  finally { pkBusy.value = '' }
}

// Codes de secours
const rcBusy = ref(false)
const rcError = ref('')
async function regenerate() {
  rcBusy.value = true; rcError.value = ''
  try {
    const r = await withReauth(() => $fetch<{ recoveryCodes: string[] }>('/api/account/recovery/regenerate', { method: 'POST' }))
    if (r) { await reloadAll(); await showCodes(r.recoveryCodes) }
  }
  catch (err) { rcError.value = errorText(err) }
  finally { rcBusy.value = false }
}

// GitHub
const ghBusy = ref(false)
const ghError = ref('')
const ghBanner = computed(() => {
  const g = route.query.github
  return typeof g === 'string' && ['lie', 'deja-lie', 'reauth'].includes(g) ? { ok: g === 'lie', text: t(`account.github.${g}`) } : null
})
async function unlinkGithub() {
  ghBusy.value = true; ghError.value = ''
  try { if (await withReauth(() => $fetch('/api/account/github/unlink', { method: 'POST' }))) await reloadAll() }
  catch (err) { ghError.value = errorText(err) }
  finally { ghBusy.value = false }
}
async function linkGithubWithReauth() {
  if (await ask()) window.location.href = `/api/account/github/start?link=1&locale=${locale.value}`
}
const eventLabel = (k: string) => t(`account.events.${k}`, k)
</script>

<template>
  <div class="wrap py-14">
    <h1 class="text-h2">{{ t('account.title') }}</h1>
    <AccountNav class="mt-8" />
    <p v-if="ghBanner" role="status" class="mt-8 rounded-lg border px-4 py-3 text-sm" :class="ghBanner.ok ? 'border-ok/40 bg-ok/10' : 'border-warn/40 bg-warn/10'">{{ ghBanner.text }}</p>

    <!-- Codes de secours affichés une fois -->
    <section v-if="codes" ref="codesBox" tabindex="-1" class="mt-8 rounded-xl border border-accent/50 bg-accent-soft p-6" aria-labelledby="codes-title">
      <h2 id="codes-title" class="font-semibold">{{ t('account.recovery.shownTitle') }}</h2>
      <p class="mt-1 text-sm text-muted">{{ t('account.recovery.shownText') }}</p>
      <ul class="mt-4 grid grid-cols-2 gap-2 font-mono text-[0.95rem] sm:grid-cols-5">
        <li v-for="c in codes" :key="c" class="rounded-md bg-surface px-2 py-1.5 text-center">{{ c }}</li>
      </ul>
      <div class="mt-5 flex flex-wrap gap-2">
        <button type="button" class="btn btn-secondary" @click="copyCodes"><AppIcon :name="copiedCodes ? 'check' : 'copy'" :size="16" />{{ copiedCodes ? t('account.recovery.copied') : t('account.recovery.copy') }}</button>
        <a :href="codesHref" download="ipnoria-codes-de-secours.txt" class="btn btn-secondary"><AppIcon name="download" :size="16" />{{ t('account.recovery.download') }}</a>
        <button type="button" class="btn btn-primary" @click="codes = null">{{ t('account.recovery.saved') }}</button>
      </div>
    </section>

    <div class="mt-10 space-y-12">
      <!-- Mot de passe -->
      <section aria-labelledby="pw-title" class="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div>
          <h2 id="pw-title" class="text-lg font-semibold tracking-tight">{{ t('account.password') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ user.hasPassword ? t('account.security.passwordText') : t('account.security.noPassword') }}</p>
        </div>
        <form class="max-w-md space-y-4" @submit.prevent="changePassword">
          <div v-if="user.hasPassword">
            <label for="sc-cur" class="field-label">{{ t('account.currentPassword') }}</label>
            <PasswordInput id="sc-cur" v-model="pw.current" autocomplete="current-password" />
          </div>
          <div>
            <label for="sc-new" class="field-label">{{ t('account.newPassword') }}</label>
            <PasswordInput id="sc-new" v-model="pw.password" autocomplete="new-password" />
          </div>
          <p v-if="pwError" role="alert" class="field-error">{{ pwError }}</p>
          <p v-if="pwState === 'done'" role="status" class="text-sm text-ok">{{ t('account.security.passwordDone') }}</p>
          <button type="submit" class="btn btn-secondary" :disabled="pwState === 'busy'">
            <span v-if="pwState === 'busy'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ user.hasPassword ? t('account.security.passwordChange') : t('account.security.passwordSet') }}
          </button>
        </form>
      </section>

      <!-- Application d'authentification -->
      <section aria-labelledby="totp-title" class="grid gap-6 border-t border-line pt-10 lg:grid-cols-[18rem_1fr]">
        <div>
          <h2 id="totp-title" class="text-lg font-semibold tracking-tight">{{ t('account.totp.title') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('account.totp.text') }}</p>
        </div>
        <div class="max-w-xl">
          <p class="flex items-center gap-2 text-sm">
            <span class="size-2 rounded-full" :class="user.totp ? 'bg-ok' : 'bg-line-strong'" aria-hidden="true" />{{ user.totp ? t('account.totp.on') : t('account.totp.off') }}
          </p>
          <p v-if="totpError" role="alert" class="mt-3 field-error">{{ totpError }}</p>
          <template v-if="!user.totp">
            <button v-if="!totp" type="button" class="btn btn-primary mt-4" :disabled="!!totpBusy" @click="setupTotp">
              <span v-if="totpBusy === 'setup'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.totp.enable') }}
            </button>
            <form v-else class="panel mt-4 grid gap-6 p-5 sm:grid-cols-[11rem_1fr]" @submit.prevent="enableTotp">
              <img :src="qrSrc" width="176" height="176" class="rounded-lg bg-white p-1" :alt="t('account.totp.qrAlt')">
              <div class="space-y-4">
                <ol class="list-decimal space-y-1 pl-5 text-sm text-muted">
                  <li>{{ t('account.totp.step1') }}</li>
                  <li>{{ t('account.totp.step2') }}</li>
                </ol>
                <p class="text-sm">{{ t('account.totp.manual') }} <code class="font-mono text-[0.85rem]">{{ totp.key }}</code></p>
                <div>
                  <label for="totp-code" class="field-label">{{ t('account.mfa.codeLabel') }}</label>
                  <input id="totp-code" v-model="totpCode" class="field max-w-48 font-mono tracking-widest" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="submit" class="btn btn-primary" :disabled="!!totpBusy">
                    <span v-if="totpBusy === 'enable'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.totp.confirm') }}
                  </button>
                  <button type="button" class="btn btn-secondary" @click="totp = null">{{ t('account.cancel') }}</button>
                </div>
              </div>
            </form>
          </template>
          <template v-else>
            <button v-if="!confirmDisable" type="button" class="btn btn-secondary mt-4" @click="confirmDisable = true">{{ t('account.totp.disable') }}</button>
            <div v-else class="mt-4 rounded-lg border border-alert/40 bg-alert/10 p-4">
              <p class="text-sm">{{ t('account.totp.disableConfirm') }}</p>
              <div class="mt-3 flex gap-2">
                <button type="button" class="btn btn-primary" :disabled="!!totpBusy" @click="disableTotp">
                  <span v-if="totpBusy === 'disable'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.totp.disableYes') }}
                </button>
                <button type="button" class="btn btn-secondary" @click="confirmDisable = false">{{ t('account.cancel') }}</button>
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- Clés d'accès -->
      <section aria-labelledby="pk-title" class="grid gap-6 border-t border-line pt-10 lg:grid-cols-[18rem_1fr]">
        <div>
          <h2 id="pk-title" class="text-lg font-semibold tracking-tight">{{ t('account.passkeys.title') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('account.passkeys.text') }}</p>
        </div>
        <div class="max-w-xl">
          <ul v-if="passkeys?.length" class="divide-y divide-line rounded-xl border border-line">
            <li v-for="k in passkeys" :key="k.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
              <AppIcon name="key" :size="16" class="text-muted" />
              <form v-if="renaming === k.id" class="flex flex-1 gap-2" @submit.prevent="renamePasskey(k.id)">
                <label :for="`pk-r-${k.id}`" class="sr-only">{{ t('account.passkeys.name') }}</label>
                <input :id="`pk-r-${k.id}`" v-model="renameValue" class="field py-1.5" maxlength="60" required>
                <button type="submit" class="btn btn-secondary" :disabled="!!pkBusy">{{ t('account.save') }}</button>
              </form>
              <div v-else class="min-w-0 flex-1">
                <p class="font-medium">{{ k.name }}</p>
                <p class="text-sm text-muted">{{ t('account.passkeys.meta', { created: fmt(k.createdAt), used: fmt(k.lastUsedAt) }) }}</p>
              </div>
              <template v-if="confirmRemove === k.id">
                <button type="button" class="btn btn-primary" :disabled="!!pkBusy" @click="removePasskey(k.id)">
                  <span v-if="pkBusy === `remove-${k.id}`" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.passkeys.removeYes') }}
                </button>
                <button type="button" class="btn btn-secondary" @click="confirmRemove = null">{{ t('account.cancel') }}</button>
              </template>
              <template v-else-if="renaming !== k.id">
                <button type="button" class="text-sm text-muted hover:text-fg" @click="renaming = k.id; renameValue = k.name">{{ t('account.passkeys.rename') }}</button>
                <button type="button" class="text-sm text-muted hover:text-alert" @click="confirmRemove = k.id">{{ t('account.passkeys.remove') }}</button>
              </template>
            </li>
          </ul>
          <form class="mt-4 flex flex-wrap items-end gap-3" @submit.prevent="addPasskey">
            <div>
              <label for="pk-name" class="field-label">{{ t('account.passkeys.name') }}</label>
              <input id="pk-name" v-model="pkName" class="field w-56" maxlength="60" required>
            </div>
            <button type="submit" class="btn btn-primary" :disabled="!!pkBusy">
              <span v-if="pkBusy === 'add'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
              <AppIcon v-else name="key" :size="16" />{{ t('account.passkeys.add') }}
            </button>
          </form>
          <p v-if="pkError" role="alert" class="mt-3 field-error">{{ pkError }}</p>
        </div>
      </section>

      <!-- Codes de secours -->
      <section v-if="user.totp || user.passkeys" aria-labelledby="rc-title" class="grid gap-6 border-t border-line pt-10 lg:grid-cols-[18rem_1fr]">
        <div>
          <h2 id="rc-title" class="text-lg font-semibold tracking-tight">{{ t('account.recovery.title') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('account.recovery.text') }}</p>
        </div>
        <div>
          <p class="text-sm" :class="(recovery?.remaining ?? 0) <= 2 ? 'text-warn' : ''">{{ t('account.recovery.remaining', { n: recovery?.remaining ?? 0 }) }}</p>
          <p v-if="rcError" role="alert" class="mt-3 field-error">{{ rcError }}</p>
          <button type="button" class="btn btn-secondary mt-4" :disabled="rcBusy" @click="regenerate">
            <span v-if="rcBusy" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ t('account.recovery.regenerate') }}
          </button>
        </div>
      </section>

      <!-- GitHub -->
      <section v-if="state?.github" aria-labelledby="gh-title" class="grid gap-6 border-t border-line pt-10 lg:grid-cols-[18rem_1fr]">
        <div>
          <h2 id="gh-title" class="text-lg font-semibold tracking-tight">GitHub</h2>
          <p class="mt-1 text-sm text-muted">{{ t('account.github.text') }}</p>
        </div>
        <div>
          <p class="flex items-center gap-2 text-sm"><span class="size-2 rounded-full" :class="user.github ? 'bg-ok' : 'bg-line-strong'" aria-hidden="true" />{{ user.github ? t('account.github.on') : t('account.github.off') }}</p>
          <p v-if="ghError" role="alert" class="mt-3 field-error">{{ ghError }}</p>
          <button v-if="user.github" type="button" class="btn btn-secondary mt-4" :disabled="ghBusy" @click="unlinkGithub">
            <span v-if="ghBusy" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ t('account.github.unlink') }}
          </button>
          <button v-else type="button" class="btn btn-secondary mt-4" @click="linkGithubWithReauth"><AppIcon name="github" :size="16" />{{ t('account.github.link') }}</button>
        </div>
      </section>

      <!-- Activité -->
      <section aria-labelledby="ev-title" class="grid gap-6 border-t border-line pt-10 lg:grid-cols-[18rem_1fr]">
        <div>
          <h2 id="ev-title" class="text-lg font-semibold tracking-tight">{{ t('account.events.title') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('account.events.text') }}</p>
        </div>
        <ul class="max-w-xl divide-y divide-line text-sm">
          <li v-for="(e, i) in events" :key="i" class="flex flex-wrap justify-between gap-x-4 py-2.5">
            <span :class="e.kind.endsWith('failed') ? 'text-warn' : ''">{{ eventLabel(e.kind) }}</span>
            <span class="text-muted">{{ e.device }}, {{ fmt(e.at) }}</span>
          </li>
          <li v-if="!events?.length" class="py-2.5 text-muted">{{ t('account.events.none') }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>
