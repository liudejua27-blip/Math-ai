"use client";

import { evaluateGeometrySelection } from "@/lib/geometry/geometry-reasoning-engine";
import type { GeometryLevel } from "@/lib/geometry/geometry-scene-types";

type GeometryEvidencePanelProps = {
  level: GeometryLevel;
  selectedRefs: string[];
};

export function GeometryEvidencePanel({
  level,
  selectedRefs,
}: GeometryEvidencePanelProps) {
  const scene = level.scene;
  const selected = new Set(selectedRefs);
  const feedback = evaluateGeometrySelection({ level, selectedRefs });
  const evidence = [
    ...scene.edges
      .filter((edge) => edge.evidenceId || selected.has(edge.id))
      .map((edge) => ({
        id: edge.evidenceId ?? edge.id,
        refId: edge.id,
        label: edge.label ?? edge.id,
        type: edge.kind ?? "edge",
      })),
    ...scene.faces
      .filter((face) => face.evidenceId || selected.has(face.id))
      .map((face) => ({
        id: face.evidenceId ?? face.id,
        refId: face.id,
        label: face.label ?? face.id,
        type: face.kind ?? "face",
      })),
  ];

  return (
    <section className="p-4">
      <div className="font-semibold text-sm">证据链</div>
      <div className="mt-3 grid gap-2">
        {evidence.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-3 text-muted-foreground text-sm">
            点击图中的线、面或时间线节点后，这里会显示可用于解释的证据。
          </div>
        ) : (
          evidence.map((item) => (
            <div
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              key={`${item.id}-${item.refId}`}
            >
              <div className="font-medium">{item.label}</div>
              <div className="mt-1 text-muted-foreground text-xs">
                {item.id} / {item.type}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-4">
        <div className="font-semibold text-sm">Step Alignment 回写</div>
        <div className="mt-2 grid gap-2">
          {feedback.stepAlignmentEvidence.map((claim) => (
            <div
              className="rounded-md border border-border bg-background px-3 py-2 text-xs leading-5"
              key={claim.claimId}
            >
              <div className="font-medium">{claim.text}</div>
              <div className="mt-1 text-muted-foreground">
                refs: {claim.refs.join(", ")} / status: {claim.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
