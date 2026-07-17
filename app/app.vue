<script setup lang="ts">
import type { HomePayload } from '#shared/types/stickers'
import { en, zh_cn } from '@nuxt/ui/locale'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const localeHead = useLocaleHead()
const currentYear = new Date().getFullYear()
const { data: stickerPackFacts } = await useFetch<HomePayload>('/api/site/home', { key: 'global-stickerhub-facts' })

const uiLocale = computed(() => locale.value === 'zh-CN' ? zh_cn : en)
const isAdminRoute = computed(() => route.path.replace(/^\/en(?=\/|$)/, '').startsWith('/admin'))
const navigation = computed(() => [
  { label: t('navigation.browse'), to: localePath({ name: 'albums' }) },
  { label: t('navigation.creators'), to: localePath({ name: 'creators' }) },
  { label: t('navigation.search'), icon: 'i-lucide-search', to: localePath({ name: 'search' }) },
])

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
        :ui="{
          container: 'max-w-[80rem] min-h-[60px] sm:min-h-[68px]',
          right: 'gap-3',
        }"
      >
        <template #title>
          <span class="flex min-w-0 items-center gap-2.5">
            <img src="/favicon.svg" alt="" width="28" height="28" class="size-7 shrink-0 rounded-[5px]" aria-hidden="true">
            <span class="font-display text-[21px] font-extrabold tracking-[-.015em]">Sticker<span class="font-semibold">Hub</span></span>
          </span>
        </template>

        <template #right>
          <UNavigationMenu
            :items="navigation"
            variant="link"
            color="neutral"
            highlight
            highlight-color="brand"
            class="hidden lg:flex"
            :ui="{
              link: 'min-h-11 px-3 text-sm font-semibold text-ink/65 hover:text-ink',
              linkLeadingIcon: 'size-4 text-ink/55 group-hover:text-ink',
            }"
          />
          <LanguageSwitcher class="hidden lg:block" />
        </template>

        <template #body>
          <div class="space-y-4 pb-4">
            <UNavigationMenu
              :items="navigation"
              orientation="vertical"
              variant="link"
              color="neutral"
              highlight
              highlight-color="brand"
              class="w-full"
              :ui="{ link: 'min-h-11 text-base font-semibold' }"
            />
            <LanguageSwitcher class="w-full" />
          </div>
        </template>
      </UHeader>

      <UMain v-if="!isAdminRoute" class="min-h-[calc(100vh-9rem)]">
        <NuxtPage />
      </UMain>

      <NuxtPage v-else />

      <UFooter
        v-if="!isAdminRoute"
        class="border-t border-ink bg-paper text-ink"
        :ui="{
          container: 'block max-w-[80rem] py-5 lg:py-5',
          left: 'hidden',
          center: 'block w-full mt-0 lg:mt-0',
          right: 'hidden',
        }"
      >
        <div class="w-full">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div class="flex min-w-0 items-center gap-2.5">
              <img src="/favicon.svg" alt="" width="28" height="28" class="size-7 shrink-0 rounded-[5px]" aria-hidden="true">
              <div class="min-w-0 sm:flex sm:items-baseline sm:gap-2.5">
                <p class="font-display text-base font-extrabold tracking-[-.015em]">Sticker<span class="font-semibold">Hub</span></p>
                <p class="mt-0.5 text-sm text-ink/60 sm:mt-0">{{ t('common.brandTagline') }}</p>
              </div>
            </div>

            <nav :aria-label="t('common.footerNavigation')" class="flex flex-wrap items-center gap-x-5">
              <NuxtLink :to="localePath({ name: 'about' })" class="inline-flex min-h-10 items-center text-sm font-semibold text-ink/60 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky">{{ t('navigation.about') }}</NuxtLink>
              <NuxtLink :to="localePath({ name: 'privacy' })" class="inline-flex min-h-10 items-center text-sm font-semibold text-ink/60 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky">{{ t('navigation.privacy') }}</NuxtLink>
              <NuxtLink :to="localePath({ name: 'support' })" class="inline-flex min-h-10 items-center text-sm font-semibold text-ink/60 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky">{{ t('navigation.support') }}</NuxtLink>
              <NuxtLink :to="localePath({ name: 'docs' })" class="inline-flex min-h-10 items-center text-sm font-semibold text-ink/60 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky">{{ t('navigation.docs') }}</NuxtLink>
            </nav>
          </div>

          <div class="mt-3 flex flex-col gap-1.5 border-t border-ink/15 pt-3 font-mono text-[11px] text-ink/55 sm:flex-row sm:items-center sm:justify-between">
            <span>© {{ currentYear }} StickerHub</span>
            <span v-if="stickerPackFacts" class="tabular-nums">{{ t('common.catalogScale', {
              packs: stickerPackFacts.albumCount.toLocaleString(locale),
              stickers: stickerPackFacts.stickerCount.toLocaleString(locale),
            }) }}</span>
          </div>
        </div>
      </UFooter>
    </UApp>
  </div>
</template>
