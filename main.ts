import { serve } from 'https://deno.land/std@0.180.0/http/server.ts'

const markdownContent = `
# Viki 的 Proxy 服务

## 使用举例

将需要代理的链接的 \`host\` 换成 \`proxy.viki.moe\`，并加上 \`proxy-host\` url 参数即可，如：

\`\`\`diff
- https://webstatic.mihoyo.com/hk4e/gacha_info/cn_gf01/gacha/list.json
+ https://proxy.viki.moe/hk4e/gacha_info/cn_gf01/gacha/list.json?proxy-host=webstatic.mihoyo.com
\`\`\`

以上链接将 \`webstatic.mihoyo.com\` 换成了 \`proxy.viki.moe\`，并添加了 \`proxy-host\` 参数指明了原来的 host。

写这玩意完全是为了应付公司对部分域名的屏蔽策略（逃

## 参数选项

参数同时支持 url \`searchParams\` 和自定义 \`headers\` 字段。

- \`proxy-host\`
- \`proxy-port\` 默认 \`443\`
- \`proxy-protocol\` 默认 \`https\`
`

const api = 'https://markdown2html.deno.dev'


async function handleRequest(request: Request) {
    const url = new URL(request.url)

    const hostname = url.searchParams.get('proxy-host') || request.headers.get("proxy-host")
    const port = url.searchParams.get('proxy-port') || request.headers.get("proxy-port")
    const protocol = url.searchParams.get('proxy-protocol') || request.headers.get("proxy-protocol")

    if (!hostname) {
        const html = await fetch(api, {
            method: 'POST',
            body: markdownContent,
        })

        return html
    }

    url.hostname = hostname || 'viki.moe'
    url.port = port || '443'
    url.protocol = protocol || 'https:'

    url.searchParams.delete('proxy-host')
    url.searchParams.delete('proxy-port')
    url.searchParams.delete('proxy-protocol')

    const headers = new Headers(request.headers);

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