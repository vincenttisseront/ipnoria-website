<script setup lang="ts">
import { logoUrl } from '#shared/references'
import type { PublicReference } from '#shared/references'

// Logo sur une plaque neutre (claire, ou sombre pour un logo clair), lisible dans les deux thèmes ;
// sans logo, le nom du client en toutes lettres.
const props = defineProps<{ reference: Pick<PublicReference, 'id' | 'name' | 'hasLogo' | 'logoDarkBg' | 'v'>, size?: 'sm' | 'lg', preview?: boolean }>()
const src = computed(() => props.preview ? `${logoUrl(props.reference)}&apercu=1` : logoUrl(props.reference))
const box = computed(() => props.size === 'lg' ? 'h-24 w-48 p-4' : 'h-16 w-36 p-3')
</script>

<template>
  <div class="flex shrink-0 items-center justify-center rounded-xl border border-line" :class="[box, reference.logoDarkBg ? 'bg-[#0d111a]' : 'bg-white']">
    <img v-if="reference.hasLogo" :src="src" :alt="reference.name" class="max-h-full max-w-full object-contain" loading="lazy" decoding="async">
    <span v-else class="text-center text-sm font-semibold leading-tight" :class="reference.logoDarkBg ? 'text-white' : 'text-[#0d1321]'">{{ reference.name }}</span>
  </div>
</template>
