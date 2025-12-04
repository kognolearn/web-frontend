// POST /api/chatbot
// Proxies requests to backend POST /chat endpoint
const BASE_URL = process.env.BACKEND_API_URL || "https://api.kognolearn.com";

export async function POST(request) {
  try {
    const body = await safeParseJson(request);

    // Validate required fields
    const validation = validateBody(body);
    if (!validation.valid) {
      return json({ error: validation.error }, 400);
    }

    const {
      system,
      user,
      userId,
      context,
      useWebSearch = false,
      responseFormat = 'text',
      temperature = 0.6,
      maxTokens = 1200,
      attachments = [],
      reasoning,
    } = body;

    // Forward to backend /chat endpoint
    const url = new URL("/chat", BASE_URL);
    const payload = {
      system,
      user,
      userId,
      ...(context !== undefined ? { context } : {}),
      useWebSearch,
      responseFormat,
      temperature,
      maxTokens,
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(reasoning !== undefined ? { reasoning } : {}),
    };

    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const bodyText = await resp.text();
    let data;
    try {
      data = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      data = { error: 'Invalid JSON from backend' };
    }

    if (!resp.ok) {
      return json({ error: data?.error || `Backend error (${resp.status})`, details: data }, resp.status);
    }

    return json({ model: data.model || 'x-ai/grok-4-fast', content: data.content || '' }, 200);
  } catch (error) {
    return json(
      {
        error: 'Internal Server Error',
        details: error?.message ?? String(error),
      },
      500
    );
  }
}

// Utilities
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function safeParseJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const { system, user, userId, context, useWebSearch, responseFormat, temperature, maxTokens, attachments } = body;

  if (!isNonEmptyString(system)) return { valid: false, error: 'Missing required field: system (string)' };
  if (!isNonEmptyString(user)) return { valid: false, error: 'Missing required field: user (string)' };
  if (!isUuid(userId)) return { valid: false, error: 'Missing or invalid field: userId (UUID)' };

  // Optional types
  if (typeof useWebSearch !== 'undefined' && typeof useWebSearch !== 'boolean') {
    return { valid: false, error: 'useWebSearch must be a boolean' };
  }
  if (typeof responseFormat !== 'undefined' && !['text', 'json'].includes(responseFormat)) {
    return { valid: false, error: 'responseFormat must be "text" or "json"' };
  }
  if (typeof temperature !== 'undefined' && typeof temperature !== 'number') {
    return { valid: false, error: 'temperature must be a number' };
  }
  if (typeof maxTokens !== 'undefined' && typeof maxTokens !== 'number') {
    return { valid: false, error: 'maxTokens must be a number' };
  }
  if (typeof attachments !== 'undefined' && !Array.isArray(attachments)) {
    return { valid: false, error: 'attachments must be an array' };
  }

  // Context must be JSON-serializable (best-effort check by trying to stringify)
  if (typeof context !== 'undefined') {
    try { JSON.stringify(context); } catch {
      return { valid: false, error: 'context must be JSON-serializable' };
    }
  }

  return { valid: true };
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isUuid(v) {
  if (typeof v !== 'string') return false;
  // UUID v1-v5 pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(v);
}

async function safeReadText(resp) {
  try { return await resp.text(); } catch { return ''; }
}
