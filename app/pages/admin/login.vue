<script setup lang="ts">
import { z } from 'zod'

const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()

const loginSchema = z.object({
  adminKey: z.string().min(32),
})

const state = reactive({ adminKey: '' })
const submitting = ref(false)

async function signIn() {
  submitting.value = true

  try {
    await $fetch('/api/admin/session', {
      method: 'POST',
      body: { adminKey: state.adminKey },
    })
    state.adminKey = ''
    await navigateTo(localePath('/admin/keys'))
  } catch {
    toast.add({
      title: t('admin.signInFailed'),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  } finally {
    state.adminKey = ''
    submitting.value = false
  }
}

useSeoMeta({
  title: () => t('admin.loginTitle'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <main class="grid min-h-screen bg-sky px-4 py-8 sm:p-10">
    <UContainer class="grid max-w-[1040px] place-items-center">
      <div class="grid w-full overflow-hidden border-2 border-ink bg-paper shadow-[8px_8px_0_#171717] lg:grid-cols-[1.1fr_.9fr]">
        <section class="bg-ink p-8 text-paper sm:p-12">
          <p class="font-mono text-xs font-bold uppercase tracking-[.14em] text-mint">StickerHub / Owner</p>
          <h1 class="mt-6 font-display text-[clamp(2.7rem,6vw,5rem)] font-extrabold leading-[.9]">{{ t('admin.loginTitle') }}</h1>
          <p class="mt-6 max-w-sm text-base leading-7 text-paper/65">{{ t('admin.consoleDescription') }}</p>
        </section>

        <section class="p-8 sm:p-12">
          <p class="font-mono text-xs font-bold uppercase text-brand-600">ADMIN ACCESS</p>
          <h2 class="mt-3 font-display text-3xl font-extrabold">{{ t('admin.loginTitle') }}</h2>
          <p class="mt-3 text-sm leading-6 text-ink/65">{{ t('admin.loginDescription') }}</p>

          <UForm :schema="loginSchema" :state="state" class="mt-8 space-y-5" @submit="signIn">
            <UFormField name="adminKey" :label="t('admin.adminKey')" required>
              <UInput
                v-model="state.adminKey"
                type="password"
                autocomplete="current-password"
                icon="i-lucide-key-round"
                :disabled="submitting"
              />
            </UFormField>
            <UButton
              type="submit"
              :label="t('admin.signIn')"
              icon="i-lucide-arrow-right"
              trailing
              :loading="submitting"
              class="offset-action w-full justify-center"
            />
          </UForm>
        </section>
      </div>
    </UContainer>
  </main>
</template>
