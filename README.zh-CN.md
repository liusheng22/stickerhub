# StickerHub

[English](./README.md) | [简体中文](./README.zh-CN.md)

StickerHub 是一个基于 Nuxt 4 构建的表情包站点，用于浏览、搜索、预览和下载海量表情包。

## 在线预览

- [正式站点](https://stickerhub.lius.me)
- [Vercel 部署](https://wxsticker.vercel.app)
- [Cloudflare Workers 部署指南](./docs/deployment.md)

## 项目定位

StickerHub 首先是一个面向普通用户的网站：

- 浏览海量表情包
- 按表情包名称或关键词搜索
- 查看表情包详情并预览其中的表情
- 下载和使用表情包
- 继续浏览相关作者与工作室的作品

项目也为获准的集成提供少量开发者接口，但这不是公开网站的主要用途。

## 技术栈

- Nuxt 4 与 TypeScript
- Nuxt UI v4 与 Tailwind CSS v4
- Nuxt Icon 与本地 Lucide Iconify 图标集
- Nuxt SEO，用于生成元数据、schema.org、robots 和 sitemap
- Scalar 交互式 API 参考
- Zod 公共 API 输入校验
- 生产环境使用 Turso，本地开发可回退到 SQLite

## 主要路由

| 路由 | 用途 |
| --- | --- |
| `/` | 首页与精选表情包 |
| `/albums` | 浏览和搜索表情包 |
| `/albums/:productId` | 表情包详情与预览 |
| `/search?q=` | 搜索结果 |
| `/creators` | 作者与工作室目录 |
| `/creators/:creatorSlug` | 作者详情与表情包列表 |
| `/docs` | 开发者接入指南 |
| `/docs/reference` | 交互式 API 参考 |
| `/admin/login` | 站点所有者登录 |
| `/admin/keys` | 站点所有者的 API Key 管理后台 |

## 快速开始

环境要求：Node.js 22 或更高版本，以及 pnpm 10。

```bash
pnpm install
cp .env.example .env
pnpm dev
```

打开 `http://localhost:3000`。

使用本地数据时，将 `STICKERMART_SQLITE_PATH` 指向 Turso SQLite 快照。使用远程数据时，改为同时配置 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`。

## 验证

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm run build:cloudflare
```

## 文档

纳入 Git 跟踪的正式项目文档位于 [`docs/`](./docs/)：

- [文档索引](./docs/README.md)
- [开发者接入](./docs/developer-access.md)
- [部署指南](./docs/deployment.md)
- [管理后台](./docs/admin-console.md)
- [wxemoticon 集成接口](./docs/wxemoticon-integration.md)

## 说明

- `_docs/` 用于存放本地或私有的工作记录，不属于正式的公开文档。
- 不要提交生产凭据、API Key 或本地数据库文件。
