<script setup lang="ts">
const { locale, t } = useI18n()
const localePath = useLocalePath()

const scalarConfiguration = computed(() => ({
  url: '/openapi.json',
  theme: 'none' as const,
  layout: 'modern' as const,
  darkMode: false,
  forceDarkModeState: 'light' as const,
  hideDarkModeToggle: true,
  showSidebar: true,
  hideSearch: false,
  hideModels: false,
  modelsSectionLabel: locale.value === 'zh-CN' ? '数据结构' : 'Schemas',
  hideClientButton: false,
  hideTestRequestButton: false,
  showOperationId: true,
  operationTitleSource: 'summary' as const,
  documentDownloadType: 'json' as const,
  persistAuth: false,
  telemetry: false,
  showDeveloperTools: 'never' as const,
  withDefaultFonts: false,
  authentication: {
    preferredSecurityScheme: 'ApiKey',
  },
  localization: {
    locale: locale.value === 'zh-CN' ? 'zh-CN' as const : 'en' as const,
    direction: 'ltr' as const,
  },
  agent: {
    disabled: true,
    hideAddApi: true,
  },
  mcp: {
    disabled: true,
  },
  customCss: `
    :root {
      --scalar-font: 'Manrope', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif;
      --scalar-font-code: 'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      --scalar-color-accent: #ff5a2f;
      --scalar-background-1: #ffffff;
      --scalar-background-2: #f6fbf8;
      --scalar-background-3: #dcc4ff;
      --scalar-border-color: rgba(23, 23, 23, 0.18);
      --scalar-color-1: #171717;
      --scalar-color-2: rgba(23, 23, 23, 0.72);
      --scalar-color-3: rgba(23, 23, 23, 0.54);
    }
    .scalar-app { color: #171717; }
    .scalar-app button, .scalar-app a, .scalar-app [role='button'] { cursor: pointer; }
    .scalar-app :focus-visible { outline-color: #b9e8ff; outline-offset: 3px; }
  `,
}))

useSeoMeta({
  title: () => t('docs.referencePageTitle'),
  description: () => t('docs.referencePageDescription'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="min-h-screen bg-paper">
    <section class="border-b-2 border-ink bg-lilac">
      <UContainer class="flex max-w-[80rem] flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge label="SCALAR" color="neutral" variant="outline" class="border-ink bg-paper font-mono" />
            <UBadge :label="t('docs.contractBadge')" color="neutral" variant="outline" class="border-ink bg-mint font-mono" />
          </div>
          <h1 class="mt-3 font-display text-[clamp(2rem,5vw,3.6rem)] font-extrabold leading-none">{{ t('docs.referencePageTitle') }}</h1>
          <p class="mt-2 max-w-[720px] text-sm leading-6 text-ink/70 sm:text-base">{{ t('docs.referencePageDescription') }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-3">
          <UButton
            :label="t('docs.backToGuide')"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="outline"
            :to="localePath('/docs')"
            class="border-2 border-ink bg-paper"
          />
          <UButton
            :label="t('docs.openContract')"
            icon="i-lucide-file-json-2"
            trailing-icon="i-lucide-arrow-up-right"
            href="/openapi.json"
            target="_blank"
            external
            class="offset-action"
          />
        </div>
      </UContainer>
    </section>

    <UContainer class="max-w-[80rem] py-5">
      <UAlert
        :title="t('docs.apiKeyStorageTitle')"
        :description="t('docs.referenceNote')"
        icon="i-lucide-shield-check"
        color="neutral"
        variant="subtle"
        class="rounded-none border-l-4 border-brand-500 bg-brand-50"
      />
    </UContainer>

    <div class="scalar-reference-shell border-y border-ink/15 bg-paper">
      <ClientOnly>
        <ScalarApiReference :configuration="scalarConfiguration" />
        <template #fallback>
          <div class="grid min-h-[65vh] place-items-center">
            <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-brand-500" />
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.scalar-reference-shell {
  min-height: 70vh;
}
</style>
