<script setup lang="ts">
import type { AlbumSummary, CursorPage, HomePayload } from '#shared/types/stickers'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const queryString = (value: unknown) => typeof value === 'string' ? value : ''
const q = ref(queryString(route.query.q))

watch(() => route.query.q, (value) => { q.value = queryString(value) })

const requestQuery = computed(() => ({
  q: queryString(route.query.q) || undefined,
  cursor: queryString(route.query.cursor) || undefined,
  limit: 24,
}))

const [{ data, error }, { data: homeData }] = await Promise.all([
  useFetch<CursorPage<AlbumSummary>>('/api/site/albums', {
    key: 'sticker-pack-catalog', query: requestQuery, watch: [requestQuery],
  }),
  useFetch<HomePayload>('/api/site/home', { key: 'album-count-for-catalog' }),
])

if (error.value || !data.value) {
  throw createError({ statusCode: 503, statusMessage: t('pageLabels.catalog'), message: t('common.catalogUnavailable') })
}

const page = computed(() => data.value as CursorPage<AlbumSummary>)
const currentPage = computed(() => Math.max(1, Number.parseInt(queryString(route.query.page) || '1', 10) || 1))
const decorativeAlbums = computed(() => {
  const albums = page.value.data
  if (!albums.length) return []
  if (albums.length < 4) return [albums[0]]
  return [albums[Math.floor((albums.length - 1) * .2)], albums[Math.floor((albums.length - 1) * .6)]]
})
const nextPage = computed(() => ({
  name: 'albums' as const,
  query: {
    q: queryString(route.query.q) || undefined,
    cursor: page.value.nextCursor || undefined,
    page: currentPage.value + 1,
  },
}))

async function applySearch() {
  await navigateTo(localePath({ name: 'albums', query: { q: q.value.trim() || undefined } }))
}

useSeoMeta({ title: () => t('seo.albums.title'), description: () => t('seo.albums.description') })
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-ink bg-mint">
      <UContainer class="relative grid min-h-[390px] max-w-[80rem] items-center">
        <div class="relative z-10 w-[min(760px,72%)] py-[66px] max-[900px]:w-[72%] max-[560px]:w-full max-[560px]:pb-28 max-[560px]:pt-12">
          <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('albums.eyebrow') }}</p>
          <h1 class="font-display text-[72px] font-extrabold leading-[.94] max-[900px]:text-[58px] max-[560px]:text-[43px]">{{ t('albums.title') }}</h1>
          <p class="mt-[18px] max-w-[52ch] text-[19px] font-semibold leading-7 max-[560px]:text-[17px]">{{ t('albums.description') }}</p>
        </div>

        <SuitePolaroid
          v-if="decorativeAlbums[0]"
          :album="decorativeAlbums[0]"
          image-class="bg-lilac"
          class="absolute right-[13%] top-[34px] z-[2] w-[154px] -rotate-5 max-[900px]:right-[3%] max-[900px]:w-[126px] max-[560px]:bottom-3 max-[560px]:right-1.5 max-[560px]:top-auto max-[560px]:w-[92px]"
        />
        <SuitePolaroid
          v-if="decorativeAlbums[1]"
          :album="decorativeAlbums[1]"
          image-class="bg-sky"
          class="absolute bottom-[26px] right-[1%] z-[2] w-[154px] rotate-6 max-[900px]:hidden"
        />
      </UContainer>
    </section>

    <section class="sticky top-[var(--ui-header-height)] z-40 border-b border-ink bg-paper/95 backdrop-blur-xl">
      <UContainer class="flex min-h-[88px] max-w-[80rem] items-center gap-5 max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:gap-3 max-[900px]:py-3.5">
        <UForm class="min-w-0 flex-1" :state="{ q }" role="search" @submit="applySearch">
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 max-[560px]:grid-cols-1">
            <UInput v-model="q" type="search" name="q" :aria-label="t('albums.searchPlaceholder')" :placeholder="t('albums.searchPlaceholder')" maxlength="80" size="xl" class="w-full min-w-0" :ui="{ base: 'border border-ink bg-paper' }" />
            <UButton type="submit" :label="t('albums.searchSubmit')" size="xl" class="offset-action max-[560px]:mt-1" />
          </div>
        </UForm>
        <span class="inline-flex min-h-12 shrink-0 items-center border-l border-ink/20 pl-5 font-mono text-xs max-[900px]:min-h-0 max-[900px]:border-l-0 max-[900px]:border-t max-[900px]:pl-0 max-[900px]:pt-3">{{ t('albums.catalogStats', { count: homeData?.albumCount.toLocaleString(locale) || '18,052' }) }}</span>
      </UContainer>
    </section>

    <section class="py-14 sm:pb-[86px]">
      <UContainer class="max-w-[80rem]">
        <div class="mb-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p class="mb-2 font-mono text-xs font-bold uppercase">{{ currentPage === 1 ? t('albums.firstShelf') : t('albums.shelf', { page: currentPage }) }}</p>
            <h2 class="font-display text-3xl font-extrabold sm:text-[40px]">{{ t('albums.inView', { count: page.data.length }) }}</h2>
          </div>
          <UBadge color="neutral" variant="outline" class="border-ink bg-paper font-mono">{{ route.query.q ? t('albums.searchBadge', { query: route.query.q }) : t('albums.catalogOrder') }}</UBadge>
        </div>

        <AlbumGrid :albums="page.data" :empty-title="t('albums.emptyTitle')" :empty-text="t('albums.emptyDescription')" />

        <nav v-if="page.nextCursor" class="mt-[42px] flex items-center justify-center gap-2" :aria-label="t('albums.next')">
          <span class="grid min-h-[42px] min-w-[42px] place-items-center rounded-[6px] border border-ink bg-brand-500 font-mono font-bold shadow-[3px_3px_0_#171717]" aria-current="page">{{ currentPage }}</span>
          <UButton :label="t('albums.next')" trailing-icon="i-lucide-arrow-right" color="neutral" variant="outline" :to="localePath(nextPage)" class="border-ink bg-paper" />
        </nav>
      </UContainer>
    </section>
  </div>
</template>
