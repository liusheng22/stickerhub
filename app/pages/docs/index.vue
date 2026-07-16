<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const activeSection = ref('quick-start')
const copiedBlock = ref<string | null>(null)
let observer: IntersectionObserver | undefined

const sectionLinks = computed(() => [
  { id: 'quick-start', label: t('docs.sectionQuickStart'), icon: 'i-lucide-rocket' },
  { id: 'authentication', label: t('docs.sectionAuthentication'), icon: 'i-lucide-key-round' },
  { id: 'pagination-errors', label: t('docs.sectionPagination'), icon: 'i-lucide-list-restart' },
  { id: 'resources', label: t('docs.sectionResources'), icon: 'i-lucide-boxes' },
])

const quickSteps = computed(() => [
  { number: '01', title: t('docs.stepOneTitle'), text: t('docs.stepOneText'), color: 'bg-lilac' },
  { number: '02', title: t('docs.stepTwoTitle'), text: t('docs.stepTwoText'), color: 'bg-mint' },
  { number: '03', title: t('docs.stepThreeTitle'), text: t('docs.stepThreeText'), color: 'bg-sky' },
])

const errorRows = computed(() => [
  { status: '400', meaning: t('docs.status400') },
  { status: '401', meaning: t('docs.status401') },
  { status: '404', meaning: t('docs.status404') },
  { status: '429', meaning: t('docs.status429') },
  { status: '500', meaning: t('docs.status500') },
])

const errorColumns = computed(() => [
  { accessorKey: 'status', header: 'HTTP' },
  { accessorKey: 'meaning', header: t('docs.responseCodes') },
])

const resources = computed(() => [
  {
    method: 'GET',
    path: '/api/v1/health',
    title: t('docs.healthResource'),
    text: t('docs.healthResourceText'),
    icon: 'i-lucide-activity',
    color: 'bg-mint',
  },
  {
    method: 'GET',
    path: '/api/v1/albums',
    title: t('docs.albumsResource'),
    text: t('docs.albumsResourceText'),
    icon: 'i-lucide-images',
    color: 'bg-sky',
  },
  {
    method: 'GET',
    path: '/api/v1/members/{md5}',
    title: t('docs.membersResource'),
    text: t('docs.membersResourceText'),
    icon: 'i-lucide-sticker',
    color: 'bg-lilac',
  },
])

const shellExample = String.raw`curl https://stickerhub.lius.me/api/v1/health \
  -H 'X-API-Key: YOUR_API_KEY' \
  -H 'Accept: application/json'`

