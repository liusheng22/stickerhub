# StickerHub 发布指南：Vercel + Cloudflare

本文定义唯一的生产拓扑：

```text
浏览器 / API 调用方
  -> Cloudflare（DNS、TLS、CDN、WAF）
  -> Vercel（Nuxt 4 / Nitro Serverless）
  -> Turso 内容库（只读）
  -> Turso Key Store（可写，独立数据库）
  -> Upstash Redis（API Key 维度限流）
```

站点正式域名固定为 `https://stickerhub.lius.me`。

Cloudflare 在此方案中不是第二个应用运行环境。不要将本仓库再部署到 Cloudflare Pages 或 Workers；那会形成两套不可控的服务端运行时、环境变量与数据连接。

## 仓库已准备的内容

- [vercel.json](./vercel.json) 固定 Nuxt/Vercel 的安装与构建命令。Nuxt/Nitro 会在 Vercel 构建环境中自动识别运行平台，无需手写 Nitro 预设。
- [.nvmrc](./.nvmrc) 将本地默认运行时固定为 Node.js 22；[package.json](./package.json) 允许 Node.js 22 与 24。Node.js 22 是首次发布基线；Vercel 生产环境仍应使用远程 Turso。
- 生产环境没有本地 SQLite 回退：未配置 Turso 时内容站会报错；未配置远程 Key Store 时公开 API 与后台 Key 管理不可用。
- `/api/v1/*`、`/api/admin/*`、`/api/webhooks/*` 响应带 `Cache-Control: no-store`；它们还带基础安全响应头。
- `/api/v1/*` 在生产环境缺少 Upstash 时会返回 `503`，不会静默退化为单实例内存限流。

## 你需要先准备的账号和资源

| 服务 | 必需资源 | 用途 |
| --- | --- | --- |
| GitHub | 此仓库的私有或公开远程仓库 | 让 Vercel 从 Git 自动部署 |
| Vercel | 一个 Project | 运行 Nuxt 应用与 Preview/Production 部署 |
| Cloudflare | 已托管的 `lius.me` Zone | `stickerhub.lius.me` DNS、TLS、CDN、WAF |
| Turso | 内容库的只读凭据 | 表情包浏览、搜索、详情与 sitemap |
| Turso | 独立的可写 Key Store 数据库和凭据 | API Key、管理员审计与邮件投递状态 |
| Upstash | Redis REST 数据库 | 每把开发者 Key 独立的生产限流 |
| Resend | 已验证发件域和 Webhook（如启用邮件） | Key 创建、轮换的事务邮件及投递状态 |

不要把数据库、Upstash、Resend 或管理员凭据放进 Git、Vercel 项目设置的公开字段、浏览器代码或 Cloudflare Worker 变量。

## 1. Turso：两个数据库边界

### 内容库：只读

使用现有表情包目录数据库，给 Vercel 创建只读 Token：

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

这个 Token 只用于 `SELECT`，不应拥有 Key Store 的写权限。

### Key Store：独立可写数据库

创建一个独立 Turso 数据库，例如 `stickerhub-api-keys`，再创建只给该库使用的写 Token：

- `NUXT_API_KEYS_DATABASE_URL`
- `NUXT_API_KEYS_AUTH_TOKEN`

首次访问后台或公开 API 时，应用会在该库中初始化 `api_keys`、`admin_audit_logs` 与邮件状态表。不要将这两个变量指向内容库，也不要在 Vercel 配置 `STICKERHUB_SQLITE_PATH` 或 `NUXT_API_KEYS_SQLITE_PATH`。

## 2. Upstash：生产 API 限流

创建 Redis REST 数据库，并在 Vercel Production 环境设置：

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `API_RATE_LIMIT=60`

API Key 本身可配置更低或更高的单 Key 限额；`API_RATE_LIMIT` 是回退默认值。生产环境不配置 Upstash 时，`/api/v1/*` 会故意返回 `503`。

