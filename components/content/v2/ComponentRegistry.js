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
  EvidenceHighlighter,
  StepwiseDerivation,
  ProofBuilder,
  CodeQuestion,
  GraphSketchAnswer,
  LongFormResponse,
  ArgumentBuilder,
  OralResponse,
} from "./components/assessment";

/**
 * Registry mapping component type strings to React components
 *
 * The keys match the `type` field from the backend component spec.
 * Component types use snake_case to match backend naming convention.
 */
const componentRegistry = {
  // Display Components (11)
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

  // Input Components (9)
  numeric_input: NumericInput,
  number_slider: NumberSlider,
  math_input: MathInput,
  matrix_input: MatrixInput,
  rich_text_area: RichTextArea,
  code_editor: CodeEditor,
  graph_plotter: GraphPlotter,
  chemical_equation: ChemicalEquation,
  audio_recorder: AudioRecorder,

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
};

/**
 * Get a component by its type name
 * @param {string} type - The component type (e.g., "markdown_block", "select_group")
 * @returns {React.ComponentType|null} - The React component or null if not found
 */
export function getComponent(type) {
  return componentRegistry[type] || null;
}

/**
 * Check if a component type is registered
 * @param {string} type - The component type
 * @returns {boolean}
 */
export function hasComponent(type) {
  return type in componentRegistry;
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
};

/**
 * Check if a component type is gradable (assessment category)
 * @param {string} type - The component type
 * @returns {boolean}
 */
export function isGradableType(type) {
  return COMPONENT_CATEGORIES.assessment.includes(type);
}

/**
 * Check if a component type is an input type
 * @param {string} type - The component type
 * @returns {boolean}
 */
export function isInputType(type) {
  return COMPONENT_CATEGORIES.input.includes(type);
}

/**
 * Check if a component type is a display type
 * @param {string} type - The component type
 * @returns {boolean}
 */
export function isDisplayType(type) {
  return COMPONENT_CATEGORIES.display.includes(type);
}

export default componentRegistry;
