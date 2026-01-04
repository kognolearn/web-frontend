"use client";

import React, { useEffect, useMemo, useRef, useState, useId } from "react";

const DEFAULT_TOOLS = ["point", "line", "segment", "circle"];
const TOOL_LABELS = {
  point: "Point",
  line: "Line",
  segment: "Segment",
  ray: "Ray",
  circle: "Circle",
  arc: "Arc",
  polygon: "Polygon",
  perpendicular: "Perpendicular",
  parallel: "Parallel",
  bisector: "Bisector",
  midpoint: "Midpoint",
  intersection: "Intersection",
};
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const normalizeTools = (tools) => {
  if (!Array.isArray(tools) || tools.length === 0) return DEFAULT_TOOLS;
  return tools.filter(Boolean);
};

const parseInitialData = (value, initialConstruction) => {
  let data = null;
  if (typeof value === "string") {
    try {
      data = JSON.parse(value);
    } catch {
      data = null;
    }
  } else if (value && typeof value === "object") {
    data = value;
  }

  if (!data && initialConstruction) {
    try {
      data = JSON.parse(initialConstruction);
    } catch {
      data = null;
    }
  }

  return {
    points: data?.points && typeof data.points === "object" ? data.points : {},
    constructions: Array.isArray(data?.constructions) ? data.constructions : [],
  };
};

const buildLabel = (index) => {
  const letter = ALPHABET[index % ALPHABET.length];
  const suffix = Math.floor(index / ALPHABET.length);
  return suffix ? `${letter}${suffix}` : letter;
};

/**
 * GeometrySketcher - Geometry sketching board using JSXGraph
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {Array<string>} [props.tools]
 * @param {string} [props.initial_construction]
 * @param {boolean} [props.show_measurements=true]
 * @param {boolean} [props.snap_to_grid=true]
 * @param {number} [props.grid_size=20]
 */
