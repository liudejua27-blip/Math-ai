"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import type { GeometrySceneSpec } from "@/lib/geometry/geometry-scene-types";
import { cn } from "@/lib/utils";

type GeometrySceneRendererProps = {
  scene: GeometrySceneSpec;
  selectedRefs: string[];
  activeTimelineId: string | null;
  onSelectRef: (refId: string) => void;
};

type Point2D = { x: number; y: number };

export function GeometrySceneRenderer({
  scene,
  selectedRefs,
  activeTimelineId,
  onSelectRef,
}: GeometrySceneRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const selected = useMemo(() => new Set(selectedRefs), [selectedRefs]);
  const points = useMemo(
    () =>
      new Map(
        scene.vertices.map((vertex) => [vertex.id, project(vertex.position)])
      ),
    [scene.vertices]
  );

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const context = gsap.context(() => {
      const refs = selectedRefs.length
        ? selectedRefs
        : scene.targets.flatMap((target) => target.correctRefs);
      const targets = refs
        .map((refId) =>
          svgRef.current?.querySelector(`[data-geometry-ref="${refId}"]`)
        )
        .filter(Boolean);

      if (targets.length === 0) {
        return;
      }

      gsap.fromTo(
        targets,
        { autoAlpha: 0.58, scale: reduceMotion ? 1 : 0.96 },
        {
          autoAlpha: 1,
          scale: 1,
          duration: reduceMotion ? 0 : 0.42,
          ease: "power2.out",
          stagger: { each: 0.04, from: "center" },
          transformOrigin: "center center",
          overwrite: "auto",
        }
      );
    }, svgRef);

    return () => context.revert();
  }, [activeTimelineId, scene.targets, selectedRefs]);

  return (
    <svg
      aria-label={`${scene.levelId} geometry scene`}
      className="h-full min-h-[360px] w-full rounded-md bg-slate-950"
      ref={svgRef}
      role="img"
      viewBox="0 0 720 440"
    >
      <defs>
        <filter id="geometry-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur result="blur" stdDeviation="3" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect fill="#020617" height="440" width="720" />
      <g opacity="0.26">
        {Array.from({ length: 12 }).map((_, index) => (
          <line
            key={`grid-x-${index}`}
            stroke="#334155"
            strokeWidth="1"
            x1={60 + index * 54}
            x2={60 + index * 54}
            y1="40"
            y2="400"
          />
        ))}
        {Array.from({ length: 7 }).map((_, index) => (
          <line
            key={`grid-y-${index}`}
            stroke="#334155"
            strokeWidth="1"
            x1="60"
            x2="660"
            y1={70 + index * 48}
            y2={70 + index * 48}
          />
        ))}
      </g>

      <g>
        {scene.faces.map((face) => {
          const polygon = face.vertices
            .map((vertexId) => points.get(vertexId))
            .filter(Boolean) as Point2D[];
          const isSelected = selected.has(face.id);
          return (
            <polygon
              className="cursor-pointer transition"
              data-geometry-ref={face.id}
              fill={faceFill(face.kind, isSelected)}
              filter={isSelected ? "url(#geometry-glow)" : undefined}
              key={face.id}
              onClick={() => onSelectRef(face.id)}
              points={polygon.map((point) => `${point.x},${point.y}`).join(" ")}
              stroke={isSelected ? "#22d3ee" : "#475569"}
              strokeDasharray={face.transparent ? "7 6" : undefined}
              strokeWidth={isSelected ? 3 : 1.5}
            />
          );
        })}
      </g>

      <g>
        {scene.edges.map((edge) => {
          const from = points.get(edge.from);
          const to = points.get(edge.to);
          if (!from || !to) {
            return null;
          }
          const isSelected = selected.has(edge.id);
          return (
            <g data-geometry-ref={edge.id} key={edge.id}>
              <line
                className="cursor-pointer"
                filter={isSelected ? "url(#geometry-glow)" : undefined}
                onClick={() => onSelectRef(edge.id)}
                stroke={edgeStroke(edge.kind, isSelected)}
                strokeDasharray={edge.kind === "hidden" ? "8 7" : undefined}
                strokeLinecap="round"
                strokeWidth={
                  edge.kind === "auxiliary" || edge.kind === "projection" ? 3 : 4
                }
                x1={from.x}
                x2={to.x}
                y1={from.y}
                y2={to.y}
              />
              <line
                className="cursor-pointer"
                onClick={() => onSelectRef(edge.id)}
                stroke="transparent"
                strokeWidth="18"
                x1={from.x}
                x2={to.x}
                y1={from.y}
                y2={to.y}
              />
            </g>
          );
        })}
      </g>

      <g>
        {scene.vertices
          .filter((vertex) => vertex.visible !== false)
          .map((vertex) => {
            const point = points.get(vertex.id);
            if (!point) {
              return null;
            }
            const isSelected = selected.has(vertex.id);
            return (
              <g
                className="cursor-pointer"
                data-geometry-ref={vertex.id}
                key={vertex.id}
                onClick={() => onSelectRef(vertex.id)}
              >
                <circle
                  className={cn("transition", isSelected && "drop-shadow")}
                  cx={point.x}
                  cy={point.y}
                  fill={isSelected ? "#22d3ee" : "#f8fafc"}
                  r={isSelected ? 7 : 5}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <text
                  fill="#e2e8f0"
                  fontSize="16"
                  fontWeight="700"
                  x={point.x + 10}
                  y={point.y - 9}
                >
                  {vertex.label}
                </text>
              </g>
            );
          })}
      </g>
    </svg>
  );
}

function project([x, y, z]: [number, number, number]): Point2D {
  return {
    x: 360 + x * 145 + y * 46,
    y: 260 - z * 115 - y * 54 + x * 8,
  };
}

function edgeStroke(
  kind: GeometrySceneSpec["edges"][number]["kind"],
  selected: boolean
) {
  if (selected) {
    return "#22d3ee";
  }
  if (kind === "auxiliary") {
    return "#f59e0b";
  }
  if (kind === "projection") {
    return "#34d399";
  }
  if (kind === "hidden") {
    return "#64748b";
  }
  return "#e2e8f0";
}

function faceFill(
  kind: GeometrySceneSpec["faces"][number]["kind"],
  selected: boolean
) {
  if (selected) {
    return "rgba(34, 211, 238, 0.22)";
  }
  if (kind === "section") {
    return "rgba(245, 158, 11, 0.18)";
  }
  if (kind === "auxiliary") {
    return "rgba(52, 211, 153, 0.15)";
  }
  if (kind === "base") {
    return "rgba(148, 163, 184, 0.18)";
  }
  return "rgba(59, 130, 246, 0.1)";
}
