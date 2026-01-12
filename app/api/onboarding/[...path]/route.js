// Proxy onboarding requests to backend /onboarding endpoints.
const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function GET(request, { params }) {
  return proxyRequest(request, params, "GET");
}

export async function POST(request, { params }) {
  return proxyRequest(request, params, "POST");
}

export async function PATCH(request, { params }) {
  return proxyRequest(request, params, "PATCH");
}

async function proxyRequest(request, params, method) {
  try {
    const resolvedParams = await params;
    const pathSegments = Array.isArray(resolvedParams?.path) ? resolvedParams.path : [];
    const pathSuffix = pathSegments.length ? `/${pathSegments.join("/")}` : "";

    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(`/onboarding${pathSuffix}`, BASE_URL);
    targetUrl.search = incomingUrl.search;

    const headers = { Accept: "application/json" };
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
    const userAgent = request.headers.get("user-agent");
    if (userAgent) {
      headers["User-Agent"] = userAgent;
    }
    const acceptLanguage = request.headers.get("accept-language");
    if (acceptLanguage) {
      headers["Accept-Language"] = acceptLanguage;
    }
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      headers["X-Forwarded-For"] = forwardedFor;
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      headers["X-Real-Ip"] = realIp;
    }

    const body =
      method === "POST" || method === "PATCH" || method === "PUT"
        ? await request.text()
        : undefined;

    const resp = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
    });

    const respText = await resp.text();
    const respContentType = resp.headers.get("content-type") || "application/json";

    return new Response(respText, {
      status: resp.status,
      headers: { "Content-Type": respContentType },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Onboarding proxy failed",
        details: error?.message ?? String(error),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
