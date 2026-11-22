<script setup lang="ts">
import { registerSchema } from '#shared/account'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { state, ensure, refresh } = useAccount()
const errorText = useAccountError()
await ensure()
if (state.value && !state.value.enabled) throw createError({ statusCode: 404, fatal: true })
if (state.value?.user) await navigateTo(localePath('compte'), { replace: true })
useSeoMeta({ title: () => t('account.signUp.title'), robots: 'noindex' })

const form = reactive({ displayName: '', email: '', password: '', consent: false, website: '' })
const startedAt = ref(0)
const pow = usePow()
onMounted(() => { startedAt.value = Date.now(); pow.prepare() })
const invalid = ref<string[]>([])
const busy = ref(false)
const error = ref('')
const errorBox = ref<HTMLElement>()
const has = (f: string) => invalid.value.includes(f)

async function submit() {
  error.value = ''
  const body = { ...form, locale: locale.value, startedAt: startedAt.value || Date.now() - 10_000 }
  const parsed = registerSchema.safeParse(body)
  invalid.value = parsed.success ? [] : [...new Set(parsed.error.issues.map(i => String(i.path[0])))]
  if (invalid.value.length) { await nextTick(); document.getElementById(`su-${invalid.value[0]}`)?.focus(); return }
  busy.value = true
  try {
    await $fetch('/api/account/register', { method: 'POST', body: { ...body, pow: await pow.get() } })
    await refresh()
    const next = route.query.next
    await navigateTo(typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : { path: localePath('compte'), query: { bienvenue: '1' } })
  }
  catch (err) {
    const code = apiErrorCode(err)
    if (code.startsWith('password_')) invalid.value = ['password']
    error.value = errorText(err)
    pow.prepare()
    await nextTick(); errorBox.value?.focus()
  }
  finally { busy.value = false }
}
const githubHref = computed(() => `/api/account/github/start?locale=${locale.value}`)
</script>

<template>
  <div class="wrap py-16 md:py-20">
    <div class="mx-auto max-w-md">
      <h1 class="text-h2">{{ t('account.signUp.title') }}</h1>
      <p class="mt-3 text-muted">{{ t('account.signUp.lead') }}</p>
      <p v-if="error" ref="errorBox" role="alert" tabindex="-1" class="mt-6 rounded-lg border border-alert/40 bg-alert/10 px-4 py-3 text-sm">{{ error }}</p>

      <form class="panel mt-8 space-y-5 p-6" novalidate @submit.prevent="submit">
        <div>
          <label for="su-displayName" class="field-label">{{ t('account.displayName') }}</label>
          <input id="su-displayName" v-model="form.displayName" class="field" autocomplete="name" maxlength="60" required :aria-invalid="has('displayName')" aria-describedby="su-dn-hint">
          <p id="su-dn-hint" class="mt-1.5 text-sm" :class="has('displayName') ? 'text-alert' : 'text-muted'">{{ t('account.displayNameHint') }}</p>
        </div>
        <div>
          <label for="su-email" class="field-label">{{ t('account.email') }}</label>
          <input id="su-email" v-model="form.email" type="email" class="field" autocomplete="email" inputmode="email" maxlength="254" required :aria-invalid="has('email')" :aria-describedby="has('email') ? 'su-email-err' : undefined">
          <p v-if="has('email')" id="su-email-err" class="field-error">{{ t('account.err.email') }}</p>
        </div>
        <div>
          <label for="su-password" class="field-label">{{ t('account.password') }}</label>
          <PasswordInput id="su-password" v-model="form.password" autocomplete="new-password" :invalid="has('password')" />
        </div>
        <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true"><input v-model="form.website" type="text" tabindex="-1" autocomplete="off"></div>
        <div>
          <div class="flex items-start gap-3">
            <input id="su-consent" v-model="form.consent" type="checkbox" class="mt-1 size-5 shrink-0 accent-[#5b8cff]" required :aria-invalid="has('consent')">
            <label for="su-consent" class="text-sm">
              {{ t('account.signUp.consent') }}
              <NuxtLink :to="localePath('confidentialite')" class="link">{{ t('contact.consentLink') }}</NuxtLink>
            </label>
          </div>
          <p v-if="has('consent')" class="field-error">{{ t('account.err.consent') }}</p>
        </div>
        <button type="submit" class="btn btn-primary w-full" :disabled="busy" data-umami-event="signup">
          <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('account.signUp.submit') }}
        </button>
        <a v-if="state?.github" :href="githubHref" class="btn btn-secondary w-full"><AppIcon name="github" :size="16" />{{ t('account.signIn.github.button') }}</a>
      </form>
      <p class="mt-6 text-center text-sm text-muted">
        {{ t('account.signUp.haveAccount') }}
        <NuxtLink :to="localePath('compte-connexion')" class="link">{{ t('account.signUp.signIn') }}</NuxtLink>
      </p>
    </div>
  </div>
</template>
