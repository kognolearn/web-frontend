/**
 * V2 Content System - Section-Based Content Architecture
 *
 * This module provides the complete V2 content rendering system including:
 * - V2ContentRenderer: Main entry point for rendering V2 content
 * - V2ContentProvider: Context provider for state management
 * - useV2Content: Hook for accessing content state
 * - useV2Grading: Hook for grading operations
 * - Component Registry: Maps type names to implementations
 *
 * Usage:
 * ```jsx
 * import { V2ContentRenderer, isV2Content } from "@/components/content/v2";
 *
 * function ContentDisplay({ content, courseId, nodeId }) {
 *   if (isV2Content(content)) {
 *     return (
 *       <V2ContentRenderer
 *         content={content}
 *         courseId={courseId}
 *         nodeId={nodeId}
 *       />
 *     );
 *   }
 *   return <LegacyRenderer content={content} />;
 * }
 * ```
 */

// Main Renderer
export { default as V2ContentRenderer, isV2Content } from "./V2ContentRenderer";

// Section Renderer
export { default as V2SectionRenderer } from "./V2SectionRenderer";

// Context & State Management
export {
  V2ContentProvider,
  useV2Content,
  V2ContentContext,
} from "./V2ContentContext";

// Grading Hook
export { useV2Grading } from "./useV2Grading";

// Component Registry
export {
  default as componentRegistry,
  getComponent,
  hasComponent,
  getRegisteredTypes,
  isGradableType,
  isInputType,
  isDisplayType,
  COMPONENT_CATEGORIES,
} from "./ComponentRegistry";

// Display Components
export * from "./components/display";

// Input Components
export * from "./components/input";

// Assessment Components
export * from "./components/assessment";

// Types (JSDoc definitions available in types.js)
// Import types.js directly if you need JSDoc type definitions
