<script setup lang="ts">
import type { StickerMember } from '#shared/types/stickers'
import { stickerDisplayName, stickerImage } from '#shared/utils/text'

const props = defineProps<{
  members: StickerMember[]
  albumName: string
}>()

const { t } = useI18n()
const open = defineModel<boolean>('open', { default: false })
const selectedIndex = defineModel<number>('selectedIndex', { default: 0 })
const carouselRegion = ref<HTMLElement | null>(null)
const carouselKey = ref(0)
const initialIndex = ref(0)
const thumbnailFallbacks = reactive(new Set<string>())
const unavailableImages = reactive(new Set<string>())

const currentMember = computed(() => props.members[selectedIndex.value])
const currentImage = computed(() => currentMember.value ? viewerImage(currentMember.value) : null)
const currentLabel = computed(() => currentMember.value ? stickerDisplayName(currentMember.value) : null)

watch(open, (isOpen) => {
  if (!isOpen) return
  initialIndex.value = Math.min(Math.max(selectedIndex.value, 0), Math.max(props.members.length - 1, 0))
  carouselKey.value += 1
})

function viewerImage(member: StickerMember) {
  if (unavailableImages.has(member.md5)) {
    return null
  }

  return thumbnailFallbacks.has(member.md5)
    ? member.thumbUrl
    : stickerImage(member)
}

function handleImageError(member: StickerMember) {
  if (!thumbnailFallbacks.has(member.md5) && member.thumbUrl && member.thumbUrl !== member.cdnUrl) {
    thumbnailFallbacks.add(member.md5)
    return
  }

  unavailableImages.add(member.md5)
}

function handleOpenAutoFocus(event: Event) {
  event.preventDefault()
  nextTick(() => {
    carouselRegion.value
      ?.querySelector<HTMLElement>('[data-slot="root"]')
      ?.focus({ preventScroll: true })
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('sticker.viewerTitle', { name: albumName })"
    :description="t('sticker.viewerDescription')"
    :content="{ onOpenAutoFocus: handleOpenAutoFocus }"
    :ui="{
      content: 'h-[min(700px,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-[860px] overflow-hidden border-2 border-ink bg-paper shadow-[7px_7px_0_#171717] sm:h-[min(720px,calc(100dvh-3rem))]',
      header: 'min-w-0 shrink-0 border-b border-ink px-4 py-3 pe-16 sm:px-5 sm:pe-16',
      wrapper: 'min-w-0',
      title: 'truncate',
      description: 'line-clamp-2',
      body: 'min-h-0 min-w-0 overflow-hidden p-0 sm:p-0',
      footer: 'min-w-0 shrink-0 border-t border-ink px-4 py-3 sm:px-5',
    }"
  >
    <template #body>
      <div ref="carouselRegion" class="h-full min-h-0 min-w-0">
        <UCarousel
          v-if="members.length"
          :key="carouselKey"
          :items="members"
          :start-index="initialIndex"
          arrows
          loop
          class="h-full min-h-0 min-w-0 bg-lilac p-3 pb-[72px] outline-none sm:p-5 md:p-6"
          :prev="{
            size: 'xl',
            class: 'pointer-events-auto size-11 border-2 border-ink bg-paper text-ink shadow-[3px_3px_0_#171717] hover:bg-brand-50 active:shadow-none focus-visible:ring-4 focus-visible:ring-brand-500/45 disabled:opacity-40',
          }"
          :next="{
            size: 'xl',
            class: 'pointer-events-auto size-11 border-2 border-ink bg-paper text-ink shadow-[3px_3px_0_#171717] hover:bg-brand-50 active:shadow-none focus-visible:ring-4 focus-visible:ring-brand-500/45 disabled:opacity-40',
          }"
          :ui="{
            viewport: 'h-full min-h-0 min-w-0',
            container: 'ms-0 h-full min-w-0 items-stretch',
            item: 'h-full min-w-0 basis-full ps-0',
            controls: 'pointer-events-none absolute inset-0 z-10',
            arrows: 'pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-3 sm:static sm:contents',
            prev: 'static start-auto top-auto translate-y-0 sm:absolute sm:start-8 sm:top-1/2 sm:-translate-y-1/2',
            next: 'static end-auto top-auto translate-y-0 sm:absolute sm:end-8 sm:top-1/2 sm:-translate-y-1/2',
          }"
          :aria-label="t('sticker.originals')"
          @select="selectedIndex = $event"
        >
          <template #default="{ item, index }">
            <div class="relative mx-auto grid h-full min-h-0 w-full max-w-[720px] place-items-center overflow-hidden rounded-[7px] border-2 border-ink bg-paper p-5 shadow-[5px_5px_0_#171717] sm:p-8 md:p-10">
              <span
                class="absolute end-3 top-3 rounded-full border border-ink/20 bg-paper/90 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-ink/65 shadow-sm backdrop-blur-sm"
                aria-hidden="true"
              >
                {{ index + 1 }} / {{ members.length }}
              </span>
              <img
                v-if="viewerImage(item)"
                :src="viewerImage(item) || undefined"
                :alt="stickerDisplayName(item) || t('sticker.itemLabel', { name: albumName, index: String(index + 1).padStart(2, '0') })"
                width="480"
                height="480"
                class="max-h-full max-w-full object-contain [image-rendering:auto]"
                decoding="async"
                referrerpolicy="no-referrer"
                @error="handleImageError(item)"
              >
              <UIcon v-else name="i-lucide-image-off" class="size-12 text-ink/40" :aria-label="t('sticker.originalUnavailable')" />
            </div>
          </template>
        </UCarousel>
      </div>
    </template>

    <template #footer>
      <div class="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0" aria-live="polite">
          <strong v-if="currentLabel" class="block truncate text-sm">{{ currentLabel }}</strong>
          <span class="font-mono text-xs text-ink/60">{{ t('sticker.fileMeta', { current: selectedIndex + 1, total: members.length }) }}</span>
        </div>
        <UButton
          v-if="currentImage"
          :label="t('sticker.openOriginal')"
          icon="i-lucide-external-link"
          color="neutral"
          variant="outline"
          :to="currentImage"
          external
          target="_blank"
          rel="noopener noreferrer"
          class="w-full shrink-0 justify-center border-ink bg-paper sm:w-auto"
        />
      </div>
    </template>
  </UModal>
</template>
