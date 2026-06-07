import assert from "node:assert/strict";
import {
  buildRemediationPlan,
  computeVariantTransferRate,
} from "./remediation-loop-engine";

const a07 = buildRemediationPlan({
  misconceptionAtoms: [
    {
      id: "A07",
      label: "定义域意识弱",
      level: "高风险",
      description: "没有先检查定义域。",
    },
  ],
  variants: [],
});
assert.ok(a07.items.some((item) => item.title.includes("定义域")));
assert.ok(a07.items.some((item) => item.level === 3));

const a08 = buildRemediationPlan({
  misconceptionAtoms: [
    {
      id: "A08",
      label: "分类讨论缺失",
      level: "高风险",
      description: "没有分情况讨论。",
    },
  ],
  variants: [],
});
assert.ok(a08.items.some((item) => item.title.includes("分类")));

const geometry = buildRemediationPlan({
  misconceptionAtoms: [
    {
      id: "A31",
      label: "几何约束遗漏",
      level: "高风险",
      description: "没有写空间约束。",
    },
  ],
  variants: [],
  recommendedGeometryLabs: [
    {
      levelId: "G0-2",
      title: "正方体基础",
      reason: "几何补强",
      targetAtoms: ["A31"],
      sceneSpecId: "scene_g0_2",
    },
  ],
});
assert.equal(geometry.nextStep, "geometry_lab");

assert.equal(
  computeVariantTransferRate([
    {
      studentId: "stu",
      sourceProblemId: "p",
      sourceAtomId: "A07",
      variantId: "v1",
      variantLevel: 1,
      correct: true,
      verifierPassed: true,
      completedAt: "2026-06-06T00:00:00.000Z",
    },
    {
      studentId: "stu",
      sourceProblemId: "p",
      sourceAtomId: "A07",
      variantId: "v2",
      variantLevel: 3,
      correct: false,
      verifierPassed: false,
      completedAt: "2026-06-06T00:00:00.000Z",
    },
  ]),
  0.5
);

console.log("remediation-loop-engine tests passed");
