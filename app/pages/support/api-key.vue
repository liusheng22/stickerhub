<script setup lang="ts">
import { z } from 'zod'

interface VerificationResponse {
  data: {
    email: string
    githubIssueUrl: string
  }
}

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()

const requestSchema = z.object({
  email: z.string().trim().email(t('accessRequest.invalidEmail')),
})
const requestState = reactive({ email: '' })
const sending = ref(false)
const sentTo = ref('')
const sendFailed = ref(false)
const verificationToken = computed(() => typeof route.query.token === 'string' ? route.query.token : '')

const {
  data: verificationResponse,
  status: verificationStatus,
  error: verificationError,
} = await useAsyncData(
  'api-key-request-verification',
  () => verificationToken.value
    ? $fetch<VerificationResponse>('/api/access-requests/verify', { query: { token: verificationToken.value } })
    : Promise.resolve(null),
  {
    watch: [verificationToken],
    default: () => null,
  },
)

const verifiedRequest = computed(() => verificationResponse.value?.data || null)
const verificationFailed = computed(() => Boolean(verificationToken.value) && verificationStatus.value !== 'pending' && Boolean(verificationError.value))

async function sendVerificationEmail() {
  sending.value = true
  sendFailed.value = false

  try {
    await $fetch('/api/access-requests/email', {
      method: 'POST',
      body: { email: requestState.email },
    })
    sentTo.value = requestState.email.trim()
    requestState.email = ''
  } catch {
    sendFailed.value = true
    toast.add({
      title: t('accessRequest.sendErrorTitle'),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    sending.value = false
  }
}

useSeoMeta({
  title: () => t('seo.apiKeyRequest.title'),
  description: () => t('seo.apiKeyRequest.description'),
  ogTitle: () => t('seo.apiKeyRequest.title'),
  ogDescription: () => t('seo.apiKeyRequest.description'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <main class="min-h-[calc(100vh-9rem)] bg-paper py-10 sm:py-16">
    <UContainer class="max-w-[72rem]">
      <NuxtLink
        :to="localePath('/support')"
        class="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink/65 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
        {{ t('accessRequest.backToSupport') }}
      </NuxtLink>

      <div class="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.48fr)] lg:items-start">
        <section class="border-2 border-ink bg-paper shadow-[8px_8px_0_#171717]" aria-labelledby="api-key-request-heading">
          <div class="border-b-2 border-ink bg-lilac p-7 sm:p-10">
            <p class="font-mono text-xs font-bold uppercase tracking-[.12em] text-ink/70">{{ t('accessRequest.eyebrow') }}</p>
            <h1 id="api-key-request-heading" class="mt-3 font-display text-[clamp(2.7rem,6vw,5.2rem)] font-extrabold leading-[.9]">
              {{ t('accessRequest.title') }}
            </h1>
            <p class="mt-5 max-w-[54ch] text-base leading-7 text-ink/75 sm:text-lg">{{ t('accessRequest.description') }}</p>
          </div>

          <div class="p-7 sm:p-10">
            <div v-if="verificationStatus === 'pending'" class="flex min-h-48 items-center gap-3 text-ink/65" role="status">
              <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" aria-hidden="true" />
              <span>{{ t('accessRequest.verifying') }}</span>
            </div>

            <div v-else-if="verifiedRequest" class="space-y-6">
              <div class="flex size-12 items-center justify-center border-2 border-ink bg-mint shadow-[3px_3px_0_#171717]">
                <UIcon name="i-lucide-badge-check" class="size-6" aria-hidden="true" />
              </div>
              <div>
                <p class="font-mono text-xs font-bold uppercase text-brand-600">{{ t('accessRequest.verifiedEyebrow') }}</p>
                <h2 class="mt-2 font-display text-3xl font-extrabold">{{ t('accessRequest.verifiedTitle') }}</h2>
                <p class="mt-3 max-w-[53ch] leading-7 text-ink/70">{{ t('accessRequest.verifiedDescription') }}</p>
              </div>
              <dl class="border-y-2 border-ink py-4">
                <dt class="font-mono text-[11px] font-bold uppercase text-ink/55">{{ t('accessRequest.verifiedEmail') }}</dt>
                <dd class="mt-1 break-all font-semibold">{{ verifiedRequest.email }}</dd>
              </dl>
              <UButton
                :label="t('accessRequest.openGithubIssue')"
                icon="i-lucide-github"
                trailing-icon="i-lucide-external-link"
                :href="verifiedRequest.githubIssueUrl"
                target="_blank"
                rel="noopener noreferrer"
                external
                class="offset-action w-full justify-center sm:w-auto"
              />
              <p class="text-sm leading-6 text-ink/65">{{ t('accessRequest.githubDisclosure') }}</p>
            </div>

            <div v-else-if="verificationFailed" class="space-y-6">
              <UAlert
                :title="t('accessRequest.invalidLinkTitle')"
                :description="t('accessRequest.invalidLinkDescription')"
                icon="i-lucide-circle-alert"
                color="error"
                variant="subtle"
                class="rounded-none border-l-4"
              />
              <UButton :to="localePath('/support/api-key')" :label="t('accessRequest.startOver')" icon="i-lucide-arrow-left" variant="outline" />
            </div>

            <div v-else-if="sentTo" class="space-y-6">
              <UAlert
                :title="t('accessRequest.emailSentTitle')"
                :description="t('accessRequest.emailSentDescription', { email: sentTo })"
                icon="i-lucide-mail-check"
                color="success"
                variant="subtle"
                class="rounded-none border-l-4"
              />
              <p class="text-sm leading-6 text-ink/65">{{ t('accessRequest.sentHelp') }}</p>
            </div>

            <UForm v-else :schema="requestSchema" :state="requestState" class="space-y-6" @submit="sendVerificationEmail">
              <UFormField
                name="email"
                :label="t('accessRequest.emailLabel')"
                :description="t('accessRequest.emailDescription')"
                required
              >
                <UInput
                  v-model="requestState.email"
                  type="email"
                  autocomplete="email"
                  inputmode="email"
                  icon="i-lucide-mail"
                  :placeholder="t('accessRequest.emailPlaceholder')"
                  :disabled="sending"
                  class="w-full"
                />
              </UFormField>
              <UAlert
                v-if="sendFailed"
                :title="t('accessRequest.sendErrorTitle')"
                :description="t('accessRequest.sendErrorDescription')"
                icon="i-lucide-circle-alert"
                color="error"
                variant="subtle"
                class="rounded-none border-l-4"
              />
              <UButton
                type="submit"
                :label="t('accessRequest.sendVerification')"
                icon="i-lucide-send"
                trailing
                :loading="sending"
                class="offset-action w-full justify-center sm:w-auto"
              />
            </UForm>
          </div>
        </section>

        <aside class="border-2 border-ink bg-sky p-6 shadow-[6px_6px_0_#171717] sm:p-7" :aria-label="t('accessRequest.stepsTitle')">
          <p class="font-mono text-xs font-bold uppercase text-ink/65">{{ t('accessRequest.stepsEyebrow') }}</p>
          <h2 class="mt-2 font-display text-2xl font-extrabold">{{ t('accessRequest.stepsTitle') }}</h2>
          <ol class="mt-6 space-y-5">
            <li class="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
              <span class="grid size-8 place-items-center border-2 border-ink bg-paper font-mono text-xs font-bold">1</span>
              <div>
                <h3 class="font-semibold">{{ t('accessRequest.stepOneTitle') }}</h3>
                <p class="mt-1 text-sm leading-6 text-ink/70">{{ t('accessRequest.stepOneDescription') }}</p>
              </div>
            </li>
            <li class="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
              <span class="grid size-8 place-items-center border-2 border-ink bg-paper font-mono text-xs font-bold">2</span>
              <div>
                <h3 class="font-semibold">{{ t('accessRequest.stepTwoTitle') }}</h3>
                <p class="mt-1 text-sm leading-6 text-ink/70">{{ t('accessRequest.stepTwoDescription') }}</p>
              </div>
            </li>
            <li class="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
              <span class="grid size-8 place-items-center border-2 border-ink bg-paper font-mono text-xs font-bold">3</span>
              <div>
                <h3 class="font-semibold">{{ t('accessRequest.stepThreeTitle') }}</h3>
                <p class="mt-1 text-sm leading-6 text-ink/70">{{ t('accessRequest.stepThreeDescription') }}</p>
              </div>
            </li>
          </ol>
        </aside>
      </div>
    </UContainer>
  </main>
</template>
