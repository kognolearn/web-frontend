# V2 Component Schemas

Base layout item shape:

```json
{
  "id": "string",
  "type": "string",
  "props": { "...": "component-specific" }
}
```

Notes:
- Input/assessment components also accept runtime fields like `value`, `onChange`, `disabled`, `grade`, `isGraded`, `isGradable`.
- Type keys are the snake_case registry keys shown below; aliases are listed when multiple keys map to one component.

## Display Components

### accordion (Accordion)

Props:
- sections: Array<{id: string, title: string, content: string, initially_open: boolean}> - Sections
- allow_multiple_open: boolean - Allow multiple sections open at once

### audio_player (AudioPlayer)

Props:
- audio_url: string - Audio file URL
- transcript?: string - Optional transcript text
- waveform?: boolean - Show waveform visualization
- playback_rate_control?: boolean - Show playback rate control

### callout (Callout)

Props:
- type: 'info' | 'tip' | 'warning' | 'error' | 'definition' - Callout type
- title?: string - Optional title
- content: string - Markdown content
- collapsible: boolean - Whether callout can be collapsed

### citation_list (CitationList)

Props:
- citations: Array
- style='APA'?: 'APA' | 'MLA' | 'Chicago'

### data_table_viewer (DataTableViewer)

Props:
- columns: string[] - Column headers
- rows: any[][] - Table data (2D array)
- sortable: boolean - Allow sorting
- filterable: boolean - Allow filtering

### diagram_viewer (DiagramViewer)

Props:
- diagram_type: 'mermaid' | 'svg' - Type of diagram
- content: string - Mermaid syntax or SVG markup
- labels?: Array<{id: string, text: string, x?: number, y?: number}> - Labels to overlay
- zoomable: boolean - Allow zoom

### glossary_panel (GlossaryPanel)

Props:
- terms: Array<{term: string, definition: string, related_terms?: string[]}>
- searchable=true?: boolean
- alphabetized=true?: boolean

### image_viewer (ImageViewer)

Props:
- images: Array<{url: string, caption?: string, alt: string}> - Images to display
- layout: 'single' | 'grid' | 'carousel' | 'comparison' - Display layout
- zoomable: boolean - Allow zoom on click

### map_viewer (MapViewer)

Props:
- center: {lat: number, lng: number}
- zoom=5?: number
- markers?: Array<{id: string, lat: number, lng: number, label: string, popup?: string}>
- regions?: Array<{id: string, geojson: string, label: string, fill_color?: string}>

### markdown_block (MarkdownBlock)

Props:
- content: string - Markdown content with LaTeX ($inline$ or $$block$$)

### pdf_viewer (PdfViewer)

Props:
- pdf_url: string - PDF URL
- start_page?: number - Starting page (1-indexed)
- end_page?: number - Ending page (1-indexed)
- citation_anchors?: string[] - Citation anchor IDs

### reveal_block (RevealBlock)

Props:
- trigger_label: string - Button label (e.g., "Show Hint", "View Solution")
- content: string - Hidden markdown content
- reveal_type: 'click' | 'hover' | 'after_attempt' - How to reveal
- penalty_warning?: string - Optional warning text
- canReveal=true?: boolean - For after_attempt, whether user has attempted

### side_by_side_compare (SideBySideCompare)

Props:
- left?: string|Object - Left panel content
- right?: string|Object - Right panel content
- panels?: Array - Optional [left, right] panels

### tab_group (TabGroup)

Props:
- tabs: Array<{id: string, label: string, content: string, icon?: string}> - Tab items
- default_tab?: string - Default tab ID

### timeline_viewer (TimelineViewer)

Props:
- events: Array<{id: string, date: string, title: string, description?: string, image_url?: string}>
- orientation='horizontal'?: 'horizontal' | 'vertical'
- zoomable=true?: boolean

### video_embed (VideoEmbed)

Props:
- video_url: string - Video URL
- start_time?: number - Start time in seconds
- end_time?: number - End time in seconds
- chapters?: Array<{time: number, label: string}> - Video chapters

## Input Components

### audio_recorder (AudioRecorder)

Answer value:
- value?: * - Current audio blob/URL

Props:
- max_duration: number - Maximum recording duration in seconds
- playback?: boolean - Show playback controls

### chemical_equation (ChemicalEquation)

Answer value:
- value?: Object - Current value { reactant_coefficients, product_coefficients }

Props:
- reactants: Array<{formula: string, coefficient_editable: boolean, initial_coefficient: number}>
- products: Array<{formula: string, coefficient_editable: boolean, initial_coefficient: number}>
- show_state_symbols?: boolean - Show state symbols (s), (l), (g), (aq)

### code_editor (CodeEditor)

Answer value:
- value?: string - Current code value

