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
 * 1. Converting double-escaped backslashes to single (\\( -> \()
 * 2. Converting \[...\] display math to $$...$$
 * 3. Converting \(...\) inline math to $...$
 * 4. Detecting bare LaTeX patterns (X^{-1}) and wrapping them in $ delimiters
 */
export function normalizeLatex(text) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  
  // Normalize double-escaped backslashes from JSON
  result = result
    .replace(/\\\\(\(|\))/g, '\\$1')  // \\( -> \(, \\) -> \)
    .replace(/\\\\(\[|\])/g, '\\$1')  // \\[ -> \[, \\] -> \]
    .replace(/\\\\mathbf/g, '\\mathbf')
    .replace(/\\\\mathbb/g, '\\mathbb')
    .replace(/\\\\lambda/g, '\\lambda')
    .replace(/\\\\begin/g, '\\begin')
    .replace(/\\\\end/g, '\\end')
    .replace(/\\\\frac/g, '\\frac')
    .replace(/\\\\sqrt/g, '\\sqrt')
    .replace(/\\\\sum/g, '\\sum')
    .replace(/\\\\int/g, '\\int')
    .replace(/\\\\cdot/g, '\\cdot')
    .replace(/\\\\times/g, '\\times')
    .replace(/\\\\pm/g, '\\pm')
    .replace(/\\\\neq/g, '\\neq')
    .replace(/\\\\leq/g, '\\leq')
    .replace(/\\\\geq/g, '\\geq')
    .replace(/\\\\infty/g, '\\infty')
    .replace(/\\\\alpha/g, '\\alpha')
    .replace(/\\\\beta/g, '\\beta')
    .replace(/\\\\gamma/g, '\\gamma')
    .replace(/\\\\delta/g, '\\delta')
    .replace(/\\\\theta/g, '\\theta')
    .replace(/\\\\pi/g, '\\pi')
    .replace(/\\\\sigma/g, '\\sigma')
    .replace(/\\\\mu/g, '\\mu')
    .replace(/\\\\epsilon/g, '\\epsilon')
    .replace(/\\\\text/g, '\\text')
    .replace(/\\\\quad/g, '\\quad')
    .replace(/\\\\qquad/g, '\\qquad')
    .replace(/\\\\left/g, '\\left')
    .replace(/\\\\right/g, '\\right');
  
  // Convert \[...\] display math to $$...$$
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
  
  // Convert \(...\) inline math to $...$
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  
  // Detect bare LaTeX patterns and wrap them in $ delimiters
  // Only apply to text not already in $ delimiters
  result = result.replace(/([A-Za-z]+)(\^{[^}]+})/g, (match, p1, p2) => {
    // Check if already wrapped in $ (look back for $)
    return `$${p1}${p2}$`;
  });
  result = result.replace(/([A-Za-z]+)(_{[^}]+})/g, '$$$1$2$$');
  result = result.replace(/([A-Za-z])\^(-?\d+)(?![}$])/g, '$$$1^{$2}$$');
  
  // Clean up any double-wrapped math ($$...$$ that got extra $)
  result = result.replace(/\$\$\$\$/g, '$$$$');
  
  return result;
}
