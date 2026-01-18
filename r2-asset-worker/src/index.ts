/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// 1. 定义允许的 CORS 头
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*", // 允许所有来源，包括 Figma 的 null origin
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, X-Asset-Ext, X-Asset-Hash, X-Asset-Content-Type, X-Upload-Secret",
		};

		// 2. 处理 OPTIONS 预检请求
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: corsHeaders,
			});
		}

		// Serve image handler (GET /figma/...)
		if (request.method === 'GET' && url.pathname.startsWith('/figma/')) {
			const response = await handleGet(request, env);
			// 添加 CORS 头到响应中
			const newHeaders = new Headers(response.headers);
			Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders
			});
		}

		// Handle Upload (POST /upload)
		if (request.method === 'POST' && url.pathname === '/upload') {
			const response = await handleUpload(request, env);
			// 添加 CORS 头到响应中
			const newHeaders = new Headers(response.headers);
			Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders
			});
		}

		return new Response('Not Found', { status: 404, headers: corsHeaders });
	},
} satisfies ExportedHandler<Env>;

async function handleGet(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	// pathname: /figma/hash.ext
	// key: figma/hash.ext (remove leading slash)
	const key = url.pathname.slice(1);

	const object = await env.MY_BUCKET.get(key);

	if (object === null) {
		return new Response('Object Not Found', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);

	return new Response(object.body, {
		headers,
	});
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	
	// 1. 校验 Secret
	const secret = request.headers.get('X-Upload-Secret');
	if (!secret || secret !== env.UPLOAD_SECRET) {
		return new Response('Unauthorized', { status: 401 });
	}

	// 2. 获取元数据
	const hash = request.headers.get('X-Asset-Hash');
	const ext = request.headers.get('X-Asset-Ext'); // png | svg
	const contentType = request.headers.get('X-Asset-Content-Type');

	if (!hash || !ext || !contentType) {
		return new Response('Missing required headers', { status: 400 });
	}

	// 3. 构造 R2 Key
	const key = `figma/${hash}.${ext}`;

	// 4. 检查是否存在（可选，R2 put 本身也可以覆盖，这里为了简单直接 put，或者为了省流可以先 head）
	// 这里直接 PUT，R2 写入是最终一致性，且如果 hash 一样内容也一样，覆盖也没问题。
	// 为了性能，如果这里有 KV 缓存或者 R2 head check 可以优化，但在 Worker 侧
	// 既然插件侧已经做了 hash check，这里理论上请求过来的都是这就需要的。
	// 不过为了防止并发上传同一文件，R2 并发写入同一 key 也是安全的。

	try {
		await env.MY_BUCKET.put(key, request.body, {
			httpMetadata: {
				contentType: contentType,
			},
		});

		// 5. 构造返回 URL
		// 如果配置了自定义域名/Worker 路由
		// 如果是 R2 公开访问域名，可能不同。这里假设 Worker 作为一个网关，或者 R2 绑定了域名。
		// 方案 A: Worker 代理读取（需要实现 GET /figma/:key）
		// 方案 B: R2 绑定了自定义域名，直接返回 R2 的 URL。
		// 方案 C: Worker 绑定了自定义域名，且做代理。

		// 根据计划文档："返回 public URL（可使用自定义域名 + Worker 路由，或 Worker 代理读取）"
		// 简单起见，如果设置了 PUBLIC_BASE_URL，则拼接；否则我们得让 Worker 也能服务 GET 请求。
		
		// 让我们增加一个 GET 处理逻辑以便 Worker 可以作为图片服务（如果 R2 没有公开 bucket 访问权限的话）。
		// 但为了简单，假设 PUBLIC_BASE_URL 指向了 R2 的公开域名，或者我们在这里实现 GET。
		// 既然是 "Cloudflare Worker + R2"，通常 R2 不直接公开，而是通过 Worker 访问。
		// 所以我们最好也实现 GET /figma/:key
		
		let publicUrl: string;
		if (env.PUBLIC_BASE_URL) {
			// 假设 PUBLIC_BASE_URL 是 https://assets.example.com
			// 最终 URL: https://assets.example.com/figma/hash.png
			// 如果 PUBLIC_BASE_URL 带了路径，要注意拼接。
			// 这里简单处理：
			const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
			publicUrl = `${base}/${key}`;
		} else {
			// 使用当前 Worker 的域名
			publicUrl = `${url.origin}/${key}`;
		}

		return new Response(JSON.stringify({ url: publicUrl, hash }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		return new Response(`Upload failed: ${(e as Error).message}`, { status: 500 });
	}
}
