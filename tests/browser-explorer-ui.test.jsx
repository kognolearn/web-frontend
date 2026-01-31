import { describe, it, expect } from "vitest";
import { filterMainTabs, getExplorerStatusLabel } from "@/components/browser/explorerUtils";

describe("browser explorer UI helpers", () => {
  it("filters out explorer tabs from visible tabs", () => {
    const tabs = [
      { id: "tab-main-1", title: "Canvas", url: "https://canvas.example.edu", role: "main" },
      { id: "tab-exp-1", title: "Notes", url: "https://canvas.example.edu/notes", role: "explorer" },
      { id: "tab-main-2", title: "Assignments", url: "https://canvas.example.edu/assignments" },
    ];

    const visible = filterMainTabs(tabs);
    expect(visible.map((tab) => tab.id)).toEqual(["tab-main-1", "tab-main-2"]);
  });

  it("returns an explorer status label when explorers are active", () => {
    const explorers = [
      { id: "exp-1", status: "running", url: "https://canvas.example.edu/notes" },
      { id: "exp-2", status: "running", url: "https://canvas.example.edu/recordings" },
    ];

    const label = getExplorerStatusLabel(explorers);
    expect(label).toMatch(/Exploring/i);
    expect(label).toMatch(/2/);
  });
});
