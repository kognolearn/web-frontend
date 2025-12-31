/**
 * V2 Content System Type Definitions
 * Using JSDoc for type safety in JavaScript
 */

/**
 * @typedef {'introduction' | 'concept_explanation' | 'worked_example' | 'guided_practice' | 'independent_practice' | 'assessment' | 'synthesis' | 'review' | 'challenge'} SectionPurpose
 */

/**
 * @typedef {'ready' | 'generating' | 'error'} ContentStatus
 */

/**
 * @typedef {Object} V2ContentPayload
 * @property {2} version - Must be 2 for V2 content
 * @property {ContentStatus} status - Content generation status
 * @property {number} total_points - Total points available in lesson
 * @property {V2Section[]} sections - Array of content sections
 * @property {V2Flashcard[]} [flashcards] - Optional flashcards
 * @property {V2Video[]} [video] - Optional video content
 * @property {string} [video_urls] - Video URLs string
 * @property {Object} [generation_plans] - Generation plan info
 * @property {string[]} [generation_warnings] - Any warnings from generation
 */

/**
 * @typedef {Object} V2Section
 * @property {string} id - Unique section identifier (e.g., "sec-intro")
 * @property {string} title - Section title
 * @property {SectionPurpose} purpose - Section purpose type
 * @property {string} learning_objective - What this section teaches
 * @property {number} estimated_minutes - Estimated time to complete
 * @property {boolean} requires_previous - If true, previous section must be completed
 * @property {V2Component[]} layout - Array of components to render
 * @property {V2GradingRule[]} grading_logic - Grading rules for this section
 */

/**
 * @typedef {Object} V2Component
 * @property {string} id - Unique component identifier
 * @property {string} type - Component type name (e.g., 'MarkdownBlock', 'SelectGroup')
 * @property {Object} props - Component-specific props
 */

/**
 * @typedef {Object} V2GradingRule
 * @property {string} component_id - ID of component to grade
 * @property {string} evaluator - Evaluator type (e.g., 'exact_match', 'numeric_match')
 * @property {Object} config - Evaluator-specific config (DO NOT expose to user)
 * @property {number} points - Points awarded for correct answer
 */

/**
 * @typedef {Object} V2Flashcard
 * @property {string} front - Front of flashcard
 * @property {string} back - Back of flashcard
 * @property {string} [explanation] - Optional explanation
 */

/**
 * @typedef {Object} V2Video
 * @property {string} videoId - Video identifier
 * @property {string} url - Video URL
 * @property {string} [title] - Video title
 * @property {string} [description] - Video description
 */

/**
 * @typedef {Object} V2GradeRequest
 * @property {Object.<string, *>} answers - Map of component_id to user answer
 * @property {string} [sectionId] - Optional: grade specific section only
 * @property {boolean} [sync] - If true, returns result immediately
 */

/**
 * @typedef {Object} V2GradeResponse
 * @property {boolean} success
 * @property {V2GradeResult} grade - Grading results
 * @property {string} [eventId] - Analytics event ID
 */

/**
 * @typedef {Object} V2GradeResult
 * @property {boolean} passed - Whether the section was passed
 * @property {number} total_points - Total possible points
 * @property {number} earned_points - Points earned
 * @property {V2ComponentGradeResult[]} results - Per-component results
 */

/**
 * @typedef {Object} V2ComponentGradeResult
 * @property {string} component_id - Component that was graded
 * @property {string} evaluator - Evaluator used
 * @property {boolean} passed - Whether this component passed
 * @property {number} points - Points possible
 * @property {number} earned_points - Points earned
 * @property {Object} details - Evaluator-specific feedback
 * @property {*} [details.expected] - Expected answer
 * @property {*} [details.received] - User's answer
 * @property {string} [details.feedback] - Feedback message
 * @property {string} [details.error] - Error message if any
 */

/**
 * @typedef {Object} V2AsyncGradeResponse
 * @property {boolean} success
 * @property {string} jobId - Job ID for polling
 * @property {'queued'} status - Initial status
 * @property {string} statusUrl - URL to poll for status
 * @property {string} message - Status message
 */

/**
 * @typedef {'idle' | 'grading' | 'graded' | 'error'} SectionGradeStatus
 */

/**
 * @typedef {Object} V2SectionGradeState
 * @property {SectionGradeStatus} status - Current grading status
 * @property {Object.<string, V2ComponentGradeResult>} [grades] - Per-component grades
 * @property {string} [error] - Error message if failed
 * @property {number} [totalScore] - Total score achieved
 * @property {number} [maxScore] - Maximum possible score
 */

