const md2htmlApi = 'https://md2html.viki.moe'

// Worker / Vercel 无法读取文件系统，README 在此内联
// Deno 版本（main.ts）会在运行时读取文件并覆盖此值
export const markdownContent = `# Viki 的 Proxy 服务

## 使用方法

将需要代理的链接的 \`host\` 换成 \`proxy.viki.moe\`，并用 \`proxy-host\` 参数（\`URLSearchParams\` 或者 \`headers\`）指明原来的 \`host\` 即可。

\`\`\`diff
- https://example.com/path/to/page?param=value
+ https://proxy.viki.moe/path/to/page?param=value&proxy-host=example.com
\`\`\`

## 参数选项

同时支持 URL \`searchParams\` 和自定义 \`headers\` 两种方式指定，**任选其一**设置即可。

以下是支持的参数：

- \`proxy-host\`: 需要代理的 \`host\`
- \`proxy-protocol\`: 协议，默认 \`https\`，可空
- \`proxy-port\`: 端口，HTTPS 默认为 \`443\`，可空
- \`proxy-referrer\`: 自定义 \`Referer\` 请求头，可空

## 举例

比如某哈游的原神卡池数据：

\`\`\`plain
https://proxy.viki.moe/gacha_info/hk4e/cn_gf01/gacha/list.json?proxy-host=operation-webstatic.mihoyo.com
\`\`\`

以上链接将 \`operation-webstatic.mihoyo.com\` 换成了 \`proxy.viki.moe\`，并添加 \`proxy-host\` 指明了原来的 \`host\`。

写这玩意完全是为了临时解决公司对部分域名的屏蔽策略（逃
`

export function createHandler(markdown: string) {
  return function handle(request: Request): Promise<Response> | Response {
    const url = new URL(request.url)
    const [sp, reqHeaders] = [url.searchParams, request.headers]

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      const responseHeaders = new Headers()
      responseHeaders.set('Access-Control-Allow-Origin', '*')
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, HEAD, DELETE, OPTIONS')
      responseHeaders.set('Access-Control-Allow-Headers', reqHeaders.get('Access-Control-Request-Headers') || '*')
      responseHeaders.set('Access-Control-Max-Age', '86400')

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
      return fetch(md2htmlApi, { method: 'POST', body: markdown })
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

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    })
  }
}
