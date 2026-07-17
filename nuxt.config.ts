import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const scalarBrowserAssetsDirectory = resolve(dirname(require.resolve('@scalar/api-reference')), 'browser')
const stickerHubSiteUrl = process.env.NUXT_SITE_URL || 'https://stickerhub.lius.me'
const legacyLocalApiKeysDatabasePath = '.data/stickermart-api-keys.db'
const defaultLocalApiKeysDatabasePath = process.env.NODE_ENV === 'production'
  ? ''
  : existsSync(legacyLocalApiKeysDatabasePath)
    ? legacyLocalApiKeysDatabasePath
    : '.data/stickerhub-api-keys.db'

const cachedInProduction = (seconds: number) => process.env.NODE_ENV === 'development'
  ? { cache: false as const }
  : { swr: seconds }

const securityHeaders = {
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

export default defineNuxtConfig({
  compatibilityDate: '2026-07-13',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    'nuxt-auth-utils',
    '@nuxtjs/i18n',
    '@nuxt/scripts',
    '@nuxtjs/seo',
  ],

  i18n: {
    defaultLocale: 'zh-CN',
    strategy: 'prefix_except_default',
    locales: [
      {
        code: 'zh-CN',
        language: 'zh-CN',
        name: '简体中文',
        file: 'zh-CN.json',
      },
      {
        code: 'en',
        language: 'en-US',
        name: 'English',
        file: 'en.json',
      },
    ],
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'stickerhub_locale',
      redirectOn: 'root',
    },
    baseUrl: stickerHubSiteUrl,
  },

  scripts: {
    registry: {
      googleAnalytics: {
        id: 'G-HMMQ4WSK7P',
        trigger: 'onNuxtReady',
      },
    },
  },

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: true,
    colorMode: false,
    experimental: {
      componentDetection: true,
    },
    theme: {
      colors: ['brand', 'primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'],
      transitions: true,
    },
  },

  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#ffffff' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      ],
    },
  },

  runtimeConfig: {
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || '',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
    sqlitePath: process.env.STICKERHUB_SQLITE_PATH || process.env.STICKERMART_SQLITE_PATH || '',
    apiKeysDatabaseUrl: process.env.NUXT_API_KEYS_DATABASE_URL || process.env.STICKERHUB_API_KEYS_DATABASE_URL || process.env.STICKERMART_API_KEYS_DATABASE_URL || '',
    apiKeysAuthToken: process.env.NUXT_API_KEYS_AUTH_TOKEN || process.env.STICKERHUB_API_KEYS_AUTH_TOKEN || process.env.STICKERMART_API_KEYS_AUTH_TOKEN || '',
    apiKeysSqlitePath: process.env.NUXT_API_KEYS_SQLITE_PATH || process.env.STICKERHUB_API_KEYS_SQLITE_PATH || process.env.STICKERMART_API_KEYS_SQLITE_PATH || defaultLocalApiKeysDatabasePath,
    apiKey: process.env.EMOTICON_API_KEY || '',
    adminApiKey: process.env.NUXT_ADMIN_API_KEY || process.env.STICKERHUB_ADMIN_API_KEY || process.env.STICKERMART_ADMIN_API_KEY || '',
    resendApiKey: process.env.NUXT_RESEND_API_KEY || '',
    resendFromEmail: process.env.NUXT_RESEND_FROM_EMAIL || '',
    resendWebhookSecret: process.env.NUXT_RESEND_WEBHOOK_SECRET || '',
    session: {
      name: 'stickerhub-admin-session',
      password: process.env.NUXT_SESSION_PASSWORD || '',
      maxAge: 60 * 60 * 8,
      cookie: {
        sameSite: 'strict' as const,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
      },
    },
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '',
    upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL || '',
    upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    apiRateLimit: Number.parseInt(process.env.API_RATE_LIMIT || '60', 10),
    public: {
      siteUrl: stickerHubSiteUrl,
    },
  },

  site: {
    url: stickerHubSiteUrl,
    name: 'StickerHub',
    description: '覆盖多种主题与风格的表情包内容，支持浏览、搜索和下载。',
    defaultLocale: 'zh-CN',
    indexable: process.env.NUXT_SITE_INDEXABLE === 'true',
    trailingSlash: false,
  },

  robots: {
    groups: [
      {
      userAgent: '*',
      allow: ['/'],
      disallow: [
          '/search',
          '/en/search',
          '/__',
        ],
      },
    ],
  },

  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    exclude: [
      '/api/**',
      '/docs',
      '/docs/**',
      '/en/docs',
      '/en/docs/**',
      '/docs-old',
      '/en/docs-old',
      '/openapi.json',
      '/search',
      '/en/search',
    ],
  },

  ogImage: {
    enabled: false,
  },

  routeRules: {
    '/**': { headers: securityHeaders },
    '/': cachedInProduction(600),
    '/albums': cachedInProduction(300),
    '/albums/**': cachedInProduction(3600),
    '/creators': cachedInProduction(600),
    '/creators/**': cachedInProduction(3600),
    '/search': cachedInProduction(60),
    '/support': cachedInProduction(600),
    '/api/site/**': cachedInProduction(300),
    '/en': cachedInProduction(600),
    '/en/albums': cachedInProduction(300),
    '/en/albums/**': cachedInProduction(3600),
    '/en/creators': cachedInProduction(600),
    '/en/creators/**': cachedInProduction(3600),
    '/en/search': cachedInProduction(60),
    '/en/support': cachedInProduction(600),
    '/api/admin/**': { headers: { ...securityHeaders, 'Cache-Control': 'no-store' } },
    '/api/v1/**': { headers: { ...securityHeaders, 'Cache-Control': 'no-store' } },
    '/api/webhooks/**': { headers: { ...securityHeaders, 'Cache-Control': 'no-store' } },
    '/docs': { robots: false },
    '/docs/**': { robots: false },
    '/en/docs': { robots: false },
    '/en/docs/**': { robots: false },
    '/docs-old': { robots: false },
    '/en/docs-old': { robots: false },
  },

  nitro: {
    compressPublicAssets: true,
    publicAssets: [
      {
        baseURL: '/_scalar',
        dir: scalarBrowserAssetsDirectory,
        maxAge: 60 * 60 * 24 * 365,
      },
    ],
    sourceMap: false,
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },
})
