<script setup lang="ts">
// Scène 3D (CSS, sans WebGL) : la console cherche la première adresse libre d'une plage, la réserve,
// crée le nom dans la zone directe puis la résolution inverse, et publie les deux zones.
// Joue seulement quand la scène est visible ; pause possible ; état final fixe si l'animation est réduite.
const { t } = useI18n()

// Plan de la scène (pixels « au sol ») et projection
const W = 980
const H = 440 // hauteur visible
const STAGE_H = 560
const SHIFT_X = 41 // recentre l'ensemble plateau + cartes
const SHIFT_Y = -90
const RX = 55 // inclinaison
const RZ = -35 // rotation du plateau
const PITCH = 56
const COLS = 8
const ROWS = 6
const GX = 40 // origine de la grille
const GY = 70
const CUBE_H = 18
const TARGET = 32 // 10.20.20.42

type Kind = 'used' | 'dhcp' | 'free'
const tiles = Array.from({ length: COLS * ROWS }, (_, i) => {
  const used = i < TARGET || [35, 38, 39, 44, 46].includes(i)
  const kind: Kind = !used ? 'free' : i % 7 === 3 ? 'dhcp' : 'used'
  return { i, x: GX + (i % COLS) * PITCH, y: GY + Math.floor(i / COLS) * PITCH, octet: 10 + i, kind }
})

// Cartes de zone : placées à l'écran (relatif au centre de la scène), puis ramenées dans le repère du plateau
// à profondeur égale, pour qu'elles gardent la même taille apparente. Projection orthographique de la scène :
// écran = Rx(RX) · Rz(RZ) · (p - centre).
const CARD_W = 300
const CARD_H = 170
const CX = W / 2
const CY = STAGE_H / 2
const DEPTH = 70
const cos = (d: number) => Math.cos((d * Math.PI) / 180)
const sin = (d: number) => Math.sin((d * Math.PI) / 180)
function planeAt(xs: number, ys: number, depth = DEPTH) {
  const y1 = sin(90 - RX) * ys + sin(RX) * depth
  const z = -sin(RX) * ys + cos(RX) * depth
  const a = -RZ
  return { x: CX + xs * cos(a) - y1 * sin(a), y: CY + xs * sin(a) + y1 * cos(a), z }
}
const fwd = planeAt(300, 10)
const rev = planeAt(300, 215)
const fwdCenter = planeAt(300, 10 - CARD_H * 0.55, DEPTH + 30)
const revCenter = planeAt(300, 215 - CARD_H * 0.55, DEPTH + 30)

// État de la scène
type Phase = 'idle' | 'search' | 'reserve' | 'name' | 'publish'
const phase = ref<Phase>('idle')
const scan = ref(-1)
const allocated = ref(false)
const token = reactive({ on: false, x: 0, y: 0, z: 0, d: 0, s: 1 })
const ptr = reactive({ on: false, x: 0, y: 0, z: 0, d: 0 })
const fwdRow = ref(false)
const revRow = ref(false)
const published = ref(false)

const target = tiles[TARGET]!
function reset() {
  phase.value = 'idle'; scan.value = -1; allocated.value = false
  Object.assign(token, { on: false, x: target.x, y: target.y, z: 0, d: 0, s: 1 })
  Object.assign(ptr, { on: false, ...fwdCenter, d: 0 })
  fwdRow.value = false; revRow.value = false; published.value = false
}
function finalState() {
  reset(); phase.value = 'publish'; allocated.value = true; fwdRow.value = true; revRow.value = true; published.value = true
}

// Déroulé : une liste de pas (attente avant l'action, action), rejouable et suspendable
type Step = [ms: number, run: () => void]
const steps: Step[] = [
  [700, () => { phase.value = 'search' }],
  ...Array.from({ length: TARGET + 1 }, (_, k): Step => [k === TARGET ? 260 : 42, () => { scan.value = k }]),
  [50, () => { phase.value = 'reserve'; allocated.value = true; Object.assign(token, { on: true, x: target.x, y: target.y, z: 0, d: 0 }) }],
  [950, () => { Object.assign(token, { z: 90, d: 800 }) }],
  [1100, () => { phase.value = 'name'; Object.assign(token, { ...fwdCenter, d: 1050, s: 0.55 }) }],
  [550, () => { token.on = false; fwdRow.value = true }],
  [60, () => { Object.assign(ptr, { on: true, ...fwdCenter, d: 0 }) }],
  [900, () => { Object.assign(ptr, { ...revCenter, d: 850 }) }],
  [800, () => { ptr.on = false; revRow.value = true }],
  [700, () => { phase.value = 'publish'; published.value = true }],
  [4800, () => reset()],
]

