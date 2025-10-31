// utils/toRichTextOnly.js
import { toRichBlock } from "./richText";

export function toRichTextOnly(blockOrString) {
  return toRichBlock(blockOrString);
}
