const md2htmlApi = "https://60s-api.viki.moe/v2/md2html";
const markdownContent = await Deno.readTextFile("./README.md");

function modifyHtml(html: string, params: URLSearchParams): string {
  const paramString = params.toString();
  if (!paramString) return html;

  // 处理href、src属性
  let modifiedHtml = html.replace(
    /(<(?:a|link|img|script|iframe|source|video|audio)\s+[^>]*?\s(?:href|src)\s*=\s*["'])([^"']*)(["'])/gi,
    (_, prefix, url, suffix) => {
      const newUrl = appendParams(url, paramString);
      return `${prefix}${newUrl}${suffix}`;
    },
  );

  // 处理srcset属性
  modifiedHtml = modifiedHtml.replace(
    /(<(?:img|source)\s+[^>]*?\ssrcset\s*=\s*["'])([^"']*)(["'])/gi,
    (_, prefix, srcset, suffix) => {
      const newSrcset = srcset.split(",")
        .map((part) => {
          const trimmed = part.trim();
          const [url, ...descriptors] = trimmed.split(/\s+/);
          const newUrl = appendParams(url, paramString);
          return descriptors.length > 0 ? `${newUrl} ${descriptors.join(" ")}` : newUrl;
        })
        .join(", ");
      return `${prefix}${newSrcset}${suffix}`;
    },
  );

  return modifiedHtml;
}

function appendParams(url: string, params: string): string {
  if (/^(#|data:|javascript:|mailto:)/i.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${params}`;
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  const [sp, reqHeaders] = [url.searchParams, request.headers];

  const [hostname, port, protocol] = [
    sp.get("proxy-host") || reqHeaders.get("proxy-host"),
    sp.get("proxy-port") || reqHeaders.get("proxy-port"),
    sp.get("proxy-protocol") || reqHeaders.get("proxy-protocol"),
  ];

  if (!hostname) {
    if (url.pathname === "/favicon.ico") {
      return fetch("https://avatar.viki.moe");
    }
    return fetch(md2htmlApi, { method: "POST", body: markdownContent });
  }

  // 构造代理URL
  const proxyUrl = new URL(url);
  proxyUrl.hostname = hostname;
  proxyUrl.port = port || "443";
  proxyUrl.protocol = protocol ? `${protocol}:` : "https:";
  
  // 删除代理参数，避免重复
  sp.delete("proxy-host");
  sp.delete("proxy-port");
  sp.delete("proxy-protocol");
  proxyUrl.search = sp.toString();

  const headers = new Headers(reqHeaders);
  headers.delete("proxy-host");
  headers.delete("proxy-port");
  headers.delete("proxy-protocol");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  // 发送代理请求
  const proxyResponse = await fetch(proxyUrl, {
    headers,
    method: request.method,
    body: request.body,
  });

  // 处理HTML内容
  const contentType = proxyResponse.headers.get("Content-Type") || "";
  if (contentType.includes("text/html")) {
    const proxyParams = new URLSearchParams({
      "proxy-host": hostname,
      "proxy-port": port || "443",
      "proxy-protocol": protocol || "https",
    });
    
    const html = await proxyResponse.text();
    const modifiedHtml = modifyHtml(html, proxyParams);
    
    const newHeaders = new Headers(proxyResponse.headers);
    newHeaders.set("Content-Length", String(new TextEncoder().encode(modifiedHtml).byteLength));
    
    return new Response(modifiedHtml, {
      headers: newHeaders,
      status: proxyResponse.status,
    });
  }

  return proxyResponse;
});
