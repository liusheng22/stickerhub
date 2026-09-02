# StickerHub Developer Access

StickerHub is primarily a consumer-facing sticker pack website. Developer access exists as a secondary capability for a small number of approved integrations.

## Public product vs. developer capability

- **Primary product**: browsing, searching, previewing, and downloading sticker packs on the public website
- **Secondary capability**: API access for approved integrations that need server-side access to public sticker pack metadata

Developer access is not positioned as the main product experience and is intentionally separated from the primary site navigation.

## Documentation surfaces

- `/docs` — developer access guide
- `/docs/reference` — interactive Scalar API reference generated from `/openapi.json`
- `/openapi.json` — raw OpenAPI 3.1 contract

## Access model

- One revocable API key per integration
- Keys are issued manually by the StickerHub operator
- Submitting a request never creates or returns an API key automatically
- API keys must stay on the server side and must not be embedded in public browser code

## Request an API key

Developers can begin from `/support` and select **Request an API Key**:

1. Enter a contact email address and open the verification link sent by StickerHub. The link is valid for 24 hours.
2. After verification, open the prefilled API Key request Issue in the public GitHub repository.
3. Add the project details and intended server-side usage, then submit the Issue yourself.
4. The StickerHub operator reviews the request and, if approved, creates a distinct Key from `/admin/keys`.

The prefilled Issue includes the verified contact email so the operator can follow up. It is a public GitHub Issue, so only submit information you are comfortable making public. Do not put an API key, payment information, or other secrets in an Issue.

## API scope

The public API is intended for approved integrations and returns JSON for sticker pack metadata and safe member metadata.

Current public routes:

| Route | Purpose |
| --- | --- |
| `GET /api/v1/health` | Verify authenticated service access |
| `GET /api/v1/albums` | List sticker packs |
| `GET /api/v1/albums/:productId` | Read one sticker pack |
| `GET /api/v1/albums/:productId/members` | List members for one pack |
| `GET /api/v1/members/:md5` | Read one member |

wxemoticon uses a separate anonymous integration contract at `GET /api/integrations/wxemoticon/albums/:productId`. It accepts one exact locally known WeChat product ID and is not a replacement for the authenticated catalog API. See [wxemoticon integration](./wxemoticon-integration.md).

## Authentication

Send the issued key in the `X-API-Key` header:

```http
X-API-Key: YOUR_API_KEY
```

Keep this key on your own server. Do not place it in frontend code, commit it to Git, or expose it through browser-only applications.

## Interactive reference

Use the interactive reference at `/docs/reference` when you need:

- full endpoint details
- request parameter rules
- response schemas
- client code examples
- authenticated test requests

## Related docs

- [Deployment](./deployment.md)
- [Admin console](./admin-console.md)
