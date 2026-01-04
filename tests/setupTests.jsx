import React from "react";
import { vi } from "vitest";
import "@testing-library/jest-dom";

vi.mock("better-react-mathjax", () => ({
  MathJaxContext: ({ children }) => <div data-mathjax-context>{children}</div>,
  MathJax: ({ children }) => <span data-mathjax>{children}</span>,
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: "<svg data-testid='mermaid'></svg>" })),
  },
}));

vi.mock("abcjs", () => ({
  renderAbc: vi.fn(() => [{}]),
  synth: {
    CreateSynth: vi.fn(() => ({
      init: vi.fn(),
      prime: vi.fn(),
      start: vi.fn(),
    })),
  },
}));

vi.mock("jsxgraph", () => {
  const createElement = vi.fn((type, args, options) => {
    const obj = {
      name: options?.name || "",
      on: vi.fn(),
      X: () => (Array.isArray(args) ? args[0] : 0),
      Y: () => (Array.isArray(args) ? args[1] : 0),
    };
    return obj;
  });
  const board = {
    create: createElement,
    on: vi.fn(),
    getUsrCoordsOfMouse: vi.fn(() => [0, 0]),
    getCoordsTopLeftCorner: vi.fn(() => [0, 0]),
    containerObj: {},
  };
  return {
    JSXGraph: {
      initBoard: vi.fn(() => board),
      freeBoard: vi.fn(),
    },
    Coords: class {
      constructor() {
        this.usrCoords = [0, 0, 0];
      }
    },
    COORDS_BY_SCREEN: 0,
    getPosition: () => [0, 0],
  };
});

globalThis.matchMedia =
  globalThis.matchMedia ||
  vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));

globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

Object.defineProperty(globalThis.navigator, "clipboard", {
  value: { writeText: vi.fn() },
  configurable: true,
});

globalThis.fetch =
  globalThis.fetch ||
  vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
    text: async () => "MOCKDATA",
  }));

globalThis.URL.createObjectURL =
  globalThis.URL.createObjectURL || vi.fn(() => "blob:mock");
globalThis.URL.revokeObjectURL =
  globalThis.URL.revokeObjectURL || vi.fn();

class MockAudioContext {
  async decodeAudioData() {
    return {
      getChannelData: () => new Float32Array(1200),
    };
  }

  async close() {}
}

globalThis.AudioContext = globalThis.AudioContext || MockAudioContext;
globalThis.webkitAudioContext = globalThis.webkitAudioContext || MockAudioContext;

Object.defineProperty(globalThis.HTMLMediaElement.prototype, "play", {
  value: vi.fn(),
  configurable: true,
});
Object.defineProperty(globalThis.HTMLMediaElement.prototype, "pause", {
  value: vi.fn(),
  configurable: true,
});

Object.defineProperty(globalThis.HTMLCanvasElement.prototype, "getContext", {
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn(() => ({ data: [] })),
    scale: vi.fn(),
  })),
});

Object.defineProperty(globalThis.HTMLCanvasElement.prototype, "toDataURL", {
  value: vi.fn(() => "data:image/png;base64,TEST"),
});

globalThis.Image =
  globalThis.Image ||
  class {
    set src(value) {
      this._src = value;
      if (this.onload) {
        setTimeout(() => this.onload(), 0);
      }
    }
  };

globalThis.$3Dmol = {
  createViewer: () => ({
    clear: vi.fn(),
    addModel: vi.fn(),
    setStyle: vi.fn(),
    selectedAtoms: vi.fn(() => []),
    addLabel: vi.fn(),
    zoomTo: vi.fn(),
    render: vi.fn(),
  }),
};

if (!globalThis.initSqlJs) {
  class MockDatabase {
    run() {}
    exec() {
      return [];
    }
    prepare() {
      return {
        run() {},
        free() {},
      };
    }
  }
  globalThis.initSqlJs = vi.fn(async () => ({ Database: MockDatabase }));
}

globalThis.MediaRecorder =
  globalThis.MediaRecorder ||
  class {
    constructor() {
      this.ondataavailable = null;
      this.onstop = null;
    }
    start() {}
    stop() {
      if (this.onstop) this.onstop();
    }
  };

if (!globalThis.navigator.mediaDevices) {
  globalThis.navigator.mediaDevices = {
    getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [] })),
  };
}