Props:
- language: string - Programming language
- initial_code: string - Initial code template
- readonly_lines?: number[] - Line numbers that cannot be edited

### drawing_canvas (DrawingCanvas)

Answer value:
- value?: string - Serialized drawing (data URL)

Props:
- width=600?: number
- height=400?: number
- tools?: Array
- background_image?: string
- snapToGrid?: boolean
- gridSize?: number

### graph_plotter (GraphPlotter)

Answer value:
- value?: * - Current plot value

Props:
- x_range: [number, number] - X axis range [min, max]
- y_range: [number, number] - Y axis range [min, max]
- grid: boolean - Show grid
- mode: 'point' | 'line' | 'freehand' | 'function' - Plotting mode
- background_functions?: Array<{expression: string, color: string, label?: string}> - Background functions
- max_points: number - Maximum number of points

### math_input (MathInput)

Answer value:
- value?: string - Current LaTeX value

Props:
- placeholder: string - Placeholder text

### matrix_input (MatrixInput)

Answer value:
- value?: (string|number)[][] - Current matrix value

Props:
- rows: number - Number of rows
- cols: number - Number of columns
- initial_values?: (string|number)[][] - Initial values
- readonly_cells?: [number, number][] - Cells that cannot be edited
- allow_fractions?: boolean - Allow fraction input

### number_slider (NumberSlider)

Answer value:
- value?: number - Current value

Props:
- min: number - Minimum value
- max: number - Maximum value
- step: number - Step increment
- initial_value?: number - Initial value
- unit?: string - Unit label
- marks?: Array<{value: number, label: string}> - Slider marks

### numeric_input (NumericInput)

Answer value:
- value?: number - Current value

Props:
- placeholder: string - Placeholder text
- unit?: string - Unit label (e.g., "kg", "m/s")
- decimal_places?: number - Max decimal places
- min?: number - Minimum value
- max?: number - Maximum value
- scientific_notation?: boolean - Allow scientific notation

### rich_text_area (RichTextArea)

Answer value:
- value?: string - Current value

Props:
- min_words: number - Minimum word count
- max_words?: number - Maximum word count
- placeholder: string - Placeholder text

## Assessment Components

### annotation_highlighter (AnnotationHighlighter)

Answer value:
- value?: Array<{start: number, end: number, color_id: string, note?: string}>

Props:
- passage: string
- highlight_colors: Array<{id: string, label: string, color: string}>
- allow_notes=true?: boolean

### argument_builder (ArgumentBuilder)

Answer value:
- value?: {claim: string, evidence: string[], reasoning?: string} - Argument value

Props:
- claim_prompt: string - Prompt for claim
- evidence_slots: number - Number of evidence pieces required
- reasoning_required?: boolean - Whether reasoning is required

### classification_buckets (ClassificationBuckets)

Answer value:
- value?: Object.<string, string[]> - Items in each bucket { bucketId: [itemIds] }

Props:
- items: Array<{id: string, content: string}> - Items to classify
- buckets: Array<{id: string, label: string, description?: string}> - Category buckets
- shuffle_items?: boolean - Shuffle items

### code_question (CodeQuestion)

Answer value:
- value?: string - Current code value

Props:
- language: string - Programming language
- initial_code: string - Initial code template
- test_cases?: Array<{input: string, expected_output: string, visible: boolean}> - Test cases

### diagram_labeler (DiagramLabeler)

Answer value:
- value?: Object.<string, string> - Label values { labelId: text }

Props:
- image_url: string - Diagram image URL
- labels: Array<{id: string, text?: string, x: number, y: number}> - Label positions

### evidence_highlighter (EvidenceHighlighter)

Answer value:
- value?: Array<{start: number, end: number, color_id: string}> - Highlighted ranges

Props:
- passage: string - Text passage to highlight
- highlight_colors: Array<{id: string, label: string, color: string}> - Available colors
- instruction: string - Instructions
- min_highlights?: number - Minimum highlights required
- max_highlights?: number - Maximum highlights allowed

### fill_in_blank (FillInBlank)

Answer value:
- value?: string|Object.<string, string|number> - Answer(s)

Props:
- template: string - Template text (may contain {{blankId}} placeholders)
- blanks: Array<{id?: string, answer?: string, hint?: string, input_type?: string, case_sensitive?: boolean}>
- case_sensitive?: boolean - Whether matching is case sensitive (default)

### graph_sketch_answer (GraphSketchAnswer)

Answer value:
- value?: * - Current sketch data

Props:
- x_range: [number, number] - X axis range
- y_range: [number, number] - Y axis range
- grid: boolean - Show grid
- constraints_hint?: string - Hint about constraints

### image_hotspot (ImageHotspot)

Answer value:
- value?: {x: number, y: number} - Clicked position (percentage)

