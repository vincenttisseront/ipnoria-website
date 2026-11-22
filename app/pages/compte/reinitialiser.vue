<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const errorText = useAccountError()
useSeoMeta({ title: () => t('account.reset.title'), robots: 'noindex', referrer: 'no-referrer' })
const token = computed(() => String(route.query.token ?? ''))
const password = ref('')
const busy = ref(false)
const done = ref(false)
const error = ref('')
async function submit() {
  busy.value = true; error.value = ''
  try {
    await $fetch('/api/account/password/reset', { method: 'POST', body: { token: token.value, password: password.value } })
    done.value = true
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="wrap py-16 md:py-20">
    <div class="mx-auto max-w-md">
      <h1 class="text-h2">{{ t('account.reset.title') }}</h1>
      <div v-if="done" role="status" class="panel mt-8 p-6">
        <p class="font-medium">{{ t('account.reset.done') }}</p>
        <p class="mt-2 text-sm text-muted">{{ t('account.reset.doneText') }}</p>
        <NuxtLink :to="localePath('compte-connexion')" class="btn btn-primary mt-5">{{ t('account.signIn.submit') }}</NuxtLink>
      </div>
      <p v-else-if="!token" role="alert" class="mt-8 rounded-lg border border-alert/40 bg-alert/10 px-4 py-3 text-sm">{{ t('account.err.invalid_token') }}</p>
      <form v-else class="panel mt-8 space-y-5 p-6" @submit.prevent="submit">
        <div>
          <label for="rp-pw" class="field-label">{{ t('account.newPassword') }}</label>
          <PasswordInput id="rp-pw" v-model="password" autocomplete="new-password" />
        </div>
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <button type="submit" class="btn btn-primary w-full" :disabled="busy">
          <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.reset.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>
