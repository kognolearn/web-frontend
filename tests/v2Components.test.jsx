import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
} from "@/components/content/v2/components/display";

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
} from "@/components/content/v2/components/input";

import AnnotationHighlighter from "@/components/content/v2/components/assessment/AnnotationHighlighter";

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
} from "@/components/content/v2/components/assessment";

import {
  CodePlayground,
  SQLWorkbench,
  CircuitBuilder,
  MusicNotation,
  MoleculeViewer3D,
  GeometrySketcher,
} from "@/components/content/v2/components/plugin";

const renderWithId = (Component, props) => {
  const utils = render(<Component {...props} />);
  expect(utils.container.querySelector(`#${props.id}`)).toBeInTheDocument();
  return utils;
};

describe("V2 display components", () => {
  it("MarkdownBlock renders LaTeX", () => {
    renderWithId(MarkdownBlock, {
      id: "markdown",
      content: "Inline $x^2$ and block $$y$$",
    });
    expect(screen.getByText("$x^2$")).toBeInTheDocument();
  });

  it("Callout renders markdown content", () => {
    renderWithId(Callout, {
      id: "callout",
      type: "tip",
      content: "Tip with $a+b$",
    });
    expect(screen.getByText("$a+b$")).toBeInTheDocument();
  });

  it("RevealBlock reveals content on click", async () => {
    const user = userEvent.setup();
    renderWithId(RevealBlock, {
      id: "reveal",
      trigger_label: "Reveal",
      content: "Answer $x$",
    });
    await user.click(screen.getByRole("button", { name: /reveal/i }));
    expect(screen.getByText("$x$")).toBeInTheDocument();
  });

  it("Accordion shows open section content", () => {
    renderWithId(Accordion, {
      id: "accordion",
      sections: [
        { id: "s1", title: "Section 1", content: "Area $A$", initially_open: true },
      ],
    });
    expect(screen.getByText("$A$")).toBeInTheDocument();
  });

  it("TabGroup renders active tab content", () => {
    renderWithId(TabGroup, {
      id: "tabs",
      tabs: [{ id: "t1", label: "Tab 1", content: "Energy $E$" }],
    });
    expect(screen.getByText("$E$")).toBeInTheDocument();
  });

  it("VideoEmbed renders iframe", () => {
    renderWithId(VideoEmbed, {
      id: "video",
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(screen.getByTitle("Video player")).toBeInTheDocument();
  });

  it("AudioPlayer renders audio element", () => {
    const { container } = renderWithId(AudioPlayer, {
      id: "audio",
      audio_url: "https://example.com/audio.mp3",
    });
    expect(container.querySelector("audio")).toBeInTheDocument();
  });

  it("ImageViewer renders images", () => {
    renderWithId(ImageViewer, {
      id: "images",
      images: [{ url: "https://example.com/image.png", alt: "Example image" }],
    });
    expect(screen.getByAltText("Example image")).toBeInTheDocument();
  });

  it("DiagramViewer renders container", () => {
    renderWithId(DiagramViewer, {
      id: "diagram",
      diagram_type: "mermaid",
      content: "graph TD\nA-->B",
    });
  });

  it("DataTableViewer renders table headers", () => {
    renderWithId(DataTableViewer, {
      id: "table",
      columns: ["Name", "Score"],
      rows: [
        ["Ada", 95],
        ["Alan", 90],
      ],
    });
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("PdfViewer renders controls", () => {
    renderWithId(PdfViewer, {
      id: "pdf",
      pdf_url: "https://example.com/doc.pdf",
    });
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("SideBySideCompare renders both panels", () => {
    renderWithId(SideBySideCompare, {
      id: "compare",
      left_content: "Left $x$",
      right_content: "Right $y$",
    });
    expect(screen.getByText("$x$")).toBeInTheDocument();
    expect(screen.getByText("$y$")).toBeInTheDocument();
  });

  it("TimelineViewer renders events", () => {
    renderWithId(TimelineViewer, {
      id: "timeline",
      events: [{ id: "e1", date: "2020", title: "Started", description: "Launch" }],
    });
    expect(screen.getByText("Started")).toBeInTheDocument();
  });

  it("MapViewer renders markers", () => {
    renderWithId(MapViewer, {
      id: "map",
      center: { lat: 0, lng: 0 },
      markers: [{ id: "m1", lat: 0, lng: 0, label: "Center" }],
    });
    expect(screen.getByText("Center")).toBeInTheDocument();
  });

  it("CitationList renders citations", () => {
    renderWithId(CitationList, {
      id: "citations",
      citations: [
        {
          id: "c1",
          authors: ["Ada Lovelace"],
          title: "Notes on the Analytical Engine",
          year: 1843,
          source: "Journal",
        },
      ],
    });
    expect(screen.getByText(/Analytical Engine/i)).toBeInTheDocument();
  });

  it("GlossaryPanel renders terms", () => {
    renderWithId(GlossaryPanel, {
      id: "glossary",
      terms: [{ term: "Signal", definition: "A function of time." }],
    });
    expect(screen.getByText("Signal")).toBeInTheDocument();
  });
});

describe("V2 input components", () => {
  it("NumericInput renders placeholder", () => {
    renderWithId(NumericInput, { id: "numeric" });
    expect(screen.getByPlaceholderText("Enter a number")).toBeInTheDocument();
  });

  it("NumberSlider renders value", () => {
    renderWithId(NumberSlider, { id: "slider", min: 0, max: 10, initial_value: 5 });
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("MathInput renders LaTeX preview", () => {
    renderWithId(MathInput, { id: "math", value: "\\frac{1}{2}" });
    expect(screen.getByText("\\[\\frac{1}{2}\\]")).toBeInTheDocument();
  });

  it("MatrixInput renders grid", () => {
    renderWithId(MatrixInput, { id: "matrix", rows: 2, cols: 2 });
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);
  });

  it("RichTextArea renders textarea", () => {
    renderWithId(RichTextArea, { id: "richtext" });
    expect(screen.getByPlaceholderText(/enter your response/i)).toBeInTheDocument();
  });

  it("CodeEditor renders language header", () => {
    renderWithId(CodeEditor, { id: "code", language: "python", initial_code: "print('hi')" });
    expect(screen.getByText("python")).toBeInTheDocument();
  });

  it("GraphPlotter renders canvas", () => {
    const { container } = renderWithId(GraphPlotter, {
      id: "plotter",
      x_range: [-5, 5],
      y_range: [-5, 5],
    });
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("ChemicalEquation renders compounds", () => {
    renderWithId(ChemicalEquation, {
      id: "chem",
      reactants: [{ formula: "H2", coefficient_editable: true, initial_coefficient: 1 }],
      products: [{ formula: "H2O", coefficient_editable: true, initial_coefficient: 1 }],
    });
    expect(screen.getByText(/balance the equation/i)).toBeInTheDocument();
  });

  it("AudioRecorder renders controls", () => {
    renderWithId(AudioRecorder, { id: "recorder", max_duration: 30 });
    expect(screen.getByText(/record/i)).toBeInTheDocument();
  });

  it("DrawingCanvas renders canvas", () => {
    const { container } = renderWithId(DrawingCanvas, { id: "drawing" });
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("AnnotationHighlighter renders passage", () => {
    renderWithId(AnnotationHighlighter, {
      id: "annotation",
      passage: "Highlight $x$ in this passage.",
      highlight_colors: [
        { id: "main", label: "Main", color: "#86efac" },
      ],
    });
    expect(screen.getByText("Highlight $x$ in this passage.")).toBeInTheDocument();
  });
});

describe("V2 assessment components", () => {
  it("SelectGroup renders question and options", () => {
    renderWithId(SelectGroup, {
      id: "select",
      question: "Choose $x$",
      options: [{ id: "a", label: "$1$" }],
    });
    expect(screen.getByText("$1$")).toBeInTheDocument();
  });

  it("MultiSelectGroup renders options", () => {
    renderWithId(MultiSelectGroup, {
      id: "multi",
      options: [{ id: "a", label: "Option $x$" }],
    });
    expect(screen.getByText("$x$")).toBeInTheDocument();
  });

  it("TrueFalseStatement renders statements", () => {
    renderWithId(TrueFalseStatement, {
      id: "tf",
      statements: [{ id: "s1", text: "Statement $x$" }],
    });
    expect(screen.getByText("$x$")).toBeInTheDocument();
  });

  it("FillInBlank renders template", () => {
    renderWithId(FillInBlank, {
      id: "fill",
      template: "Solve $x+1={{blank1}}$",
      blanks: [{ id: "blank1" }],
    });
    expect(screen.getByText(/Solve/)).toBeInTheDocument();
  });

  it("MatchingPairs renders items", () => {
    renderWithId(MatchingPairs, {
      id: "match",
      left_items: [{ id: "l1", content: "Left" }],
      right_items: [{ id: "r1", content: "Right" }],
      shuffle: false,
    });
    expect(screen.getByText("Left")).toBeInTheDocument();
  });

  it("SortableList renders list items", () => {
    renderWithId(SortableList, {
      id: "sort",
      items: [{ id: "i1", content: "First" }],
    });
    expect(screen.getByText("First")).toBeInTheDocument();
  });

  it("ClassificationBuckets renders buckets", () => {
    renderWithId(ClassificationBuckets, {
      id: "classify",
      buckets: [{ id: "b1", label: "Group A" }],
      items: [{ id: "i1", label: "Item 1" }],
    });
    expect(screen.getByText("Group A")).toBeInTheDocument();
  });

  it("ShortAnswer renders input", () => {
    renderWithId(ShortAnswer, { id: "short" });
    expect(screen.getByPlaceholderText(/enter your answer/i)).toBeInTheDocument();
  });

  it("NumericAnswer renders input", () => {
    renderWithId(NumericAnswer, { id: "numeric-answer" });
    expect(screen.getByPlaceholderText(/enter a number/i)).toBeInTheDocument();
  });

  it("TableInput renders table", () => {
    renderWithId(TableInput, {
      id: "table-input",
      columns: ["Col 1"],
      rows: 1,
      initial_values: [[""]],
    });
    expect(screen.getByText("Col 1")).toBeInTheDocument();
  });

  it("ImageHotspot renders prompt", () => {
    renderWithId(ImageHotspot, {
      id: "hotspot",
      image_url: "https://example.com/image.png",
      prompt: "Click the point",
    });
    expect(screen.getByText(/Click the point/)).toBeInTheDocument();
  });

  it("DiagramLabeler renders labels", () => {
    renderWithId(DiagramLabeler, {
      id: "labeler",
      image_url: "https://example.com/diagram.png",
      labels: [{ id: "l1", text: "Label 1", x: 10, y: 10 }],
    });
    expect(screen.getByText("Label 1")).toBeInTheDocument();
  });

  it("EvidenceHighlighter renders instruction", () => {
    renderWithId(EvidenceHighlighter, {
      id: "evidence",
      passage: "Highlight key text.",
      highlight_colors: [{ id: "main", label: "Main", color: "#fde047" }],
    });
    expect(screen.getByText("Highlight key text.")).toBeInTheDocument();
  });

  it("StepwiseDerivation renders premises", () => {
    renderWithId(StepwiseDerivation, {
      id: "steps",
      given: ["x+1=2"],
      goal: "x=1",
    });
    expect(screen.getByText("\\(x+1=2\\)")).toBeInTheDocument();
  });

  it("ProofBuilder renders prompt", () => {
    renderWithId(ProofBuilder, {
      id: "proof",
      prompt: "Prove $x$",
    });
    expect(screen.getByText(/Prove/)).toBeInTheDocument();
  });

  it("CodeQuestion renders editor", () => {
    renderWithId(CodeQuestion, {
      id: "code-question",
      language: "python",
      initial_code: "print('hi')",
      test_cases: [{ input: "1", expected_output: "1", visible: true }],
    });
    expect(screen.getByText("python")).toBeInTheDocument();
  });

  it("GraphSketchAnswer renders prompt", () => {
    renderWithId(GraphSketchAnswer, {
      id: "graph-sketch",
      x_range: [-5, 5],
      y_range: [-5, 5],
    });
    expect(screen.getByText(/Draw on the graph/i)).toBeInTheDocument();
  });

  it("LongFormResponse renders rubric content", async () => {
    const user = userEvent.setup();
    renderWithId(LongFormResponse, {
      id: "longform",
      rubric: "Use $x$ in your reasoning.",
    });
    await user.click(screen.getByRole("button", { name: /Rubric/i }));
    expect(screen.getByText("$x$")).toBeInTheDocument();
  });

  it("ArgumentBuilder renders prompt", () => {
    renderWithId(ArgumentBuilder, {
      id: "argument",
      claim_prompt: "Make an argument",
    });
    expect(screen.getByText(/Make an argument/)).toBeInTheDocument();
  });

  it("OralResponse renders keyword hints", () => {
    renderWithId(OralResponse, {
      id: "oral",
      expected_keywords: ["signal", "system"],
    });
    expect(screen.getByText("signal")).toBeInTheDocument();
  });
});

describe("V2 plugin components", () => {
  it("CodePlayground renders run button", () => {
    renderWithId(CodePlayground, {
      id: "playground",
      language: "javascript",
      initial_code: "console.log('hi')",
    });
    expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument();
  });

  it("SQLWorkbench renders schema", () => {
    renderWithId(SQLWorkbench, {
      id: "sql",
      database_schema: [
        {
          name: "users",
          columns: [{ name: "id", type: "INTEGER" }],
          sample_data: [[1]],
        },
      ],
    });
    expect(screen.getByText("users")).toBeInTheDocument();
  });

  it("CircuitBuilder renders component palette", () => {
    renderWithId(CircuitBuilder, {
      id: "circuit",
      available_components: ["resistor", "battery"],
    });
    expect(screen.getByText("resistor")).toBeInTheDocument();
  });

  it("MusicNotation renders notation controls", () => {
    renderWithId(MusicNotation, {
      id: "music",
      abc_notation: "C D E F",
    });
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });

  it("MoleculeViewer3D renders build tools", () => {
    renderWithId(MoleculeViewer3D, {
      id: "molecule",
      mode: "build",
      available_atoms: ["C", "O"],
    });
    expect(screen.getByRole("button", { name: /Add Atom/i })).toBeInTheDocument();
  });

  it("GeometrySketcher renders tool buttons", () => {
    renderWithId(GeometrySketcher, {
      id: "geometry",
      tools: ["point", "line"],
    });
    expect(screen.getByRole("button", { name: "Point" })).toBeInTheDocument();
  });
});