Props:
- image_url: string - Image URL
- prompt: string - Instructions for what to click

### long_form_response (LongFormResponse)

Answer value:
- value?: string - Current value

Props:
- rubric?: string - Display rubric (markdown)
- min_words: number - Minimum word count
- max_words?: number - Maximum word count

### matching_pairs (MatchingPairs)

Answer value:
- value?: Array<[string, string]> - Matched pairs [[leftId, rightId], ...]

Props:
- left_items: Array<{id: string, content: string}> - Left column items
- right_items: Array<{id: string, content: string}> - Right column items
- allow_many_to_one?: boolean - Allow multiple left items to match one right
- shuffle?: boolean - Shuffle items

### multi_select_group (MultiSelectGroup)

Answer value:
- value?: string[] - Selected option IDs

Props:
- options: Array<{id: string, label: string}> - Available options

### numeric_answer (NumericAnswer)

Answer value:
- value?: number - Current value

Props:
- placeholder: string - Placeholder text
- unit?: string - Unit label
- tolerance?: number - Display tolerance (actual in grading_logic)

### oral_response (OralResponse)

Answer value:
- value?: * - Current audio blob/URL

Props:
- max_duration: number - Maximum recording duration in seconds
- expected_keywords?: string[] - Keywords hint for display

### proof_builder (ProofBuilder)

Answer value:
- value?: * - Proof value (format depends on proof_format)

Props:
- given: string[] - Starting premises
- goal: string - What to prove
- available_rules?: Array<{id: string, name: string, description: string}> - Rules to choose from
- max_steps: number - Maximum number of steps
- proof_format: 'two_column' | 'paragraph' | 'tree' - Proof format

### select_group (SelectGroup)

Answer value:
- value?: string - Selected option ID/value

Props:
- question?: string - Question text (supports markdown/LaTeX)
- options: Array<{id: string, text: string}|string> - Available options (can be strings or objects)
- multi_select?: false - Must be false for single select

### short_answer (ShortAnswer)

Answer value:
- value?: string - Current value

Props:
- placeholder: string - Placeholder text
- max_length?: number - Maximum character length
- case_sensitive?: boolean - Whether matching is case sensitive

### sortable_list (SortableList)

Answer value:
- value?: string[] - Ordered array of item IDs

Props:
- items: Array<{id: string, content: string}> - Items to sort

### stepwise_derivation (StepwiseDerivation)

Answer value:
- value?: string[] - Array of derivation steps (LaTeX)

Props:
- given: string[] - Starting premises/equations
- goal: string - What to derive
- max_steps: number - Maximum number of steps

### table_input (TableInput)

Answer value:
- value?: string[][] - Current table values (2D array)

Props:
- columns: string[] - Column headers
- rows: number - Number of editable rows
- initial_values?: string[][] - Initial cell values

### true_false_statement (TrueFalseStatement)

Answer value:
- value?: Object.<string, boolean|'unsure'> - Answers { statementId: true/false/'unsure' }

Props:
- statements: Array<{id: string, text: string}> - Statements to evaluate
- include_unsure?: boolean - Include "Not enough info" option

## Plugin Components

### circuit_builder (CircuitBuilder)

Props:
- available_components: Array<string>
- grid_size=[10,8]?: [number, number]
- initial_circuit?: string
- simulation_enabled=true?: boolean
- target_measurement?: Object

### code_playground (CodePlayground)

Props:
- language: string
- initial_code: string
- readonly_lines?: number[]
- hidden_setup?: string
- hidden_teardown?: string
- output_type='console'?: 'console' | 'html' | 'canvas' | 'table'
- time_limit_ms=5000?: number
- memory_limit_mb=64?: number

### geometry_sketcher (GeometrySketcher)

Props:
- tools?: Array<string>
- initial_construction?: string
- show_measurements=true?: boolean
- snap_to_grid=true?: boolean
- grid_size=20?: number

### molecule_viewer3_d, molecule_viewer_3d (MoleculeViewer3D)

Props:
- mode='display'?: 'display' | 'build'
- molecule_data?: string
- molecule_id?: string
- show_labels=true?: boolean
- display_style='ball_and_stick'?: 'ball_and_stick' | 'space_filling' | 'wireframe'
- available_atoms?: string[]

### music_notation (MusicNotation)

Props:
- mode='display'?: 'display' | 'input'
- abc_notation?: string
- clef='treble'?: string
- time_signature='4/4'?: string
- key_signature='C'?: string
- num_measures=4?: number
- playback=true?: boolean

### s_q_l_workbench, sql_workbench (SQLWorkbench)

Props:
- database_schema: Array<{name: string, columns: Array, sample_data?: Array}>
- initial_query?: string
- readonly_schema=true?: boolean
- show_schema_explorer=true?: boolean
