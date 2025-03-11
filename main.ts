const md2htmlApi = "https://60s-api.viki.moe/v2/md2html";
const markdownContent = await Deno.readTextFile("./README.md");

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);
  const [sp, reqHeaders] = [url.searchParams, request.headers];

  const [hostname, port, protocol] = [
    sp.get("proxy-host") || reqHeaders.get("proxy-host"),
    sp.get("proxy-port") || reqHeaders.get("proxy-port"),
    sp.get("proxy-protocol") || reqHeaders.get("proxy-protocol"),
  ];

  if (!hostname) {
    if (url.pathname === '/favicon.ico') {
      return fetch('https://avatar.viki.moe');
    }
    return fetch(md2htmlApi, { method: "POST", body: markdownContent });
  }

  // 目标URL构建
  const targetUrl = new URL(url);
  targetUrl.hostname = hostname;
  targetUrl.port = port || "443";
  targetUrl.protocol = protocol || "https:";

  // 清理搜索参数和请求头
  sp.delete("proxy-host");
  sp.delete("proxy-port");
  sp.delete("proxy-protocol");

  const headers = new Headers(reqHeaders);
  headers.delete("proxy-host");
  headers.delete("proxy-port");
  headers.delete("proxy-protocol");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );

  try {
    const response = await fetch(targetUrl.href, {
      headers,
      method: request.method,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: "follow",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    // 处理HTML响应，重写相对URL
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const originalText = await response.text();
      // 替换相对路径的资源引用
      const baseUrl = `${targetUrl.protocol}//${targetUrl.hostname}${targetUrl.port ? `:${targetUrl.port}` : ''}`;
      
      // 创建当前服务URL的基础部分(用于构建代理URL)
      const currentOrigin = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
      
      // 替换模式，处理不同类型的资源引用
      const modifiedHtml = originalText
        // 处理src属性中的绝对路径引用 (以/开头)
        .replace(/(src|href)=(['"])\/([^'"]*)\2/gi, 
          `$1=$2${currentOrigin}?proxy-host=${hostname}${port ? `&proxy-port=${port}` : ''}${protocol ? `&proxy-protocol=${protocol}` : ''}&/$3$2`)
        // 处理src属性中的相对路径引用 (不以/开头,也不包含http)
        .replace(/(src|href)=(['"])(?!http|\/\/|data:|#)([^'"\/][^'"]*)\2/gi, 
          `$1=$2${currentOrigin}?proxy-host=${hostname}${port ? `&proxy-port=${port}` : ''}${protocol ? `&proxy-protocol=${protocol}` : ''}&/${url.pathname.split('/').slice(0, -1).join('/')}/$3$2`)
        // 处理绝对URL但未指定协议的情况 (以//开头)
        .replace(/(src|href)=(['"])\/\/([^'"]*)\2/gi, 
          `$1=$2${protocol || 'https:'}//\3$2`);
      
      // 插入base标签确保其他相对路径正确解析
      const baseTagHtml = `<base href="${baseUrl}/">`;
      const modifiedHtmlWithBase = modifiedHtml.replace(/<head>/i, `<head>${baseTagHtml}`);
      
      return new Response(modifiedHtmlWithBase, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    // 非HTML内容直接返回
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`代理请求错误: ${error.message}`, { status: 500 });
  }
});