/**
 * @typedef {'pristine' | 'dirty' | 'submitted' | 'graded'} SectionProgress
 */

/**
 * @typedef {Object} V2ContentState
 * @property {Object.<string, Object.<string, *>>} answers - Map of section_id -> component_id -> answer
 * @property {Object.<string, V2SectionGradeState>} sectionGrades - Map of section_id -> grade state
 * @property {Object.<string, SectionProgress>} sectionProgress - Map of section_id -> progress
 */

// Component Props Type Definitions

/**
 * @typedef {Object} BaseComponentProps
 * @property {string} id - Component ID
 * @property {*} [value] - Current value
 * @property {Function} [onChange] - Value change handler
 * @property {boolean} [disabled] - Whether input is disabled
 * @property {V2ComponentGradeResult} [grade] - Grade result
 * @property {boolean} [isGraded] - Whether section is graded
 * @property {boolean} [isGradable] - Whether this component is gradable
 */

/**
 * @typedef {Object} MarkdownBlockProps
 * @property {string} content - Markdown content with LaTeX support
 */

/**
 * @typedef {Object} CalloutProps
 * @property {'info' | 'tip' | 'warning' | 'error' | 'definition'} type - Callout type
 * @property {string} [title] - Optional title
 * @property {string} content - Markdown content
 * @property {boolean} collapsible - Whether callout can be collapsed
 */

/**
 * @typedef {Object} RevealBlockProps
 * @property {string} trigger_label - Button label (e.g., "Show Hint")
 * @property {string} content - Hidden markdown content
 * @property {'click' | 'hover' | 'after_attempt'} reveal_type - How to reveal
 * @property {string} [penalty_warning] - Optional warning text
 */

/**
 * @typedef {Object} AccordionSection
 * @property {string} id - Section ID
 * @property {string} title - Section title
 * @property {string} content - Markdown content
 * @property {boolean} initially_open - Whether open by default
 */

/**
 * @typedef {Object} AccordionProps
 * @property {AccordionSection[]} sections - Accordion sections
 * @property {boolean} allow_multiple_open - Allow multiple sections open
 */

/**
 * @typedef {Object} TabItem
 * @property {string} id - Tab ID
 * @property {string} label - Tab label
 * @property {string} content - Markdown content
 * @property {string} [icon] - Optional icon
 */

/**
 * @typedef {Object} TabGroupProps
 * @property {TabItem[]} tabs - Tab items
 * @property {string} [default_tab] - Default tab ID
 */

/**
 * @typedef {Object} VideoChapter
 * @property {number} time - Time in seconds
 * @property {string} label - Chapter label
 */

/**
 * @typedef {Object} VideoEmbedProps
 * @property {string} video_url - Video URL
 * @property {number} [start_time] - Start time in seconds
 * @property {number} [end_time] - End time in seconds
 * @property {VideoChapter[]} [chapters] - Video chapters
 */

/**
 * @typedef {Object} SelectOption
 * @property {string} id - Option ID
 * @property {string} label - Option label (can contain markdown/LaTeX)
 */

/**
 * @typedef {Object} SelectGroupProps
 * @property {SelectOption[]} options - Available options
 * @property {false} multi_select - Must be false for single select
 */

/**
 * @typedef {Object} MultiSelectGroupProps
 * @property {SelectOption[]} options - Available options
 */

/**
 * @typedef {Object} NumericInputProps
 * @property {string} placeholder - Placeholder text
 * @property {string} [unit] - Unit label (e.g., "kg", "m/s")
 * @property {number} [decimal_places] - Max decimal places
 * @property {number} [min] - Minimum value
 * @property {number} [max] - Maximum value
 * @property {boolean} [scientific_notation] - Allow scientific notation
 */

/**
 * @typedef {Object} FillInBlankItem
 * @property {string} id - Blank ID
 * @property {string} [hint] - Optional hint
 * @property {'text' | 'number' | 'dropdown'} input_type - Input type
 * @property {string[]} [options] - Options for dropdown
 */

/**
 * @typedef {Object} FillInBlankProps
 * @property {string} template - Template with {{blankId}} placeholders
 * @property {FillInBlankItem[]} blanks - Blank definitions
 * @property {boolean} case_sensitive - Whether matching is case sensitive
 */

export {};