const reduced = ref(false)
const playing = ref(false)
const visible = ref(false)
let idx = 0
let timer: ReturnType<typeof setTimeout> | undefined
function tick() {
  const [ms, run] = steps[idx]!
  timer = setTimeout(() => {
    run()
    idx = (idx + 1) % steps.length
    if (playing.value && visible.value) tick()
  }, ms)
}
function stop() { clearTimeout(timer); timer = undefined }
function resume() { stop(); if (playing.value && visible.value) tick() }
function togglePlay() { playing.value = !playing.value; resume() }
function replay() { stop(); idx = 0; reset(); playing.value = true; resume() }

// Mise à l'échelle : la scène est dessinée en W × H puis réduite à la largeur disponible
const box = ref<HTMLElement>()
const scale = ref(1)
let ro: ResizeObserver | undefined
let io: IntersectionObserver | undefined
onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced.value) finalState()
  else { reset(); playing.value = true }
  ro = new ResizeObserver(([e]) => { scale.value = Math.min(1, (e?.contentRect.width ?? W) / W) })
  io = new IntersectionObserver(([e]) => { visible.value = !!e?.isIntersecting; resume() }, { threshold: 0.3 })
  if (box.value) { ro.observe(box.value); io.observe(box.value) }
})
onBeforeUnmount(() => { stop(); ro?.disconnect(); io?.disconnect() })

const order: Phase[] = ['search', 'reserve', 'name', 'publish']
const current = computed(() => order.indexOf(phase.value))
const tileClass = (tl: typeof tiles[number]) => {
  if (tl.i === TARGET && allocated.value) return 'is-alloc'
  if (scan.value === tl.i && phase.value === 'search') return `is-${tl.kind} is-scan`
  return `is-${tl.kind}`
}
const billboard = `rotateZ(${-RZ}deg) rotateX(${-RX}deg)`
</script>

