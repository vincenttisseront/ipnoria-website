<script setup lang="ts">
import { BETA_AGREEMENT, BETA_AGREEMENT_VERSION } from '#shared/beta'

definePageMeta({ middleware: 'account' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const errorText = useAccountError()
useSeoMeta({ title: () => t('beta.agreement.title'), robots: 'noindex' })
const { data } = await useFetch<{ state: { application: { status: string } | null, agreementAccepted: boolean } | null }>('/api/beta/status')
const sections = computed(() => BETA_AGREEMENT[locale.value === 'en' ? 'en' : 'fr'])
const agree = ref(false)
const busy = ref(false)
const error = ref('')
async function accept() {
  busy.value = true; error.value = ''
  try { await $fetch('/api/beta/agreement', { method: 'POST' }); await navigateTo(localePath('beta-espace')) }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="wrap py-14 md:py-20">
    <NuxtLink :to="localePath('beta')" class="text-sm text-muted no-underline hover:text-fg">{{ t('beta.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ t('beta.agreement.title') }}</h1>
    <p class="mt-3 text-sm text-muted">{{ t('beta.agreement.version', { v: BETA_AGREEMENT_VERSION }) }}</p>
    <ol class="measure mt-10 space-y-6">
      <li v-for="(s, i) in sections" :key="i">
        <h2 class="font-semibold">{{ i + 1 }}. {{ s.title }}</h2>
        <p class="mt-1.5 text-muted">{{ s.text }}</p>
      </li>
    </ol>
    <div class="mt-12 max-w-2xl">
      <p v-if="data?.state?.agreementAccepted" role="status" class="rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm">
        {{ t('beta.agreement.done') }} <NuxtLink :to="localePath('beta-espace')" class="link">{{ t('beta.openSpace') }}</NuxtLink>
      </p>
      <p v-else-if="data?.state?.application?.status !== 'accepted'" class="text-muted">{{ t('beta.agreement.notYet') }}</p>
      <form v-else class="panel space-y-4 p-6" @submit.prevent="accept">
        <label class="flex items-start gap-3"><input v-model="agree" type="checkbox" class="mt-1 size-5 shrink-0 accent-[#5b8cff]" required><span>{{ t('beta.agreement.check') }}</span></label>
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="!agree || busy">
          <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('beta.agreement.accept') }}
        </button>
      </form>
    </div>
  </div>
</template>
