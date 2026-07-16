import { listSitemapAlbums, listSitemapCreators } from '../../utils/queries/stickers'

export default defineEventHandler(async () => {
  const [albums, creators] = await Promise.all([listSitemapAlbums(), listSitemapCreators()])

  return [
    { loc: '/albums', changefreq: 'daily', priority: 0.9, _i18nTransform: true },
    { loc: '/creators', changefreq: 'weekly', priority: 0.8, _i18nTransform: true },
    { loc: '/about', changefreq: 'monthly', priority: 0.5, _i18nTransform: true },
    { loc: '/privacy', changefreq: 'monthly', priority: 0.3, _i18nTransform: true },
    { loc: '/support', changefreq: 'monthly', priority: 0.3, _i18nTransform: true },
    ...creators.map(({ slug }) => ({ loc: `/creators/${encodeURIComponent(slug)}`, changefreq: 'weekly', priority: 0.7, _i18nTransform: true })),
    ...albums.map(({ productId }) => ({ loc: `/albums/${encodeURIComponent(productId)}`, changefreq: 'weekly', priority: 0.8, _i18nTransform: true })),
  ]
})
