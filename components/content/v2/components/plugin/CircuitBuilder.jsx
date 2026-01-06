"use client";

import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_GRID = [10, 8];
const NODE_RADIUS = 6;

const buildNodeId = (row, col) => `n${row}_${col}`;

const computeOrientation = (a, b) => {
  if (!a || !b) return 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return Math.round(angle);
};

const buildConnections = (components) => {
  const nodeMap = new Map();
  components.forEach((component) => {
    component.nodes.forEach((node) => {
      if (!nodeMap.has(node)) nodeMap.set(node, []);
      nodeMap.get(node).push(component);
    });
  });

  const connections = [];
  nodeMap.forEach((items, node) => {
    if (items.length < 2) return;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        connections.push({
          from: { component_id: items[i].id, terminal: node },
          to: { component_id: items[j].id, terminal: node },
        });
      }
    }
  });
  return connections;
};

const computeCircuitFlags = (components) => {
  if (components.length === 0) {
    return { is_complete_circuit: false, has_short_circuit: false };
  }
  const nodeMap = new Map();
  components.forEach((component) => {
    component.nodes.forEach((node) => {
      if (!nodeMap.has(node)) nodeMap.set(node, []);
      nodeMap.get(node).push(component.id);
    });
  });

  const adjacency = new Map();
  components.forEach((component) => adjacency.set(component.id, new Set()));
  nodeMap.forEach((ids) => {
    ids.forEach((id) => {
      ids.forEach((otherId) => {
        if (id !== otherId) adjacency.get(id).add(otherId);
      });
    });
  });

  const visited = new Set();
  const queue = [components[0].id];
  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    adjacency.get(current).forEach((next) => {
      if (!visited.has(next)) queue.push(next);
    });
  }

  const hasBattery = components.some((component) => component.type === "battery");
  const isConnected = visited.size === components.length;
  const hasShort = components.some(
    (component) => component.nodes[0] === component.nodes[1]
  );

  return {
    is_complete_circuit: hasBattery && isConnected,
    has_short_circuit: hasShort,
  };
};

/**
 * CircuitBuilder - Grid-based circuit layout
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {Array<string>} props.available_components
 * @param {[number, number]} [props.grid_size=[10,8]]
 * @param {string} [props.initial_circuit]
 * @param {boolean} [props.simulation_enabled=true]
 * @param {Object} [props.target_measurement]
 */
