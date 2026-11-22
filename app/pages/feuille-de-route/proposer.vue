<script setup lang="ts">
import { ideaSchema } from '#shared/account'
import type { IdeaStatus } from '#shared/account'

// Proposer une idée : les idées proches s'affichent pendant la saisie du titre, pour voter plutôt que dupliquer.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const errorText = useAccountError()
definePageMeta({ middleware: 'account' })
const { state } = useAccount()
useSeoMeta({ title: () => t('ideas.proposeTitle'), robots: 'noindex' })
const user = computed(() => state.value?.user)
const form = reactive({ title: '', body: '', locale: locale.value as 'fr' | 'en' })
const invalid = ref<string[]>([])
const busy = ref(false)
const error = ref('')
type Similar = { id: string, title: Record<string, string>, status: IdeaStatus, votes: number }
const similar = ref<Similar[]>([])
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => form.title, (v) => {
  clearTimeout(timer)
  timer = setTimeout(async () => { similar.value = v.trim().length >= 6 ? await $fetch<Similar[]>('/api/ideas/similar', { query: { q: v } }).catch(() => []) : [] }, 300)
})
const pick = (o: Record<string, string>) => o?.[locale.value] || o?.[locale.value === 'fr' ? 'en' : 'fr'] || ''
async function submit() {
  error.value = ''
  const p = ideaSchema.safeParse(form)
  invalid.value = p.success ? [] : [...new Set(p.error.issues.map(i => String(i.path[0])))]
  if (!p.success) { await nextTick(); document.getElementById(`ip-${invalid.value[0]}`)?.focus(); return }
  busy.value = true
  try {
    const r = await $fetch<{ id: string }>('/api/ideas', { method: 'POST', body: p.data })
    await navigateTo(localePath({ name: 'feuille-de-route-id', params: { id: r.id } }))
  }
  catch (err) { error.value = errorText(err) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="wrap py-14 md:py-20">
    <NuxtLink :to="localePath('feuille-de-route')" class="text-sm text-muted no-underline hover:text-fg">{{ t('ideas.back') }}</NuxtLink>
    <h1 class="mt-6 text-h2">{{ t('ideas.proposeTitle') }}</h1>
    <p class="measure mt-4 text-lg text-muted">{{ t('ideas.proposeLead') }}</p>

    <p v-if="user && !user.emailVerified" role="alert" class="mt-8 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
      {{ t('account.err.unverified') }} <NuxtLink :to="localePath('compte')" class="link">{{ t('account.verify.go') }}</NuxtLink>
    </p>

    <div class="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
      <form class="space-y-5" novalidate @submit.prevent="submit">
        <div>
          <label for="ip-title" class="field-label">{{ t('ideas.form.title') }}</label>
          <input id="ip-title" v-model="form.title" class="field" maxlength="120" required :aria-invalid="invalid.includes('title')" aria-describedby="ip-title-hint">
          <p id="ip-title-hint" class="mt-1.5 text-sm" :class="invalid.includes('title') ? 'text-alert' : 'text-muted'">{{ t('ideas.form.titleHint') }}</p>
        </div>
        <div>
          <label for="ip-body" class="field-label">{{ t('ideas.form.body') }}</label>
          <textarea id="ip-body" v-model="form.body" class="field min-h-48" maxlength="4000" required :aria-invalid="invalid.includes('body')" aria-describedby="ip-body-hint" />
          <p id="ip-body-hint" class="mt-1.5 text-sm" :class="invalid.includes('body') ? 'text-alert' : 'text-muted'">{{ t('ideas.form.bodyHint', { n: form.body.trim().length }) }}</p>
        </div>
        <div>
          <label for="ip-locale" class="field-label">{{ t('ideas.form.language') }}</label>
          <select id="ip-locale" v-model="form.locale" class="field !w-auto"><option value="fr">Français</option><option value="en">English</option></select>
        </div>
        <p v-if="error" role="alert" class="field-error">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="busy || !user?.emailVerified">
          <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />{{ t('ideas.form.submit') }}
        </button>
      </form>
      <aside aria-live="polite">
        <template v-if="similar.length">
          <h2 class="text-sm font-semibold">{{ t('ideas.similar') }}</h2>
          <ul class="mt-3 space-y-2">
            <li v-for="s in similar" :key="s.id">
              <NuxtLink :to="localePath({ name: 'feuille-de-route-id', params: { id: s.id } })" class="flex items-start justify-between gap-3 rounded-lg border border-line p-3 no-underline hover:border-accent/60" target="_blank">
                <span class="text-sm text-fg">{{ pick(s.title) }}</span>
                <span class="shrink-0 font-mono text-sm text-muted">{{ s.votes }}</span>
              </NuxtLink>
            </li>
          </ul>
          <p class="mt-3 text-sm text-muted">{{ t('ideas.similarHint') }}</p>
        </template>
      </aside>
    </div>
  </div>
</template>
