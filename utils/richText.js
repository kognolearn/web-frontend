/**
 * Utility functions for handling rich text content
 */

/**
 * Checks if a block has rich content (structured content array)
 */
export function hasRichContent(block) {
  return (
    block &&
    typeof block === "object" &&
    Array.isArray(block.content) &&
    block.content.length > 0
  );
}

/**
 * Converts various formats to a RichBlock structure
 */
export function toRichBlock(value) {
  if (!value) {
    return { content: [] };
  }

  // Already a rich block with content array
  if (typeof value === "object" && Array.isArray(value.content)) {
    return value;
  }

  // Array of content items
  if (Array.isArray(value)) {
    return { content: value };
  }

  // String - convert to text content
  if (typeof value === "string") {
    return { content: [{ text: value }] };
  }

  // Object with blocks property
  if (typeof value === "object" && Array.isArray(value.blocks)) {
    return { content: value.blocks };
  }

  // Object with sequence property
  if (typeof value === "object" && Array.isArray(value.sequence)) {
    return { content: value.sequence };
  }

  // Object with body or reading property (legacy format)
  if (typeof value === "object" && (value.body || value.reading)) {
    return { body: value.body || value.reading };
  }

  // Fallback: empty content
  return { content: [] };
}

/**
 * Normalizes LaTeX content by:
 * 1. Converting double-escaped backslashes to single (\\command -> \command)
 * 2. Converting \[...\] display math to $$...$$
 * 3. Converting \(...\) inline math to $...$
 * 4. Fixing common LaTeX issues like broken delimiters
 */
export function normalizeLatex(text) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  
  // Step 1: Handle multiple levels of escaping that can occur from JSON parsing
  // Only convert double backslash to single (\\omega -> \omega)
  // Use \\\\ to match double backslash in regex
  result = result.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
  
  // Step 2: Fix double-escaped special characters and delimiters
  result = result
    // 2 backslashes + delimiter -> 1 backslash + delimiter  
    .replace(/\\\\(\(|\))/g, '\\$1')
    .replace(/\\\\(\[|\])/g, '\\$1')
    // Escaped braces
    .replace(/\\\\\{/g, '\\{')
    .replace(/\\\\\}/g, '\\}')
    .replace(/\\\\_/g, '\\_')
    .replace(/\\\\,/g, '\\,')
    .replace(/\\\\;/g, '\\;')
    .replace(/\\\\!/g, '\\!');
  
  // Step 3: Convert \[...\] display math to $$...$$
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
  
  // Step 4: Fix \mathcal, \mathscr etc. that might have issues
  result = result.replace(/\\(mathcal|mathscr|mathbb|mathbf|mathrm|mathit|text|operatorname)\s*\{/g, '\\$1{');
  
  // Step 5: Fix cases where command runs into number (e.g., \omega0 -> \omega_0)
  const greekLetters = 'alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega';
  const greekPattern = new RegExp(`\\\\(${greekLetters})(\\d)`, 'g');
  result = result.replace(greekPattern, '\\$1_$2');
  
  // Step 6: Escape special characters inside \text{} blocks
  // & and # need to be escaped as \& and \# in LaTeX text mode
  result = result.replace(/\\text\{([^}]*)\}/g, (match, content) => {
    const escaped = content
      .replace(/(?<!\\)&/g, '\\&')
      .replace(/(?<!\\)#/g, '\\#');
    return `\\text{${escaped}}`;
  });
  
  // Step 7: Escape stray single dollar signs so they are treated as text, not inline math
  result = result.replace(/(?<!\$)\$(?!\$)/g, '\\$');
  
  return result;
}
