<script setup lang="ts">
const catalog = [
  { key: 'contact', title: 'Contact', text: 'Page Contact, formulaire et bouton « Nous contacter ». Le bloc « Un projet de migration DDI ? » perd ce bouton.' },
  { key: 'booking', title: 'Démonstration sur rendez-vous', text: 'Page de réservation et les boutons qui y mènent.' },
  { key: 'demo', title: 'Démo publique', text: 'Page Démo : instance en lecture seule, ou invitation à réserver tant qu’elle n’existe pas.' },
  { key: 'newsletter', title: 'Alertes de version', text: 'Formulaire d’inscription de l’accueil. Les liens de confirmation déjà envoyés restent valables.' },
] as const

const { data, refresh } = await useFetch<{ features: Array<{ key: string, enabled: boolean }> }>('/api/admin/features')
const { refresh: refreshPublic } = useSiteFeatures()
const busy = ref('')
const notice = ref<{ kind: 'ok' | 'error', text: string } | null>(null)

const enabled = (key: string) => data.value?.features.find(f => f.key === key)?.enabled !== false

async function toggle(key: string) {
  const next = !enabled(key)
  busy.value = key
  notice.value = null
  try {
    await $fetch('/api/admin/features', { method: 'PUT', body: { key, enabled: next } })
    await Promise.all([refresh(), refreshPublic()])
    notice.value = { kind: 'ok', text: next ? 'Élément réaffiché sur le site.' : 'Élément masqué sur le site.' }
  }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    notice.value = { kind: 'error', text: code === 401 ? 'Reconnectez-vous.' : 'Le changement n’a pas été enregistré. Réessayez.' }
  }
  finally { busy.value = '' }
}
</script>

<template>
  <section aria-labelledby="feat-title">
    <h2 id="feat-title" class="text-xl font-semibold tracking-tight">Éléments du site</h2>
    <p class="mt-2 max-w-2xl text-muted">Masquez une partie du site public. Le changement est immédiat.</p>
    <p v-if="notice" :role="notice.kind === 'error' ? 'alert' : 'status'" class="mt-6 rounded-lg px-4 py-3 text-sm" :class="notice.kind === 'error' ? 'border-l-4 border-alert bg-surface text-alert' : 'border-l-4 border-ok bg-surface text-ok'">{{ notice.text }}</p>
    <ul class="mt-8 divide-y divide-line rounded-2xl border border-line">
      <li v-for="item in catalog" :key="item.key" class="flex items-center gap-6 px-5 py-4">
        <div class="min-w-0 flex-1">
          <p class="font-medium" :id="`feat-${item.key}-label`">{{ item.title }}</p>
          <p class="mt-1 text-sm text-muted" :id="`feat-${item.key}-text`">{{ item.text }}</p>
        </div>
        <button
          type="button"
          role="switch"
          class="relative h-11 w-16 shrink-0 rounded-full border border-line-strong"
          :class="enabled(item.key) ? 'bg-ok' : 'bg-raised'"
          :aria-checked="enabled(item.key)"
          :aria-labelledby="`feat-${item.key}-label`"
          :aria-describedby="`feat-${item.key}-text`"
          :disabled="busy === item.key"
          @click="toggle(item.key)"
        >
          <span class="sr-only">{{ enabled(item.key) ? 'Activé' : 'Masqué' }}</span>
          <span class="absolute top-2 size-7 rounded-full" :class="enabled(item.key) ? 'left-8 bg-bg' : 'left-1.5 bg-fg'" aria-hidden="true" />
          <span v-if="busy === item.key" class="absolute inset-0 m-auto size-3.5 animate-spin rounded-full border-2 border-bg/40 border-t-bg" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </section>
</template>
