<script setup lang="ts">
// Champ mot de passe avec bouton afficher / masquer et compteur de longueur pour un nouveau mot de passe.
const props = defineProps<{ id: string, autocomplete: 'current-password' | 'new-password', describedby?: string, invalid?: boolean }>()
const model = defineModel<string>({ required: true })
const { t } = useI18n()
const shown = ref(false)
const isNew = computed(() => props.autocomplete === 'new-password')
</script>

<template>
  <div>
    <div class="relative">
      <input
        :id="id" v-model="model" :type="shown ? 'text' : 'password'" class="field pr-12" :autocomplete="autocomplete"
        :minlength="isNew ? 12 : undefined" maxlength="128" required spellcheck="false"
        :aria-invalid="invalid || undefined" :aria-describedby="[describedby, isNew ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined"
      >
      <button
        type="button" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-fg"
        :aria-label="shown ? t('account.hidePassword') : t('account.showPassword')" :aria-pressed="shown" @click="shown = !shown"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
          <path v-if="shown" d="M3 3l18 18" />
        </svg>
      </button>
    </div>
    <p v-if="isNew" :id="`${id}-hint`" class="mt-1.5 text-sm" :class="model.length && model.length < 12 ? 'text-warn' : 'text-muted'">
      {{ t('account.passwordHint', { n: model.length }) }}
    </p>
  </div>
</template>
