<script setup lang="ts">
import { z } from 'zod'

interface ManagedKey {
  id: string
  keyPrefix: string
  label: string
  ownerEmail: string | null
  scopes: string[]
  rateLimitPerMinute: number
  status: 'active' | 'revoked'
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  rotatedAt: string | null
}

interface AuditLog {
  id: string
  action: string
  keyId: string | null
  keyPrefix: string | null
  metadata: Record<string, string | number | boolean | null>
  createdAt: string
}

type NotificationStatus = 'not-requested' | 'not-configured' | 'invalid-site-url' | 'accepted' | 'failed'

const { locale, t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()

const { data: keyPayload, error: keyError, refresh: refreshKeys } = await useFetch<{ data: ManagedKey[] }>('/api/admin/keys', {
  key: 'admin-managed-keys',
})
const { data: auditPayload, refresh: refreshAudit } = await useFetch<{ data: AuditLog[] }>('/api/admin/audit', {
  key: 'admin-audit-logs',
})

if (keyError.value) {
  await navigateTo(localePath('/admin/login'))
}

const keys = computed(() => keyPayload.value?.data || [])
const auditLogs = computed(() => auditPayload.value?.data || [])
const createOpen = ref(false)
const secretOpen = ref(false)
const issuedKey = ref('')
const issuedNotification = ref<NotificationStatus>('not-requested')
const actionTarget = ref<ManagedKey | null>(null)
const actionType = ref<'rotate' | 'revoke' | null>(null)
const notifyRotationOwner = ref(false)
const busy = ref(false)
const copied = ref(false)

const createSchema = z.object({
  label: z.string().trim().min(1).max(120),
  ownerEmail: z.string().trim().email().optional().or(z.literal('')),
  rateLimitPerMinute: z.number().int().min(1).max(10_000),
  expiresAt: z.string().optional(),
  notifyOwner: z.boolean(),
}).refine(value => !value.notifyOwner || Boolean(value.ownerEmail), {
  path: ['ownerEmail'],
  message: 'Owner email is required when sending a notification',
})

const createState = reactive({
  label: '',
  ownerEmail: '',
  rateLimitPerMinute: 60,
  expiresAt: '',
  notifyOwner: false,
})

const keyColumns = computed(() => [
  { accessorKey: 'label', header: t('admin.integrationLabel') },
  { accessorKey: 'ownerEmail', header: t('admin.ownerEmail') },
  { accessorKey: 'keyPrefix', header: t('admin.keyPrefix') },
  { accessorKey: 'status', header: t('admin.status') },
  { accessorKey: 'rateLimitPerMinute', header: t('admin.quota') },
  { accessorKey: 'lastUsedAt', header: t('admin.lastUsed') },
  { id: 'actions', header: t('admin.actions') },
])

const auditColumns = computed(() => [
  { accessorKey: 'action', header: t('admin.audit') },
  { accessorKey: 'keyPrefix', header: t('admin.keyPrefix') },
  { accessorKey: 'createdAt', header: t('admin.createdAt') },
])

function dateTime(value: string | null) {
  if (!value) return t('admin.never')
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function notificationStatusLabel(status: unknown) {
  const labels: Record<string, string> = {
    accepted: t('admin.auditNotificationAccepted'),
    delayed: t('admin.auditNotificationDelayed'),
    delivered: t('admin.auditNotificationDelivered'),
    bounced: t('admin.auditNotificationBounced'),
    complained: t('admin.auditNotificationComplained'),
    failed: t('admin.auditNotificationFailed'),
    suppressed: t('admin.auditNotificationSuppressed'),
    'invalid-site-url': t('admin.auditNotificationInvalidSiteUrl'),
    'not-configured': t('admin.auditNotificationNotConfigured'),
  }
  return typeof status === 'string' ? labels[status] : undefined
}

function actionLabel(log: AuditLog) {
  const labels: Record<string, string> = {
    'key.created': t('admin.auditCreated'),
    'key.rotated': t('admin.auditRotated'),
    'key.revoked': t('admin.auditRevoked'),
  }
  if (log.action === 'key.owner_notification' || log.action === 'key.owner_notification.delivery') {
    return notificationStatusLabel(log.metadata.status) || t('admin.auditNotified')
  }
  return labels[log.action] || log.action
}

function resetCreateForm() {
  createState.label = ''
  createState.ownerEmail = ''
  createState.rateLimitPerMinute = 60
  createState.expiresAt = ''
  createState.notifyOwner = false
}

function openCreateDialog() {
  createOpen.value = true
}

function closeCreateDialog() {
  createOpen.value = false
}

function closeSecretDialog() {
  secretOpen.value = false
  issuedKey.value = ''
}

function closeActionDialog() {
  actionType.value = null
  actionTarget.value = null
  notifyRotationOwner.value = false
}

async function refreshData() {
  await Promise.all([refreshKeys(), refreshAudit()])
}

async function createKey() {
  busy.value = true

  try {
    const payload = await $fetch<{ data: ManagedKey & { apiKey: string, notification: NotificationStatus } }>('/api/admin/keys', {
      method: 'POST',
      body: {
        label: createState.label,
        ownerEmail: createState.ownerEmail || undefined,
        scopes: ['catalog:read'],
        rateLimitPerMinute: createState.rateLimitPerMinute,
        expiresAt: createState.expiresAt ? new Date(createState.expiresAt).toISOString() : undefined,
        notifyOwner: createState.notifyOwner,
      },
    })

    issuedKey.value = payload.data.apiKey
    issuedNotification.value = payload.data.notification
    createOpen.value = false
    secretOpen.value = true
    resetCreateForm()
    await refreshData()
  } catch {
    toast.add({ title: t('admin.loadFailed'), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

function openAction(type: 'rotate' | 'revoke', key: ManagedKey) {
  actionType.value = type
  actionTarget.value = key
  notifyRotationOwner.value = false
}

async function confirmAction() {
  if (!actionType.value || !actionTarget.value) return
  busy.value = true

  try {
    const payload = await $fetch<{ data: ManagedKey & { apiKey?: string, notification?: NotificationStatus } }>(`/api/admin/keys/${actionTarget.value.id}/${actionType.value}`, {
      method: 'POST',
      body: actionType.value === 'rotate' ? { notifyOwner: notifyRotationOwner.value } : undefined,
    })

    if (actionType.value === 'rotate' && payload.data.apiKey) {
      issuedKey.value = payload.data.apiKey
      issuedNotification.value = payload.data.notification || 'not-requested'
      secretOpen.value = true
    }

    actionType.value = null
    actionTarget.value = null
    await refreshData()
  } catch {
    toast.add({ title: t('admin.loadFailed'), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    busy.value = false
  }
}

async function copyIssuedKey() {
  if (!issuedKey.value || !navigator.clipboard) return
  await navigator.clipboard.writeText(issuedKey.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}

async function signOut() {
  await $fetch('/api/admin/session', { method: 'DELETE' })
  await navigateTo(localePath('/admin/login'))
}

useSeoMeta({
  title: () => t('admin.consoleTitle'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <main class="min-h-screen bg-paper">
    <header class="border-b-2 border-ink bg-mint">
      <UContainer class="flex max-w-[88rem] flex-wrap items-center justify-between gap-5 py-6">
        <div>
          <p class="font-mono text-xs font-bold uppercase tracking-[.14em] text-ink/60">StickerHub / Owner</p>
          <h1 class="mt-2 font-display text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-none">{{ t('admin.consoleTitle') }}</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-ink/70">{{ t('admin.consoleDescription') }}</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <UButton :label="t('admin.createKey')" icon="i-lucide-key-round" class="offset-action" @click="openCreateDialog" />
          <UButton :label="t('admin.signOut')" icon="i-lucide-log-out" color="neutral" variant="outline" class="border-2 border-ink bg-paper" @click="signOut" />
        </div>
      </UContainer>
    </header>

    <UContainer class="max-w-[88rem] space-y-10 py-10">
      <section>
        <div class="mb-4 flex items-end justify-between gap-4">
          <h2 class="font-display text-2xl font-extrabold">{{ t('admin.keys') }}</h2>
          <span class="font-mono text-xs text-ink/55">{{ keys.length }}</span>
        </div>
        <UCard variant="outline" class="overflow-hidden border-2 border-ink bg-paper">
          <UTable :data="keys" :columns="keyColumns" class="min-w-[980px]">
            <template #ownerEmail-cell="{ row }">
              <span class="text-sm text-ink/70">{{ row.original.ownerEmail || '—' }}</span>
            </template>
            <template #keyPrefix-cell="{ row }">
              <code class="font-mono text-xs">{{ row.original.keyPrefix }}</code>
            </template>
            <template #status-cell="{ row }">
              <UBadge :label="row.original.status === 'active' ? t('admin.active') : t('admin.revoked')" :color="row.original.status === 'active' ? 'success' : 'error'" variant="subtle" />
            </template>
            <template #rateLimitPerMinute-cell="{ row }">
              <span class="font-mono text-xs">{{ row.original.rateLimitPerMinute }}/min</span>
            </template>
            <template #lastUsedAt-cell="{ row }">
              <span class="text-xs text-ink/65">{{ dateTime(row.original.lastUsedAt) }}</span>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex gap-2">
                <UTooltip :text="t('admin.rotate')">
                  <UButton icon="i-lucide-refresh-cw" color="neutral" variant="outline" size="xs" :disabled="row.original.status !== 'active'" @click="openAction('rotate', row.original)" />
                </UTooltip>
                <UTooltip :text="t('admin.revoke')">
                  <UButton icon="i-lucide-ban" color="error" variant="outline" size="xs" :disabled="row.original.status !== 'active'" @click="openAction('revoke', row.original)" />
                </UTooltip>
              </div>
            </template>
          </UTable>
          <div v-if="!keys.length" class="px-6 py-12 text-center text-sm text-ink/60">{{ t('admin.emptyKeys') }}</div>
        </UCard>
      </section>

      <section>
        <h2 class="mb-4 font-display text-2xl font-extrabold">{{ t('admin.audit') }}</h2>
        <UCard variant="outline" class="overflow-hidden border border-ink/25 bg-paper">
          <UTable :data="auditLogs" :columns="auditColumns" class="min-w-[680px]">
            <template #action-cell="{ row }">
              <span class="text-sm">{{ actionLabel(row.original) }}</span>
            </template>
            <template #keyPrefix-cell="{ row }">
              <code class="font-mono text-xs text-ink/65">{{ row.original.keyPrefix || '—' }}</code>
            </template>
            <template #createdAt-cell="{ row }">
              <span class="text-xs text-ink/65">{{ dateTime(row.original.createdAt) }}</span>
            </template>
          </UTable>
        </UCard>
      </section>
    </UContainer>

    <UModal v-model:open="createOpen" :title="t('admin.createKey')" :description="t('admin.consoleDescription')">
      <template #body>
        <UForm :schema="createSchema" :state="createState" class="space-y-5" @submit="createKey">
          <UFormField name="label" :label="t('admin.integrationLabel')" required>
            <UInput v-model="createState.label" autofocus />
          </UFormField>
          <UFormField name="ownerEmail" :label="t('admin.ownerEmail')">
            <UInput v-model="createState.ownerEmail" type="email" autocomplete="email" />
          </UFormField>
          <UFormField name="rateLimitPerMinute" :label="t('admin.rateLimit')" required>
            <UInputNumber v-model="createState.rateLimitPerMinute" :min="1" :max="10000" class="w-full" />
          </UFormField>
          <UFormField name="expiresAt" :label="t('admin.expiresAt')" :hint="t('admin.noExpiry')">
            <UInput v-model="createState.expiresAt" type="datetime-local" />
          </UFormField>
          <UCheckbox v-model="createState.notifyOwner" :label="t('admin.notifyOwner')" :description="t('admin.notifyOwnerHelp')" />
          <div class="flex justify-end gap-3 pt-2">
            <UButton :label="t('admin.cancel')" color="neutral" variant="ghost" @click="closeCreateDialog" />
            <UButton type="submit" :label="t('admin.create')" icon="i-lucide-key-round" :loading="busy" class="offset-action" />
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="secretOpen" :title="t('admin.createdTitle')" :description="t('admin.createdText')" :dismissible="false">
      <template #body>
        <div class="space-y-5">
          <UInput :model-value="issuedKey" readonly class="font-mono text-xs" />
          <UAlert v-if="issuedNotification === 'accepted'" :title="t('admin.notificationAccepted')" icon="i-lucide-mail-check" color="success" variant="subtle" />
          <UAlert v-else-if="issuedNotification === 'not-configured'" :title="t('admin.notificationNotConfigured')" icon="i-lucide-mail-warning" color="warning" variant="subtle" />
          <UAlert v-else-if="issuedNotification === 'invalid-site-url'" :title="t('admin.notificationInvalidSiteUrl')" icon="i-lucide-link-2-off" color="warning" variant="subtle" />
          <UAlert v-else-if="issuedNotification === 'failed'" :title="t('admin.notificationFailed')" icon="i-lucide-mail-x" color="warning" variant="subtle" />
          <div class="flex justify-end gap-3">
            <UButton :label="copied ? t('admin.copied') : t('admin.copyKey')" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" color="neutral" variant="outline" @click="copyIssuedKey" />
            <UButton :label="t('admin.savedKey')" class="offset-action" @click="closeSecretDialog" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal :open="Boolean(actionType && actionTarget)" :title="actionType === 'rotate' ? t('admin.rotateTitle') : t('admin.revokeTitle')" :description="actionType === 'rotate' ? t('admin.rotateText') : t('admin.revokeText')" @update:open="value => { if (!value) closeActionDialog() }">
      <template #body>
        <UCheckbox
          v-if="actionType === 'rotate' && actionTarget?.ownerEmail"
          v-model="notifyRotationOwner"
          :label="t('admin.notifyRotationOwner')"
          :description="t('admin.notifyRotationOwnerHelp')"
        />
        <UAlert
          v-else-if="actionType === 'rotate'"
          :title="t('admin.notifyRotationUnavailable')"
          icon="i-lucide-mail-x"
          color="warning"
          variant="subtle"
        />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton :label="t('admin.cancel')" color="neutral" variant="ghost" @click="closeActionDialog" />
          <UButton :label="actionType === 'rotate' ? t('admin.confirmRotate') : t('admin.confirmRevoke')" :icon="actionType === 'rotate' ? 'i-lucide-refresh-cw' : 'i-lucide-ban'" :color="actionType === 'rotate' ? 'primary' : 'error'" :loading="busy" class="offset-action" @click="confirmAction" />
        </div>
      </template>
    </UModal>
  </main>
</template>
