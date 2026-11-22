<script setup lang="ts">
// Visite de la console dans une fenêtre de navigateur : onglets ARIA, captures réelles (WebP + PNG de repli).
const { t } = useI18n()

const shots = [
  { key: 'ipam', file: 'console-ipam-adresses', w: 1440, h: 830, path: 'ipam/adresses', dark: false },
  { key: 'dns', file: 'console-dns-enregistrements', w: 1440, h: 640, path: 'dns/zones', dark: false },
  { key: 'dhcp', file: 'console-dhcp-reservations', w: 1440, h: 385, path: 'dhcp/reservations', dark: false },
  { key: 'radius', file: 'console-radius-regles', w: 1210, h: 409, path: 'radius/regles', dark: false },
  { key: 'tree', file: 'console-ipam-reseaux-sombre', w: 1440, h: 445, path: 'ipam/reseaux', dark: true },
] as const

const active = ref(0)
const tabs = ref<HTMLButtonElement[]>([])
const current = computed(() => shots[active.value]!)

function onKey(e: KeyboardEvent) {
  const last = shots.length - 1
  const map: Record<string, number> = {
    ArrowRight: active.value === last ? 0 : active.value + 1,
    ArrowLeft: active.value === 0 ? last : active.value - 1,
    Home: 0,
    End: last,
  }
  if (!(e.key in map)) return
  e.preventDefault()
  active.value = map[e.key]!
  tabs.value[active.value]?.focus()
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_40px_120px_-40px_rgb(91_140_255/0.45)]">
    <!-- barre de fenêtre -->
    <div class="flex items-center gap-4 border-b border-line bg-raised/60 px-4 py-2.5">
      <span class="flex gap-1.5" aria-hidden="true">
        <span class="size-2.5 rounded-full bg-tint/15" />
        <span class="size-2.5 rounded-full bg-tint/15" />
        <span class="size-2.5 rounded-full bg-tint/15" />
      </span>
      <span class="hidden flex-1 truncate rounded-md bg-bg/70 px-3 py-1 text-center font-mono text-[0.75rem] text-muted sm:block" aria-hidden="true">
        https://ddi.exemple.lan/{{ current.path }}
      </span>
    </div>

    <div
      role="tablist"
      :aria-label="t('gallery.label')"
      class="flex gap-1 overflow-x-auto border-b border-line px-2 py-2"
      @keydown="onKey"
    >
      <button
        v-for="(s, i) in shots"
        :id="`tab-${s.key}`"
        :key="s.key"
        ref="tabs"
        role="tab"
        type="button"
        :aria-selected="i === active"
        :aria-controls="`panel-${s.key}`"
        :tabindex="i === active ? 0 : -1"
        class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        :class="i === active ? 'bg-raised text-fg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]' : 'text-muted hover:text-fg'"
        @click="active = i"
      >{{ t(`gallery.tabs.${s.key}`) }}</button>
    </div>

    <figure :id="`panel-${current.key}`" role="tabpanel" :aria-labelledby="`tab-${current.key}`">
      <div class="aspect-[1440/830] overflow-hidden" :class="current.dark ? 'bg-[#0b0f17]' : 'bg-[#f6f7f9]'">
        <picture :key="current.key">
          <source :srcset="`/img/${current.file}.webp`" type="image/webp">
          <img
            :src="`/img/${current.file}.png`"
            :width="current.w"
            :height="current.h"
            :alt="t(`gallery.captions.${current.key}`)"
            class="shot h-auto w-full"
            :fetchpriority="active === 0 ? 'high' : 'auto'"
            decoding="async"
          >
        </picture>
      </div>
      <figcaption class="border-t border-line px-5 py-3 text-sm text-muted">{{ t(`gallery.captions.${current.key}`) }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.shot { animation: shot-in 280ms ease-out; }
@keyframes shot-in { from { opacity: 0; } to { opacity: 1; } }
</style>