## 3. Vercel：导入、环境变量和首次部署

1. 将仓库推送到 GitHub。
2. 在 Vercel 选择 **Add New → Project**，导入此仓库。
3. Root Directory 保持仓库根目录；Framework Preset 选择或确认 **Nuxt.js**。不要填写 Output Directory；Nuxt/Nitro 会生成 Vercel 所需输出。
4. Vercel 会使用 [vercel.json](./vercel.json) 中的 `pnpm install --frozen-lockfile` 与 `pnpm build`。Node.js 选择 **22.x 或 24.x**；首次上线建议使用 22.x，后续可在 Preview 环境验证 24.x 后再切换。
5. 在 **Settings → Environment Variables** 添加下表的 Production 值，再执行首次 Production 部署。

### Production 环境变量

| 变量 | Production 值或来源 | 必需 |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | 内容库的 `libsql://` URL | 是 |
| `TURSO_AUTH_TOKEN` | 内容库只读 Token | 是 |
| `NUXT_API_KEYS_DATABASE_URL` | Key Store 的 `libsql://` URL | 是 |
| `NUXT_API_KEYS_AUTH_TOKEN` | Key Store 可写 Token | 是 |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL | 是，公开 API 上线时 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST Token | 是，公开 API 上线时 |
| `API_RATE_LIMIT` | `60` | 是 |
| `NUXT_ADMIN_API_KEY` | 独立、随机的 32+ 字符管理员密钥 | 是 |
| `NUXT_SESSION_PASSWORD` | 与管理员密钥不同的随机 32+ 字符会话密钥 | 是 |
| `CORS_ALLOWED_ORIGINS` | `https://stickerhub.lius.me` | 是 |
| `NUXT_SITE_URL` | `https://stickerhub.lius.me` | 是 |
| `NUXT_SITE_INDEXABLE` | `true` | 是，仅 Production |
| `NUXT_RESEND_API_KEY` | Resend API Key | 启用 Key 邮件时 |
| `NUXT_RESEND_FROM_EMAIL` | 已验证域下的发件地址 | 启用 Key 邮件时 |
| `NUXT_RESEND_WEBHOOK_SECRET` | Resend Webhook signing secret | 启用投递状态跟踪时 |

不要在 Production 配置以下本地变量：

- `STICKERHUB_SQLITE_PATH`
- `NUXT_API_KEYS_SQLITE_PATH`
- `EMOTICON_API_KEY`

用于生成高熵 Secret 的本地命令如下；分别运行两次，两个值不能复用：

```bash
openssl rand -base64 48
```

### Preview 环境

Preview 默认不应拥有 Production 管理员、Resend 和可写 Key Store 凭据。若希望 Preview 可以完整浏览，请创建单独的 staging Turso/Upstash 凭据；同时保持：

```text
NUXT_SITE_INDEXABLE=false
```

Preview 不需要配置公开 API；如果没有专用 staging Key Store，`/api/v1/*` 和 `/admin/*` 返回不可用是预期安全行为。

每次修改 Vercel 环境变量后都应重新部署，因为本项目在 Nuxt 配置阶段读取这些值。

## 4. 域名切换：先 Vercel，后 Cloudflare 代理

1. 在 Vercel Project 的 **Settings → Domains** 添加 `stickerhub.lius.me`。
2. 在 Cloudflare 的 `lius.me` Zone 新建 DNS 记录：

   | Type | Name | Target | Proxy status |
   | --- | --- | --- | --- |
   | `CNAME` | `stickerhub` | `cname.vercel-dns.com` | **DNS only（灰云）** |

3. 等 Vercel 显示域名已验证且 TLS 证书已签发。首次验证前不要开橙云，否则 Vercel 可能无法看见用于验证的 CNAME。
4. 访问 `https://stickerhub.lius.me` 并完成下方验证后，再把该记录切为 **Proxied（橙云）**。

