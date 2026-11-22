<script setup lang="ts">
// Palette de recherche globale : Ctrl+K (ou ⌘K, ou « / »), flèches pour naviguer, Entrée pour ouvrir, Échap pour fermer.
interface Hit { kind: string, title: string, context: string, url: string, snippet: string }

const { t, locale } = useI18n()
const open = useState('search-open', () => false)
const q = ref('')
const hits = ref<Hit[]>([])
const active = ref(0)
const loading = ref(false)
const input = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)
let lastFocus: HTMLElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

function onGlobalKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open.value = !open.value }
  else if (e.key === '/' && !typing && !open.value) { e.preventDefault(); open.value = true }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onGlobalKey); clearTimeout(timer) })

watch(open, async (v) => {
  if (v) {
    lastFocus = document.activeElement as HTMLElement | null
    await nextTick()
    input.value?.focus()
    input.value?.select()
  }
  else {
    lastFocus?.focus?.()
  }
})

watch(q, (value) => {
  clearTimeout(timer)
  if (value.trim().length < 2) { hits.value = []; loading.value = false; return }
  loading.value = true
  timer = setTimeout(async () => {
    const mine = ++seq
    try {
      const r = await $fetch<{ results: Hit[] }>('/api/search', { query: { q: value, locale: locale.value } })
      if (mine === seq) { hits.value = r.results; active.value = 0 }
    }
    catch { if (mine === seq) hits.value = [] }
    finally { if (mine === seq) loading.value = false }
  }, 160)
})

async function go(hit: Hit | undefined) {
  if (!hit) return
  open.value = false
  q.value = ''
  hits.value = []
  await navigateTo(hit.url)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.preventDefault(); open.value = false }
  else if (e.key === 'ArrowDown') { e.preventDefault(); active.value = Math.min(hits.value.length - 1, active.value + 1); scrollActive() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active.value = Math.max(0, active.value - 1); scrollActive() }
  else if (e.key === 'Enter') { e.preventDefault(); go(hits.value[active.value]) }
  else if (e.key === 'Tab') { e.preventDefault() } // le focus reste dans la palette
}
function scrollActive() {
  nextTick(() => list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }))
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" @mousedown.self="open = false">
      <div role="dialog" aria-modal="true" :aria-label="t('search.title')" class="panel w-full max-w-2xl overflow-hidden shadow-2xl shadow-black/50" @keydown="onKey">
        <div class="flex items-center gap-3 border-b border-line px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" class="shrink-0 text-muted" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            ref="input" v-model="q" type="text" role="combobox" aria-expanded="true" aria-controls="search-results"
            :aria-activedescendant="hits.length ? `search-hit-${active}` : undefined" aria-autocomplete="list"
            class="h-14 flex-1 bg-transparent text-[1.05rem] text-fg outline-none placeholder:text-muted" :placeholder="t('search.placeholder')" autocomplete="off" spellcheck="false"
          >
          <span v-if="loading" class="size-4 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
          <kbd class="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[0.7rem] text-muted sm:inline">Esc</kbd>
        </div>

        <ul v-if="hits.length" id="search-results" ref="list" role="listbox" class="max-h-[55vh] overflow-y-auto p-2">
          <li
            v-for="(h, i) in hits" :id="`search-hit-${i}`" :key="h.url + i" role="option" :aria-selected="i === active"
            class="cursor-pointer rounded-lg px-3 py-2.5" :class="i === active ? 'bg-raised' : ''"
            @mousemove="active = i" @click="go(h)"
          >
            <span class="flex items-baseline justify-between gap-3">
              <span class="truncate font-medium text-fg">{{ h.title }}</span>
              <span class="shrink-0 text-[0.75rem] text-muted">{{ t(`search.kind.${h.kind}`) }}</span>
            </span>
            <span v-if="h.context && h.context !== h.title" class="block truncate text-[0.8rem] text-accent">{{ h.context }}</span>
            <span v-if="h.snippet" class="mt-0.5 line-clamp-2 block text-sm text-muted">{{ h.snippet }}</span>
          </li>
        </ul>
        <p v-else-if="q.trim().length >= 2 && !loading" class="px-5 py-8 text-center text-muted" role="status">{{ t('search.empty') }}</p>
        <p v-else class="px-5 py-6 text-sm text-muted">{{ t('search.hint') }}</p>
        <p class="sr-only" aria-live="polite">{{ hits.length ? t('docs.searchCount', { n: hits.length }) : '' }}</p>
      </div>
    </div>
  </Teleport>
</template>
