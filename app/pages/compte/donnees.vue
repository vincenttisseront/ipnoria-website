<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const errorText = useAccountError()
const { withReauth } = useReauth()
definePageMeta({ middleware: 'account' })
const { state } = useAccount()
const { refresh } = useAccount()
useSeoMeta({ title: () => t('account.data.title'), robots: 'noindex' })
const confirming = ref(false)
const email = ref('')
const busy = ref(false)
const error = ref('')
const deleted = ref(false)
async function remove() {
  busy.value = true; error.value = ''
  try {
    const r = await withReauth(() => $fetch('/api/account/delete', { method: 'POST', body: { email: email.value } }))
    if (r) { deleted.value = true; await refresh() }
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="wrap py-14">
    <h1 class="text-h2">{{ t('account.title') }}</h1>
    <AccountNav class="mt-8" />
    <div v-if="deleted" role="status" class="panel mt-10 max-w-xl p-6">
      <p class="font-medium">{{ t('account.data.deleted') }}</p>
      <NuxtLink :to="localePath('/')" class="btn btn-primary mt-5">{{ t('error.back') }}</NuxtLink>
    </div>
    <div v-else class="mt-10 max-w-2xl space-y-12">
      <section aria-labelledby="ex-title">
        <h2 id="ex-title" class="text-lg font-semibold tracking-tight">{{ t('account.data.exportTitle') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('account.data.exportText') }}</p>
        <a href="/api/account/export" download class="btn btn-secondary mt-4"><AppIcon name="download" :size="16" />{{ t('account.data.export') }}</a>
      </section>
      <section aria-labelledby="del-title" class="border-t border-line pt-10">
        <h2 id="del-title" class="text-lg font-semibold tracking-tight">{{ t('account.data.deleteTitle') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('account.data.deleteText') }}</p>
        <button v-if="!confirming" type="button" class="btn btn-secondary mt-4" @click="confirming = true">{{ t('account.data.delete') }}</button>
        <form v-else class="mt-4 space-y-4 rounded-xl border border-alert/40 bg-alert/10 p-5" @submit.prevent="remove">
          <div>
            <label for="del-email" class="field-label">{{ t('account.data.deleteConfirm', { email: state?.user?.email }) }}</label>
            <input id="del-email" v-model="email" type="email" class="field" autocomplete="off" required>
          </div>
          <p v-if="error" role="alert" class="field-error">{{ error }}</p>
          <div class="flex gap-2">
            <button type="submit" class="btn btn-primary" :disabled="busy || email.trim().toLowerCase() !== state?.user?.email.toLowerCase()">
              <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.data.deleteYes') }}
            </button>
            <button type="button" class="btn btn-secondary" @click="confirming = false; email = ''">{{ t('account.cancel') }}</button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>
