# StickerHub

[English](./README.md) | [简体中文](./README.zh-CN.md)

StickerHub is a Nuxt 4 sticker pack destination for browsing, searching, previewing, and downloading a large collection of sticker packs.

## Live preview

- [Official site](https://stickerhub.lius.me)
- [Vercel deployment](https://wxsticker.vercel.app)
- [Cloudflare Workers deployment guide](./docs/deployment.md)

## What this project is

StickerHub is primarily a consumer-facing website:

- browse a large collection of sticker packs
- search by pack name or keywords
- open pack details and preview members
- download and use sticker packs
- continue browsing through creators and studios

A small developer-access surface also exists for approved integrations, but it is secondary to the public website.

## Stack

- Nuxt 4 and TypeScript
- Nuxt UI v4 with Tailwind CSS v4
- Nuxt Icon with the local Lucide Iconify collection
- Nuxt SEO for metadata, schema.org, robots, and sitemap generation
- Scalar for the interactive API reference
- Zod for public API input validation
- Turso in production, with a local SQLite fallback for development

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage and featured sticker packs |
| `/albums` | Sticker pack browsing and search |
| `/albums/:productId` | Sticker pack detail and preview |
| `/search?q=` | Search results |
| `/creators` | Creator and studio directory |
| `/creators/:creatorSlug` | Creator detail and pack listing |
| `/docs` | Developer access guide |
| `/docs/reference` | Interactive API reference |
| `/admin/login` | Owner login |
| `/admin/keys` | Owner key-management console |

## Quick start

Requirements: Node.js 22 or newer and pnpm 10.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:3000`.

For local data, set `STICKERMART_SQLITE_PATH` to the Turso SQLite snapshot. For remote data, configure both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` instead.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm run build:cloudflare
```

## Documentation

Formal, git-tracked project documentation lives in [`docs/`](./docs/):

- [Documentation index](./docs/README.md)
- [Developer access](./docs/developer-access.md)
- [Deployment](./docs/deployment.md)
- [Admin console](./docs/admin-console.md)
- [wxemoticon integration](./docs/wxemoticon-integration.md)

## Notes

- `_docs/` is used as a local/private working-notes area, not the formal public documentation surface.
- Production credentials, API keys, and local database files should never be committed.
