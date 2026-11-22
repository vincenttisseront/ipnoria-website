// Thème choisi par le visiteur : « system » (défaut, suit le système), « light » ou « dark ».
// Gardé dans un cookie de préférence (lu au rendu serveur : pas de flash au chargement).
export type ThemeChoice = 'system' | 'light' | 'dark'

export function useTheme() {
  const cookie = useCookie<ThemeChoice>('theme', {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  })
  const choice = computed<ThemeChoice>(() => (['light', 'dark'].includes(cookie.value) ? cookie.value : 'system'))

  function set(next: ThemeChoice) {
    cookie.value = next
    if (import.meta.client) {
      if (next === 'system') document.documentElement.removeAttribute('data-theme')
      else document.documentElement.setAttribute('data-theme', next)
    }
  }
  return { choice, set }
}
