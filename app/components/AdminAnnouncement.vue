<script setup lang="ts">
const { data, refresh } = await useFetch<{ fr: string, en: string, endsOn: string, enabled: boolean }>('/api/admin/announcement')
const fr = ref('')
const en = ref('')
const endsOn = ref('')
const enabled = ref(false)
watch(data, (d) => {
  if (!d) return
  fr.value = d.fr
  en.value = d.en
  endsOn.value = d.endsOn || ''
  enabled.value = d.enabled
}, { immediate: true })

const busy = ref(false)
const notice = ref<{ kind: 'ok' | 'error', text: string } | null>(null)

async function save() {
  busy.value = true
  notice.value = null
  try {
    await $fetch('/api/admin/announcement', { method: 'PUT', body: { fr: fr.value, en: en.value, endsOn: endsOn.value, enabled: enabled.value } })
    await refresh()
    notice.value = { kind: 'ok', text: enabled.value ? 'Bandeau publié.' : 'Bandeau masqué.' }
  }
  catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    notice.value = { kind: 'error', text: code === 401 ? 'Reconnectez-vous.' : 'Le bandeau n’a pas été enregistré. Réessayez.' }
  }
  finally { busy.value = false }
}
</script>

<template>
  <section aria-labelledby="ann-title" class="mt-14">
    <h2 id="ann-title" class="text-xl font-semibold tracking-tight">Annonce</h2>
    <p class="mt-2 max-w-2xl text-muted">Un bandeau en haut du site, en français et en anglais. Il disparaît à la fin du jour choisi.</p>
    <form class="mt-8 max-w-2xl space-y-4" @submit.prevent="save">
      <div>
        <label for="ann-fr" class="field-label">Texte français</label>
        <textarea id="ann-fr" v-model="fr" class="field min-h-24" maxlength="280" />
      </div>
      <div>
        <label for="ann-en" class="field-label">Texte anglais</label>
        <textarea id="ann-en" v-model="en" class="field min-h-24" maxlength="280" />
      </div>
      <div>
        <label for="ann-end" class="field-label">Afficher jusqu’au</label>
        <input id="ann-end" v-model="endsOn" type="date" class="field min-h-11">
        <p class="mt-1.5 text-sm text-muted">Laissez vide pour le laisser affiché.</p>
      </div>
      <div class="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
        <p id="ann-on" class="font-medium">Afficher le bandeau</p>
        <button
          type="button" role="switch"
          class="relative h-11 w-16 shrink-0 rounded-full border border-line-strong"
          :class="enabled ? 'bg-ok' : 'bg-raised'"
          :aria-checked="enabled" aria-labelledby="ann-on"
          @click="enabled = !enabled"
        >
          <span class="sr-only">{{ enabled ? 'Affiché' : 'Masqué' }}</span>
          <span class="absolute top-2 size-7 rounded-full" :class="enabled ? 'left-8 bg-bg' : 'left-1.5 bg-fg'" aria-hidden="true" />
        </button>
      </div>
      <p v-if="notice" :role="notice.kind === 'error' ? 'alert' : 'status'" class="rounded-lg px-4 py-3 text-sm" :class="notice.kind === 'error' ? 'border-l-4 border-alert bg-surface text-alert' : 'border-l-4 border-ok bg-surface text-ok'">{{ notice.text }}</p>
      <button type="submit" class="btn btn-primary" :disabled="busy">
        <span v-if="busy" class="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden="true" />
        Enregistrer l’annonce
      </button>
    </form>
  </section>
</template>
