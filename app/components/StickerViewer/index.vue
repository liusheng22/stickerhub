<script setup lang="ts">
import type { StickerMember } from '#shared/types/stickers'
import { stickerImage } from '#shared/utils/text'

const props = defineProps<{
  members: StickerMember[]
  albumName: string
}>()

const { t } = useI18n()
const open = defineModel<boolean>('open', { default: false })
const selectedIndex = defineModel<number>('selectedIndex', { default: 0 })
const carouselKey = ref(0)
const initialIndex = ref(0)
const thumbnailFallbacks = reactive(new Set<string>())
const unavailableImages = reactive(new Set<string>())

const currentMember = computed(() => props.members[selectedIndex.value])
const currentImage = computed(() => currentMember.value ? viewerImage(currentMember.value) : null)
const currentLabel = computed(() => {
  const member = currentMember.value
  return member?.caption || member?.attachedText || member?.displayName || t('sticker.itemLabel', { name: props.albumName, index: selectedIndex.value + 1 })
})

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
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('sticker.viewerTitle', { name: albumName })"
    :description="t('sticker.viewerDescription')"
    :ui="{
      content: 'w-[min(920px,calc(100vw-24px))] max-w-none overflow-hidden border-2 border-ink bg-paper shadow-[8px_8px_0_#171717]',
      header: 'border-b border-ink px-4 py-3 sm:px-5',
      body: 'p-0 sm:p-0',
      footer: 'border-t border-ink px-4 py-3 sm:px-5',
    }"
  >
    <template #body>
      <UCarousel
        v-if="members.length"
        :key="carouselKey"
        :items="members"
        :start-index="initialIndex"
        arrows
        loop
        class="bg-lilac p-4 sm:p-7"
        :prev="{ class: 'border-2 border-ink bg-paper shadow-[3px_3px_0_#171717]' }"
        :next="{ class: 'border-2 border-ink bg-paper shadow-[3px_3px_0_#171717]' }"
        :ui="{
          item: 'basis-full',
          controls: 'mt-4 justify-center',
          arrows: 'gap-3',
        }"
        :aria-label="t('sticker.originals')"
        @select="selectedIndex = $event"
      >
        <template #default="{ item, index }">
          <div class="mx-auto grid min-h-[min(66vh,620px)] max-w-[680px] place-items-center rounded-[7px] border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_#171717] sm:p-9">
            <img
              v-if="viewerImage(item)"
              :src="viewerImage(item) || undefined"
              :alt="item.caption || item.attachedText || item.displayName || t('sticker.itemLabel', { name: albumName, index: index + 1 })"
              width="480"
              height="480"
              class="max-h-[min(54vh,480px)] max-w-full object-contain [image-rendering:auto]"
              decoding="async"
              referrerpolicy="no-referrer"
              @error="handleImageError(item)"
            >
            <UIcon v-else name="i-lucide-image-off" class="size-12 text-ink/40" :aria-label="t('sticker.originalUnavailable')" />
          </div>
        </template>
      </UCarousel>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite">
          <strong class="block text-sm">{{ currentLabel }}</strong>
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
          class="border-ink bg-paper"
        />
      </div>
    </template>
  </UModal>
</template>
