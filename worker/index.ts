/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SITE_PUBLIC_INDEXING?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!["GET","HEAD","OPTIONS"].includes(request.method) && url.pathname.startsWith("/api/")) {
      const origin = request.headers.get("origin");
      if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({error:"Bu işlem site üzerinden yapılmalıdır."},{status:403,headers:{"Cache-Control":"no-store"}});
      const size = Number(request.headers.get("content-length") || 0);
      // This temporary importer authenticates before reading a body and enforces
      // its own image, part and metadata budgets. Other API routes stay bounded.
      const limit=url.pathname==="/api/source-archive"?33_554_432:4_000_000;
      if (!Number.isFinite(size) || size < 0 || size > limit) return Response.json({error:"İstek boyutu çok büyük."},{status:413,headers:{"Cache-Control":"no-store"}});
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const internalHeaders=new Headers(request.headers);
    internalHeaders.set("x-orman-public-indexing",env.SITE_PUBLIC_INDEXING==="true"?"1":"0");
    const response=await handler.fetch(new Request(request,{headers:internalHeaders}), env, ctx);
    const responseHeaders=new Headers(response.headers);
    responseHeaders.set("X-Content-Type-Options","nosniff");
    responseHeaders.set("Referrer-Policy","strict-origin-when-cross-origin");
    // Keep inline hydration and Sites embedding compatible. This is a baseline,
    // not a complete authorization or script-security policy.
    if(!responseHeaders.has("Content-Security-Policy"))responseHeaders.set("Content-Security-Policy","object-src 'none'; base-uri 'self'; form-action 'self'");
    if (responseHeaders.get("Content-Type")?.includes("text/html")) responseHeaders.set("Cache-Control","private, no-store");
    if (env.SITE_PUBLIC_INDEXING !== "true") responseHeaders.set("X-Robots-Tag","noindex, nofollow");
    if (url.protocol === "https:") responseHeaders.set("Strict-Transport-Security","max-age=31536000");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:responseHeaders});
  },
};

export default worker;
