import { isBlockedAiCrawler } from '../utils/crawlers'

export default defineEventHandler((event) => {
  if (event.path === '/robots.txt' || !isBlockedAiCrawler(getHeader(event, 'user-agent'))) {
    return
  }

  setResponseStatus(event, 403)
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  return 'Automated AI crawling is not permitted.'
})
