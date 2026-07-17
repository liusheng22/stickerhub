<script setup lang="ts">
import type { AlbumSummary, NumberedPage } from '#shared/types/stickers'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const queryString = (value: unknown) => typeof value === 'string' ? value : ''
const q = ref(queryString(route.query.q))
const requestedPage = computed(() => Math.max(1, Number.parseInt(queryString(route.query.page) || '1', 10) || 1))

watch(() => route.query.q, (value) => { q.value = queryString(value) })

const requestQuery = computed(() => ({
  q: queryString(route.query.q) || undefined,
  page: requestedPage.value,
  limit: 24,
}))
const catalogKey = computed(() => `sticker-pack-catalog:${requestQuery.value.q || 'all'}:${requestedPage.value}`)

const { data, error, pending } = await useAsyncData(catalogKey, () => $fetch<NumberedPage<AlbumSummary>>('/api/site/albums', {
  query: requestQuery.value,
}))

if (error.value || !data.value) {
  throw createError({ statusCode: 503, message: t('common.catalogUnavailable') })
}

const page = computed(() => data.value as NumberedPage<AlbumSummary>)
const currentPage = requestedPage
const totalPages = computed(() => Math.max(1, Math.ceil(page.value.total / page.value.pageSize)))
const hasPreviousPage = computed(() => currentPage.value > 1)
const hasNextPage = computed(() => currentPage.value < totalPages.value)
const decorativeAlbums = computed(() => {
  const albums = page.value.data
  if (!albums.length) return []
  if (albums.length < 4) return [albums[0]]
  return [albums[Math.floor((albums.length - 1) * .2)], albums[Math.floor((albums.length - 1) * .6)]]
})
const paginationTo = (targetPage: number) => localePath({
  name: 'albums',
  query: {
    q: queryString(route.query.q) || undefined,
    page: targetPage > 1 ? targetPage : undefined,
  },
})

if (requestedPage.value !== page.value.page) {
  await navigateTo(paginationTo(page.value.page), { replace: true, redirectCode: 302 })
}

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
        <span class="inline-flex min-h-12 shrink-0 items-center border-l border-ink/20 pl-5 font-mono text-xs max-[900px]:min-h-0 max-[900px]:border-l-0 max-[900px]:border-t max-[900px]:pl-0 max-[900px]:pt-3">{{ t('albums.catalogStats', { count: page.total.toLocaleString(locale) }) }}</span>
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

        <div v-if="pending" class="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" :aria-label="t('common.loading')" aria-live="polite">
          <UCard v-for="index in 8" :key="index" variant="outline" class="overflow-hidden border-ink/15 bg-paper" :ui="{ body: 'space-y-3 p-3 sm:p-3' }">
            <USkeleton class="aspect-square w-full rounded-[5px]" />
            <USkeleton class="h-5 w-2/3" />
            <USkeleton class="h-4 w-full" />
          </UCard>
        </div>
        <AlbumGrid v-else :albums="page.data" :empty-title="t('albums.emptyTitle')" :empty-text="t('albums.emptyDescription')" />

        <nav v-if="page.total > page.pageSize" class="mt-10" :class="pending && 'pointer-events-none opacity-60'" :aria-busy="pending" :aria-label="t('albums.pagination')">
          <div class="hidden items-center justify-center gap-2 sm:flex">
            <UButton
              :label="t('albums.previous')"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              size="md"
              :disabled="!hasPreviousPage"
              :to="hasPreviousPage ? paginationTo(currentPage - 1) : undefined"
              class="min-h-11 px-3 font-semibold text-ink/65 hover:bg-mint/45 hover:text-ink disabled:opacity-30"
            />

            <UPagination
              :page="currentPage"
              :total="page.total"
              :items-per-page="page.pageSize"
              :sibling-count="1"
              :show-controls="false"
              show-edges
              :to="paginationTo"
              size="md"
              color="neutral"
              variant="ghost"
              active-color="neutral"
              active-variant="solid"
              :ui="{
                list: 'gap-1',
                item: '[&_a]:min-h-11 [&_a]:min-w-11 [&_a]:font-mono [&_a]:font-bold',
                ellipsis: '[&_div]:min-h-11 [&_div]:min-w-8 [&_div]:border-0 [&_div]:bg-transparent [&_div]:shadow-none',
              }"
            />

            <UButton
              :label="t('albums.next')"
              trailing-icon="i-lucide-arrow-right"
              color="neutral"
              variant="ghost"
              size="md"
              :disabled="!hasNextPage"
              :to="hasNextPage ? paginationTo(currentPage + 1) : undefined"
              class="min-h-11 px-3 font-semibold text-ink/65 hover:bg-mint/45 hover:text-ink disabled:opacity-30"
            />
          </div>

          <div class="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 sm:hidden">
            <UButton
              icon="i-lucide-arrow-left"
              :aria-label="t('albums.previous')"
              color="neutral"
              variant="outline"
              size="lg"
              square
              :disabled="!hasPreviousPage"
              :to="hasPreviousPage ? paginationTo(currentPage - 1) : undefined"
              class="border-ink/25 bg-paper"
            />
            <span class="text-center font-mono text-sm font-bold tabular-nums text-ink/65">{{ t('albums.pageStatus', { page: currentPage, total: totalPages }) }}</span>
            <UButton
              icon="i-lucide-arrow-right"
              :aria-label="t('albums.next')"
              color="neutral"
              variant="outline"
              size="lg"
              square
              :disabled="!hasNextPage"
              :to="hasNextPage ? paginationTo(currentPage + 1) : undefined"
              class="border-ink/25 bg-paper"
            />
          </div>
        </nav>
      </UContainer>
    </section>
  </div>
</template>