<template>
  <div>
    <p class="sr-only">{{ t('alloc.sr') }}</p>
    <div ref="box" class="relative w-full overflow-hidden" :style="{ height: `${H * scale}px` }" aria-hidden="true">
      <div class="scene absolute left-1/2 top-0 origin-top" :style="{ width: `${W}px`, height: `${H}px`, transform: `translateX(-50%) scale(${scale})` }">
        <div class="stage" :style="{ height: `${STAGE_H}px`, transform: `translate(${SHIFT_X}px, ${SHIFT_Y}px) rotateX(${RX}deg) rotateZ(${RZ}deg)` }">
          <!-- Plateau de la plage -->
          <div class="plate" :style="{ left: `${GX - 22}px`, top: `${GY - 46}px`, width: `${COLS * PITCH + 34}px`, height: `${ROWS * PITCH + 58}px` }">
            <span class="plate-label">10.20.20.0/26</span>
          </div>

          <!-- Adresses -->
          <div v-for="tl in tiles" :key="tl.i" class="cube" :class="tileClass(tl)" :style="{ transform: `translate3d(${tl.x}px, ${tl.y}px, 0)` }">
            <template v-if="tl.kind !== 'free' || (tl.i === TARGET && allocated)">
              <div class="face front" />
              <div class="face left" />
            </template>
            <div class="face top"><span>.{{ tl.octet }}</span></div>
          </div>

          <!-- Ombres au sol -->
          <div class="shadow" :class="{ on: token.on }" :style="{ transform: `translate3d(${token.x}px, ${token.y}px, 0) scale(${1 + token.z / 120})`, transitionDuration: `${token.d}ms`, opacity: token.on ? 0.55 - token.z / 300 : 0 }" />

          <!-- Adresse réservée, en vol vers la zone -->
          <div
            class="cube token is-alloc" :class="{ on: token.on }"
            :style="{ transform: `translate3d(${token.x}px, ${token.y}px, ${token.z}px) scale3d(${token.s}, ${token.s}, ${token.s})`, transitionDuration: `${token.d}ms` }"
          >
            <div class="face front" /><div class="face left" />
            <div class="face top"><span>.42</span></div>
            <div class="tag" :style="{ transform: `translate3d(23px, 23px, ${CUBE_H + 20}px) ${billboard}` }">10.20.20.42</div>
          </div>
          <div
            class="ptr" :class="{ on: ptr.on }"
            :style="{ transform: `translate3d(${ptr.x}px, ${ptr.y}px, ${ptr.z}px) ${billboard}`, transitionDuration: `${ptr.d}ms` }"
          >PTR</div>

          <!-- Zones DNS, dressées -->
          <div v-for="c in [{ p: fwd, key: 'fwd' }, { p: rev, key: 'rev' }]" :key="c.key" class="card" :style="{ left: `${c.p.x - CARD_W / 2}px`, top: `${c.p.y - CARD_H}px`, width: `${CARD_W}px`, height: `${CARD_H}px`, transform: `translateZ(${c.p.z}px) ${billboard}` }">
            <div class="card-head">
              <span>{{ c.key === 'fwd' ? 'corp.example' : '20.20.10.in-addr.arpa' }}</span>
              <span class="serial" :class="{ bumped: published }">{{ published ? '2026112205' : '2026112204' }}</span>
            </div>
            <ul v-if="c.key === 'fwd'" class="rows">
              <li><b>srv-web01</b><i>A</i>10.20.20.11</li>
              <li><b>srv-db01</b><i>A</i>10.20.20.12</li>
              <li><b>imp-rdc</b><i>A</i>10.20.20.20</li>
              <li class="new" :class="{ on: fwdRow }"><b>srv-app03</b><i>A</i>10.20.20.42</li>
            </ul>
            <ul v-else class="rows rows-rev">
              <li><b>11</b><i>PTR</i>srv-web01.corp.example.</li>
              <li><b>12</b><i>PTR</i>srv-db01.corp.example.</li>
              <li><b>20</b><i>PTR</i>imp-rdc.corp.example.</li>
              <li class="new" :class="{ on: revRow }"><b>42</b><i>PTR</i>srv-app03.corp.example.</li>
            </ul>
            <p class="state" :class="{ on: published }">{{ t('alloc.published') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <ol class="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="(p, i) in order" :key="p" class="border-t-2 pt-3 transition-colors duration-300" :class="i <= current ? 'border-accent' : 'border-line'" :aria-current="i === current ? 'step' : undefined">
          <p class="font-medium" :class="i === current ? 'text-fg' : 'text-muted'">{{ t(`alloc.steps.${p}.title`) }}</p>
          <p class="mt-1 text-sm text-muted">{{ t(`alloc.steps.${p}.text`) }}</p>
        </li>
      </ol>
      <div class="flex shrink-0 gap-2">
        <button v-if="!reduced" type="button" class="btn btn-secondary" :aria-pressed="!playing" @click="togglePlay">
          <svg v-if="playing" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 7 5.5z" /></svg>
          {{ playing ? t('alloc.pause') : t('alloc.play') }}
        </button>
        <button type="button" class="btn btn-secondary" @click="replay"><AppIcon name="refresh" :size="16" />{{ t('alloc.replay') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene { perspective: 3200px; }
.stage, .stage * { transform-style: preserve-3d; }
.stage { position: absolute; left: 0; top: 0; width: 100%; transform-origin: 50% 50%; }

.plate {
  position: absolute; border-radius: 18px;
  background: color-mix(in srgb, var(--color-tint) 3%, var(--color-surface));
  border: 1px solid var(--color-line-strong);
  box-shadow: 0 30px 80px -30px rgb(0 0 0 / 0.45);
}
.plate-label { position: absolute; left: 22px; bottom: 14px; font: 500 13px/1 var(--font-mono); color: var(--color-muted); }

.cube { position: absolute; left: 0; top: 0; width: 46px; height: 46px; }
.face { position: absolute; backface-visibility: visible; }
.top {
  inset: 0; border-radius: 5px; transform: translateZ(18px);
  display: flex; align-items: center; justify-content: center;
  font: 500 11px/1 var(--font-mono); transition: background-color 0.25s, box-shadow 0.25s, color 0.25s;
}
.front { left: 0; top: 46px; width: 46px; height: 18px; transform-origin: top; transform: rotateX(90deg); }
.left { left: -18px; top: 0; width: 18px; height: 46px; transform-origin: right; transform: rotateY(90deg); }

/* Adresse utilisée */
.is-used .top { background: color-mix(in srgb, var(--color-tint) 13%, var(--color-surface)); color: var(--color-muted); }
.is-used .front { background: color-mix(in srgb, var(--color-tint) 8%, var(--color-surface)); }
.is-used .left { background: color-mix(in srgb, var(--color-tint) 5%, var(--color-bg)); }
/* Réservation DHCP */
.is-dhcp .top { background: color-mix(in srgb, var(--color-ok) 22%, var(--color-surface)); color: var(--color-fg); }
.is-dhcp .front { background: color-mix(in srgb, var(--color-ok) 16%, var(--color-surface)); }
.is-dhcp .left { background: color-mix(in srgb, var(--color-ok) 10%, var(--color-bg)); }
/* Adresse libre : posée à plat */
.is-free .top { transform: translateZ(1px); transition: transform 0.4s, background-color 0.4s; border: 1px dashed var(--color-line-strong); color: color-mix(in srgb, var(--color-muted) 70%, transparent); }
/* Parcours de la plage */
.is-scan .top { box-shadow: 0 0 0 2px var(--color-accent), 0 0 22px 2px color-mix(in srgb, var(--color-accent) 55%, transparent); color: var(--color-fg); }
/* Adresse réservée */
.is-alloc .top { transform: translateZ(18px); border: 0; background: var(--color-accent); color: #fff; box-shadow: 0 0 26px 2px color-mix(in srgb, var(--color-accent) 50%, transparent); }
.is-alloc .front { background: color-mix(in srgb, var(--color-accent) 72%, #000); }
.is-alloc .left { background: color-mix(in srgb, var(--color-accent) 55%, #000); }

.token { opacity: 0; transition-property: transform, opacity; transition-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }
.token.on { opacity: 1; }
.tag, .ptr {
  position: absolute; left: 0; top: 0; white-space: nowrap; translate: -50% -100%;
  padding: 5px 9px; border-radius: 7px; font: 600 13px/1 var(--font-mono);
  background: var(--color-fg); color: var(--color-bg);
}
.ptr { opacity: 0; background: var(--color-accent); color: #fff; transition-property: transform, opacity; transition-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }
.ptr.on { opacity: 1; }

.shadow { position: absolute; left: 0; top: 0; width: 46px; height: 46px; border-radius: 50%; background: radial-gradient(closest-side, rgb(0 0 0 / 0.55), transparent); transition-property: transform, opacity; transition-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }

.card {
  position: absolute; transform-origin: 50% 100%;
  padding: 14px 16px; border-radius: 14px;
  background: var(--color-surface); border: 1px solid var(--color-line-strong);
  box-shadow: 0 24px 60px -24px rgb(0 0 0 / 0.5);
  font: 12px/1.4 var(--font-mono); color: var(--color-fg);
}
.card-head { display: flex; justify-content: space-between; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--color-line); font-weight: 600; }
.serial { color: var(--color-muted); font-weight: 400; transition: color 0.3s; }
.serial.bumped { color: var(--color-ok); }
.rows { margin-top: 6px; }
.rows li { display: grid; grid-template-columns: 82px 34px 1fr; padding: 2px 4px; border-radius: 4px; color: var(--color-muted); white-space: nowrap; }
.rows-rev li { grid-template-columns: 30px 38px 1fr; }
.rows b { font-weight: 500; color: var(--color-fg); overflow: hidden; text-overflow: ellipsis; }
.rows i { font-style: normal; color: var(--color-accent); }
.rows .new { opacity: 0; translate: 0 -6px; transition: opacity 0.35s, translate 0.35s, background-color 0.6s; }
.rows .new.on { opacity: 1; translate: 0 0; background: color-mix(in srgb, var(--color-accent) 16%, transparent); color: var(--color-fg); }
.state { margin-top: 8px; font-size: 11px; color: var(--color-ok); opacity: 0; transition: opacity 0.4s; }
.state.on { opacity: 1; }
</style>
