<script setup lang="ts">
import type { HomePayload } from '#shared/types/stickers'

const { t } = useI18n()
const localePath = useLocalePath()
const { data: homeData } = await useFetch<HomePayload>('/api/site/home', { key: 'docs-header-album' })

const activeSection = ref('introduction')
const copiedBlock = ref<string | null>(null)
let observer: IntersectionObserver | undefined

const navGroups = computed(() => [
  {
    label: t('docs.overview'),
    items: [
      { id: 'introduction', label: t('docs.introduction') },
      { id: 'authentication', label: t('docs.authentication') },
      { id: 'pagination', label: t('docs.pagination') },
    ],
  },
  { label: t('docs.health'), items: [{ id: 'get-health', label: t('docs.getHealth') }] },
  {
    label: t('docs.albums'),
    items: [
      { id: 'list-albums', label: t('docs.listAlbums') },
      { id: 'get-album', label: t('docs.getAlbum') },
    ],
  },
  {
    label: t('docs.members'),
    items: [
      { id: 'list-members', label: t('docs.listMembers') },
      { id: 'get-member', label: t('docs.getMember') },
    ],
  },
])

const tocItems = computed(() => navGroups.value.flatMap((group) => group.items))
const paginationRows = computed(() => [
  { parameter: 'cursor', type: 'string', rules: t('docs.cursorRules') },
  { parameter: 'limit', type: 'integer', rules: t('docs.limitRules') },
  { parameter: 'q', type: 'string', rules: t('docs.queryRules') },
])
const paginationColumns = computed(() => [
  { accessorKey: 'parameter', header: t('docs.parameter') },
  { accessorKey: 'type', header: t('docs.type') },
  { accessorKey: 'rules', header: t('docs.rules') },
])

const shellExample = String.raw`curl https://stickerhub.lius.me/api/v1/health \
  -H 'X-API-Key: YOUR_API_KEY' \
  -H 'Accept: application/json'`

const javascriptExample = String.raw`const response = await fetch('/api/v1/albums?q=cat&limit=24', {
  headers: {
    'Accept': 'application/json',
    'X-API-Key': process.env.STICKERHUB_API_KEY,
  },
})

const { data, nextCursor } = await response.json()`

const docsAlbum = computed(() => homeData.value?.albums[3])
const docsImage = computed(() => docsAlbum.value?.thumbUrl || docsAlbum.value?.iconUrl || docsAlbum.value?.bannerUrl)

async function copyCode(id: string, value: string) {
  if (!navigator.clipboard) return
  await navigator.clipboard.writeText(value)
  copiedBlock.value = id
  window.setTimeout(() => {
    if (copiedBlock.value === id) copiedBlock.value = null
  }, 1600)
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
    if (visible[0]?.target.id) activeSection.value = visible[0].target.id
  }, { rootMargin: '-20% 0px -68% 0px' })

  for (const item of tocItems.value) {
    const element = document.getElementById(item.id)
    if (element) observer.observe(element)
  }
})

onBeforeUnmount(() => observer?.disconnect())

