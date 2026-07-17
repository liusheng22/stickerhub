<script setup lang="ts">
import type { AlbumPagePayload, RelatedAlbumGroup } from '#shared/types/stickers'
import { creatorLabel, creatorSlug, deriveSeriesKey, isPlatformPublisher } from '#shared/utils/related'
import { albumHeroImage } from '#shared/utils/text'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const productId = computed(() => String(route.params.productId || ''))
const coverFailed = ref(false)
const viewerOpen = ref(false)
const selectedStickerIndex = ref(0)

const { data, error } = await useFetch<AlbumPagePayload>(() => `/api/site/albums/${encodeURIComponent(productId.value)}`, { key: `sticker-pack-${productId.value}` })

if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode === 404 ? 404 : 503,
    statusMessage: error.value?.statusCode === 404 ? '404' : t('pageLabels.catalog'),
    message: error.value?.statusCode === 404 ? t('album.notAvailable') : t('common.catalogUnavailable'),
  })
}

const page = computed(() => data.value as AlbumPagePayload)
const album = computed(() => page.value.album)
const description = computed(() => album.value.description?.trim()
  || t('seo.albumDetail.fallbackDescription', { name: album.value.packName, count: album.value.memberCount }))
const coverUrl = computed(() => albumHeroImage(album.value))
const albumCreator = computed(() => isPlatformPublisher(album.value.copyright) ? null : creatorLabel(album.value.copyright))
const albumCreatorSlug = computed(() => albumCreator.value ? creatorSlug(album.value.copyright) : null)
const breadcrumbItems = computed(() => {
  const items: Array<{ label: string, to?: string }> = [
    { label: t('common.home'), to: localePath({ name: 'index' }) },
    { label: t('navigation.browse'), to: localePath({ name: 'albums' }) },
  ]

  if (albumCreator.value && albumCreatorSlug.value) {
    items.push({
      label: albumCreator.value,
      to: localePath({ name: 'creators-creatorSlug', params: { creatorSlug: albumCreatorSlug.value } }),
    })
  }

  items.push({ label: album.value.packName })
  return items
})

function groupEyebrow(group: RelatedAlbumGroup) {
  if (group.reason === 'creator') return t('album.sameCreator')
  if (group.reason === 'series') return t('album.sameSeries')
  return t('album.keepBrowsing')
}

function groupLabel(group: RelatedAlbumGroup) {
  if (group.reason === 'creator' && albumCreator.value) return t('album.moreFromCreator', { name: albumCreator.value })
  if (group.reason === 'series') return t('album.moreInSeries', { name: deriveSeriesKey(album.value.packName) || album.value.packName })
  return t('album.moreToExplore')
}

function groupAction(group: RelatedAlbumGroup) {
  const query = deriveSeriesKey(album.value.packName) || album.value.packName
  if (group.reason === 'creator' && albumCreatorSlug.value) {
    return {
      label: t('album.openCreator'),
      to: localePath({ name: 'creators-creatorSlug', params: { creatorSlug: albumCreatorSlug.value } }),
    }
  }
  return group.reason === 'fallback'
    ? { label: t('common.browseAll'), to: localePath({ name: 'albums' }) }
    : { label: t('album.seeSeries'), to: localePath({ name: 'search', query: { q: query } }) }
}

function openSticker(index: number) {
  selectedStickerIndex.value = index
  viewerOpen.value = true
}

