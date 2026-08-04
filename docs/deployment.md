# StickerHub Deployment

## Production topology

StickerHub supports both Vercel and Cloudflare Workers. Keep only one production origin for `stickerhub.lius.me`; use the other platform as a preview or rollback target until the production cutover is complete.

This repository is configured for a Cloudflare **Worker**, not Cloudflare Pages. The deployment entry point and static assets are described in [`wrangler.jsonc`](../wrangler.jsonc).

## Cloudflare Workers Build

Use Node.js `22.22.0` or later. The repository pins `22.22.0` in `.nvmrc` and requires Node 22–24 in `package.json`.

For a Git-connected Cloudflare Worker Build, configure:

```text
Build command: pnpm run build:cloudflare
Deploy command: pnpm exec wrangler deploy --keep-vars
```

Do not use `nuxi build --preset=cloudflare_pages`: that preset produces a Cloudflare Pages deployment rather than a Worker.

`wrangler.jsonc` keeps the Worker `workers.dev` URL available for verification, disables version-specific preview URLs, and manages `stickerhub.lius.me` as the production Custom Domain. Cloudflare creates the required proxied DNS record and certificate when Wrangler deploys this configuration.

For a direct local release after logging in with Wrangler:

```bash
pnpm run deploy:cloudflare
```

The project build copies Scalar's official standalone browser assets into the Worker asset bundle. It does not bundle Scalar into the Worker server runtime.

## Cloudflare runtime secrets

Nuxt runtime configuration is overridden by `NUXT_`-prefixed values in a Worker. For Cloudflare, use the names in the right column. Do not upload `STICKERHUB_SQLITE_PATH`, `STICKERMART_SQLITE_PATH`, or `NUXT_API_KEYS_SQLITE_PATH`: the local SQLite fallbacks cannot run in a Worker.

| Local/Vercel variable | Cloudflare Worker secret |
| --- | --- |
| `TURSO_DATABASE_URL` | `NUXT_TURSO_DATABASE_URL` |
| `TURSO_AUTH_TOKEN` | `NUXT_TURSO_AUTH_TOKEN` |
| `NUXT_API_KEYS_DATABASE_URL` | `NUXT_API_KEYS_DATABASE_URL` |
| `NUXT_API_KEYS_AUTH_TOKEN` | `NUXT_API_KEYS_AUTH_TOKEN` |
| `NUXT_ADMIN_API_KEY` | `NUXT_ADMIN_API_KEY` |
| `NUXT_SESSION_PASSWORD` | `NUXT_SESSION_PASSWORD` |
| `CORS_ALLOWED_ORIGINS` | `NUXT_CORS_ALLOWED_ORIGINS` |
| `UPSTASH_REDIS_REST_URL` | `NUXT_UPSTASH_REDIS_REST_URL` |
| `UPSTASH_REDIS_REST_TOKEN` | `NUXT_UPSTASH_REDIS_REST_TOKEN` |
| `API_RATE_LIMIT` | `NUXT_API_RATE_LIMIT` |
| `NUXT_RESEND_API_KEY` | `NUXT_RESEND_API_KEY` |
| `NUXT_RESEND_FROM_EMAIL` | `NUXT_RESEND_FROM_EMAIL` |
| `NUXT_RESEND_WEBHOOK_SECRET` | `NUXT_RESEND_WEBHOOK_SECRET` |

The `build:cloudflare` script sets `NUXT_SITE_URL=https://stickerhub.lius.me` and `NUXT_SITE_INDEXABLE=true` before Nuxt compiles the production Worker. This prevents runtime-only Worker variables from accidentally producing a `noindex` production build.

After the first valid Worker deployment, secrets can be uploaded in one operation with Wrangler's `secret bulk` command. Use a temporary, untracked `.env` or JSON input file; never add secret values to `wrangler.jsonc` or commit them.

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
- `NUXT_SITE_URL` as a valid public HTTPS URL at build time

Recommended webhook target:

```text
https://stickerhub.lius.me/api/webhooks/resend
```

The wxemoticon desktop feedback endpoint reuses the same Resend sender configuration. It sends missing-album reports to the fixed owner mailbox `black.liusheng@gmail.com`; no extra database, API key, or client secret is required. Configure a Cloudflare rate-limiting rule for the exact endpoint before deployment:

```text
POST /api/integrations/wxemoticon/missing-albums
5 requests per IP / 10 minutes
Action: Block
```

The endpoint is deliberately `no-store`. Do not add it to a cache rule or a broad cache-everything rule. A missing Resend configuration returns a service-unavailable response, and a Resend delivery failure returns a gateway error; the desktop client keeps the GitHub Issue option available in both cases.

## Verification

Before or after deployment, run:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm run build:cloudflare
pnpm exec wrangler deploy --dry-run --keep-vars
```

## Notes

- Turso credentials, API keys, and local database files should never be committed.
- `_docs/` remains a local/private working-notes area and is not the formal project documentation surface.
