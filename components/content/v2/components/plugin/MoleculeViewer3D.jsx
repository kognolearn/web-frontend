"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const THREE_DMOL_URL = "https://unpkg.com/3dmol@2.5.3/build/3Dmol-min.js";
const DEFAULT_ATOMS = ["C", "H", "O", "N", "S"];
let threeDMolPromise = null;

const load3DMol = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.$3Dmol) return Promise.resolve(window.$3Dmol);
  if (threeDMolPromise) return threeDMolPromise;

  threeDMolPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-3dmol]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.$3Dmol));
      existing.addEventListener("error", () => reject(new Error("3Dmol load failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = THREE_DMOL_URL;
    script.async = true;
    script.dataset["3dmol"] = "true";
    script.onload = () => resolve(window.$3Dmol);
    script.onerror = () => reject(new Error("3Dmol load failed"));
    document.head.appendChild(script);
  });

  return threeDMolPromise;
};

const detectFormat = (data) => {
  if (!data) return "pdb";
  if (data.includes("ATOM") || data.includes("HETATM")) return "pdb";
  if (data.includes("M  END")) return "mol";
  if (data.includes("data_")) return "cif";
  return "pdb";
};

const styleMap = {
  ball_and_stick: { stick: {}, sphere: { scale: 0.3 } },
  space_filling: { sphere: {} },
  wireframe: { line: {} },
};

const buildPdb = (atoms, bonds) => {
  if (!Array.isArray(atoms) || atoms.length === 0) return "";
  const atomLines = atoms.map((atom, index) => {
    const serial = String(index + 1).padStart(5, " ");
    const elem = (atom.element || "C").padStart(2, " ");
    const name = (atom.element || "C").padEnd(2, " ");
    const x = Number(atom.x || 0).toFixed(3).padStart(8, " ");
    const y = Number(atom.y || 0).toFixed(3).padStart(8, " ");
    const z = Number(atom.z || 0).toFixed(3).padStart(8, " ");
    return `ATOM  ${serial} ${name} UNK A   1    ${x}${y}${z}  1.00  0.00           ${elem}`;
  });
  const bondLines = (bonds || []).map((bond) => {
    const from = String(bond.from_index ?? bond.from ?? 1).padStart(5, " ");
    const to = String(bond.to_index ?? bond.to ?? 1).padStart(5, " ");
    return `CONECT${from}${to}`;
  });
  return [...atomLines, ...bondLines, "END"].join("\n");
};

const normalizeValue = (value) => {
  if (!value) return null;
  if (typeof value === "string") return { data: value };
  if (value?.atoms) return { atoms: value.atoms, bonds: value.bonds || [] };
  if (value?.molecule_data) return { data: value.molecule_data };
  return null;
};

/**
 * MoleculeViewer3D - 3D molecule viewer and builder (3Dmol.js)
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {'display' | 'build'} [props.mode='display']
 * @param {string} [props.molecule_data]
 * @param {string} [props.molecule_id]
 * @param {boolean} [props.show_labels=true]
 * @param {'ball_and_stick' | 'space_filling' | 'wireframe'} [props.display_style='ball_and_stick']
 * @param {string[]} [props.available_atoms]
 */
