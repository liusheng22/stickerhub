<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('seo.support.title'),
  description: () => t('seo.support.description'),
  ogTitle: () => t('seo.support.title'),
  ogDescription: () => t('seo.support.description'),
})
</script>

<template>
  <div class="bg-paper">
    <section class="overflow-hidden border-b-2 border-ink bg-lilac">
      <UContainer class="relative grid min-h-[360px] max-w-[80rem] items-end gap-8 py-14 sm:min-h-[410px] sm:py-20 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div class="relative z-10">
          <p class="font-mono text-xs font-bold uppercase">{{ t('support.eyebrow') }}</p>
          <h1 class="mt-3 max-w-[900px] font-display text-[clamp(3.5rem,8vw,7.1rem)] font-extrabold leading-[.88]">
            {{ t('support.title') }}
          </h1>
          <p class="mt-6 max-w-[62ch] text-lg leading-8 text-ink/75 sm:text-xl">
            {{ t('support.description') }}
          </p>
        </div>

        <div class="relative hidden min-h-[235px] lg:block" aria-hidden="true">
          <div class="absolute right-3 top-0 grid size-52 rotate-6 place-items-center border-2 border-ink bg-paper shadow-[8px_8px_0_#171717]">
            <UIcon name="i-lucide-heart-handshake" class="size-20 text-brand-500" />
          </div>
          <div class="absolute bottom-1 left-0 -rotate-6 border-2 border-ink bg-sky px-4 py-3 font-mono text-[11px] font-bold uppercase shadow-[5px_5px_0_#171717]">
            {{ t('support.deskNote') }}
          </div>
        </div>
      </UContainer>
    </section>

    <UContainer class="max-w-[80rem] py-12 sm:py-16">
      <section aria-labelledby="support-channels-title">
        <div class="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="font-mono text-xs font-bold uppercase text-brand-600">{{ t('support.channelsEyebrow') }}</p>
            <h2 id="support-channels-title" class="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none">
              {{ t('support.channelsTitle') }}
            </h2>
          </div>
          <p class="max-w-[42ch] text-sm leading-6 text-ink/65">{{ t('support.channelsDescription') }}</p>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <UCard variant="outline" class="overflow-hidden border-2 border-ink bg-paper shadow-[6px_6px_0_#171717]" :ui="{ body: 'p-0 sm:p-0' }">
            <div class="grid h-full lg:grid-cols-[minmax(0,1fr)_minmax(290px,.92fr)]">
              <div class="flex flex-col p-6 sm:p-8">
                <div class="flex size-12 items-center justify-center border-2 border-ink bg-mint shadow-[3px_3px_0_#171717]">
                  <UIcon name="i-lucide-scan-line" class="size-6" />
                </div>
                <p class="mt-7 font-mono text-xs font-bold uppercase">{{ t('support.wechatEyebrow') }}</p>
                <h3 class="mt-2 font-display text-3xl font-extrabold leading-tight">{{ t('support.wechatTitle') }}</h3>
                <p class="mt-4 max-w-[34ch] leading-7 text-ink/70">{{ t('support.wechatDescription') }}</p>
                <p class="mt-auto pt-8 font-mono text-xs text-ink/55">{{ t('support.wechatHint') }}</p>
              </div>
              <figure class="flex items-center justify-center bg-ink p-5 sm:p-7">
                <img
                  src="/images/support/wechat-appreciation.jpg"
                  :alt="t('support.wechatQrAlt')"
                  width="1152"
                  height="1152"
                  class="aspect-square w-full max-w-[360px] border border-paper/35 object-contain"
                >
              </figure>
            </div>
          </UCard>

          <UCard variant="outline" class="border-2 border-ink bg-sky shadow-[6px_6px_0_#171717]">
            <div class="flex h-full flex-col p-1 sm:p-2">
              <div class="flex size-12 items-center justify-center border-2 border-ink bg-paper shadow-[3px_3px_0_#171717]">
                <UIcon name="i-lucide-coffee" class="size-6" />
              </div>
              <p class="mt-7 font-mono text-xs font-bold uppercase">{{ t('support.kofiEyebrow') }}</p>
              <h3 class="mt-2 font-display text-3xl font-extrabold leading-tight">{{ t('support.kofiTitle') }}</h3>
              <p class="mt-4 max-w-[34ch] leading-7 text-ink/70">{{ t('support.kofiDescription') }}</p>
              <p class="mt-7 font-mono text-xs text-ink/60">ko-fi.com/liusheng</p>
              <UButton
                :label="t('support.openKofi')"
                icon="i-lucide-arrow-up-right"
                trailing-icon="i-lucide-external-link"
                href="https://ko-fi.com/liusheng"
                target="_blank"
                rel="noopener noreferrer"
                external
                class="offset-action mt-auto w-full justify-center bg-brand-500 text-ink"
              />
            </div>
          </UCard>
        </div>
      </section>

      <UAlert
        :title="t('support.voluntaryTitle')"
        :description="t('support.voluntaryDescription')"
        icon="i-lucide-heart"
        color="neutral"
        variant="subtle"
        class="mt-10 rounded-none border-l-4 border-brand-500 bg-brand-50"
      />
    </UContainer>
  </div>
</template>
