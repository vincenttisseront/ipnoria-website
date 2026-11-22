<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const errorText = useAccountError()
useSeoMeta({ title: () => t('account.forgot.title'), robots: 'noindex' })
const email = ref('')
const busy = ref(false)
const sent = ref(false)
const error = ref('')
async function submit() {
  busy.value = true; error.value = ''
  try {
    await $fetch('/api/account/password/forgot', { method: 'POST', body: { email: email.value, locale: locale.value } })
    sent.value = true
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="wrap py-16 md:py-20">
    <div class="mx-auto max-w-md">
      <h1 class="text-h2">{{ t('account.forgot.title') }}</h1>
      <p class="mt-3 text-muted">{{ t('account.forgot.lead') }}</p>
      <div v-if="sent" role="status" class="panel mt-8 p-6">
        <p class="font-medium">{{ t('account.forgot.sent') }}</p>
        <p class="mt-2 text-sm text-muted">{{ t('account.forgot.sentText') }}</p>
      </div>
      <form v-else class="panel mt-8 space-y-5 p-6" @submit.prevent="submit">
        <div>
          <label for="fp-email" class="field-label">{{ t('account.email') }}</label>
          <input id="fp-email" v-model="email" type="email" class="field" autocomplete="email" inputmode="email" maxlength="254" required>
        </div>
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <button type="submit" class="btn btn-primary w-full" :disabled="busy">
          <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.forgot.submit') }}
        </button>
      </form>
      <p class="mt-6 text-center text-sm"><NuxtLink :to="localePath('compte-connexion')" class="link">{{ t('account.forgot.back') }}</NuxtLink></p>
    </div>
  </div>
</template>
