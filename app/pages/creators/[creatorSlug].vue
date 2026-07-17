<script setup lang="ts">
import type { CreatorPagePayload } from '#shared/types/stickers'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const creatorSlug = computed(() => String(route.params.creatorSlug || ''))
const { data, error } = await useFetch<CreatorPagePayload>(() => `/api/site/creators/${encodeURIComponent(creatorSlug.value)}`, {
  key: `creator:${creatorSlug.value}`,
})

if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode === 404 ? 404 : 503,
    message: error.value?.statusCode === 404 ? t('creator.notAvailable') : t('creators.unavailable'),
  })
}

const page = computed(() => data.value as CreatorPagePayload)
const creator = computed(() => page.value.creator)
const breadcrumbItems = computed(() => [
  { label: t('common.home'), to: localePath({ name: 'index' }) },
  { label: t('common.creators'), to: localePath({ name: 'creators' }) },
  { label: creator.value.name },
])

useSeoMeta({
  title: () => t('seo.creatorDetail.title', { name: creator.value.name }),
  description: () => t('seo.creatorDetail.description', { count: creator.value.albumCount, name: creator.value.name }),
  ogImage: () => creator.value.coverUrl || undefined,
})
</script>

<template>
  <div>
    <section class="border-b border-ink bg-mint py-10 sm:py-16">
      <UContainer class="max-w-[80rem]">
        <UBreadcrumb :items="breadcrumbItems" :aria-label="t('common.breadcrumb')" class="mb-8 font-mono text-xs" />
        <div class="grid grid-cols-[minmax(260px,.65fr)_minmax(0,1.35fr)] items-center gap-12 max-[760px]:grid-cols-1">
          <div class="mx-auto w-full max-w-[400px] -rotate-2 rounded-[8px] border-2 border-ink bg-paper p-3 shadow-[8px_8px_0_#171717]">
            <div class="grid aspect-square place-items-center overflow-hidden rounded-[5px] border border-ink bg-lilac p-6">
              <img v-if="creator.coverUrl" :src="creator.coverUrl" :alt="t('creators.cardAlt', { name: creator.name })" width="480" height="480" class="size-[82%] object-contain" decoding="async" referrerpolicy="no-referrer">
              <UIcon v-else name="i-lucide-shapes" class="size-14 text-ink/45" aria-hidden="true" />
            </div>
          </div>
          <div>
            <p class="font-mono text-xs font-bold uppercase">{{ t('creators.creatorFile') }}</p>
            <h1 class="mt-2 font-display text-[clamp(3.2rem,8vw,7rem)] font-extrabold leading-[.9]">{{ creator.name }}</h1>
            <p class="mt-6 max-w-[58ch] text-lg leading-8">{{ t('creator.description') }}</p>
            <div class="mt-7 flex flex-wrap gap-2.5 border-t border-ink pt-5">
              <UBadge color="neutral" variant="outline" size="lg" class="border-ink bg-paper font-mono">{{ t('common.packs', { count: creator.albumCount.toLocaleString(locale) }) }}</UBadge>
              <UBadge color="neutral" variant="outline" size="lg" class="border-ink bg-paper font-mono">{{ t('common.stickers', { count: creator.stickerCount.toLocaleString(locale) }) }}</UBadge>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-14 sm:pb-[88px]">
      <UContainer class="max-w-[80rem]">
        <div class="mb-8">
          <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('creator.completeShelf') }}</p>
          <h2 class="font-display text-3xl font-extrabold sm:text-[44px]">{{ t('creator.archiveCount', { count: creator.albumCount }) }}</h2>
        </div>
        <AlbumGrid :albums="page.albums" />
      </UContainer>
    </section>
  </div>
</template>
