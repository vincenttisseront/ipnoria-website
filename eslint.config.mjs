// Règles @nuxt/eslint (Vue, TypeScript, imports) ; la mise en forme n'est pas imposée par le linter
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/multi-word-component-names': 'off',
    'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
  },
}, {
  ignores: ['.output/**', '.nuxt/**', 'coverage/**', 'node_modules/**'],
})
