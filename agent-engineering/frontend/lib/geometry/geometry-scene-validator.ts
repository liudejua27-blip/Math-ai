import type { GeometrySceneSpec } from "./geometry-scene-types";

export type GeometrySceneValidation = {
  valid: boolean;
  errors: string[];
};

export function validateGeometrySceneSpec(
  scene: GeometrySceneSpec
): GeometrySceneValidation {
  const errors: string[] = [];
  collectForbiddenFields(scene, errors);

  if (scene.type !== "geometry_lab_scene") {
    errors.push("Scene type must be geometry_lab_scene.");
  }
  if (scene.version !== "1.0") {
    errors.push("Scene version must be 1.0.");
  }

  const vertexIds = new Set<string>();
  const edgeIds = new Set<string>();
  const faceIds = new Set<string>();
  const targetIds = new Set<string>();

  collectUnique(scene.vertices.map((item) => item.id), vertexIds, errors, "vertex");
  collectUnique(scene.edges.map((item) => item.id), edgeIds, errors, "edge");
  collectUnique(scene.faces.map((item) => item.id), faceIds, errors, "face");
  collectUnique(scene.targets.map((item) => item.id), targetIds, errors, "target");

  for (const edge of scene.edges) {
    if (!vertexIds.has(edge.from)) {
      errors.push(`Edge ${edge.id} references missing vertex ${edge.from}.`);
    }
    if (!vertexIds.has(edge.to)) {
      errors.push(`Edge ${edge.id} references missing vertex ${edge.to}.`);
    }
  }

  for (const face of scene.faces) {
    for (const vertexId of face.vertices) {
      if (!vertexIds.has(vertexId)) {
        errors.push(`Face ${face.id} references missing vertex ${vertexId}.`);
      }
    }
  }

  const selectableRefs = new Set([...vertexIds, ...edgeIds, ...faceIds]);
  for (const target of scene.targets) {
    if (!Array.isArray(target.correctRefs) || target.correctRefs.length === 0) {
      errors.push(`Target ${target.id} must include at least one correctRef.`);
      continue;
    }
    if (!Array.isArray(target.evidenceIds) || target.evidenceIds.length === 0) {
      errors.push(`Target ${target.id} must bind at least one evidenceId.`);
    }
    for (const refId of target.correctRefs) {
      if (!selectableRefs.has(refId)) {
        errors.push(`Target ${target.id} references missing object ${refId}.`);
      }
    }
  }

  for (const item of scene.timeline) {
    for (const refId of item.refs) {
      if (!(selectableRefs.has(refId) || targetIds.has(refId))) {
        errors.push(`Timeline ${item.id} references missing object ${refId}.`);
      }
    }
  }

  const cameraPresetIds = new Set(scene.cameraPresets?.map((item) => item.id) ?? []);
  for (const item of scene.animationSteps ?? []) {
    if (!item.id) {
      errors.push("Animation step id is required.");
    }
    for (const refId of item.refs) {
      if (!(selectableRefs.has(refId) || targetIds.has(refId))) {
        errors.push(`Animation step ${item.id} references missing object ${refId}.`);
      }
    }
    if (item.cameraPresetId && !cameraPresetIds.has(item.cameraPresetId)) {
      errors.push(
        `Animation step ${item.id} references missing camera preset ${item.cameraPresetId}.`
      );
    }
  }

  for (const item of scene.wrongObjectHighlights ?? []) {
    if (!Array.isArray(item.refs) || item.refs.length === 0) {
      errors.push(`Wrong object highlight ${item.id} must include refs.`);
    }
    for (const refId of item.refs) {
      if (!selectableRefs.has(refId)) {
        errors.push(
          `Wrong object highlight ${item.id} references missing object ${refId}.`
        );
      }
    }
  }

  if (scene.assessment.maxAttempts < 1) {
    errors.push("Assessment maxAttempts must be at least 1.");
  }
  if (scene.assessment.passRule.minCorrectTargets < 1) {
    errors.push("Assessment minCorrectTargets must be at least 1.");
  }

  return { valid: errors.length === 0, errors };
}

function collectForbiddenFields(value: unknown, errors: string[], path = "scene") {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenFields(item, errors, `${path}[${index}]`)
    );
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === "script" ||
      normalizedKey === "code" ||
      normalizedKey === "javascript"
    ) {
      errors.push(`Forbidden executable field ${path}.${key}.`);
      continue;
    }
    collectForbiddenFields(child, errors, `${path}.${key}`);
  }
}

function collectUnique(
  ids: string[],
  target: Set<string>,
  errors: string[],
  label: string
) {
  for (const id of ids) {
    if (!id) {
      errors.push(`Empty ${label} id.`);
      continue;
    }
    if (target.has(id)) {
      errors.push(`Duplicate ${label} id ${id}.`);
    }
    target.add(id);
  }
}