export default function CircuitBuilder({
  id,
  available_components = [],
  grid_size = DEFAULT_GRID,
  initial_circuit,
  simulation_enabled = true,
  target_measurement,
  value,
  onChange,
}) {
  const [selectedComponent, setSelectedComponent] = useState(
    available_components[0] || ""
  );
  const [startNode, setStartNode] = useState(null);
  const [components, setComponents] = useState([]);
  const [measurements, setMeasurements] = useState({});

  const [cols, rows] =
    Array.isArray(grid_size) && grid_size.length === 2 ? grid_size : DEFAULT_GRID;
  const safeCols = Math.max(5, Number(cols) || 10);
  const safeRows = Math.max(5, Number(rows) || 8);

  const nodePositions = useMemo(() => {
    const spacing = 50;
    return Array.from({ length: safeRows }).flatMap((_, row) =>
      Array.from({ length: safeCols }).map((__, col) => ({
        id: buildNodeId(row, col),
        row,
        col,
        x: col * spacing + spacing,
        y: row * spacing + spacing,
      }))
    );
  }, [safeRows, safeCols]);

  const nodesById = useMemo(() => {
    const map = new Map();
    nodePositions.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodePositions]);

  useEffect(() => {
    if (!initial_circuit) return;
    try {
      const parsed = JSON.parse(initial_circuit);
      if (Array.isArray(parsed.components)) {
        setComponents(parsed.components);
      }
      if (parsed.measurements) {
        setMeasurements(parsed.measurements);
      }
    } catch {
      // ignore parse errors
    }
  }, [initial_circuit]);

  useEffect(() => {
    const connections = buildConnections(components);
    const flags = computeCircuitFlags(components);
    const nextAnswer = {
      components,
      connections,
      measurements,
      ...flags,
    };
    onChange?.(nextAnswer);
  }, [components, measurements, onChange]);

  const handleNodeClick = (node) => {
    if (!selectedComponent) return;
    if (!startNode) {
      setStartNode(node);
      return;
    }
    if (startNode.id === node.id) {
      setStartNode(null);
      return;
    }
    const nextComponent = {
      id: `${selectedComponent}_${components.length + 1}`,
      type: selectedComponent,
      nodes: [startNode.id, node.id],
      value: selectedComponent === "resistor" ? 100 : undefined,
      orientation: computeOrientation(startNode, node),
    };
    setComponents((prev) => [...prev, nextComponent]);
    setStartNode(null);
  };

  const updateComponentValue = (id, value) => {
    setComponents((prev) =>
      prev.map((component) =>
        component.id === id ? { ...component, value } : component
      )
    );
  };

  const removeComponent = (id) => {
    setComponents((prev) => prev.filter((component) => component.id !== id));
  };

  const handleMeasurementChange = (event) => {
    const measurementKey =
      target_measurement?.key || target_measurement?.type || "measurement";
    const measurementType = target_measurement?.type;
    setMeasurements((prev) => ({
      ...prev,
      [measurementKey]: {
        value: Number(event.target.value),
        unit: measurementType === "current" ? "A" : measurementType === "resistance" ? "Ω" : "V",
      },
    }));
  };

  return (
    <div id={id} className="v2-circuit-builder space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {available_components.map((component) => (
          <button
            key={component}
            type="button"
            onClick={() => setSelectedComponent(component)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedComponent === component
                ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50"
            }`}
          >
            {component}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <svg
          className="w-full h-[420px]"
          viewBox={`0 0 ${safeCols * 50 + 50} ${safeRows * 50 + 50}`}
        >
          {components.map((component) => {
            const [nodeA, nodeB] = component.nodes.map((id) => nodesById.get(id));
            if (!nodeA || !nodeB) return null;
            return (
              <g key={component.id}>
                <line
                  x1={nodeA.x}
                  y1={nodeA.y}
                  x2={nodeB.x}
                  y2={nodeB.y}
                  stroke="var(--primary)"
                  strokeWidth="2"
                />
                <text
                  x={(nodeA.x + nodeB.x) / 2}
                  y={(nodeA.y + nodeB.y) / 2 - 6}
                  fontSize="10"
                  fill="var(--foreground)"
                  textAnchor="middle"
                >
                  {component.type}
                </text>
              </g>
            );
          })}
          {nodePositions.map((node) => (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={NODE_RADIUS}
              fill={startNode?.id === node.id ? "var(--primary)" : "var(--surface-2)"}
              stroke="var(--border)"
              strokeWidth="1.5"
              onClick={() => handleNodeClick(node)}
            />
          ))}
        </svg>
      </div>

      {components.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Components
          </div>
          {components.map((component) => (
            <div
              key={component.id}
              className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]"
            >
              <span className="font-semibold text-[var(--foreground)]">
                {component.id}
              </span>
              <span>{component.type}</span>
              <span>{component.nodes.join(" → ")}</span>
              <span>{component.orientation}°</span>
              {component.type === "resistor" && (
                <input
                  type="number"
                  value={component.value ?? 0}
                  onChange={(event) =>
                    updateComponentValue(component.id, Number(event.target.value))
                  }
                  className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--foreground)]"
                />
              )}
              <button
                type="button"
                onClick={() => removeComponent(component.id)}
                className="ml-auto text-rose-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {target_measurement && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--muted-foreground)] space-y-2">
          <div>
            Target: {target_measurement.type} {target_measurement.target_value} ±{" "}
            {target_measurement.tolerance ?? 0.1}
          </div>
          <input
            type="number"
            onChange={handleMeasurementChange}
            className="w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--foreground)]"
            placeholder="Enter measurement"
          />
        </div>
      )}

      <div className="text-xs text-[var(--muted-foreground)]">
        Simulation {simulation_enabled ? "enabled" : "disabled"}.
      </div>
    </div>
  );
}
