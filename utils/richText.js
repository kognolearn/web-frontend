function isEscaped(text, index) {
  let slashCount = 0;
  let i = index - 1;
  while (i >= 0 && text[i] === '\\') {
    slashCount += 1;
    i -= 1;
  }
  return slashCount % 2 === 1;
}

function unescapeText(text) {
  if (!text) return '';
  return text.replace(/\\([$()\\[\\]\\\\])/g, (_, ch) => ch);
}

function consumeBlock(text, start, open, close) {
  const bodyStart = start + open.length;
  let i = bodyStart;
  while (i < text.length) {
    const idx = text.indexOf(close, i);
    if (idx === -1) return null;
    if (!isEscaped(text, idx)) {
      return {
        end: idx + close.length,
        body: text.slice(bodyStart, idx),
      };
    }
    i = idx + close.length;
  }
  return null;
}

function consumeInlineDollar(text, start) {
  const bodyStart = start + 1;
  let i = bodyStart;
  while (i < text.length) {
    const idx = text.indexOf('$', i);
    if (idx === -1) return null;
    if (text[idx - 1] === '$') {
      i = idx + 1;
      continue;
    }
    if (!isEscaped(text, idx)) {
      return {
        end: idx + 1,
        body: text.slice(bodyStart, idx),
      };
    }
    i = idx + 1;
  }
  return null;
}

export function parsePlainTextToNodes(input) {
  if (input === null || input === undefined) return [];
  const text = String(input);
  if (!text) return [];

  const nodes = [];
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      nodes.push({ text: unescapeText(buffer) });
      buffer = '';
    }
  };

  let i = 0;
  while (i < text.length) {
    const char = text[i];

    if (char === '$' && !isEscaped(text, i)) {
      if (text[i + 1] === '$') {
        const block = consumeBlock(text, i, '$$', '$$');
        if (block) {
          flushBuffer();
          nodes.push({ 'block-math': block.body.trim() });
          i = block.end;
          continue;
        }
      } else {
        const inline = consumeInlineDollar(text, i);
        if (inline) {
          flushBuffer();
          nodes.push({ 'inline-math': inline.body.trim() });
          i = inline.end;
          continue;
        }
      }
    }

    if (char === '\\' && !isEscaped(text, i)) {
      const next = text[i + 1];
      if (next === '[') {
        const block = consumeBlock(text, i, '\\[', '\\]');
        if (block) {
          flushBuffer();
          nodes.push({ 'block-math': block.body.trim() });
          i = block.end;
          continue;
        }
      }
      if (next === '(') {
        const inline = consumeBlock(text, i, '\\(', '\\)');
        if (inline) {
          flushBuffer();
          nodes.push({ 'inline-math': inline.body.trim() });
          i = inline.end;
          continue;
        }
      }
    }

    buffer += char;
    i += 1;
  }

  flushBuffer();
  return nodes;
}

function coerceNode(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => coerceNode(entry)).filter(Boolean);
  }

  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return parsePlainTextToNodes(String(value));
  }

  if (type === 'object') {
    if (Array.isArray(value.content)) {
      return value.content.flatMap((entry) => coerceNode(entry)).filter(Boolean);
    }

    if (Object.prototype.hasOwnProperty.call(value, 'block-math')) {
      const math = value['block-math'];
      if (math !== null && math !== undefined) {
        return [{ 'block-math': String(math).trim() }];
      }
      return [];
    }

    if (Object.prototype.hasOwnProperty.call(value, 'inline-math')) {
      const math = value['inline-math'];
      if (math !== null && math !== undefined) {
        return [{ 'inline-math': String(math).trim() }];
      }
      return [];
    }

    if (Object.prototype.hasOwnProperty.call(value, 'text')) {
      return parsePlainTextToNodes(value.text ?? '');
    }

    if (Object.prototype.hasOwnProperty.call(value, 'markdown')) {
      return parsePlainTextToNodes(value.markdown ?? '');
    }

    if (Object.prototype.hasOwnProperty.call(value, 'value')) {
      return parsePlainTextToNodes(value.value ?? '');
    }
  }

  return [];
}

export function toRichBlock(value) {
  const nodes = coerceNode(value).filter((node) => {
    if (!node) return false;
    if (typeof node !== 'object') return false;
    if ('text' in node) {
      return typeof node.text === 'string' && node.text.length > 0;
    }
    if ('inline-math' in node) {
      return typeof node['inline-math'] === 'string' && node['inline-math'].length > 0;
    }
    if ('block-math' in node) {
      return typeof node['block-math'] === 'string' && node['block-math'].length > 0;
    }
    return false;
  });
  return { content: nodes };
}

export function hasRichContent(block) {
  return Boolean(block && Array.isArray(block.content) && block.content.length > 0);
}

export function mergeRichBlocks(...values) {
  const nodes = values.flatMap((value) => coerceNode(value)).filter(Boolean);
  return { content: nodes };
}
