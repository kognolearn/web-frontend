/**
 * ComponentRegistry - Maps component type names to their implementations
 *
 * This registry is the central mapping between the backend component type strings
 * and their React component implementations. When the backend sends a component
 * with type "markdown_block", this registry resolves it to MarkdownBlock component.
 */

// Display Components
import {
  MarkdownBlock,
  Callout,
  RevealBlock,
  Accordion,
  TabGroup,
  VideoEmbed,
  AudioPlayer,
  ImageViewer,
  DiagramViewer,
  DataTableViewer,
  PdfViewer,
  SideBySideCompare,
  TimelineViewer,
  MapViewer,
  CitationList,
  GlossaryPanel,
} from "./components/display";

// Input Components
import {
  NumericInput,
  NumberSlider,
  MathInput,
  MatrixInput,
  RichTextArea,
  CodeEditor,
  GraphPlotter,
  ChemicalEquation,
  AudioRecorder,
  DrawingCanvas,
} from "./components/input";

// Assessment Components
import {
  SelectGroup,
  MultiSelectGroup,
  TrueFalseStatement,
  FillInBlank,
  MatchingPairs,
  SortableList,
  ClassificationBuckets,
  ShortAnswer,
  NumericAnswer,
  TableInput,
  ImageHotspot,
  DiagramLabeler,
  AnnotationHighlighter,
  EvidenceHighlighter,
  StepwiseDerivation,
  ProofBuilder,
  CodeQuestion,
  GraphSketchAnswer,
  LongFormResponse,
  ArgumentBuilder,
  OralResponse,
} from "./components/assessment";

import {
  CodePlayground,
  SQLWorkbench,
  CircuitBuilder,
  MusicNotation,
  MoleculeViewer3D,
  GeometrySketcher,
} from "./components/plugin";

/**
 * Convert PascalCase to snake_case
 * @param {string} str
 * @returns {string}
 */
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, (match, letter, index) =>
    index === 0 ? letter.toLowerCase() : '_' + letter.toLowerCase()
  );
}

/**
 * Registry mapping component type strings to React components
 *
 * The keys use snake_case internally, but getComponent handles both
 * snake_case and PascalCase lookups (e.g., "markdown_block" or "MarkdownBlock")
 */
const componentRegistry = {
  // Display Components (16)
  markdown_block: MarkdownBlock,
  callout: Callout,
  reveal_block: RevealBlock,
  accordion: Accordion,
  tab_group: TabGroup,
  video_embed: VideoEmbed,
  audio_player: AudioPlayer,
  image_viewer: ImageViewer,
  diagram_viewer: DiagramViewer,
  data_table_viewer: DataTableViewer,
  pdf_viewer: PdfViewer,
  side_by_side_compare: SideBySideCompare,
  timeline_viewer: TimelineViewer,
  map_viewer: MapViewer,
  citation_list: CitationList,
  glossary_panel: GlossaryPanel,

  // Input Components (11)
  numeric_input: NumericInput,
  number_slider: NumberSlider,
  math_input: MathInput,
  matrix_input: MatrixInput,
  rich_text_area: RichTextArea,
  code_editor: CodeEditor,
  graph_plotter: GraphPlotter,
  chemical_equation: ChemicalEquation,
  audio_recorder: AudioRecorder,
  drawing_canvas: DrawingCanvas,
  annotation_highlighter: AnnotationHighlighter,

  // Assessment Components (20)
  select_group: SelectGroup,
  multi_select_group: MultiSelectGroup,
  true_false_statement: TrueFalseStatement,
  fill_in_blank: FillInBlank,
  matching_pairs: MatchingPairs,
  sortable_list: SortableList,
  classification_buckets: ClassificationBuckets,
  short_answer: ShortAnswer,
  numeric_answer: NumericAnswer,
  table_input: TableInput,
  image_hotspot: ImageHotspot,
  diagram_labeler: DiagramLabeler,
  evidence_highlighter: EvidenceHighlighter,
  stepwise_derivation: StepwiseDerivation,
  proof_builder: ProofBuilder,
  code_question: CodeQuestion,
  graph_sketch_answer: GraphSketchAnswer,
  long_form_response: LongFormResponse,
  argument_builder: ArgumentBuilder,
  oral_response: OralResponse,

  // Plugin Components (6)
  code_playground: CodePlayground,
  sql_workbench: SQLWorkbench,
  s_q_l_workbench: SQLWorkbench,
  circuit_builder: CircuitBuilder,
  music_notation: MusicNotation,
  molecule_viewer3_d: MoleculeViewer3D,
  molecule_viewer_3d: MoleculeViewer3D,
  geometry_sketcher: GeometrySketcher,
};

