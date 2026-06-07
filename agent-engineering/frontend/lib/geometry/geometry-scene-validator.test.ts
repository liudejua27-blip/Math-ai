import assert from "node:assert/strict";
import { GEOMETRY_LEVELS } from "./geometry-levels";
import { validateGeometrySceneSpec } from "./geometry-scene-validator";
import type { GeometrySceneSpec } from "./geometry-scene-types";

const scene = structuredClone(GEOMETRY_LEVELS[0].scene);
assert.equal(validateGeometrySceneSpec(scene).valid, true);

const missingRef = structuredClone(scene);
missingRef.targets[0].correctRefs = ["missing-object"];
const missingRefValidation = validateGeometrySceneSpec(missingRef);
assert.equal(missingRefValidation.valid, false);
assert.ok(
  missingRefValidation.errors.some((error) =>
    error.includes("references missing object")
  )
);

const noCorrectRefs = structuredClone(scene);
noCorrectRefs.targets[0].correctRefs = [];
const noCorrectRefsValidation = validateGeometrySceneSpec(noCorrectRefs);
assert.equal(noCorrectRefsValidation.valid, false);
assert.ok(
  noCorrectRefsValidation.errors.some((error) =>
    error.includes("correctRef")
  )
);

const noEvidenceIds = structuredClone(scene);
noEvidenceIds.targets[0].evidenceIds = [];
const noEvidenceIdsValidation = validateGeometrySceneSpec(noEvidenceIds);
assert.equal(noEvidenceIdsValidation.valid, false);
assert.ok(
  noEvidenceIdsValidation.errors.some((error) =>
    error.includes("evidenceId")
  )
);

const scriptScene = structuredClone(scene) as GeometrySceneSpec & {
  script?: string;
};
scriptScene.script = "alert('blocked')";
const scriptValidation = validateGeometrySceneSpec(scriptScene);
assert.equal(scriptValidation.valid, false);
assert.ok(
  scriptValidation.errors.some((error) =>
    error.includes("Forbidden executable field")
  )
);

const nestedCodeScene = structuredClone(scene) as GeometrySceneSpec & {
  timeline: Array<GeometrySceneSpec["timeline"][number] & { code?: string }>;
};
nestedCodeScene.timeline[0].code = "rotate()";
const nestedCodeValidation = validateGeometrySceneSpec(nestedCodeScene);
assert.equal(nestedCodeValidation.valid, false);
assert.ok(
  nestedCodeValidation.errors.some((error) =>
    error.includes("Forbidden executable field")
  )
);

console.log("geometry-scene-validator tests passed");
