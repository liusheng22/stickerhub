# StickerHub Design System

Status: approved for implementation on 2026-07-14, updated for StickerHub positioning on 2026-07-15.

The current direction is **StickerHub as a broad sticker pack destination**. The approved visual reference is `_docs/design/html-demo/concept-c-collector-desk.html`; its layout language remains useful, but the public product framing is now consumer-facing, content-first, and centered on browsing, searching, and downloading sticker packs.

## Product character

- Broad, approachable, and content-rich without becoming childish or overly noisy.
- The first screen should read as a real sticker pack destination, never as a generic SaaS landing page.
- The home hero may be expressive; browse and detail content must remain efficient to scan.
- Real pack imagery is the visual material. Do not add unrelated illustrations, fake products, fake categories, shopping carts, accounts, or purchase flows.
- Chinese homepage copy should stay explanatory and calm rather than slogan-heavy or conversion-oriented.

## Foundation

| Token | Value | Role |
| --- | --- | --- |
| Ink | `#171717` | Text, strong borders, offset shadows |
| Paper | `#FFFFFF` | Page and card surface |
| Signal Orange | `#FF5A2F` | Primary action and brand memory |
| Fresh Mint | `#BEEFD2` | Image stages and discovery bands |
| Soft Lilac | `#DCC4FF` | Search trails and secondary bands |
| Clear Sky | `#B9E8FF` | Hero field, focus and information accents |

- Display: `Bricolage Grotesque`, weight 600–800.
- Body: `Manrope`, `Noto Sans SC`, weight 400–700.
- Utility: `DM Mono`, weight 400–500.
- Chinese album titles use the body stack rather than forcing a Latin display face.
- Base radius is `6px`; large utility boards may use `8px`.
- Strong interactive elements use a 2px Ink border and a `4px 4px 0 #171717` offset shadow.
- Avoid gradients, excessive pills, nested cards, and equal-weight dashboard stat cards.

## Component policy

- Use Nuxt 4, Nuxt UI v4, Tailwind CSS v4, and Nuxt Icon/Lucide.
- Buttons, inputs, forms, badges, cards, headers, footers, empty states, skeletons, and navigation primitives come from Nuxt UI.
- Tailwind utilities and a small global token/animation layer provide layout and visual treatment.
- Do not recreate Nuxt UI primitives in local components.

## Global shell

- Header contains the StickerHub brand and the primary Browse, Creators, and Search links. Developer access stays in the footer.
- Developer access belongs in the footer or another secondary surface, not in primary navigation.
- Desktop header height is approximately 68px; mobile is approximately 60px.
- The header is white, lightly translucent, and separated by a single quiet rule.
- Footer is white with one rule, a short product statement, utility navigation, and a secondary developer-access link.
- Focus rings use Clear Sky and remain visible against every surface.

## Home

- Hero height is approximately `min(82svh, 760px)` and must reveal the next orange divider in the first viewport.
- A Clear Sky field holds six real popular album cards around one central Paper board.
- Keep the current visual composition, but align the public copy with the approved StickerHub positioning:
  - English hero copy should emphasize breadth, browseability, search, and downloads.
  - Chinese hero copy should use calm explanatory language such as `海量表情包，持续收录与更新` and `覆盖多种主题与风格的表情包内容，支持浏览、搜索和下载。`
  - Do not place an extra Chinese logo subtitle beneath the brand.
- Album cards use real cover art, Ink borders, Paper surfaces, small rotations, and offset shadows.
- Desktop reference positions:
  - card 1: left `2%`, top `8%`, rotate `-6deg`
  - card 2: left `9%`, bottom `7%`, rotate `5deg`
  - card 3: left `21%`, top `3%`, width `156px`, rotate `-11deg`
  - card 4: right `21%`, bottom `2%`, width `158px`, rotate `11deg`
  - card 5: right `8%`, top `7%`, rotate `6deg`
  - card 6: right `1%`, bottom `13%`, rotate `-5deg`
- Cards 3 and 4 are the only strong-angle cards and remain roughly two-thirds identifiable. Hide them below the desktop composition breakpoint.
- Entry motion runs once for 450–650ms. No continuous floating. Reduced-motion users receive a static composition.
- Popular packs use a four/two/one-column responsive grid with fixed image ratios.
- Search suggestions are derived from real album names or verified queries and are not presented as fake categories.

