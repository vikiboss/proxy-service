const md2htmlApi = "https://md2html.viki.moe";
const markdownContent = await Deno.readTextFile("./README.md");

Deno.serve((request: Request) => {
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

	url.hostname = hostname || "viki.moe";
	url.port = port || "443";
	url.protocol = protocol || "https:";

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

	return fetch(url.href, {
		headers,
		method: request.method,
		body: request.body,
	});
});
