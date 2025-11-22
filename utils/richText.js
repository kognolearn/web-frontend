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
