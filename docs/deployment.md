# StickerHub Deployment

## Production topology

StickerHub is deployed as a Nuxt application on Vercel, with Cloudflare handling the `lius.me` DNS zone, TLS edge, CDN, and WAF.

Do not deploy the same Nuxt application to Cloudflare Pages or Workers as a second origin.

## Required production secrets

Set these values in the deployment platform's server-side secret store:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `NUXT_API_KEYS_DATABASE_URL`
- `NUXT_API_KEYS_AUTH_TOKEN`
- `NUXT_ADMIN_API_KEY`
- `NUXT_SESSION_PASSWORD`
- `NUXT_RESEND_API_KEY` (optional)
- `NUXT_RESEND_FROM_EMAIL` (optional)
- `NUXT_RESEND_WEBHOOK_SECRET` (recommended when Resend is enabled)
- `CORS_ALLOWED_ORIGINS`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `API_RATE_LIMIT`
- `NUXT_SITE_URL`
- `NUXT_SITE_INDEXABLE=true`

## Data and infrastructure notes

- Use Turso in production.
- Keep the catalog database token read-only.
- Use a separate writable Turso database or writer token for the API Key Store.
- Production API access should fail closed when the durable Upstash rate limiter is not configured.

## Email notifications

When Resend is configured, StickerHub can send access-created notifications to approved integration owners.

Required settings for email support:

- `NUXT_RESEND_API_KEY`
- `NUXT_RESEND_FROM_EMAIL`
- `NUXT_RESEND_WEBHOOK_SECRET`
- `NUXT_SITE_URL` as a valid public HTTPS URL

Recommended webhook target:

```text
https://YOUR_PUBLIC_HOST/api/webhooks/resend
```

## Verification

Before or after deployment, run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Notes

- Turso credentials, API keys, and local database files should never be committed.
- `_docs/` remains a local/private working-notes area and is not the formal project documentation surface.
