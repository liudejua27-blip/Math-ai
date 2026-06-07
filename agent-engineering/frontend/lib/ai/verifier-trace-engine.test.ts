import assert from "node:assert/strict";
import { buildVerifierTraces } from "./verifier-trace-engine";

const strictChecks = [
  {
    id: "Q1",
    label: "定义域约束",
    status: "fail" as const,
    reason: "没有先写 x>0。",
  },
  {
    id: "Q2",
    label: "求导公式",
    status: "pass" as const,
    reason: "求导式可检查。",
  },
];

const withoutPython = buildVerifierTraces({ strictChecks });
assert.ok(withoutPython.some((trace) => trace.verifier === "not_checked"));
assert.ok(
  withoutPython.every((trace) => Array.isArray(trace.evidenceIds) && trace.evidenceIds.length > 0)
);
assert.equal(withoutPython[0].status, "fail");
assert.ok(withoutPython[0].failureReason);

const withPython = buildVerifierTraces({
  strictChecks,
  pythonVerifier: {
    verification: {
      checks: [
        { name: "sympy_derivative", passed: true },
        { name: "numeric_sampling", passed: false, reason: "采样点不满足。" },
      ],
    },
  },
});
assert.ok(withPython.some((trace) => trace.verifier === "sympy"));
assert.ok(withPython.some((trace) => trace.verifier === "numeric_sampling" && trace.status === "fail"));

console.log("verifier-trace-engine tests passed");
