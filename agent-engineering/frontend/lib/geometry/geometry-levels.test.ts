import assert from "node:assert/strict";
import { GEOMETRY_LEVELS } from "./geometry-levels";
import { validateGeometrySceneSpec } from "./geometry-scene-validator";

for (const level of GEOMETRY_LEVELS) {
  const validation = validateGeometrySceneSpec(level.scene);
  assert.equal(
    validation.valid,
    true,
    `${level.levelId} scene should be valid: ${validation.errors.join("; ")}`
  );
}

assert.equal(GEOMETRY_LEVELS.length, 12);
assert.equal(GEOMETRY_LEVELS[0].scene.type, "geometry_lab_scene");

console.log(
  JSON.stringify(
    {
      geometryLevels: GEOMETRY_LEVELS.length,
      templates: [...new Set(GEOMETRY_LEVELS.map((level) => level.template))],
    },
    null,
    2
  )
);
