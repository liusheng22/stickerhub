const blockedAiCrawlerPattern = /(?:ClaudeBot|Claude-SearchBot|anthropic-ai|GPTBot|CCBot|Bytespider|Google-Extended|Applebot-Extended|meta-externalagent|cohere-ai|PerplexityBot)/i

export function isBlockedAiCrawler(userAgent: string | undefined): boolean {
  return Boolean(userAgent && blockedAiCrawlerPattern.test(userAgent))
}