/**
 * Normalize a component type to snake_case for registry lookup
 * Handles both PascalCase (MarkdownBlock) and snake_case (markdown_block)
 * @param {string} type
 * @returns {string}
 */
function normalizeType(type) {
  if (!type) return '';
  // If already snake_case or lowercase, return as-is
  if (type.includes('_') || type === type.toLowerCase()) {
    return type;
  }
  // Convert PascalCase to snake_case
  return toSnakeCase(type);
}

/**
 * Get a component by its type name
 * @param {string} type - The component type (e.g., "markdown_block", "MarkdownBlock")
 * @returns {React.ComponentType|null} - The React component or null if not found
 */
export function getComponent(type) {
  const normalized = normalizeType(type);
  return componentRegistry[normalized] || null;
}

/**
 * Check if a component type is registered
 * @param {string} type - The component type
 * @returns {boolean}
 */
export function hasComponent(type) {
  const normalized = normalizeType(type);
  return normalized in componentRegistry;
}

/**
 * Get all registered component types
 * @returns {string[]}
 */
export function getRegisteredTypes() {
  return Object.keys(componentRegistry);
}

/**
 * Component categories for reference
 */
export const COMPONENT_CATEGORIES = {
  display: [
    "markdown_block",
    "callout",
    "reveal_block",
    "accordion",
    "tab_group",
    "video_embed",
    "audio_player",
    "image_viewer",
    "diagram_viewer",
    "data_table_viewer",
    "pdf_viewer",
    "side_by_side_compare",
    "timeline_viewer",
    "map_viewer",
    "citation_list",
    "glossary_panel",
  ],
  input: [
    "numeric_input",
    "number_slider",
    "math_input",
    "matrix_input",
    "rich_text_area",
    "code_editor",
    "graph_plotter",
    "chemical_equation",
    "audio_recorder",
    "drawing_canvas",
    "annotation_highlighter",
  ],
  assessment: [
    "select_group",
    "multi_select_group",
    "true_false_statement",
    "fill_in_blank",
    "matching_pairs",
    "sortable_list",
    "classification_buckets",
    "short_answer",
    "numeric_answer",
    "table_input",
    "image_hotspot",
    "diagram_labeler",
    "evidence_highlighter",
    "stepwise_derivation",
    "proof_builder",
    "code_question",
    "graph_sketch_answer",
    "long_form_response",
    "argument_builder",
    "oral_response",
  ],
  plugin: [
    "code_playground",
    "sql_workbench",
    "s_q_l_workbench",
    "circuit_builder",
    "music_notation",
    "molecule_viewer3_d",
    "molecule_viewer_3d",
    "geometry_sketcher",
  ],
};

/**
 * Check if a component type is gradable (assessment category)
 * @param {string} type - The component type
 * @returns {boolean}
 */
export function isGradableType(type) {
  const normalized = normalizeType(type);
  return COMPONENT_CATEGORIES.assessment.includes(normalized);
}

/**
 * Check if a component type is an input type
 * @param {string} type - The component type
 * @returns {boolean}
 */
export function isInputType(type) {
  const normalized = normalizeType(type);
  return COMPONENT_CATEGORIES.input.includes(normalized);
}

/**
 * Check if a component type is a display type
 * @param {string} type - The component type
 * @returns {boolean}
 */
export function isDisplayType(type) {
  const normalized = normalizeType(type);
  return (
    COMPONENT_CATEGORIES.display.includes(normalized) ||
    COMPONENT_CATEGORIES.plugin.includes(normalized)
  );
}

export default componentRegistry;
