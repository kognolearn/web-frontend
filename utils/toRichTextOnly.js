// utils/toRichTextOnly.js
export function toRichTextOnly(blockOrString) {
  if (blockOrString && typeof blockOrString === "object" && Array.isArray(blockOrString.content)) {
    return blockOrString;
  }
  return { content: [ { text: String(blockOrString ?? "") } ] };
}
