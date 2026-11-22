<script setup lang="ts">
// Démonstration du principe « une seule source de vérité » : un /24 fictif dont on alloue une adresse libre.
// Données générées par un aléa à graine fixe, identiques côté serveur et navigateur (pas d'écart d'hydratation).
type CellState = 'network' | 'broadcast' | 'gateway' | 'used' | 'free' | 'new'
interface Cell { i: number, ip: string, state: CellState, host: string, mac: string }

const { t } = useI18n()
const PREFIX = '10.20.4.'
const COLS = 16

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hostFor(i: number): string {
  const n = String(i).padStart(3, '0')
  if (i < 20) return `srv-${n}`
  if (i < 32) return `sw-${n}`
  if (i < 48) return `ap-${n}`
  if (i < 60) return `imp-${n}`
  return `pc-${n}`
}

// MAC fictive, administrée localement (02:…), dérivée de l'index
function macFor(i: number): string {
  const rnd = mulberry32(i * 7919)
  const bytes = [0x02, 0x5e, ...Array.from({ length: 4 }, () => Math.floor(rnd() * 256))]
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(':')
}

function initialCells(): Cell[] {
  const rnd = mulberry32(2404)
  return Array.from({ length: 256 }, (_, i) => {
    let state: CellState
    if (i === 0) state = 'network'
    else if (i === 255) state = 'broadcast'
    else if (i === 1) state = 'gateway'
    else state = rnd() < (i < 60 ? 0.8 : 0.45) ? 'used' : 'free'
    return { i, ip: PREFIX + i, state, host: state === 'used' ? hostFor(i) : '', mac: macFor(i) }
  })
}

const cells = ref<Cell[]>(initialCells())
const picked = ref<Cell | null>(null)
const focusIndex = ref(cells.value.findIndex(c => c.state === 'free'))
const buttons = ref<HTMLButtonElement[]>([])

const usedCount = computed(() => cells.value.filter(c => c.state === 'used' || c.state === 'new' || c.state === 'gateway').length)

function label(c: Cell): string {
  const state = {
    network: t('demo.stateNetwork'),
    broadcast: t('demo.stateBroadcast'),
    gateway: t('demo.stateGateway'),
    free: t('demo.stateFree'),
    used: t('demo.stateUsed', { host: c.host }),
    new: t('demo.stateUsed', { host: c.host }),
  }[c.state]
  return t('demo.cellLabel', { ip: c.ip, state })
}

function allocate(c: Cell) {
  focusIndex.value = c.i
  if (c.state !== 'free') return
  c.state = 'new'
  c.host = `poste-${String(c.i).padStart(3, '0')}`
  picked.value = { ...c }
}

function reset() {
  cells.value = initialCells()
  picked.value = null
}

function onKey(e: KeyboardEvent) {
  const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }
  let next = focusIndex.value
  if (e.key in moves) next += moves[e.key]!
  else if (e.key === 'Home') next -= next % COLS
  else if (e.key === 'End') next += COLS - 1 - (next % COLS)
  else return
  e.preventDefault()
  next = Math.min(255, Math.max(0, next))
  focusIndex.value = next
  buttons.value[next]?.focus()
}

const cellClass: Record<CellState, string> = {
  network: 'bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.12)_0_1.5px,transparent_1.5px_4px)] cursor-not-allowed',
  broadcast: 'bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.12)_0_1.5px,transparent_1.5px_4px)] cursor-not-allowed',
  gateway: 'bg-warn cursor-not-allowed',
  used: 'bg-accent/70 cursor-not-allowed',
  free: 'bg-tint/[0.04] ring-1 ring-inset ring-tint/10 hover:bg-tint/15 hover:ring-tint/40 cursor-pointer',
  new: 'bg-ok shadow-[0_0_12px_2px_rgb(61_214_163/0.55)] cell-new',
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p class="font-mono text-[0.85rem] text-fg">{{ t('demo.title') }}</p>
      <p class="text-[0.8rem] text-muted">{{ t('demo.used', { n: usedCount }) }}</p>
    </div>

    <div
      role="group"
      :aria-label="t('demo.gridLabel')"
      class="mt-3 grid grid-cols-16 gap-[3px]"
      @keydown="onKey"
    >
      <button
        v-for="c in cells"
        :key="c.i"
        ref="buttons"
        type="button"
        class="aspect-square rounded-[3px] transition-colors"
        :class="cellClass[c.state]"
        :tabindex="c.i === focusIndex ? 0 : -1"
        :aria-label="label(c)"
        :aria-disabled="c.state !== 'free'"
        :title="label(c)"
        @click="allocate(c)"
        @focus="focusIndex = c.i"
      />
    </div>

    <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-muted">
      <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-accent/70" aria-hidden="true" />{{ t('demo.legendUsed') }}</li>
      <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-tint/[0.04] ring-1 ring-inset ring-tint/15" aria-hidden="true" />{{ t('demo.legendFree') }}</li>
      <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-warn" aria-hidden="true" />{{ t('demo.legendGateway') }}</li>
      <li class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-ok" aria-hidden="true" />{{ t('demo.legendNew') }}</li>
    </ul>

    <div aria-live="polite">
      <div v-if="picked" :key="picked.i" class="mt-4 rounded-xl border border-line bg-bg/60 p-4">
        <p class="text-sm font-medium">{{ t('demo.picked', { ip: picked.ip }) }}</p>
        <dl class="mt-2.5 grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-1.5 text-[0.85rem]">
          <template
v-for="(row, n) in [
            { k: t('demo.recIpam'), v: t('demo.recIpamValue', { ip: picked.ip, host: picked.host }) },
            { k: t('demo.recDns'), v: t('demo.recDnsValue', { ip: picked.ip, host: picked.host }) },
            { k: t('demo.recDhcp'), v: t('demo.recDhcpValue', { mac: picked.mac }) },
          ]" :key="row.k">
            <dt class="record flex items-center gap-1.5 font-medium text-ok" :style="{ animationDelay: `${n * 140}ms` }">
              <AppIcon name="check" :size="13" />{{ row.k }}
            </dt>
            <dd class="record min-w-0 break-words font-mono text-[0.8rem] leading-6 text-fg/90" :style="{ animationDelay: `${n * 140}ms` }">{{ row.v }}</dd>
          </template>
        </dl>
        <button type="button" class="link mt-3 text-[0.8rem] text-muted" @click="reset">{{ t('demo.reset') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-cols-16 { grid-template-columns: repeat(16, minmax(0, 1fr)); }
.record { animation: record-in 260ms ease-out both; }
.cell-new { animation: cell-in 420ms ease-out; }
@keyframes record-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}
@keyframes cell-in {
  0% { transform: scale(0.5); }
  60% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
</style>
