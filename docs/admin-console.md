# StickerHub Admin Console

The admin console is owner-only and is used to manage developer access for approved integrations.

## Routes

| Route | Purpose |
| --- | --- |
| `/admin/login` | Owner login screen |
| `/admin/keys` | API key management console |
| `/api/admin/keys` | Server-only API key lifecycle management |

## Authentication flow

1. The owner enters the administrator access key on `/admin/login`
2. The server validates the key
3. A sealed HttpOnly session cookie is issued for the browser session
4. The browser uses that session to access `/admin/keys`

The administrator key is not persisted in browser storage.

## Key lifecycle

The admin console supports:

- creating an integration key
- rotating an existing key
- revoking a key
- reviewing recent key-related activity

Issued secrets are shown once at creation or rotation time and cannot be retrieved later.

## Notification behavior

When configured, StickerHub can notify the integration owner that access was created or rotated.

Important:
- notification emails never include the API key secret
- the secret must still be delivered separately through a secure channel
- the console reports acceptance by the email service, not guaranteed delivery

## Related docs

- [Developer access](./developer-access.md)
- [Deployment](./deployment.md)
