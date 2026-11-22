// État gardé dans le navigateur (localStorage), sans jamais l'envoyer au serveur.
// Le stockage peut être indisponible (navigation privée, politique de l'entreprise) : on continue alors en mémoire.
export function useLocalState<T>(key: string, initial: () => T) {
  const state = ref(initial()) as Ref<T>
  const available = ref(true)
  onMounted(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) state.value = JSON.parse(raw)
    }
    catch { available.value = false }
    watch(state, (v) => {
      try { localStorage.setItem(key, JSON.stringify(v)) }
      catch { available.value = false }
    }, { deep: true })
  })
  function clear() {
    state.value = initial()
    try { localStorage.removeItem(key) }
    catch { /* rien à effacer */ }
  }
  return { state, available, clear }
}
