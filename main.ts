import { serve } from 'https://deno.land/std@0.180.0/http/server.ts'

const md2htmlApi = 'https://markdown2html.deno.dev'
const markdownContent = Deno.readTextFileSync('./README.md')

async function handleRequest(request: Request) {
  const url = new URL(request.url)
  const hostname = url.searchParams.get('proxy-host') || request.headers.get('proxy-host')
  const port = url.searchParams.get('proxy-port') || request.headers.get('proxy-port')
  const protocol = url.searchParams.get('proxy-protocol') || request.headers.get('proxy-protocol')

  if (!hostname) {
    return await fetch(md2htmlApi, { method: 'POST', body: markdownContent })
  }

  url.hostname = hostname || 'viki.moe'
  url.port = port || '443'
  url.protocol = protocol || 'https:'

  url.searchParams.delete('proxy-host')
  url.searchParams.delete('proxy-port')
  url.searchParams.delete('proxy-protocol')

  const headers = new Headers(request.headers)

  headers.delete('proxy-host')
  headers.delete('proxy-port')
  headers.delete('proxy-protocol')

  const res = await fetch(url.href, {
    headers,
    method: request.method,
    body: request.body
  })

  return res
}

serve(handleRequest)
