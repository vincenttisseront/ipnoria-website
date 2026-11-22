<script setup lang="ts">
import type { NuxtError } from '#app'

// Pages d'erreur du site : un message par code, ce qu'il faut faire ensuite, et l'équivalent DNS du code
// (le public du site lit les codes de réponse DNS plus volontiers que les codes HTTP).
const props = defineProps<{ error: NuxtError }>()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const searchOpen = useState('search-open', () => false)

const KNOWN = [400, 401, 403, 404, 405, 410, 429, 500, 502, 503, 504] as const
const DNS: Record<number, string> = { 400: 'FORMERR', 401: 'NOTAUTH', 403: 'REFUSED', 404: 'NXDOMAIN', 405: 'NOTIMP', 410: 'NXDOMAIN', 429: 'REFUSED', 500: 'SERVFAIL', 502: 'SERVFAIL', 503: 'SERVFAIL', 504: 'SERVFAIL' }

const code = computed(() => Number(props.error.statusCode) || 500)
const key = computed(() => (KNOWN as readonly number[]).includes(code.value) ? String(code.value) : code.value >= 500 ? '500' : '400')
const isServer = computed(() => code.value >= 500)
const retryable = computed(() => isServer.value || code.value === 429)
const rcode = computed(() => DNS[code.value] ?? (isServer.value ? 'SERVFAIL' : 'FORMERR'))
const host = (() => { try { return new URL(useRuntimeConfig().public.siteUrl).host } catch { return useRequestURL().host } })()
const path = computed(() => route.fullPath.length > 80 ? route.fullPath.slice(0, 79) + '…' : route.fullPath)

useSeoMeta({ title: () => t(`error.code.${key.value}.title`), robots: 'noindex' })

// 404 : pages proches de l'adresse demandée, cherchées avec les mots du chemin
type Hit = { kind: string, title: string, context: string, url: string }
const { data: near } = useAsyncData('error-near', async () => {
  if (code.value !== 404) return []
  const words = decodeURIComponent(route.path).split('/').filter(w => w && w !== 'en').pop()?.replace(/[-_.]+/g, ' ').trim() ?? ''
  if (words.length < 3) return []
  try { return (await $fetch<{ results: Hit[] }>('/api/search', { query: { q: words, locale: locale.value } })).results.slice(0, 4) }
  catch { return [] }
}, { server: false, default: () => [] })

const retrying = ref(false)
function retry() {
  retrying.value = true
  window.location.reload()
}
async function leave(to: string) {
  await clearError({ redirect: to })
}
function openSearch() {
  searchOpen.value = true
}
</script>

<template>
  <NuxtLayout>
    <div class="wrap grid gap-12 py-16 md:py-24 lg:grid-cols-[1fr_26rem] lg:items-start">
      <div class="measure">
        <p class="font-mono text-muted">{{ t('error.label', { code }) }}</p>
        <h1 class="mt-3 text-display">{{ t(`error.code.${key}.title`) }}</h1>
        <p class="mt-5 text-lg text-muted">{{ t(`error.code.${key}.text`) }}</p>

        <div class="mt-8 flex flex-wrap gap-3">
          <button v-if="retryable" type="button" class="btn btn-primary" :disabled="retrying" @click="retry">
            <span v-if="retrying" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" /><AppIcon v-else name="refresh" :size="16" />{{ t('error.retry') }}
          </button>
          <a v-if="code === 401" href="/auth/login" class="btn btn-primary"><AppIcon name="lock" :size="16" />{{ t('error.login') }}</a>
          <button type="button" class="btn" :class="retryable || code === 401 ? 'btn-secondary' : 'btn-primary'" @click="leave(localePath('/'))">
            <AppIcon name="home" :size="16" />{{ t('error.back') }}
          </button>
          <button v-if="!isServer" type="button" class="btn btn-secondary" @click="openSearch">
            <AppIcon name="search" :size="16" />{{ t('error.search') }}
          </button>
        </div>

        <section v-if="near?.length" class="mt-12" aria-labelledby="near-title">
          <h2 id="near-title" class="text-lg font-semibold tracking-tight">{{ t('error.near') }}</h2>
          <ul class="mt-4 divide-y divide-line border-y border-line">
            <li v-for="h in near" :key="h.url">
              <NuxtLink :to="h.url" class="flex items-baseline justify-between gap-4 py-3 no-underline hover:text-accent" @click="clearError()">
                <span class="font-medium">{{ h.title }}</span>
                <span class="shrink-0 text-sm text-muted">{{ t(`search.kind.${h.kind}`) }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <p class="mt-10 text-sm text-muted">
          {{ isServer ? t('error.persist') : t('error.report') }}
          <NuxtLink :to="localePath('contact')" class="link" @click="clearError()">{{ t('error.contact') }}</NuxtLink>
        </p>
      </div>

      <div class="theme-dark overflow-hidden rounded-2xl border border-line-strong bg-code" aria-hidden="true">
        <div class="flex items-center gap-1.5 border-b border-line px-4 py-3">
          <span class="size-2.5 rounded-full bg-tint/15" />
          <span class="size-2.5 rounded-full bg-tint/15" />
          <span class="size-2.5 rounded-full bg-tint/15" />
        </div>
        <pre class="whitespace-pre-wrap break-all p-5 font-mono text-[0.82rem] leading-6 text-fg"><span class="text-muted">$</span> curl -sI https://{{ host }}{{ path }}
<span :class="isServer ? 'text-alert' : 'text-warn'">HTTP/2 {{ code }}</span>
<span class="text-muted">content-type: text/html; charset=utf-8</span>

<span class="text-muted">; {{ t('error.dnsNote') }}</span> <span :class="isServer ? 'text-alert' : 'text-warn'">{{ rcode }}</span>
</pre>
      </div>
    </div>
  </NuxtLayout>
</template>