不要为这个子域同时创建 A、AAAA、CNAME 多条冲突记录；也不要将 Vercel 生成的 `*.vercel.app` 预览域名加入正式 CORS 白名单。

## 5. Cloudflare：TLS、缓存与安全规则

### TLS

在 **SSL/TLS** 中设置：

- Encryption mode：**Full (strict)**。
- Always Use HTTPS：开启。
- Minimum TLS Version：TLS 1.2。
- 等正式站点稳定后再启用 HSTS；先以不含 preload 的配置观察至少一天，确认没有子域兼容问题后再考虑长期 HSTS。

不要使用 Flexible SSL。它会让 Cloudflare 到 Vercel 的连接退化为 HTTP，并容易引发重定向循环或 Cookie 安全问题。

### Cache Rules

添加一条高优先级规则：

```text
when http.request.uri.path starts_with "/api/"
then Cache eligibility: Bypass cache
```

这会保护后台、Resend Webhook 和按 API Key 鉴权的接口。不要创建覆盖全站的 **Cache Everything** 规则；Nuxt 的页面 SWR 与 Vercel 静态资源缓存已足够，Cloudflare 默认也会缓存有合适缓存头的静态资源。

### WAF / Rate limiting

把 Cloudflare 作为第二道按 IP 的防护，不能替代应用内按 Key 的 Upstash 限流：

- `/api/admin/*`：建议每 IP `10 requests / 1 minute`，动作为 Block 或 Managed Challenge。
- `/api/v1/*`：建议每 IP `240 requests / 1 minute`，动作为 Block。实际业务配额仍由每把 Key 的 60 RPM 控制。
- `/api/webhooks/resend`：不要加 JavaScript Challenge；该端点会自行验证 Resend 的 Svix 签名。

Cloudflare 不同套餐可创建的 WAF/Rate Limiting 规则数量不同；若当前套餐没有该能力，保留应用内 Upstash 限流并不要为此改成全站 Bot Challenge。

## 6. Resend Webhook

确认公开 HTTPS 域名已经正常访问后，在 Resend 新建 Webhook：

```text
https://stickerhub.lius.me/api/webhooks/resend
```

选择应用已处理的事件：

- `email.delivery_delayed`
- `email.delivered`
- `email.bounced`
- `email.complained`
- `email.failed`
- `email.suppressed`

将 Webhook signing secret 写入 Vercel 的 `NUXT_RESEND_WEBHOOK_SECRET`，然后重新部署。不要把该 secret 放在 Cloudflare 规则、前端代码或 README 中。

## 7. 上线后验证

完成 DNS 代理切换后，逐项验证：

```bash
curl -I https://stickerhub.lius.me/
curl -I https://stickerhub.lius.me/admin/login
curl -sS https://stickerhub.lius.me/robots.txt
curl -sS https://stickerhub.lius.me/sitemap.xml
curl -sS https://stickerhub.lius.me/openapi.json
curl -i https://stickerhub.lius.me/api/v1/health
```

预期：

- 首页、`/docs`、`/admin/login`、`/robots.txt`、`/sitemap.xml`、`/openapi.json` 返回成功。
- `/api/v1/health` 在没有 `X-API-Key` 时返回 `401`，而不是 `200`。
- `/api/admin/*`、`/api/v1/*`、`/api/webhooks/*` 响应为 `Cache-Control: no-store`。
- 响应含 `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy` 与 `Permissions-Policy`。
- `/admin/login` 可以登录；创建一把测试 Key 后，只用该 Key 请求 `/api/v1/health` 得到 `200`。
- 从后台创建一把通知邮件 Key，Resend 显示 accepted，之后对应 Webhook 状态会回写审计记录。
- Cloudflare 开橙云后页面、图片、开发者 API 与 Resend Webhook 均保持正常。

测试完成后应撤销测试 API Key，而不是长期留存。
