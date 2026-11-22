<script setup lang="ts">
import { githubLinks } from '#shared/links'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const menu = ref<HTMLDetailsElement | null>(null)
// Le menu mobile se referme après chaque navigation
watch(() => route.fullPath, () => { if (menu.value) menu.value.open = false })

// La barre devient opaque dès qu'on a fait défiler la page
const scrolled = ref(false)
const onScroll = () => { scrolled.value = window.scrollY > 8 }
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const items = computed(() => [
  { to: localePath('documentation'), label: t('nav.docs'), hash: false },
  { to: localePath('guides'), label: t('nav.guides'), hash: false },
  { to: localePath('outils'), label: t('nav.tools'), hash: false },
  { to: localePath('feuille-de-route'), label: t('nav.roadmap'), hash: false },
  { to: localePath('contact'), label: t('nav.contact'), hash: false },
])
const searchOpen = useState('search-open', () => false)
const isMac = ref(false)
onMounted(() => { isMac.value = /Mac|iPhone|iPad/.test(navigator.platform) })
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b transition-colors duration-200"
    :class="scrolled ? 'border-line bg-bg/80 backdrop-blur-xl' : 'border-transparent bg-transparent'"
  >
    <div class="wrap flex h-16 items-center justify-between gap-6">
      <NuxtLink :to="localePath('/')" class="flex items-center gap-2.5 text-fg no-underline">
        <BrandMark />
        <span class="text-[1.05rem] font-semibold tracking-tight">Ipnoria</span>
      </NuxtLink>

      <nav :aria-label="t('nav.menu')" class="hidden items-center gap-0.5 lg:flex">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="rounded-lg px-3 py-2 text-[0.925rem] text-muted no-underline transition-colors hover:text-fg"
          :active-class="item.hash ? '' : '!text-fg'"
          :exact-active-class="item.hash ? '' : '!text-fg'"
        >{{ item.label }}</NuxtLink>
        <button
          type="button"
          class="ml-2 flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
          :aria-label="t('search.open')"
          aria-keyshortcuts="Control+K Meta+K"
          @click="searchOpen = true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <kbd class="font-mono text-[0.7rem]">{{ isMac ? '⌘K' : 'Ctrl K' }}</kbd>
        </button>
        <span class="mx-2 h-5 w-px bg-line" aria-hidden="true" />
        <ThemeSwitcher />
        <LangSwitcher />
        <a :href="githubLinks.repo" class="btn btn-secondary ml-2 !min-h-9 !px-3 !py-1.5" rel="noopener">
          <AppIcon name="github" :size="16" />{{ t('nav.github') }}
        </a>
      </nav>

      <div class="flex items-center gap-2 lg:hidden">
      <button type="button" class="btn btn-secondary !px-3" :aria-label="t('search.open')" @click="searchOpen = true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </button>
      <details ref="menu" class="relative">
        <summary class="btn btn-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <AppIcon name="menu" /><span class="sr-only">{{ t('nav.menu') }}</span>
        </summary>
        <nav
          :aria-label="t('nav.menu')"
          class="panel absolute right-0 top-[calc(100%+0.5rem)] flex w-64 flex-col gap-0.5 p-2 shadow-2xl shadow-black/60"
        >
          <NuxtLink
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            class="rounded-lg px-3 py-2.5 text-fg no-underline hover:bg-raised"
          >{{ item.label }}</NuxtLink>
          <a :href="githubLinks.repo" class="flex items-center gap-2 rounded-lg px-3 py-2.5 text-fg no-underline hover:bg-raised" rel="noopener">
            <AppIcon name="github" :size="16" />{{ t('nav.github') }}
          </a>
          <div class="mt-1 flex items-center justify-between border-t border-line px-1 pt-2"><LangSwitcher /><ThemeSwitcher /></div>
        </nav>
      </details>
      </div>
    </div>
  </header>
</template>
