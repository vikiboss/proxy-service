const md2htmlApi = 'https://md2html.viki.moe'
const markdownContent = await Deno.readTextFile('./README.md')

Deno.serve((request: Request) => {
  const url = new URL(request.url)
  const [sp, reqHeaders] = [url.searchParams, request.headers]

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    const responseHeaders = new Headers()
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, HEAD, DELETE, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', reqHeaders.get('Access-Control-Request-Headers') || '*')
    responseHeaders.set('Access-Control-Max-Age', '86400') // 缓存预检响应24小时

    return new Response(null, {
      status: 200,
      headers: responseHeaders,
    })
  }

  const [hostname, port, protocol, referrer] = [
    sp.get('proxy-host') || reqHeaders.get('proxy-host'),
    sp.get('proxy-port') || reqHeaders.get('proxy-port'),
    sp.get('proxy-protocol') || reqHeaders.get('proxy-protocol'),
    sp.get('proxy-referrer') || reqHeaders.get('proxy-referrer'),
  ]

  if (!hostname) {
    if (url.pathname === '/favicon.ico') {
      return fetch('https://avatar.viki.moe')
    }
    return fetch(md2htmlApi, { method: 'POST', body: markdownContent })
  }

  url.hostname = hostname || 'viki.moe'
  url.port = port || '443'
  url.protocol = protocol || 'https:'

  sp.delete('proxy-host')
  sp.delete('proxy-port')
  sp.delete('proxy-protocol')
  sp.delete('proxy-referrer')

  const headers = new Headers(reqHeaders)

  headers.delete('proxy-host')
  headers.delete('proxy-port')
  headers.delete('proxy-protocol')
  headers.delete('proxy-referrer')

  if (referrer) {
    headers.set('referer', referrer)
  }

  return fetch(url.href, {
    headers,
    method: request.method,
    body: request.body,
    redirect: 'follow',
  }).then(response => {
    const responseHeaders = new Headers(response.headers)

    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, HEAD, DELETE, OPTIONS')
    responseHeaders.set(
      'Access-Control-Allow-Headers',
      request.headers.get('Access-Control-Request-Headers') || '*',
    )

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  })
})