## Albums

- Use a compact editorial heading and search toolbar, not a large filter card.
- Public UI searches only `pack_name` and `description`.
- Do not display raw `status` or `attr` values and do not invent category labels.
- Decorative header albums come deterministically from approximately 20% and 60% of the current result page.
- With fewer than four results show one decorative card; with no results show none.
- Decorative choices update with the current search and remain SSR/client stable.
- Cursor values are never printed in the interface.
- The page should read as a broad sticker pack browsing surface, not as a database report.

## Search

- The query is the visual highlight in the results headline; the result count is supporting information.
- Keep a prominent Nuxt UI search control directly below the heading.
- Empty results show search suggestions sourced from real album names.
- Do not add classification controls before a governed tag data layer exists.
- Copy should stay descriptive and content-focused rather than technical or system-oriented.

## Album detail

- Use a full-width Mint hero stage with a large cover and a clear title/description region.
- The first viewport should reveal the beginning of the member grid.
- Price, sticker count, and copyright form one information strip; raw status/attribute values are hidden.
- Sticker members appear on Paper square stages with `object-contain`; labels remain compact.
- Recommended albums use the same AlbumCard component as the browse grid.
- If a public creator page exists, the breadcrumb should become `Home → Browse → Creator → Pack`; otherwise keep `Home → Browse → Pack`.

### Recommendation rules

Recommendation groups carry one of `creator`, `series`, or `fallback`:

1. Exact normalized copyright match, excluding platform-level publishers.
2. Clear shared character or series name.
3. Stable popular fallback derived from `productId`; never `ORDER BY RANDOM()`.

Titles are generated from the reason:

- `More from {creator}`
- `More in the {series} series`
- `More sticker packs`

Platform or distributor names such as Tencent must not be labeled as creators. `status` and `attr` may only break ties; they are not recommendation explanations.

## Creators

- Creator pages remain available as a secondary browse path for people who want to continue through an artist or studio.
- The creators directory should feel like an extension of the main browsing experience, not an internal index.
- Only copyright holders with multiple packs should appear; platform and distributor names stay excluded.

## Developer access

- `/docs` is a developer-access guide for approved integrations.
- `/docs/reference` is the interactive Scalar API reference generated from `/openapi.json`.
- The guide owns quick start, authentication, pagination, error handling, safety notes, code samples, and resource orientation; it does not duplicate the complete OpenAPI schema by hand.
- Scalar owns endpoint search, request parameters, response schemas, client code generation, API key entry, and interactive test requests.
- Production access uses one scoped, revocable API key per integration. The Key Store is separate from the read-only catalog database; it stores only a hash, never a retrievable secret.
- `/api/admin/keys` is an owner-only management API. It creates, lists, rotates, and revokes integration keys; it is never a browser-facing self-service portal.
- `/admin/login` exchanges the single administrator credential for a short sealed HttpOnly session. `/admin/keys` is the owner-only operational console, built with Nuxt UI and never embeds the administrator credential in client code.
- Optional email notifications confirm that access was created but never contain a key secret; one-time key display remains in the authenticated control flow.
- A real self-service developer portal requires authenticated developer accounts, verified contact channels, and audit policy. Do not imply that anonymous visitors can create credentials before those capabilities exist.
- Ask AI and MCP controls remain disabled until StickerHub has a real document agent and a real MCP server.
- Never prefill or persist production credentials in browser documentation.
- Never expose server exceptions or credentials in either documentation surface.

## Responsive and accessibility acceptance

- Required viewports: `1440×900`, `768×1024`, and `390×844`.
- No horizontal scrolling, overlapping text, clipped controls, or unstable random layouts.
- Touch targets are at least 44px.
- Images have meaningful alt text; purely decorative imagery is hidden from assistive technology.
- Body text meets WCAG AA contrast.
- Hover cannot be the only way to access information.
- All motion respects `prefers-reduced-motion`.
- Prioritize at most four hero images; lazy-load remaining catalog media.

## Data evolution

Categories may be introduced only after a governed source exists, for example:

```text
album_tags
  product_id
  tag_slug
  tag_label
  source
  confidence
```

Until then, album names and descriptions are the only public search dimensions.
