/**
 * Vercel Edge Function 版本
 * 部署：vercel deploy
 * 所有请求经由 vercel.json rewrites 路由至此函数
 */

import { createHandler, markdownContent } from '../handler.ts'

export const config = {
  runtime: 'edge',
}

export default createHandler(markdownContent)
