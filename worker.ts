/**
 * Cloudflare Workers 版本
 * 部署：npx wrangler deploy
 */

import { createHandler, markdownContent } from './handler.ts'

export default {
  fetch: createHandler(markdownContent),
}
