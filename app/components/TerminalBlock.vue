<script setup lang="ts">
// Fenêtre de terminal : une ligne par étape, chacune copiable. Les commentaires (#) nomment l'étape.
const props = defineProps<{ lines: Array<{ comment: string, command: string }> }>()
const { t } = useI18n()
const copied = ref<number | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy(i: number) {
  try {
    await navigator.clipboard.writeText(props.lines[i]!.command)
    copied.value = i
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = null), 1800)
  }
  catch {
    // Presse-papiers refusé (contexte non sécurisé) : la commande reste sélectionnable à la main
  }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="theme-dark overflow-hidden rounded-2xl border border-line-strong bg-code">
    <div class="flex items-center gap-1.5 border-b border-line px-4 py-3" aria-hidden="true">
      <span class="size-2.5 rounded-full bg-tint/15" />
      <span class="size-2.5 rounded-full bg-tint/15" />
      <span class="size-2.5 rounded-full bg-tint/15" />
    </div>
    <ol class="space-y-4 p-5 font-mono text-[0.85rem] leading-6">
      <li v-for="(l, i) in lines" :key="l.command" class="group">
        <p class="text-muted/80"># {{ i + 1 }}. {{ l.comment }}</p>
        <div class="flex items-start justify-between gap-3">
          <code class="min-w-0 break-all text-fg"><span class="select-none text-accent" aria-hidden="true">$ </span>{{ l.command }}</code>
          <button
            type="button"
            class="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2 py-1 font-sans text-[0.75rem] text-muted transition-colors hover:border-line-strong hover:text-fg"
            @click="copy(i)"
          >
            <AppIcon :name="copied === i ? 'check' : 'copy'" :size="13" />
            <span aria-live="polite">{{ copied === i ? t('quickstart.copied') : t('quickstart.copy') }}</span>
          </button>
        </div>
      </li>
    </ol>
  </div>
</template>
