<script setup lang="ts">
import type { HomePayload } from '#shared/types/stickers'
import { en, zh_cn } from '@nuxt/ui/locale'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const localeHead = useLocaleHead()
const { data: stickerPackFacts } = await useFetch<HomePayload>('/api/site/home', { key: 'global-stickerhub-facts' })

const uiLocale = computed(() => locale.value === 'zh-CN' ? zh_cn : en)
const isAdminRoute = computed(() => route.path.replace(/^\/en(?=\/|$)/, '').startsWith('/admin'))
const navigation = computed(() => [
  { label: t('navigation.browse'), to: localePath({ name: 'albums' }) },
  { label: t('navigation.creators'), to: localePath({ name: 'creators' }) },
  { label: t('navigation.search'), to: localePath({ name: 'search' }) },
])

const pageLabel = computed(() => {
  const path = route.path.replace(/^\/en(?=\/|$)/, '') || '/'
  if (path === '/') return t('pageLabels.home')
  if (path.startsWith('/albums/')) return t('pageLabels.albumDetail')
  if (path === '/albums') return t('pageLabels.albums')
  if (path.startsWith('/creators/')) return t('pageLabels.creatorDetail')
  if (path === '/creators') return t('pageLabels.creators')
  if (path === '/about') return t('pageLabels.about')
  if (path === '/privacy') return t('pageLabels.privacy')
  if (path === '/support') return t('pageLabels.support')
  if (path === '/search') return t('pageLabels.search')
  if (path.startsWith('/docs')) return t('pageLabels.docs')
  return t('pageLabels.catalog')
})

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
}))
</script>

<template>
  <div class="isolate min-h-screen bg-paper text-ink">
    <UApp :locale="uiLocale">
      <NuxtLoadingIndicator color="var(--sticker-orange)" :height="3" />

      <UHeader
          v-if="!isAdminRoute"
          title="StickerHub"
          :to="localePath({ name: 'index' })"
          class="sticky top-0 z-50 border-b border-ink/15 bg-paper/95 backdrop-blur-xl"
          :ui="{ container: 'max-w-[80rem] min-h-[68px]' }"
        >
          <template #title>
            <span class="flex min-w-0 items-baseline gap-2">
              <span class="font-display text-xl font-extrabold">StickerHub</span>
              <span v-if="locale === 'en'" class="hidden max-w-56 truncate font-mono text-[10px] font-bold tracking-[.08em] text-ink/55 min-[860px]:inline">{{ t('common.brandTagline') }}</span>
            </span>
          </template>

          <template #right>
            <UNavigationMenu
              :items="navigation"
              variant="link"
              color="neutral"
              class="hidden md:flex"
            />
            <LanguageSwitcher class="hidden md:flex" />
          </template>

          <template #body>
            <div class="space-y-4 pb-4">
              <UNavigationMenu
                :items="navigation"
                orientation="vertical"
                variant="link"
                color="neutral"
                class="w-full"
              />
              <LanguageSwitcher class="w-full" />
            </div>
          </template>
      </UHeader>

      <UMain v-if="!isAdminRoute" class="min-h-[calc(100vh-9rem)]">
        <NuxtPage />
      </UMain>

      <NuxtPage v-else />

      <UFooter v-if="!isAdminRoute" class="border-t border-ink/15 bg-paper text-ink">
          <template #left>
            <p class="font-display text-sm font-extrabold">StickerHub / {{ pageLabel }}</p>
          </template>
          <template #right>
            <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
              <NuxtLink :to="localePath({ name: 'about' })" class="inline-flex min-h-11 items-center font-mono text-xs text-ink/65 hover:text-ink">{{ t('navigation.about') }}</NuxtLink>
              <NuxtLink :to="localePath({ name: 'privacy' })" class="inline-flex min-h-11 items-center font-mono text-xs text-ink/65 hover:text-ink">{{ t('navigation.privacy') }}</NuxtLink>
              <NuxtLink :to="localePath({ name: 'support' })" class="inline-flex min-h-11 items-center font-mono text-xs text-ink/65 hover:text-ink">{{ t('navigation.support') }}</NuxtLink>
              <NuxtLink :to="localePath({ name: 'docs' })" class="inline-flex min-h-11 items-center font-mono text-xs text-ink/65 hover:text-ink">{{ t('navigation.docs') }}</NuxtLink>
              <span class="font-mono text-xs text-ink/65">{{ t('common.packs', { count: stickerPackFacts?.albumCount.toLocaleString(locale) || '18,052' }) }} · {{ t('common.stickers', { count: stickerPackFacts?.stickerCount.toLocaleString(locale) || '321,143' }) }}</span>
            </div>
          </template>
      </UFooter>
    </UApp>
  </div>
</template>
