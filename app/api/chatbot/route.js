// POST /api/chatbot
// Bridges requests to OpenRouter Grok 4 Fast with validation and robust error handling.
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
      temperature = 0.5,
      maxTokens = 600,
      attachments = [],
      reasoning,
    } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // Explicit error if not configured
      return json({ error: 'Server misconfiguration: OPENROUTER_API_KEY is missing' }, 500);
    }

    // Build messages for OpenRouter (OpenAI-compatible)
    const systemPreamble = buildSystemPreamble({
      system,
      context,
      useWebSearch,
      responseFormat,
    });

    const userContent = buildUserContent(user, attachments);

    const messages = [
      { role: 'system', content: systemPreamble },
      userContent,
    ];

    // Reasoning options mapping (best-effort, optional)
    const reasoningConfig = normalizeReasoning(reasoning);

    // Construct payload
    const payload = {
      model: 'x-ai/grok-4-fast',
      messages,
      temperature,
      max_tokens: maxTokens,
      // response_format may be ignored by some providers but is safe to include
      ...(responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
      ...(reasoningConfig ? { reasoning: reasoningConfig } : {}),
    };

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Optional but recommended by OpenRouter
        ...(process.env.OPENROUTER_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_REFERER } : {}),
        ...(process.env.OPENROUTER_TITLE ? { 'X-Title': process.env.OPENROUTER_TITLE } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await safeReadText(resp);
      // Throwing as requested if the call does not go through
      throw new Error(`OpenRouter error (${resp.status}): ${truncate(errorText, 2000)}`);
    }

    const data = await resp.json();
    const content = extractMessageContent(data);

    return json({ model: 'x-ai/grok-4-fast', content }, 200);
  } catch (error) {
    // Ensure the error is surfaced; include minimal diagnostics
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

function buildSystemPreamble({ system, context, useWebSearch, responseFormat }) {
  const parts = [system.trim()];
  if (typeof context !== 'undefined') {
    const ctx = typeof context === 'string' ? context : safeStringify(context);
    parts.push(`Context:\n${ctx}`);
  }
  if (useWebSearch) {
    parts.push('Web search may be used when necessary; include sources when applicable.');
  }
  if (responseFormat === 'json') {
    parts.push('Respond with a single valid JSON object only, no extra prose.');
  }
  return parts.join('\n\n');
}

function buildUserContent(user, attachments) {
  // OpenAI/OpenRouter compatible content composition with optional media
  const base = [{ type: 'text', text: user }];
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      const { type, mimeType, data, url, name } = att || {};
      if (!mimeType && !type && !url && !data) continue;

      const isImage = (mimeType || '').startsWith('image/');
      const dataUrl = data && mimeType ? `data:${mimeType};base64,${data}` : undefined;
      const imageUrl = url || dataUrl;

      if (isImage && imageUrl) {
        base.push({ type: 'image_url', image_url: imageUrl, mime_type: mimeType || undefined, name: name || undefined });
      } else {
        // Fallback: include non-image attachments as text descriptors
        const label = name || 'attachment';
        const descriptor = url ? url : (data ? `[inline base64 ${mimeType || 'data'} omitted]` : '(no content)');
        base.push({ type: 'text', text: `Attachment: ${label}${mimeType ? ` (${mimeType})` : ''} -> ${descriptor}` });
      }
    }
  }
  // If we created multiple parts, use array style; otherwise a simple string also works.
  return base.length > 1
    ? { role: 'user', content: base }
    : { role: 'user', content: base[0].text };
}

function normalizeReasoning(reasoning) {
  if (!reasoning) return undefined;
  if (typeof reasoning === 'object') return reasoning;
  if (reasoning === true) return { effort: 'medium' };
  if (typeof reasoning === 'string') return { effort: reasoning };
  return undefined;
}

function extractMessageContent(apiResponse) {
  try {
    const content = apiResponse?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;

    // If content is array of parts, join text parts for a normalized string
    if (Array.isArray(content)) {
      const texts = content
        .map((part) => (typeof part === 'string' ? part : part?.text || ''))
        .filter(Boolean);
      return texts.join('\n');
    }
  } catch {
    // ignore and fall through
  }
  return '';
}

function safeStringify(obj) {
  try { return JSON.stringify(obj); } catch { return String(obj); }
}

async function safeReadText(resp) {
  try { return await resp.text(); } catch { return ''; }
}

function truncate(s, max) {
  if (!s || s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}