const javascriptExample = String.raw`const response = await fetch('/api/v1/albums?q=cat&limit=24', {
  headers: {
    Accept: 'application/json',
    'X-API-Key': process.env.STICKERHUB_API_KEY,
  },
})

if (!response.ok) {
  const { error } = await response.json()
  throw new Error(error.code + ': ' + error.message)
}

const { data, nextCursor } = await response.json()`

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
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

    if (visible[0]?.target.id) activeSection.value = visible[0].target.id
  }, { rootMargin: '-18% 0px -68% 0px' })

  for (const section of sectionLinks.value) {
    const element = document.getElementById(section.id)
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
    <section class="overflow-hidden border-b border-ink bg-sky">
      <UContainer class="relative grid min-h-[390px] max-w-[80rem] items-center gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_330px] lg:py-20">
        <div class="relative z-10">
          <div class="mb-7 flex flex-wrap gap-2">
            <UBadge :label="t('docs.guideBadge')" icon="i-lucide-book-open-text" color="neutral" variant="outline" class="border-ink bg-paper font-mono" />
            <UBadge :label="t('docs.contractBadge')" icon="i-lucide-braces" color="neutral" variant="outline" class="border-ink bg-mint font-mono" />
            <UBadge :label="t('docs.endpointsBadge')" icon="i-lucide-route" color="neutral" variant="outline" class="border-ink bg-lilac font-mono" />
          </div>

          <h1 class="max-w-[820px] font-display text-[clamp(3.2rem,7vw,6.5rem)] font-extrabold leading-[.88] tracking-[-.045em]">
            {{ t('docs.guideTitle') }}
          </h1>
          <p class="mt-7 max-w-[760px] text-lg leading-8 text-ink/75 sm:text-xl">
            {{ t('docs.guideDescription') }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UButton
              :label="t('docs.openReference')"
              icon="i-lucide-play"
              trailing-icon="i-lucide-arrow-up-right"
              :to="localePath('/docs/reference')"
              class="offset-action"
            />
            <UButton
              :label="t('docs.viewContract')"
              icon="i-lucide-file-json-2"
              color="neutral"
              variant="outline"
              href="/openapi.json"
              target="_blank"
              external
              class="border-2 border-ink bg-paper"
            />
          </div>
        </div>

        <div class="relative hidden min-h-[250px] lg:block" aria-hidden="true">
          <div class="absolute right-8 top-2 w-[230px] rotate-6 border-2 border-ink bg-paper p-4 shadow-[8px_8px_0_#171717]">
            <div class="grid aspect-[4/3] place-items-center border border-ink bg-lilac">
              <UIcon name="i-lucide-braces" class="size-20" />
            </div>
            <p class="mt-4 font-mono text-xs font-bold">OPENAPI / 3.1.0</p>
          </div>
          <div class="absolute bottom-0 left-0 w-[210px] -rotate-6 border-2 border-ink bg-mint px-5 py-4 shadow-[6px_6px_0_#ff5a2f]">
            <p class="font-mono text-[11px] font-bold uppercase">Authorization</p>
            <p class="mt-2 font-mono text-sm">X-API-Key</p>
          </div>
        </div>
      </UContainer>
    </section>

    <UContainer class="grid max-w-[80rem] gap-10 py-12 lg:grid-cols-[210px_minmax(0,1fr)_280px] lg:py-16">
      <aside class="lg:sticky lg:top-[calc(var(--ui-header-height)+24px)] lg:self-start">
        <p class="mb-3 font-mono text-[11px] font-bold uppercase tracking-[.12em] text-ink/55">{{ t('docs.reference') }}</p>
        <nav class="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1" :aria-label="t('docs.reference')">
          <UButton
            v-for="section in sectionLinks"
            :key="section.id"
            :label="section.label"
            :icon="section.icon"
            :to="`#${section.id}`"
            color="neutral"
            :variant="activeSection === section.id ? 'soft' : 'ghost'"
            class="shrink-0 justify-start lg:w-full"
            :class="activeSection === section.id ? 'bg-lilac text-ink' : 'text-ink/65'"
          />
        </nav>
      </aside>

      <article class="min-w-0">
        <section id="quick-start" class="scroll-mt-28">
          <p class="font-mono text-xs font-bold uppercase text-brand-600">01 / {{ t('docs.quickStart') }}</p>
          <h2 class="mt-2 font-display text-[clamp(2.4rem,5vw,4.3rem)] font-extrabold leading-[.95]">{{ t('docs.quickStart') }}</h2>
          <p class="mt-5 max-w-[68ch] text-lg leading-8 text-ink/70">{{ t('docs.quickStartIntro') }}</p>

          <div class="mt-8 grid gap-4 md:grid-cols-3">
            <UCard v-for="step in quickSteps" :key="step.number" variant="outline" class="border-2 border-ink shadow-[4px_4px_0_#171717]" :class="step.color">
              <p class="font-mono text-xs font-bold">{{ step.number }}</p>
              <h3 class="mt-6 font-display text-xl font-extrabold">{{ step.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-ink/70">{{ step.text }}</p>
            </UCard>
          </div>

          <UAlert
            :title="t('docs.accessProvisionTitle')"
            :description="t('docs.accessProvisionText')"
            icon="i-lucide-key-round"
            color="neutral"
            variant="subtle"
            class="mt-6 rounded-none border-l-4 border-brand-500 bg-brand-50"
          />

          <h3 class="mt-10 font-display text-2xl font-extrabold">{{ t('docs.firstRequest') }}</h3>
          <p class="mt-2 leading-7 text-ink/70">{{ t('docs.firstRequestText') }}</p>
          <div class="mt-5 overflow-x-auto rounded-md border-2 border-ink bg-ink text-paper shadow-[6px_6px_0_#ff5a2f]">
            <div class="flex items-center justify-between border-b border-paper/20 px-4 py-2">
              <span class="font-mono text-[11px] text-paper/65">{{ t('docs.shellLabel') }}</span>
              <UButton
                :label="copiedBlock === 'shell' ? t('docs.copied') : t('docs.copy')"
                :icon="copiedBlock === 'shell' ? 'i-lucide-check' : 'i-lucide-copy'"
                color="neutral"
                variant="ghost"
                size="xs"
                class="text-paper hover:bg-paper/10"
                @click="copyCode('shell', shellExample)"
              />
            </div>
            <pre class="m-0 min-w-max p-5 font-mono text-[13px] leading-7"><code>{{ shellExample }}</code></pre>
          </div>
        </section>

        <section id="authentication" class="scroll-mt-28 pt-20">
          <p class="border-t border-ink pt-3 font-mono text-xs font-bold uppercase text-brand-600">02 / {{ t('docs.authentication') }}</p>
          <h2 class="mt-2 font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-none">{{ t('docs.authentication') }}</h2>
          <p class="mt-5 max-w-[68ch] leading-8 text-ink/70">{{ t('docs.authenticationText') }}</p>
          <UAlert
            :title="t('docs.keyTitle')"
            :description="t('docs.keyDescription')"
            icon="i-lucide-shield-check"
            color="neutral"
            variant="subtle"
            class="mt-6 rounded-none border-2 border-ink bg-lilac shadow-[4px_4px_0_#171717]"
          />
        </section>

        <section id="pagination-errors" class="scroll-mt-28 pt-20">
          <p class="border-t border-ink pt-3 font-mono text-xs font-bold uppercase text-brand-600">03 / {{ t('docs.sectionPagination') }}</p>
          <h2 class="mt-2 font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-none">{{ t('docs.pagination') }}</h2>
          <p class="mt-5 max-w-[68ch] leading-8 text-ink/70">{{ t('docs.paginationText') }}</p>

          <div class="mt-8 overflow-hidden border-2 border-ink bg-paper">
            <div class="border-b border-ink bg-mint px-4 py-3 font-display text-lg font-extrabold">{{ t('docs.responseCodes') }}</div>
            <UTable :data="errorRows" :columns="errorColumns" />
          </div>

          <h3 class="mt-10 font-display text-2xl font-extrabold">{{ t('docs.javascriptExample') }}</h3>
          <p class="mt-2 leading-7 text-ink/70">{{ t('docs.errorText') }}</p>
          <div class="mt-5 overflow-x-auto rounded-md border-2 border-ink bg-ink text-paper shadow-[6px_6px_0_#b9e8ff]">
            <div class="flex items-center justify-between border-b border-paper/20 px-4 py-2">
              <span class="font-mono text-[11px] text-paper/65">JavaScript</span>
              <UButton
                :label="copiedBlock === 'javascript' ? t('docs.copied') : t('docs.copy')"
                :icon="copiedBlock === 'javascript' ? 'i-lucide-check' : 'i-lucide-copy'"
                color="neutral"
                variant="ghost"
                size="xs"
                class="text-paper hover:bg-paper/10"
                @click="copyCode('javascript', javascriptExample)"
              />
            </div>
            <pre class="m-0 min-w-max p-5 font-mono text-[13px] leading-7"><code>{{ javascriptExample }}</code></pre>
          </div>
        </section>

        <section id="resources" class="scroll-mt-28 pt-20">
          <p class="border-t border-ink pt-3 font-mono text-xs font-bold uppercase text-brand-600">04 / {{ t('docs.sectionResources') }}</p>
          <h2 class="mt-2 font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-none">{{ t('docs.resourceMap') }}</h2>

          <div class="mt-8 space-y-4">
            <UCard v-for="resource in resources" :key="resource.path" variant="outline" class="border-2 border-ink" :class="resource.color">
              <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div class="grid size-12 shrink-0 place-items-center border-2 border-ink bg-paper shadow-[3px_3px_0_#171717]">
                  <UIcon :name="resource.icon" class="size-6" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge :label="resource.method" color="neutral" variant="outline" class="border-ink bg-paper font-mono" />
                    <code class="break-all font-mono text-xs">{{ resource.path }}</code>
                  </div>
                  <h3 class="mt-3 font-display text-xl font-extrabold">{{ resource.title }}</h3>
                  <p class="mt-1 leading-7 text-ink/70">{{ resource.text }}</p>
                </div>
              </div>
            </UCard>
          </div>

          <UAlert
            :title="t('docs.publicBoundary')"
            :description="t('docs.publicBoundaryText')"
            icon="i-lucide-eye-off"
            color="neutral"
            variant="subtle"
            class="mt-6 rounded-none border-l-4 border-brand-500 bg-brand-50"
          />
        </section>
      </article>

      <aside class="lg:sticky lg:top-[calc(var(--ui-header-height)+24px)] lg:self-start">
        <UCard variant="outline" class="border-2 border-ink bg-ink text-paper shadow-[7px_7px_0_#ff5a2f]">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <UIcon name="i-lucide-square-terminal" class="size-7 text-mint" />
              <UBadge label="SCALAR" color="neutral" variant="outline" class="border-paper/40 font-mono text-paper" />
            </div>
          </template>
          <h2 class="font-display text-2xl font-extrabold leading-tight">{{ t('docs.referencePanelTitle') }}</h2>
          <p class="mt-3 text-sm leading-6 text-paper/65">{{ t('docs.referencePanelText') }}</p>
          <ul class="mt-6 space-y-3 text-sm">
            <li class="flex gap-2"><UIcon name="i-lucide-search" class="mt-0.5 size-4 shrink-0 text-mint" />{{ t('docs.featureSearch') }}</li>
            <li class="flex gap-2"><UIcon name="i-lucide-key-round" class="mt-0.5 size-4 shrink-0 text-mint" />{{ t('docs.featureAuth') }}</li>
            <li class="flex gap-2"><UIcon name="i-lucide-code-xml" class="mt-0.5 size-4 shrink-0 text-mint" />{{ t('docs.featureClients') }}</li>
          </ul>
          <UButton
            :label="t('docs.openReference')"
            icon="i-lucide-play"
            :to="localePath('/docs/reference')"
            class="mt-7 w-full justify-center border-2 border-paper bg-brand-500 text-ink shadow-[3px_3px_0_#fff]"
          />
        </UCard>

        <UAlert
          :title="t('docs.apiKeyStorageTitle')"
          :description="t('docs.apiKeyStorageText')"
          icon="i-lucide-lock-keyhole"
          color="neutral"
          variant="subtle"
          class="mt-6 rounded-none border border-ink/20 bg-paper"
        />
      </aside>
    </UContainer>
  </div>
</template>