export default function MoleculeViewer3D({
  id,
  mode = "display",
  molecule_data,
  molecule_id,
  show_labels = true,
  display_style = "ball_and_stick",
  available_atoms = [],
  value,
  onChange,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [fetchedData, setFetchedData] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [atoms, setAtoms] = useState([]);
  const [bonds, setBonds] = useState([]);
  const [selectedElement, setSelectedElement] = useState(
    available_atoms[0] || DEFAULT_ATOMS[0]
  );
  const [bondStart, setBondStart] = useState(null);

  const normalizedValue = useMemo(() => normalizeValue(value), [value]);
  const atomPalette = available_atoms.length ? available_atoms : DEFAULT_ATOMS;

  const derivedData = useMemo(() => {
    if (mode === "build") {
      return buildPdb(atoms, bonds);
    }
    if (normalizedValue?.data) return normalizedValue.data;
    if (normalizedValue?.atoms) return buildPdb(normalizedValue.atoms, normalizedValue.bonds);
    if (molecule_data) return molecule_data;
    return "";
  }, [mode, atoms, bonds, normalizedValue, molecule_data]);

  useEffect(() => {
    if (mode !== "build") return;
    if (normalizedValue?.atoms) {
      setAtoms(normalizedValue.atoms);
      setBonds(normalizedValue.bonds || []);
    }
  }, [mode, normalizedValue]);

  useEffect(() => {
    if (mode !== "build") return;
    onChange?.({ atoms, bonds });
  }, [mode, atoms, bonds, onChange]);

  useEffect(() => {
    if (!molecule_id || derivedData) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    fetch(`https://files.rcsb.org/download/${molecule_id}.pdb`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch PDB");
        return res.text();
      })
      .then((data) => {
        if (active) setFetchedData(data);
      })
      .catch((err) => {
        if (active) setError(err?.message || "Failed to load PDB");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [molecule_id, derivedData]);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!containerRef.current) return;
      setError(null);
      try {
        const $3Dmol = await load3DMol();
        if (cancelled || !$3Dmol) return;
        containerRef.current.innerHTML = "";
        const viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: "white",
        });
        viewerRef.current = viewer;
        const payload = derivedData || fetchedData;
        if (payload) {
          viewer.addModel(payload, detectFormat(payload));
          viewer.setStyle({}, styleMap[display_style] || styleMap.ball_and_stick);
          if (show_labels) {
            const atomsList = viewer.selectedAtoms();
            atomsList.slice(0, 200).forEach((atom) => {
              viewer.addLabel(atom.elem || "", {
                position: atom,
                backgroundColor: "rgba(0,0,0,0.6)",
                fontColor: "white",
                fontSize: 10,
              });
            });
          }
          viewer.zoomTo();
        }
        viewer.render();
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to render molecule");
      }
    };
    render();
    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.clear();
        viewerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [derivedData, fetchedData, display_style, show_labels]);

  const handleAddAtom = () => {
    const nextIndex = atoms.length;
    const newAtom = {
      id: `a${nextIndex + 1}`,
      element: selectedElement || "C",
      x: nextIndex * 1.5,
      y: (nextIndex % 2) * 0.7,
      z: (nextIndex % 3) * 0.4,
    };
    const nextAtoms = [...atoms, newAtom];
    let nextBonds = bonds;
    if (atoms.length > 0) {
      nextBonds = [
        ...bonds,
        {
          id: `b${bonds.length + 1}`,
          from: atoms[atoms.length - 1].id,
          to: newAtom.id,
          order: 1,
        },
      ];
    }
    setAtoms(nextAtoms);
    setBonds(nextBonds);
  };

  const handleRemoveAtom = (atomId) => {
    const nextAtoms = atoms.filter((atom) => atom.id !== atomId);
    const nextBonds = bonds.filter(
      (bond) => bond.from !== atomId && bond.to !== atomId
    );
    setAtoms(nextAtoms);
    setBonds(nextBonds);
    if (bondStart === atomId) setBondStart(null);
  };

  const handleBondClick = (atomId) => {
    if (!bondStart) {
      setBondStart(atomId);
      return;
    }
    if (bondStart === atomId) {
      setBondStart(null);
      return;
    }
    setBonds((prev) => [
      ...prev,
      { id: `b${prev.length + 1}`, from: bondStart, to: atomId, order: 1 },
    ]);
    setBondStart(null);
  };

  const handleResetBuild = () => {
    setAtoms([]);
    setBonds([]);
    setBondStart(null);
  };

  return (
    <div id={id} className="v2-molecule-viewer space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
          <span>
            Mode: {mode} · Style: {display_style} · Labels {show_labels ? "on" : "off"}
          </span>
          {molecule_id && (
            <a
              href={`https://www.rcsb.org/structure/${molecule_id}`}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--primary)] hover:underline"
            >
              View PDB {molecule_id}
            </a>
          )}
        </div>

        <div
          ref={containerRef}
          className="h-[320px] w-full rounded-xl border border-[var(--border)] bg-white"
        />

        {isLoading && (
          <div className="text-xs text-[var(--muted-foreground)]">Loading molecule...</div>
        )}
        {error && (
          <div className="text-xs text-rose-500">{error}</div>
        )}
        {!derivedData && !fetchedData && !isLoading && (
          <div className="text-xs text-[var(--muted-foreground)]">
            No molecule data provided.
          </div>
        )}
      </div>

      {mode === "build" && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {atomPalette.map((atom) => (
              <button
                key={atom}
                type="button"
                onClick={() => setSelectedElement(atom)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedElement === atom
                    ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50"
                }`}
              >
                {atom}
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddAtom}
              className="ml-auto rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white"
            >
              Add Atom
            </button>
            <button
              type="button"
              onClick={handleResetBuild}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Clear
            </button>
          </div>

          {atoms.length > 0 ? (
            <div className="space-y-2 text-xs text-[var(--muted-foreground)]">
              <div className="font-semibold text-[var(--foreground)]">Atoms</div>
              {atoms.map((atom) => (
                <div key={atom.id} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBondClick(atom.id)}
                    className={`rounded-full border px-2 py-1 ${
                      bondStart === atom.id
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-[var(--border)]"
                    }`}
                    title="Click to start/complete bond"
                  >
                    {atom.element} · {atom.id}
                  </button>
                  <span>
                    ({atom.x.toFixed(1)}, {atom.y.toFixed(1)}, {atom.z.toFixed(1)})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAtom(atom.id)}
                    className="ml-auto text-rose-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[var(--muted-foreground)]">
              Add atoms to start building.
            </div>
          )}

          {bonds.length > 0 && (
            <div className="text-xs text-[var(--muted-foreground)]">
              Bonds: {bonds.map((bond) => `${bond.from}-${bond.to}`).join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
