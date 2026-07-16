<script setup lang="ts">
import type { AlbumSummary, CursorPage, HomePayload } from '#shared/types/stickers'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const queryString = (value: unknown) => typeof value === 'string' ? value : ''
const q = computed(() => queryString(route.query.q).trim().slice(0, 80))
const cursor = computed(() => queryString(route.query.cursor) || undefined)
const currentPage = computed(() => Math.max(1, Number.parseInt(queryString(route.query.page) || '1', 10) || 1))
const searchKey = computed(() => `sticker-search-results:${q.value}:${cursor.value || 'first'}`)

const [{ data, error, pending }, { data: homeData }] = await Promise.all([
  useAsyncData(searchKey, () => q.value
    ? $fetch<CursorPage<AlbumSummary>>('/api/site/search', { query: { q: q.value, cursor: cursor.value, limit: 24 } })
    : Promise.resolve({ data: [], nextCursor: null } satisfies CursorPage<AlbumSummary>), {
      default: () => ({ data: [], nextCursor: null }),
    }),
  useFetch<HomePayload>('/api/site/home', { key: 'search-suggestions-home' }),
])

if (error.value || !data.value) {
  throw createError({ statusCode: 503, statusMessage: t('pageLabels.search'), message: t('search.unavailable') })
}

const page = computed(() => data.value as CursorPage<AlbumSummary>)
const suggestions = computed(() => homeData.value?.searchTrails?.slice(0, 5) || [])
const nextPage = computed(() => ({
  name: 'search' as const,
  query: { q: q.value, cursor: page.value.nextCursor || undefined, page: currentPage.value + 1 },
}))

useSeoMeta({
  title: () => q.value ? t('seo.search.queryTitle', { query: q.value }) : t('seo.search.title'),
  description: () => q.value ? t('seo.search.queryDescription', { query: q.value }) : t('seo.search.description'),
  robots: 'noindex, follow',
})
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-ink bg-lilac">
      <UContainer class="relative grid min-h-[390px] max-w-[80rem] items-center">
        <div class="relative z-10 w-[min(760px,72%)] py-[66px] max-[900px]:w-[72%] max-[560px]:w-full max-[560px]:pb-28 max-[560px]:pt-12">
          <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('search.eyebrow') }}</p>
          <h1 class="font-display text-[72px] font-extrabold leading-[.94] max-[900px]:text-[58px] max-[560px]:text-[43px]">
            <template v-if="q">
              <span v-if="t('search.resultsPrefix')">{{ t('search.resultsPrefix') }} </span>
              <span class="inline-block -rotate-1 rounded-[6px] border-2 border-ink bg-brand-500 px-[.12em] pb-[.05em] shadow-[5px_5px_0_#171717]">“{{ q }}”</span>{{ t('search.resultsSuffix') }}
            </template>
            <template v-else>{{ t('search.title') }}</template>
          </h1>
          <p class="mt-[18px] max-w-[52ch] text-[19px] font-semibold leading-7 max-[560px]:text-[17px]">
            {{ q ? t('search.resultsDescription') : t('search.description') }}
          </p>
        </div>

        <SuitePolaroid
          v-if="page.data[0]"
          :album="page.data[0]"
          image-class="bg-mint"
          class="absolute right-[13%] top-[34px] z-[2] w-[154px] -rotate-5 max-[900px]:right-[3%] max-[900px]:w-[126px] max-[560px]:bottom-3 max-[560px]:right-1.5 max-[560px]:top-auto max-[560px]:w-[92px]"
        />
      </UContainer>
    </section>

    <section class="sticky top-[var(--ui-header-height)] z-40 border-b border-ink bg-paper/95 backdrop-blur-xl">
      <UContainer class="flex min-h-[88px] max-w-[80rem] items-center gap-5 max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:gap-3 max-[900px]:py-3.5">
        <SearchBar :initial-value="q" label="" :placeholder="t('search.placeholder')" :submit-label="t('common.searchAgain')" />
        <span class="inline-flex min-h-12 shrink-0 items-center border-l border-ink/20 pl-5 font-mono text-xs max-[900px]:min-h-0 max-[900px]:border-l-0 max-[900px]:border-t max-[900px]:pl-0 max-[900px]:pt-3" aria-live="polite">{{ q ? t('search.resultCount', { count: page.data.length }) : t('search.hint') }}</span>
      </UContainer>
    </section>

    <section class="py-14 sm:pb-[86px]">
      <UContainer class="max-w-[80rem]">
        <div v-if="pending" class="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-live="polite" aria-label="Loading search results">
          <UCard v-for="index in 8" :key="index" variant="outline" class="overflow-hidden border-ink/15 bg-paper" :ui="{ body: 'space-y-3 p-3 sm:p-3' }">
            <USkeleton class="aspect-square w-full rounded-[5px]" />
            <USkeleton class="h-5 w-2/3" />
            <USkeleton class="h-4 w-full" />
          </UCard>
        </div>

        <template v-else-if="q && page.data.length">
          <div class="mb-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('search.matchingShelf') }}</p>
              <h2 class="font-display text-3xl font-extrabold sm:text-[40px]">{{ t('search.openPack') }}</h2>
            </div>
            <UButton :label="t('search.clear')" color="neutral" variant="outline" :to="localePath({ name: 'albums' })" class="border-ink bg-paper" />
          </div>
          <AlbumGrid :albums="page.data" />
        </template>

        <div v-else-if="q" class="border-2 border-ink bg-sky p-6 shadow-[6px_6px_0_#171717] sm:p-9">
          <UEmpty icon="i-lucide-search-x" :title="t('search.emptyTitle')" :description="t('search.emptyDescription')" size="lg">
            <template #actions>
              <div class="flex flex-wrap justify-center gap-2">
                <UButton v-for="suggestion in suggestions" :key="suggestion" :label="suggestion" color="neutral" variant="outline" :to="localePath({ name: 'search', query: { q: suggestion } })" class="border-ink bg-paper" />
              </div>
            </template>
          </UEmpty>
        </div>

        <div v-else class="grid gap-6 border-2 border-ink bg-mint p-6 shadow-[6px_6px_0_#171717] sm:p-9 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <p class="font-mono text-xs font-bold uppercase">{{ t('search.startHere') }}</p>
            <h2 class="mt-2 font-display text-3xl font-extrabold">{{ t('search.suggestionsTitle') }}</h2>
          </div>
          <div class="flex flex-wrap gap-2 md:justify-end">
            <UButton v-for="suggestion in suggestions" :key="suggestion" :label="suggestion" icon="i-lucide-search" color="neutral" variant="outline" :to="localePath({ name: 'search', query: { q: suggestion } })" class="border-ink bg-paper" />
          </div>
        </div>

        <nav v-if="page.nextCursor" class="mt-[42px] flex items-center justify-center gap-2" :aria-label="t('search.more')">
          <span class="grid min-h-[42px] min-w-[42px] place-items-center rounded-[6px] border border-ink bg-brand-500 font-mono font-bold shadow-[3px_3px_0_#171717]" aria-current="page">{{ currentPage }}</span>
          <UButton :label="t('search.more')" trailing-icon="i-lucide-arrow-right" :to="localePath(nextPage)" class="offset-action" />
        </nav>
      </UContainer>
    </section>
  </div>
</template>