useSeoMeta({
  title: () => t('seo.docs.title'),
  description: () => t('seo.docs.description'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="bg-paper">
    <header class="border-b border-ink bg-sky">
      <UContainer class="flex min-h-[150px] max-w-[80rem] items-center justify-between gap-7 max-[760px]:min-h-[130px]">
        <div>
          <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('docs.eyebrow') }}</p>
          <h1 class="font-display text-[46px] font-extrabold leading-tight max-[760px]:text-4xl">{{ t('docs.pageTitle') }}</h1>
          <p class="mt-2 font-mono text-xs">Version 1.0.0 · X-API-Key</p>
        </div>
        <div class="w-[92px] rotate-5 rounded-[7px] border-2 border-ink bg-paper p-[7px] shadow-[4px_4px_0_#171717] max-[760px]:w-[74px]" aria-hidden="true">
          <div class="grid aspect-square place-items-center overflow-hidden bg-mint">
            <img v-if="docsImage" :src="docsImage" alt="" width="120" height="120" class="size-[82%] object-contain" loading="eager" decoding="async" referrerpolicy="no-referrer">
            <UIcon v-else name="i-lucide-braces" class="size-8" />
          </div>
        </div>
      </UContainer>
    </header>

    <main class="grid grid-cols-[240px_minmax(0,720px)_210px] justify-center gap-[42px] px-6 py-12 pb-[90px] max-[1050px]:grid-cols-[210px_minmax(0,720px)] max-[760px]:grid-cols-1 max-[760px]:gap-0 max-[760px]:px-4 max-[760px]:py-0 max-[760px]:pb-[70px]">
      <nav class="sticky top-[calc(var(--ui-header-height)+24px)] self-start max-[760px]:static max-[760px]:flex max-[760px]:gap-2 max-[760px]:overflow-x-auto max-[760px]:border-b max-[760px]:border-ink max-[760px]:py-3.5" :aria-label="t('docs.reference')">
        <h2 class="mb-3.5 font-mono text-xs font-bold uppercase max-[760px]:hidden">{{ t('docs.reference') }}</h2>
        <div v-for="group in navGroups" :key="group.label" class="mb-6 max-[760px]:contents">
          <strong class="mb-1.5 block text-[13px] max-[760px]:hidden">{{ group.label }}</strong>
          <a
            v-for="item in group.items"
            :key="item.id"
            :href="`#${item.id}`"
            class="block border-l-[3px] border-transparent px-2.5 py-[7px] text-[13px] text-ink/60 transition-colors max-[760px]:shrink-0 max-[760px]:rounded-full max-[760px]:border max-[760px]:border-ink max-[760px]:px-3"
            :class="activeSection === item.id ? 'border-l-brand-500 bg-ink/5 font-extrabold text-ink max-[760px]:border-ink max-[760px]:bg-brand-500' : ''"
          >
            {{ item.label }}
          </a>
        </div>
      </nav>

      <article class="min-w-0 max-[760px]:pt-10">
        <p class="mb-2 font-mono text-xs font-bold uppercase">{{ t('docs.reference') }}</p>
        <h1 id="introduction" class="scroll-mt-32 font-display text-[58px] font-extrabold leading-[.96] max-[760px]:text-[43px]">{{ t('docs.introductionTitle') }}</h1>
        <p class="mt-[18px] max-w-[70ch] text-lg leading-8 text-ink/70">{{ t('docs.introductionText') }}</p>

        <UAlert
          :title="t('docs.keyTitle')"
          :description="t('docs.keyDescription')"
          icon="i-lucide-key-round"
          color="neutral"
          variant="subtle"
          class="my-[22px] rounded-none border-l-4 border-brand-500 bg-lilac"
        />

        <h2 id="authentication" class="scroll-mt-32 mt-[54px] border-t border-ink pt-2 font-display text-[32px] font-extrabold">{{ t('docs.authentication') }}</h2>
        <p class="mt-4 max-w-[70ch] leading-7">{{ t('docs.authenticationText') }}</p>
        <div class="my-[18px] overflow-x-auto rounded-[7px] border-2 border-ink bg-ink text-paper shadow-[5px_5px_0_#ff5a2f]">
          <div class="flex items-center justify-between border-b border-paper/25 px-3 py-2 font-mono text-[10px] text-paper/70">
            <span>Shell</span>
            <UButton :label="copiedBlock === 'shell' ? t('docs.copied') : t('docs.copy')" :icon="copiedBlock === 'shell' ? 'i-lucide-check' : 'i-lucide-copy'" color="neutral" variant="ghost" size="xs" class="min-h-7 text-paper hover:bg-paper/10" @click="copyCode('shell', shellExample)" />
          </div>
          <pre class="m-0 p-[18px] font-mono text-[13px] leading-[1.65]"><code>{{ shellExample }}</code></pre>
        </div>

        <h2 id="pagination" class="scroll-mt-32 mt-[54px] border-t border-ink pt-2 font-display text-[32px] font-extrabold">{{ t('docs.pagination') }}</h2>
        <p class="mt-4 max-w-[70ch] leading-7">{{ t('docs.paginationText') }}</p>
        <div class="mt-4 overflow-hidden border-y border-ink/20">
          <UTable :data="paginationRows" :columns="paginationColumns" class="text-[13px]" />
        </div>

        <h2 id="get-health" class="scroll-mt-32 mt-[54px] border-t border-ink pt-2 font-display text-[32px] font-extrabold"><UBadge label="GET" color="neutral" variant="outline" class="mr-2 border-ink bg-mint font-mono" /> <code class="font-mono text-[.72em]">/api/v1/health</code></h2>
        <p class="mt-4 max-w-[70ch] leading-7">{{ t('docs.healthText') }}</p>

        <h2 id="list-albums" class="scroll-mt-32 mt-[54px] border-t border-ink pt-2 font-display text-[32px] font-extrabold"><UBadge label="GET" color="neutral" variant="outline" class="mr-2 border-ink bg-mint font-mono" /> <code class="font-mono text-[.72em]">/api/v1/albums</code></h2>
        <p class="mt-4 max-w-[70ch] leading-7">{{ t('docs.listAlbumsText') }}</p>
        <div class="my-[18px] overflow-x-auto rounded-[7px] border-2 border-ink bg-ink text-paper shadow-[5px_5px_0_#ff5a2f]">
          <div class="flex items-center justify-between border-b border-paper/25 px-3 py-2 font-mono text-[10px] text-paper/70">
            <span>JavaScript</span>
            <UButton :label="copiedBlock === 'javascript' ? t('docs.copied') : t('docs.copy')" :icon="copiedBlock === 'javascript' ? 'i-lucide-check' : 'i-lucide-copy'" color="neutral" variant="ghost" size="xs" class="min-h-7 text-paper hover:bg-paper/10" @click="copyCode('javascript', javascriptExample)" />
          </div>
          <pre class="m-0 p-[18px] font-mono text-[13px] leading-[1.65]"><code>{{ javascriptExample }}</code></pre>
        </div>

        <h2 id="get-album" class="scroll-mt-32 mt-[54px] border-t border-ink pt-2 font-display text-[32px] font-extrabold"><UBadge label="GET" color="neutral" variant="outline" class="mr-2 border-ink bg-mint font-mono" /> <code class="font-mono text-[.72em]">/api/v1/albums/{productId}</code></h2>
        <p class="mt-4 max-w-[70ch] leading-7">{{ t('docs.getAlbumText') }}</p>

        <h2 id="list-members" class="scroll-mt-32 mt-[54px] border-t border-ink pt-2 font-display text-[32px] font-extrabold"><UBadge label="GET" color="neutral" variant="outline" class="mr-2 border-ink bg-mint font-mono" /> <code class="font-mono text-[.72em]">/api/v1/albums/{productId}/members</code></h2>
        <p class="mt-4 max-w-[70ch] leading-7">{{ t('docs.listMembersText') }}</p>

        <h2 id="get-member" class="scroll-mt-32 mt-[54px] border-t border-ink pt-2 font-display text-[32px] font-extrabold"><UBadge label="GET" color="neutral" variant="outline" class="mr-2 border-ink bg-mint font-mono" /> <code class="font-mono text-[.72em]">/api/v1/members/{md5}</code></h2>
        <p class="mt-4 max-w-[70ch] leading-7">{{ t('docs.getMemberText') }}</p>

        <div class="mt-10 flex flex-wrap gap-3 border-t border-ink pt-6">
          <UButton :label="t('docs.openOpenApi')" icon="i-lucide-braces" to="/openapi.json" target="_blank" class="offset-action" />
          <UButton :label="t('docs.browsePacks')" icon="i-lucide-grid-2x2" color="neutral" variant="outline" :to="localePath({ name: 'albums' })" class="border-ink bg-paper" />
        </div>
      </article>

      <aside class="sticky top-[calc(var(--ui-header-height)+24px)] self-start max-[1050px]:hidden">
        <h2 class="mb-3.5 font-mono text-xs font-bold uppercase">{{ t('docs.onThisPage') }}</h2>
        <a
          v-for="item in tocItems"
          :key="item.id"
          :href="`#${item.id}`"
          class="block py-1.5 text-xs text-ink/60"
          :class="activeSection === item.id ? 'font-extrabold text-ink' : ''"
        >
          {{ item.label }}
        </a>
      </aside>
    </main>
  </div>
</template>
