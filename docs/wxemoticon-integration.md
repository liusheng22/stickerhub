# wxemoticon Integration

StickerHub exposes one dedicated endpoint for the wxemoticon desktop application to fill missing image URLs for a locally installed WeChat sticker pack.

## Endpoint

```http
GET /api/integrations/wxemoticon/albums/{productId}
```

The endpoint is anonymous and read-only. It does not use the public API key store, update API key usage, or call the Upstash rate limiter. The client must request one exact WeChat `productId`; search, batching, and full-catalog synchronization are not supported.

Successful response:

```json
{
  "schemaVersion": 1,
  "productId": "com.tencent.xin.emoticon.person.stiker_1769162174748b9dff62c8e6d0",
  "iconUrl": "https://...",
  "version": "a:12|b:34|detail:56",
  "members": [
    {
      "memberIndex": 1,
      "md5": "84fca82941e003784f71b99100f672ea",
      "previewUrl": "https://...",
      "downloadUrl": "https://..."
    }
  ]
}
```

The response never contains encryption keys, encrypted-source URLs, API credentials, database credentials, or internal source metadata.

## Query behavior

A complete cache miss executes one parameterized, read-only SQL statement. The statement joins `products`, `album_members`, and `members` by the exact `productId`, selects an explicit safe column list, and returns all members in pack order. It does not run the album recommendation queries or the paginated public API path.

An album with no available joined rows returns `404`. Invalid or non-WeChat product IDs return `400`.

## Caching

Successful responses use:

```http
Cache-Control: public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000
ETag: "wxemoticon-v1-<sha256>"
```

The cache has two Cloudflare layers:

1. Workers Cache is enabled in `wrangler.jsonc`. It is tiered across Cloudflare and serves a hit before the Worker executes, so a hit performs zero Turso queries and consumes no Worker CPU time.
2. When the Worker does execute, `caches.default` stores a schema-versioned response in the local Cloudflare data-center cache. This protects against repeat queries after an outer-cache miss or deployment. Cache API availability is optional; a cache failure never fails the endpoint.

The Worker cache is version-isolated by default. A new deployment starts with a new outer cache namespace, which prevents an old response contract from surviving a code deployment. The inner cache key contains the canonical endpoint path, normalized `productId`, and `schemaVersion=1`.

On Vercel, the same standard `Cache-Control` header allows its CDN to cache the response; the Cloudflare Cache API layer is simply unavailable. Clients may retain the response locally and send `If-None-Match`. A matching validator returns `304 Not Modified`.

Only successful album responses are cacheable. Validation failures, missing albums, and unexpected errors explicitly use `Cache-Control: no-store`.

## Client constraints

wxemoticon should request this endpoint only after a user selects a locally installed album with missing resources. It must merge members by lowercase `md5` and preserve this source priority:

```text
local recovered file
  > URL already present in the local WeChat database
  > StickerHub downloadUrl/previewUrl
```

The desktop client must keep its own persistent cache. StickerHub unavailability must affect only the selected album and must not replace that album with personal favorites or fail the whole local catalog.

## Missing album feedback

The desktop client also exposes two feedback paths when a locally installed album is not in StickerHub:

- GitHub Issue: opens a prefilled issue in the public repository. The user reviews and submits it in GitHub; the client does not claim that the issue was submitted.
- Email: sends the sanitized album metadata and member MD5 list to the fixed owner mailbox `black.liusheng@gmail.com`.

The email endpoint is:

```http
POST /api/integrations/wxemoticon/missing-albums
```

It is intentionally anonymous and does not use a database, API key, or client-embedded secret. The server requires `NUXT_RESEND_API_KEY` and `NUXT_RESEND_FROM_EMAIL`, sends through the existing Resend integration, and returns only after Resend accepts the message. Requests and responses are `no-store`; the route must not be placed behind a cache rule.

Because the endpoint sends an email, configure a Cloudflare rate-limiting rule for the exact path before exposing it publicly. A reasonable starting point is 5 requests per IP per 10 minutes with a Block action. This protects the fixed mailbox without requiring another database or quota service.
