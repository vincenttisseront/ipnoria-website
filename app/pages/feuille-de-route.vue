<script setup lang="ts">
import { voteSchema } from '#shared/forms'

const { t, locale } = useI18n()
const route = useRoute()
useSeoMeta({ title: () => t('roadmap.title'), description: () => t('roadmap.lead') })

interface Item { id: string, status: string, title: { fr: string, en: string }, text: { fr: string, en: string }, votes: number }
const { data } = await useFetch<{ votingOpen: boolean, items: Item[] }>('/api/roadmap')
const lang = computed(() => (locale.value === 'en' ? 'en' : 'fr') as 'fr' | 'en')
const banner = computed(() => (route.query.vote === 'confirme' ? 'confirmed' : route.query.vote === 'invalide' ? 'invalid' : ''))
const max = computed(() => Math.max(1, ...(data.value?.items.map(i => i.votes) ?? [1])))

// Fenêtre de vote (custom, jamais une boîte système)
const voting = ref<Item | null>(null)
const email = ref('')
const consent = ref(false)
const website = ref('')
const startedAt = ref(0)
const status = ref<'idle' | 'sending' | 'sent' | 'error' | 'rate'>('idle')
const invalid = ref<Set<string>>(new Set())
const emailInput = ref<HTMLInputElement | null>(null)
let opener: HTMLElement | null = null

async function openVote(item: Item, e: Event) {
  opener = e.currentTarget as HTMLElement
  voting.value = item
  status.value = 'idle'
  invalid.value = new Set()
  startedAt.value = Date.now()
  await nextTick()
  emailInput.value?.focus()
}
function close() { voting.value = null; opener?.focus() }

async function submit() {
  if (!voting.value) return
  const body = { item: voting.value.id, email: email.value, consent: consent.value, website: website.value, locale: lang.value, startedAt: startedAt.value }
  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) { invalid.value = new Set(parsed.error.issues.map(i => String(i.path[0]))); return }
  status.value = 'sending'
  try { await $fetch('/api/roadmap/vote', { method: 'POST', body }); status.value = 'sent' }
  catch (e: unknown) { status.value = (e as { statusCode?: number }).statusCode === 429 ? 'rate' : 'error' }
}
</script>

<template>
  <div class="wrap max-w-4xl pt-14">
    <h1 class="text-display">{{ t('roadmap.title') }}</h1>
    <p class="measure mt-5 text-lg text-muted">{{ t('roadmap.lead') }}</p>

    <p v-if="banner" role="status" class="mt-8 rounded-xl border px-4 py-3" :class="banner === 'confirmed' ? 'border-ok/40 bg-ok/10' : 'border-warn/40 bg-warn/10'">
      {{ t(`roadmap.banner.${banner}`) }}
    </p>
    <p v-if="data && !data.votingOpen" class="mt-8 rounded-xl border border-line bg-raised/50 px-4 py-3 text-sm text-muted">{{ t('roadmap.closed') }}</p>

    <ol v-if="data" class="mt-10 space-y-3">
      <li v-for="item in data.items" :id="item.id" :key="item.id" class="panel flex scroll-mt-24 flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div class="min-w-0 flex-1">
          <h2 class="font-semibold tracking-tight">{{ item.title[lang] }}</h2>
          <p class="mt-1 text-[0.95rem] text-muted">{{ item.text[lang] }}</p>
          <div class="mt-3 h-1 overflow-hidden rounded-full bg-raised" aria-hidden="true">
            <div class="h-full rounded-full bg-accent" :style="{ width: `${(item.votes / max) * 100}%` }" />
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-4">
          <span class="font-mono text-lg" :aria-label="t('roadmap.votes', { n: item.votes })">{{ item.votes }}</span>
          <button type="button" class="btn btn-secondary" :disabled="!data.votingOpen" @click="openVote(item, $event)">{{ t('roadmap.vote') }}</button>
        </div>
      </li>
    </ol>
    <p class="mt-8 text-sm text-muted">{{ t('roadmap.footnote') }}</p>

    <Teleport to="body">
      <div v-if="voting" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @mousedown.self="close" @keydown.esc="close">
        <div role="dialog" aria-modal="true" aria-labelledby="vote-title" class="panel w-full max-w-md p-6 shadow-2xl shadow-black/50">
          <h2 id="vote-title" class="text-lg font-semibold">{{ t('roadmap.dialogTitle', { title: voting.title[lang] }) }}</h2>
          <p v-if="status === 'sent'" role="status" class="mt-4 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3">{{ t('roadmap.sent') }}</p>
          <form v-else class="mt-4 space-y-4" novalidate @submit.prevent="submit">
            <p class="text-sm text-muted">{{ t('roadmap.dialogLead') }}</p>
            <div>
              <label for="vote-email" class="field-label">{{ t('contact.email') }}</label>
              <input id="vote-email" ref="emailInput" v-model="email" type="email" class="field" autocomplete="email" :aria-invalid="invalid.has('email')" :aria-describedby="invalid.has('email') ? 'vote-err' : undefined">
              <p v-if="invalid.has('email')" id="vote-err" class="field-error">{{ t('contact.errors.email') }}</p>
            </div>
            <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true"><input v-model="website" type="text" tabindex="-1" autocomplete="off"></div>
            <label class="flex items-start gap-2.5 text-sm">
              <input v-model="consent" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-[var(--t-accent)]" :aria-invalid="invalid.has('consent')">
              <span class="text-muted">{{ t('roadmap.consent') }}</span>
            </label>
            <p v-if="invalid.has('consent')" class="field-error">{{ t('contact.errors.consent') }}</p>
            <p v-if="status === 'error' || status === 'rate'" role="alert" class="field-error">{{ t(status === 'rate' ? 'contact.errors.rate' : 'newsletter.errors.error') }}</p>
            <div class="flex justify-end gap-3">
              <button type="button" class="btn btn-secondary" @click="close">{{ t('roadmap.cancel') }}</button>
              <button type="submit" class="btn btn-primary" :disabled="status === 'sending'">
                <span v-if="status === 'sending'" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
                {{ t('roadmap.send') }}
              </button>
            </div>
          </form>
          <div v-if="status === 'sent'" class="mt-5 flex justify-end"><button type="button" class="btn btn-secondary" @click="close">{{ t('roadmap.close') }}</button></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
