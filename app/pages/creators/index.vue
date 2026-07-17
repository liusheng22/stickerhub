<script setup lang="ts">
import type { CreatorSummary, CursorPage } from '#shared/types/stickers'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const queryString = (value: unknown) => typeof value === 'string' ? value : ''
const q = ref(queryString(route.query.q))
const cursor = computed(() => queryString(route.query.cursor) || undefined)
const currentQuery = computed(() => queryString(route.query.q).trim().slice(0, 80))
const currentPage = computed(() => Math.max(1, Number.parseInt(queryString(route.query.page) || '1', 10) || 1))
const creatorKey = computed(() => `creator-directory:${currentQuery.value}:${cursor.value || 'first'}`)

watch(() => route.query.q, (value) => { q.value = queryString(value) })

const { data, error, pending } = await useAsyncData(creatorKey, () => $fetch<CursorPage<CreatorSummary>>('/api/site/creators', {
  query: { q: currentQuery.value || undefined, cursor: cursor.value, limit: 24 },
}), {
  default: () => ({ data: [], nextCursor: null }),
})

if (error.value || !data.value) {
  throw createError({ statusCode: 503, message: t('creators.unavailable') })
}

const page = computed(() => data.value as CursorPage<CreatorSummary>)
const nextPage = computed(() => ({
  name: 'creators' as const,
  query: { q: currentQuery.value || undefined, cursor: page.value.nextCursor || undefined, page: currentPage.value + 1 },
}))

async function searchCreators() {
  await navigateTo(localePath({ name: 'creators', query: { q: q.value.trim() || undefined } }))
}

useSeoMeta({
  title: () => currentQuery.value ? t('seo.creators.queryTitle', { query: currentQuery.value }) : t('seo.creators.title'),
  description: () => t('seo.creators.description'),
})
</script>

<template>
  <div>
    <section class="border-b border-ink bg-sky py-16 sm:py-20">
      <UContainer class="max-w-[80rem]">
        <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('creators.eyebrow') }}</p>
        <h1 class="max-w-[900px] font-display text-[clamp(3rem,7vw,6.5rem)] font-extrabold leading-[.92]">{{ t('creators.title') }}</h1>
        <p class="mt-6 max-w-[62ch] text-lg font-semibold leading-8">{{ t('creators.description') }}</p>
      </UContainer>
    </section>

    <section class="sticky top-[var(--ui-header-height)] z-40 border-b border-ink bg-paper/95 backdrop-blur-xl">
      <UContainer class="flex min-h-[88px] max-w-[80rem] items-center gap-5 max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:gap-3 max-[900px]:py-3.5">
        <UForm class="min-w-0 flex-1" :state="{ q }" role="search" @submit="searchCreators">
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 max-[560px]:grid-cols-1">
            <UInput v-model="q" type="search" name="q" icon="i-lucide-search" :aria-label="t('creators.searchPlaceholder')" :placeholder="t('creators.searchPlaceholder')" maxlength="80" size="xl" class="w-full min-w-0" :ui="{ base: 'border border-ink bg-paper' }" />
            <UButton type="submit" :label="t('creators.searchSubmit')" size="xl" class="offset-action max-[560px]:mt-1" />
          </div>
        </UForm>
        <span class="inline-flex min-h-12 shrink-0 items-center border-l border-ink/20 pl-5 font-mono text-xs max-[900px]:min-h-0 max-[900px]:border-l-0 max-[900px]:border-t max-[900px]:pl-0 max-[900px]:pt-3" aria-live="polite">{{ pending ? t('creators.checking') : t('creators.shelfCount', { count: page.data.length }) }}</span>
      </UContainer>
    </section>

    <section class="py-14 sm:pb-[86px]">
      <UContainer class="max-w-[80rem]">
        <div v-if="pending" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" :aria-label="t('creators.loading')" aria-live="polite">
          <UCard v-for="index in 8" :key="index" variant="outline" class="border-ink/20" :ui="{ body: 'space-y-3 p-3 sm:p-3' }">
            <USkeleton class="aspect-[1.2/1] w-full rounded-[5px]" />
            <USkeleton class="h-6 w-2/3" />
            <USkeleton class="h-4 w-1/2" />
          </UCard>
        </div>

        <UPageGrid v-else-if="page.data.length" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <CreatorCard v-for="(creator, index) in page.data" :key="creator.slug" :creator="creator" :index="index" />
        </UPageGrid>

        <UEmpty v-else icon="i-lucide-user-search" :title="t('creators.emptyTitle')" :description="t('creators.emptyDescription')" size="lg" class="border-2 border-ink bg-lilac p-8 shadow-[6px_6px_0_#171717]" />

        <nav v-if="!pending && page.nextCursor" class="mt-11 flex items-center justify-center gap-2" :aria-label="t('creators.more')">
          <span class="grid min-h-11 min-w-11 place-items-center rounded-[6px] border border-ink bg-brand-500 font-mono font-bold shadow-[3px_3px_0_#171717]" aria-current="page">{{ currentPage }}</span>
          <UButton :label="t('creators.more')" trailing-icon="i-lucide-arrow-right" :to="localePath(nextPage)" class="offset-action" />
        </nav>
      </UContainer>
    </section>
  </div>
</template>
