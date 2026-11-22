<script setup lang="ts">
const { t, locale } = useI18n()
const errorText = useAccountError()
const localePath = useLocalePath()
definePageMeta({ middleware: 'account' })
const { refresh: refreshAccount } = useAccount()
useSeoMeta({ title: () => t('account.sessions.title'), robots: 'noindex' })
type S = { id: string, device: string, createdAt: string, lastSeenAt: string, current: boolean }
const { data, refresh } = await useFetch<S[]>('/api/account/sessions', { default: () => [] })
const fmt = (d: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d))
const busy = ref('')
const error = ref('')
const done = ref('')
async function revoke(s: S) {
  busy.value = s.id; error.value = ''
  try {
    await $fetch(`/api/account/sessions/${s.id}`, { method: 'DELETE' })
    if (s.current) { await refreshAccount(); await navigateTo(localePath('compte-connexion')); return }
    await refresh()
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = '' }
}
async function revokeOthers() {
  busy.value = 'others'; error.value = ''; done.value = ''
  try {
    const r = await $fetch<{ count: number }>('/api/account/sessions/revoke-others', { method: 'POST' })
    done.value = t('account.sessions.revoked', { n: r.count }); await refresh()
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = '' }
}
</script>

<template>
  <div class="wrap py-14">
    <h1 class="text-h2">{{ t('account.title') }}</h1>
    <AccountNav class="mt-8" />
    <div class="mt-10 max-w-2xl">
      <h2 class="text-lg font-semibold tracking-tight">{{ t('account.sessions.title') }}</h2>
      <p class="mt-1 text-sm text-muted">{{ t('account.sessions.text') }}</p>
      <ul class="mt-6 divide-y divide-line rounded-xl border border-line">
        <li v-for="s in data" :key="s.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="font-medium">{{ s.device }} <span v-if="s.current" class="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">{{ t('account.sessions.current') }}</span></p>
            <p class="text-sm text-muted">{{ t('account.sessions.meta', { created: fmt(s.createdAt), seen: fmt(s.lastSeenAt) }) }}</p>
          </div>
          <button type="button" class="btn btn-secondary" :disabled="!!busy" @click="revoke(s)">
            <span v-if="busy === s.id" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ s.current ? t('account.signOut') : t('account.sessions.revoke') }}
          </button>
        </li>
      </ul>
      <p v-if="error" role="alert" class="mt-4 field-error">{{ error }}</p>
      <p v-if="done" role="status" class="mt-4 text-sm text-ok">{{ done }}</p>
      <button v-if="(data?.length ?? 0) > 1" type="button" class="btn btn-secondary mt-6" :disabled="!!busy" @click="revokeOthers">
        <span v-if="busy === 'others'" class="size-4 animate-spin rounded-full border-2 border-line-strong border-t-fg" aria-hidden="true" />{{ t('account.sessions.revokeOthers') }}
      </button>
    </div>
  </div>
</template>
