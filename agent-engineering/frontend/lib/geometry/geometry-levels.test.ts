import assert from "node:assert/strict";
import { GEOMETRY_LEVELS } from "./geometry-levels";
import {
  FEATURED_GEOMETRY_LEVEL_IDS,
  getGeometryLevelDisplay,
  sortGeometryLevelsForLearningPath,
} from "./geometry-learning-flow";
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

for (const levelId of FEATURED_GEOMETRY_LEVEL_IDS) {
  const level = GEOMETRY_LEVELS.find((item) => item.levelId === levelId);
  assert.ok(level, `${levelId} should exist as a featured Geometry Lab scene`);
  const display = getGeometryLevelDisplay(level);
  assert.ok(display.title.length > 0);
  assert.ok(display.exampleProblem.length > 0);
  assert.ok(display.variantPrompt.length > 0);
}

assert.deepEqual(
  sortGeometryLevelsForLearningPath(GEOMETRY_LEVELS)
    .slice(0, FEATURED_GEOMETRY_LEVEL_IDS.length)
    .map((level) => level.levelId),
  [...FEATURED_GEOMETRY_LEVEL_IDS]
);

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
