import assert from "node:assert/strict";
import { GEOMETRY_LEVEL_BY_ID } from "./geometry-levels";
import {
  buildGeometryConstraintSystem,
  buildGeometryVisualMathBenchmarkStandards,
  evaluateGeometrySelection,
  solveGeometryLevel,
} from "./geometry-reasoning-engine";

const linePlaneLevel = GEOMETRY_LEVEL_BY_ID.get("G1-4");
assert.ok(linePlaneLevel);
const linePlaneSolvers = solveGeometryLevel(linePlaneLevel);
assert.equal(linePlaneSolvers[0].kind, "line_plane_angle");
assert.ok(
  linePlaneSolvers[0].auxiliaryCandidates.some(
    (item) => item.refId === "AC" && item.role === "projection" && item.required
  )
);

const linePlaneFeedback = evaluateGeometrySelection({
  level: linePlaneLevel,
  selectedRefs: ["AB"],
});
assert.deepEqual(linePlaneFeedback.solvedTargetIds, []);
assert.ok(linePlaneFeedback.wrongRefs.includes("AB"));
assert.ok(linePlaneFeedback.learnerMemorySignal.shouldReview);
assert.ok(
  linePlaneFeedback.messages.some((message) =>
    message.text.includes("线面角要找斜线在底面上的投影")
  )
);

const correctedLinePlane = evaluateGeometrySelection({
  level: linePlaneLevel,
  selectedRefs: ["AC"],
});
assert.deepEqual(correctedLinePlane.missingTargetIds, []);
assert.equal(correctedLinePlane.learnerMemorySignal.spatialTransferDelta, 1);

const dihedralLevel = GEOMETRY_LEVEL_BY_ID.get("G2-2");
assert.ok(dihedralLevel);
const dihedralSolver = solveGeometryLevel(dihedralLevel)[0];
assert.equal(dihedralSolver.kind, "dihedral_angle");
assert.ok(dihedralSolver.acceptedRefs.includes("POM"));
assert.ok(dihedralSolver.stepAlignmentEvidence[0].text.includes("辅助截面"));

const sectionLevel = GEOMETRY_LEVEL_BY_ID.get("G1-6");
assert.ok(sectionLevel);
const sectionSolver = solveGeometryLevel(sectionLevel)[0];
assert.equal(sectionSolver.kind, "section_construction");
assert.ok(sectionSolver.acceptedRefs.includes("ABCDiag"));

const constraints = buildGeometryConstraintSystem(linePlaneLevel.scene);
assert.ok(
  constraints.constraints.some(
    (item) => item.type === "parallel" && item.refs.includes("AB")
  )
);
assert.ok(
  constraints.constraints.some(
    (item) => item.type === "section" && item.refs.includes("ABCDiag")
  )
);

const standards = buildGeometryVisualMathBenchmarkStandards();
assert.deepEqual(
  standards.map((item) => item.source),
  ["MathVerse", "MATH-Vision", "MathVista"]
);

console.log("geometry-reasoning-engine tests passed");