export default function GeometrySketcher({
  id,
  tools = DEFAULT_TOOLS,
  initial_construction,
  show_measurements = true,
  snap_to_grid = true,
  grid_size = 20,
  value,
  onChange,
}) {
  const boardRef = useRef(null);
  const jxgRef = useRef(null);
  const labelIndexRef = useRef(0);
  const pendingRef = useRef([]);
  const polygonRef = useRef([]);
  const activeToolRef = useRef(null);
  const hasLoadedInitialRef = useRef(false);

  const [activeTool, setActiveTool] = useState(() => normalizeTools(tools)[0]);
  const [points, setPoints] = useState({});
  const [constructions, setConstructions] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [polygonCount, setPolygonCount] = useState(0);
  const uniqueId = useId();

  const toolList = useMemo(() => normalizeTools(tools), [tools]);
  const initialData = useMemo(
    () => parseInitialData(value, initial_construction),
    [value, initial_construction]
  );
  const gridStep = Math.max(1, Math.round((Number(grid_size) || 20) / 10));
  const containerId = useMemo(() => {
    const safeId = `${id || "geometry"}-${uniqueId}`.replace(/[^a-zA-Z0-9_-]/g, "");
    return `jxg-${safeId}`;
  }, [id, uniqueId]);

  useEffect(() => {
    if (!toolList.includes(activeTool)) {
      setActiveTool(toolList[0]);
    }
  }, [toolList, activeTool]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    onChange?.({ points, constructions });
  }, [points, constructions, onChange]);

  useEffect(() => {
    let active = true;
    const initBoard = async () => {
      const JXG = await import("jsxgraph");
      if (!active) return;
      jxgRef.current = JXG;
      if (boardRef.current) {
        JXG.JSXGraph.freeBoard(boardRef.current);
        boardRef.current = null;
      }

      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: [-10, 10, 10, -10],
        axis: true,
        grid: true,
        keepaspectratio: false,
        showCopyright: false,
        showNavigation: false,
      });
      boardRef.current = board;

      const getCoords = (event) => {
        if (!board) return null;
        if (board.getUsrCoordsOfMouse) {
          const coords = board.getUsrCoordsOfMouse(event);
          if (Array.isArray(coords)) return { x: coords[0], y: coords[1] };
          if (coords?.usrCoords) return { x: coords.usrCoords[1], y: coords.usrCoords[2] };
        }
        const corner = board.getCoordsTopLeftCorner(event);
        const absPos = JXG.getPosition(event, board.containerObj);
        const dx = absPos[0] - corner[0];
        const dy = absPos[1] - corner[1];
        const coords = new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board);
        return { x: coords.usrCoords[1], y: coords.usrCoords[2] };
      };

      const snap = (value) =>
        snap_to_grid ? Math.round(value / gridStep) * gridStep : value;

      const registerPoint = (point, label) => {
        const updatePoint = () => {
          setPoints((prev) => ({
            ...prev,
            [label]: { x: Number(point.X().toFixed(3)), y: Number(point.Y().toFixed(3)) },
          }));
        };
        updatePoint();
        point.on("drag", updatePoint);
        point.on("up", updatePoint);
      };

      const createPoint = (x, y) => {
        const label = buildLabel(labelIndexRef.current++);
        const point = board.create("point", [x, y], {
          name: label,
          size: 3,
          withLabel: show_measurements,
          snapToGrid: snap_to_grid,
          snapSizeX: gridStep,
          snapSizeY: gridStep,
          showInfobox: show_measurements,
        });
        registerPoint(point, label);
        return point;
      };

      const resetPending = () => {
        pendingRef.current = [];
        setPendingCount(0);
      };

      const appendConstruction = (name) => {
        setConstructions((prev) => [...prev, name]);
      };

      const handleToolAction = (x, y) => {
        const tool = activeToolRef.current;
        if (!tool) return;
        const snappedX = snap(x);
        const snappedY = snap(y);

        if (tool === "point") {
          createPoint(snappedX, snappedY);
          resetPending();
          return;
        }

        if (tool === "polygon") {
          const point = createPoint(snappedX, snappedY);
          polygonRef.current = [...polygonRef.current, point];
          setPolygonCount(polygonRef.current.length);
          return;
        }

        const nextPending = [...pendingRef.current, createPoint(snappedX, snappedY)];
        pendingRef.current = nextPending;
        setPendingCount(nextPending.length);

        const finalizeTwoPointTool = (factory, constructionTag) => {
          if (nextPending.length < 2) return false;
          factory(nextPending[0], nextPending[1]);
          if (constructionTag) appendConstruction(constructionTag);
          resetPending();
          return true;
        };

        const finalizeThreePointTool = (factory, constructionTag) => {
          if (nextPending.length < 3) return false;
          factory(nextPending[0], nextPending[1], nextPending[2]);
          if (constructionTag) appendConstruction(constructionTag);
          resetPending();
          return true;
        };

        if (tool === "line") {
          finalizeTwoPointTool((a, b) => board.create("line", [a, b]));
        } else if (tool === "segment") {
          finalizeTwoPointTool((a, b) => board.create("segment", [a, b]));
        } else if (tool === "ray") {
          finalizeTwoPointTool((a, b) => board.create("ray", [a, b]));
        } else if (tool === "circle") {
          finalizeTwoPointTool((a, b) => board.create("circle", [a, b]));
        } else if (tool === "arc") {
          finalizeThreePointTool((a, b, c) => board.create("arc", [a, b, c]));
        } else if (tool === "midpoint") {
          finalizeTwoPointTool((a, b) => {
            const midpoint = board.create("midpoint", [a, b], {
              withLabel: show_measurements,
              name: buildLabel(labelIndexRef.current++),
            });
            registerPoint(midpoint, midpoint.name);
          }, "midpoint");
        } else if (tool === "perpendicular") {
          finalizeThreePointTool((a, b, c) => {
            const base = board.create("line", [a, b], { dash: 1, strokeColor: "#64748b" });
            board.create("perpendicular", [base, c], {
              strokeColor: "#7ba37a",
            });
          }, "perpendicular_line");
        } else if (tool === "parallel") {
          finalizeThreePointTool((a, b, c) => {
            const base = board.create("line", [a, b], { dash: 1, strokeColor: "#64748b" });
            board.create("parallel", [base, c], {
              strokeColor: "#7ba37a",
            });
          }, "parallel_line");
        } else if (tool === "bisector") {
          finalizeThreePointTool((a, b, c) => {
            board.create("bisector", [a, b, c], {
              strokeColor: "#7ba37a",
            });
          }, "angle_bisector");
        } else if (tool === "intersection") {
          if (nextPending.length < 4) return;
          const line1 = board.create("line", [nextPending[0], nextPending[1]], {
            dash: 1,
            strokeColor: "#64748b",
          });
          const line2 = board.create("line", [nextPending[2], nextPending[3]], {
            dash: 1,
            strokeColor: "#64748b",
          });
          const intersection = board.create("intersection", [line1, line2, 0], {
            withLabel: show_measurements,
            name: buildLabel(labelIndexRef.current++),
          });
          registerPoint(intersection, intersection.name);
          appendConstruction("intersection");
          resetPending();
        }
      };

      board.on("down", (event) => {
        const coords = getCoords(event);
        if (!coords) return;
        handleToolAction(coords.x, coords.y);
      });

      if (!hasLoadedInitialRef.current) {
        Object.entries(initialData.points).forEach(([label, coords]) => {
          const point = board.create("point", [coords.x, coords.y], {
            name: label,
            size: 3,
            withLabel: show_measurements,
            snapToGrid: snap_to_grid,
            snapSizeX: gridStep,
            snapSizeY: gridStep,
            showInfobox: show_measurements,
          });
          registerPoint(point, label);
          labelIndexRef.current += 1;
        });
        if (initialData.constructions.length > 0) {
          setConstructions(initialData.constructions);
        }
        hasLoadedInitialRef.current = true;
      }
    };

    initBoard();

    return () => {
      active = false;
      if (jxgRef.current && boardRef.current) {
        jxgRef.current.JSXGraph.freeBoard(boardRef.current);
        boardRef.current = null;
      }
    };
  }, [
    containerId,
    gridStep,
    snap_to_grid,
    show_measurements,
    initialData.points,
    initialData.constructions,
  ]);

  const finishPolygon = () => {
    const board = boardRef.current;
    if (!board || polygonRef.current.length < 3) return;
    board.create("polygon", polygonRef.current, {
      borders: { strokeColor: "#7ba37a" },
    });
    polygonRef.current = [];
    setPolygonCount(0);
  };

  const clearPending = () => {
    pendingRef.current = [];
    polygonRef.current = [];
    setPendingCount(0);
    setPolygonCount(0);
  };

  return (
    <div id={id} className="v2-geometry-sketcher space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {toolList.map((tool) => (
          <button
            key={tool}
            type="button"
            onClick={() => {
              setActiveTool(tool);
              clearPending();
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeTool === tool
                ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50"
            }`}
          >
            {TOOL_LABELS[tool] || tool}
          </button>
        ))}
        <div className="ml-auto text-xs text-[var(--muted-foreground)]">
          Grid {snap_to_grid ? "snap" : "free"} · Measurements {show_measurements ? "on" : "off"}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <div id={containerId} className="h-[420px] w-full rounded-xl" />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
        <span>
          Active tool: <strong className="text-[var(--foreground)]">{TOOL_LABELS[activeTool] || activeTool}</strong>
        </span>
        {pendingCount > 0 && <span>Pending points: {pendingCount}</span>}
        {polygonCount > 0 && <span>Polygon points: {polygonCount}</span>}
        {polygonCount >= 3 && (
          <button
            type="button"
            onClick={finishPolygon}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--foreground)] hover:border-[var(--primary)]/60"
          >
            Finish polygon
          </button>
        )}
        {(pendingCount > 0 || polygonCount > 0) && (
          <button
            type="button"
            onClick={clearPending}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Clear pending
          </button>
        )}
      </div>
    </div>
  );
}