useSeoMeta({
  title: () => t('seo.albumDetail.title', { name: album.value.packName }),
  description,
  ogTitle: () => t('seo.albumDetail.ogTitle', { name: album.value.packName }),
  ogDescription: description,
  ogImage: () => coverUrl.value || undefined,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div>
    <section class="border-b border-ink bg-lilac py-[34px] pb-[62px]">
      <UContainer class="max-w-[80rem]">
        <UBreadcrumb :items="breadcrumbItems" :aria-label="t('common.breadcrumb')" class="mb-[26px] font-mono text-xs" />

        <div class="grid grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] items-center gap-[54px] max-[900px]:grid-cols-1 max-[560px]:gap-[30px]">
          <div class="-rotate-2 rounded-[8px] border-2 border-ink bg-paper p-3.5 pb-[18px] shadow-[8px_8px_0_#171717] max-[900px]:mx-auto max-[900px]:w-[min(440px,80%)] max-[560px]:w-[86%]">
            <div class="grid aspect-square place-items-center overflow-hidden rounded-[5px] border border-ink bg-mint p-4">
              <img
                v-if="coverUrl && !coverFailed"
                :src="coverUrl"
                :alt="t('album.coverAlt', { name: album.packName })"
                width="720"
                height="720"
                class="size-full object-contain"
                decoding="async"
                loading="eager"
                fetchpriority="high"
                referrerpolicy="no-referrer"
                @error="coverFailed = true"
              >
              <UIcon v-else name="i-lucide-image-off" class="size-10 text-ink/45" :aria-label="t('album.coverUnavailable')" />
            </div>
            <span class="mt-3 block font-mono text-xs">{{ t('album.collectionCard', { count: album.memberCount }) }}</span>
          </div>

          <div class="rounded-[8px] border-2 border-ink bg-paper p-9 shadow-[7px_7px_0_#171717] max-[560px]:px-5 max-[560px]:py-6">
            <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('album.stickerPack') }}</p>
            <h1 class="font-display text-[64px] font-extrabold leading-[.96] max-[900px]:text-[50px] max-[560px]:text-[38px]">{{ album.packName }}</h1>
            <p class="mb-[26px] mt-5 text-lg leading-8">{{ description }}</p>
            <div class="flex flex-wrap gap-2.5 border-t border-ink pt-5">
              <UBadge color="neutral" variant="outline" size="lg" class="min-h-[30px] border-ink bg-paper font-mono">{{ t('common.stickers', { count: album.memberCount.toLocaleString(locale) }) }}</UBadge>
              <UBadge color="neutral" variant="outline" size="lg" class="min-h-[30px] border-ink bg-paper font-mono">{{ album.priceText || t('common.priceUnavailable') }}</UBadge>
              <NuxtLink
                v-if="albumCreator && albumCreatorSlug"
                :to="localePath({ name: 'creators-creatorSlug', params: { creatorSlug: albumCreatorSlug } })"
                class="inline-flex min-h-11 items-center rounded-[6px] border border-ink bg-paper px-3 text-sm font-semibold transition-colors hover:bg-mint/45 focus-visible:bg-mint/45"
              >
                {{ t('album.byCreator', { name: albumCreator }) }}
              </NuxtLink>
              <UBadge v-else-if="album.copyright" color="neutral" variant="outline" size="lg" class="min-h-[30px] border-ink bg-paper">{{ album.copyright }}</UBadge>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-[66px] pb-[84px]">
      <UContainer class="max-w-[80rem]">
        <div class="mb-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('album.packPreview') }}</p>
            <h2 class="font-display text-3xl font-extrabold sm:text-[40px]">{{ t('album.previewTitle') }}</h2>
          </div>
          <span class="font-mono text-xs">{{ t('common.previews', { count: page.members.length }) }}</span>
        </div>
        <div class="grid grid-cols-3 border-l border-t border-ink bg-paper sm:grid-cols-4 lg:grid-cols-6">
          <StickerTile v-for="(member, index) in page.members" :key="member.md5" :member="member" :index="index" @open="openSticker" />
        </div>
      </UContainer>
    </section>

    <StickerViewer
      v-model:open="viewerOpen"
      v-model:selected-index="selectedStickerIndex"
      :members="page.members"
      :album-name="album.packName"
    />

    <section v-for="group in page.relatedGroups" :key="group.reason" class="border-t border-ink bg-mint py-[58px] pb-[76px]">
      <UContainer class="max-w-[80rem]">
        <div class="mb-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p class="mb-2 font-mono text-xs font-bold uppercase">{{ groupEyebrow(group) }}</p>
            <h2 class="font-display text-3xl font-extrabold sm:text-[40px]">{{ groupLabel(group) }}</h2>
          </div>
          <UButton :label="groupAction(group).label" color="neutral" variant="outline" :to="groupAction(group).to" class="border-ink bg-paper" />
        </div>
        <AlbumGrid :albums="group.items" hide-description />
      </UContainer>
    </section>
  </div>
</template>
