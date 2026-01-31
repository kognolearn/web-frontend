export function filterMainTabs(tabs) {
  if (!Array.isArray(tabs)) return [];
  return tabs.filter((tab) => tab?.role !== "explorer");
}

export function getExplorerStatusLabel(explorers) {
  if (!Array.isArray(explorers) || explorers.length === 0) return "";
  const active = explorers.filter((entry) => entry?.status === "running");
  if (active.length === 0) return "";
  const count = active.length;
  return `Exploring ${count} page${count === 1 ? "" : "s"}`;
}
