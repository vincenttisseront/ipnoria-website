import tailwindcss from '@tailwindcss/vite'

// Site vitrine DDI-Buntu : rendu serveur (SSR) pour le référencement, API Nitro pour le formulaire de contact.
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },

  modules: ['@nuxtjs/i18n', 'nuxt-security', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
    // Aucune police inlinée en data: (la CSP n'autorise que font-src 'self')
    build: { assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined) },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [{ name: 'theme-color', content: '#14213d' }],
    },
  },

  // Toutes les valeurs sont surchargées à l'exécution par les variables NUXT_* (voir .env.example)
  runtimeConfig: {
    databaseUrl: '',                 // NUXT_DATABASE_URL
    ipHashSalt: '',                  // NUXT_IP_HASH_SALT : l'adresse IP n'est jamais stockée en clair
    contactRetentionDays: 365,       // NUXT_CONTACT_RETENTION_DAYS : purge RGPD automatique
    smtp: {
      host: '',                      // NUXT_SMTP_HOST (vide = pas d'e-mail, le message reste en base)
      port: 587,
      secure: false,
      user: '',
      pass: '',
      from: '',
      to: '',                        // NUXT_SMTP_TO : destinataire des notifications
    },
    public: {
      siteUrl: 'http://localhost:3000', // NUXT_PUBLIC_SITE_URL
      githubRepo: 'vincenttisseront/ddibuntu',
      legal: {
        // Mentions légales (LCEN, art. 6) : à compléter en production via NUXT_PUBLIC_LEGAL_*
        publisher: 'Vincent Tisseront',
        address: '',
        email: '',
        host: '',
      },
    },
  },

  i18n: {
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: { useCookie: true, cookieKey: 'lang', redirectOn: 'root', alwaysRedirect: false },
    customRoutes: 'config',
    pages: {
      'documentation': { fr: '/documentation', en: '/docs' },
      'mentions-legales': { fr: '/mentions-legales', en: '/legal-notice' },
      'confidentialite': { fr: '/confidentialite', en: '/privacy' },
    },
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  // En-têtes de sécurité (CSP avec nonce, HSTS, COOP/CORP…), limitation de débit et de taille des requêtes
  security: {
    strict: true,
    headers: {
      crossOriginEmbedderPolicy: 'require-corp',
      contentSecurityPolicy: {
        'default-src': ["'none'"],
        'base-uri': ["'none'"],
        'connect-src': ["'self'"],
        'font-src': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'img-src': ["'self'", 'data:'],
        'manifest-src': ["'self'"],
        'object-src': ["'none'"],
        'script-src': ["'self'", "'strict-dynamic'", "'nonce-{{nonce}}'"],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production',
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: { maxAge: 31536000, includeSubdomains: true, preload: false },
      xFrameOptions: 'DENY',
      permissionsPolicy: {
        'camera': [], 'microphone': [], 'geolocation': [], 'display-capture': [],
        'fullscreen': [], 'payment': [], 'usb': [],
        // Directive non reconnue par Chromium : retirée pour ne pas polluer la console
        'web-share': false,
      },
    },
    rateLimiter: { tokensPerInterval: 300, interval: 300000, headers: false },
    requestSizeLimiter: { maxRequestSizeInBytes: 32_000, maxUploadFileRequestInBytes: 32_000 },
    xssValidator: { methods: ['POST'] },
    corsHandler: false,
    hidePoweredBy: true,
  },

  routeRules: {
    // Formulaire : 5 envois par tranche de 10 minutes et par adresse IP
    // Le message n'est jamais rendu en HTML (texte brut en base et dans l'e-mail) : le filtre XSS générique refuserait à tort « a < b »
    '/api/contact': { security: { rateLimiter: { tokensPerInterval: 5, interval: 600000 }, xssValidator: false } },
    '/api/**': { headers: { 'cache-control': 'no-store' } },
    '/img/**': { headers: { 'cache-control': 'public, max-age=604800' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  nitro: {
    // Les migrations SQL sont embarquées dans le serveur construit (useStorage('assets:migrations'))
    serverAssets: [{ baseName: 'migrations', dir: './database/migrations' }],
  },

  typescript: { strict: true },
  eslint: { config: { stylistic: false } },
})
