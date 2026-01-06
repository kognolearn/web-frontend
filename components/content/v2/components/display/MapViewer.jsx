"use client";

import React, { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toPoint = (lng, lat) => ({
  x: clamp(lng, -180, 180) + 180,
  y: 90 - clamp(lat, -90, 90),
});

const buildPathFromRing = (ring) => {
  if (!Array.isArray(ring) || ring.length === 0) return "";
  const parts = ring.map(([lng, lat]) => {
    const { x, y } = toPoint(lng, lat);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  return `M ${parts.join(" L ")} Z`;
};

const geojsonToPaths = (geojson) => {
  if (!geojson) return [];
  let data;
  try {
    data = typeof geojson === "string" ? JSON.parse(geojson) : geojson;
  } catch {
    return [];
  }

  const geometries = [];

  if (data.type === "FeatureCollection") {
    data.features?.forEach((feature) => {
      if (feature?.geometry) geometries.push(feature.geometry);
    });
  } else if (data.type === "Feature") {
    if (data.geometry) geometries.push(data.geometry);
  } else if (data.type) {
    geometries.push(data);
  }

  const paths = [];
  geometries.forEach((geometry) => {
    if (!geometry) return;
    if (geometry.type === "Polygon") {
      geometry.coordinates?.forEach((ring) => {
        const path = buildPathFromRing(ring);
        if (path) paths.push(path);
      });
    }
    if (geometry.type === "MultiPolygon") {
      geometry.coordinates?.forEach((polygon) => {
        polygon?.forEach((ring) => {
          const path = buildPathFromRing(ring);
          if (path) paths.push(path);
        });
      });
    }
  });

  return paths;
};

/**
 * MapViewer - Geographic map with markers and regions
 *
 * @param {Object} props
 * @param {string} props.id - Component ID
 * @param {{lat: number, lng: number}} props.center
 * @param {number} [props.zoom=5]
 * @param {Array<{id: string, lat: number, lng: number, label: string, popup?: string}>} [props.markers]
 * @param {Array<{id: string, geojson: string, label: string, fill_color?: string}>} [props.regions]
 */
export default function MapViewer({
  id,
  center = { lat: 0, lng: 0 },
  zoom = 5,
  markers = [],
  regions = [],
}) {
  const safeZoom = clamp(Number(zoom) || 5, 1, 20);
  const centerPoint = toPoint(center.lng, center.lat);
  const viewWidth = 360 / safeZoom;
  const viewHeight = 180 / safeZoom;
  const viewX = clamp(centerPoint.x - viewWidth / 2, 0, 360 - viewWidth);
  const viewY = clamp(centerPoint.y - viewHeight / 2, 0, 180 - viewHeight);
  const viewBox = `${viewX} ${viewY} ${viewWidth} ${viewHeight}`;

  const [activeMarkerId, setActiveMarkerId] = useState(null);

  const regionPaths = useMemo(() => {
    return regions.map((region) => ({
      id: region.id,
      label: region.label,
      fillColor: region.fill_color,
      paths: geojsonToPaths(region.geojson),
    }));
  }, [regions]);

  const activeMarker = markers.find((marker) => marker.id === activeMarkerId);

  return (
    <div id={id} className="v2-map-viewer space-y-3">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <svg
          viewBox={viewBox}
          className="w-full h-[280px] rounded-xl bg-[var(--surface-2)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x="0" y="0" width="360" height="180" fill="transparent" />
          {regionPaths.map((region) =>
            region.paths.map((path, idx) => (
              <path
                key={`${region.id}-${idx}`}
                d={path}
                fill={region.fillColor || "var(--primary)"}
                fillOpacity={region.fillColor ? 0.3 : 0.15}
                stroke="var(--primary)"
                strokeOpacity={0.4}
                strokeWidth={0.4}
              />
            ))
          )}
          {markers.map((marker) => {
            const point = toPoint(marker.lng, marker.lat);
            return (
              <g key={marker.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={2.2}
                  fill="var(--primary)"
                  onClick={() => setActiveMarkerId(marker.id)}
                />
                <text
                  x={point.x + 3.5}
                  y={point.y - 3.5}
                  fontSize="4"
                  fill="var(--foreground)"
                >
                  {marker.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {activeMarker && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--foreground)] font-semibold">
            <MapPin className="h-4 w-4 text-[var(--primary)]" />
            {activeMarker.label}
          </div>
          {activeMarker.popup && (
            <p className="mt-2 text-[var(--muted-foreground)]">
              {activeMarker.popup}
            </p>
          )}
        </div>
      )}

      {regions.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
          {regions.map((region) => (
            <span
              key={region.id}
              className="rounded-full border border-[var(--border)] px-2 py-1"
            >
              {region.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
