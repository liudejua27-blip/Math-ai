import type {
  GeometryLevel,
  GeometryRefType,
  GeometrySceneSpec,
} from "./geometry-scene-types";

type Vec3 = [number, number, number];

export type GeometryRelationType =
  | "parallel"
  | "perpendicular"
  | "incident"
  | "projection"
  | "section"
  | "auxiliary_candidate";

export type GeometryObjectRef = {
  id: string;
  type: "point" | "edge" | "face";
  label: string;
  kind?: string;
};

export type GeometryConstraint = {
  id: string;
  type: GeometryRelationType;
  refs: string[];
  confidence: number;
  reason: string;
};

export type GeometryConstraintSystem = {
  sceneId: string;
  objects: GeometryObjectRef[];
  constraints: GeometryConstraint[];
};

export type GeometrySolverKind =
  | "line_plane_angle"
  | "dihedral_angle"
  | "section_construction"
  | "generic_constraint";

export type GeometryAuxiliaryCandidate = {
  refId: string;
  label: string;
  role: "projection" | "auxiliary_line" | "auxiliary_face" | "section";
  required: boolean;
  reason: string;
};

export type GeometrySolverResult = {
  kind: GeometrySolverKind;
  targetId: string;
  prompt: string;
  acceptedRefs: string[];
  auxiliaryCandidates: GeometryAuxiliaryCandidate[];
  reasoningTrace: string[];
  stepAlignmentEvidence: Array<{
    claimId: string;
    text: string;
    refs: string[];
    status: "pass" | "fail" | "warn";
  }>;
};

export type GeometrySelectionFeedback = {
  selectedRefs: string[];
  solvedTargetIds: string[];
  missingTargetIds: string[];
  wrongRefs: string[];
  misconceptionAtoms: string[];
  messages: Array<{
    refId?: string;
    status: "success" | "warning" | "error";
    text: string;
  }>;
  suggestedAuxiliaries: GeometryAuxiliaryCandidate[];
  stepAlignmentEvidence: GeometrySolverResult["stepAlignmentEvidence"];
  learnerMemorySignal: {
    atomIds: string[];
    spatialTransferDelta: number;
    shouldReview: boolean;
  };
};

export type GeometryVisualMathBenchmarkStandard = {
  source: "MathVerse" | "MATH-Vision" | "MathVista";
  borrowedIdea: string;
  localMetric: string;
};

export function buildGeometryConstraintSystem(
  scene: GeometrySceneSpec
): GeometryConstraintSystem {
  const objects: GeometryObjectRef[] = [
    ...scene.vertices.map((vertex) => ({
      id: vertex.id,
      type: "point" as const,
      label: vertex.label,
    })),
    ...scene.edges.map((edge) => ({
      id: edge.id,
      type: "edge" as const,
      label: edge.label ?? edge.id,
      kind: edge.kind,
    })),
    ...scene.faces.map((face) => ({
      id: face.id,
      type: "face" as const,
      label: face.label ?? face.id,
      kind: face.kind,
    })),
  ];
  const constraints: GeometryConstraint[] = [];

  for (const first of scene.edges) {
    for (const second of scene.edges) {
      if (first.id >= second.id) {
        continue;
      }
      const relation = classifyEdgeRelation(scene, first, second);
      if (relation) {
        constraints.push(relation);
      }
    }
  }

  for (const edge of scene.edges) {
    for (const face of scene.faces) {
      if (face.vertices.includes(edge.from) && face.vertices.includes(edge.to)) {
        constraints.push({
          id: `incident:${edge.id}:${face.id}`,
          type: "incident",
          refs: [edge.id, face.id],
          confidence: 1,
          reason: `${edge.id} 的两个端点都在平面 ${face.id} 上。`,
        });
      }
    }
  }

  for (const edge of scene.edges.filter((item) => item.kind === "projection")) {
    constraints.push({
      id: `projection:${edge.id}`,
      type: "projection",
      refs: [edge.id],
      confidence: 0.9,
      reason: `${edge.id} 被 scene spec 标记为投影线。`,
    });
  }

  for (const face of scene.faces.filter((item) => item.kind === "section")) {
    constraints.push({
      id: `section:${face.id}`,
      type: "section",
      refs: [face.id],
      confidence: 0.92,
      reason: `${face.id} 被 scene spec 标记为截面。`,
    });
  }

  return {
    sceneId: scene.sceneId,
    objects,
    constraints,
  };
}

export function solveGeometryLevel(level: GeometryLevel): GeometrySolverResult[] {
  return level.scene.targets.map((target) => solveGeometryTarget(level, target));
}

export function evaluateGeometrySelection({
  level,
  selectedRefs,
}: {
  level: GeometryLevel;
  selectedRefs: string[];
}): GeometrySelectionFeedback {
  const selected = new Set(selectedRefs);
  const solvers = solveGeometryLevel(level);
  const acceptedRefs = new Set(solvers.flatMap((solver) => solver.acceptedRefs));
  const solvedTargetIds = solvers
    .filter((solver) =>
      solver.auxiliaryCandidates
        .filter((candidate) => candidate.required)
        .some((candidate) => selected.has(candidate.refId))
    )
    .map((solver) => solver.targetId);
  const missingTargetIds = solvers
    .filter((solver) => !solvedTargetIds.includes(solver.targetId))
    .map((solver) => solver.targetId);
  const wrongRefs = selectedRefs.filter((refId) => !acceptedRefs.has(refId));
  const suggestedAuxiliaries = uniqueAuxiliaries(
    solvers.flatMap((solver) => solver.auxiliaryCandidates)
  );
  const misconceptionAtoms = [
    ...new Set([
      ...level.targetAtoms,
      ...level.scene.targets
        .filter((target) => missingTargetIds.includes(target.id))
        .flatMap((target) => target.misconceptionIfWrong),
    ]),
  ];
  const messages = buildFeedbackMessages({
    level,
    selectedRefs,
    solvedTargetIds,
    wrongRefs,
    suggestedAuxiliaries,
  });
  const stepAlignmentEvidence = solvers.flatMap((solver) =>
    solver.stepAlignmentEvidence.map((claim) => ({
      ...claim,
      status:
        claim.refs.some((refId) => selected.has(refId)) ||
        solvedTargetIds.includes(solver.targetId)
          ? claim.status
          : "warn",
    }))
  );

  return {
    selectedRefs,
    solvedTargetIds,
    missingTargetIds,
    wrongRefs,
    misconceptionAtoms,
    messages,
    suggestedAuxiliaries,
    stepAlignmentEvidence,
    learnerMemorySignal: {
      atomIds: misconceptionAtoms,
      spatialTransferDelta:
        wrongRefs.length === 0 && missingTargetIds.length === 0 ? 1 : 0,
      shouldReview: wrongRefs.length > 0 || missingTargetIds.length > 0,
    },
  };
}

export function buildGeometryVisualMathBenchmarkStandards(): GeometryVisualMathBenchmarkStandard[] {
  return [
    {
      source: "MathVerse",
      borrowedIdea:
        "评测模型是否真正理解图形，而不是只读文字题干；重点看视觉对象和推理链是否一致。",
      localMetric: "object_grounding_accuracy",
    },
    {
      source: "MATH-Vision",
      borrowedIdea:
        "按数学学科和难度分桶，避免只在简单几何图上看起来很强。",
      localMetric: "geometry_solver_accuracy_by_scene_type",
    },
    {
      source: "MathVista",
      borrowedIdea:
        "覆盖视觉上下文中的逻辑、几何、代数混合推理，检查多步视觉数学能力。",
      localMetric: "visual_reasoning_transfer_rate",
    },
  ];
}

function solveGeometryTarget(
  level: GeometryLevel,
  target: GeometrySceneSpec["targets"][number]
): GeometrySolverResult {
  if (level.levelId === "G1-4" || target.id.includes("PROJECTION")) {
    return {
      kind: "line_plane_angle",
      targetId: target.id,
      prompt: "先找斜线在平面上的投影，再把线面角转成平面角。",
      acceptedRefs: unique(["A1C", "AC", ...target.correctRefs]),
      auxiliaryCandidates: [
        auxiliary("A1C", "斜线 A1C", "auxiliary_line", false, "这是待求角的空间斜线。"),
        auxiliary("AC", "投影 AC", "projection", true, "A1 投到底面为 A，所以 A1C 的投影是 AC。"),
        auxiliary("ABCD", "底面 ABCD", "auxiliary_face", false, "线面角必须绑定到目标平面。"),
      ],
      reasoningTrace: [
        "确定目标平面是 ABCD。",
        "找到 A1 在底面上的垂足 A。",
        "连接垂足 A 与 C，得到投影 AC。",
        "线面角等于 A1C 与 AC 的夹角。",
      ],
      stepAlignmentEvidence: [
        claim(target.id, "线面角必须先找斜线在平面上的投影。", ["A1C", "AC"]),
      ],
    };
  }

  if (level.levelId === "G2-2" || target.id.includes("DIHEDRAL")) {
    return {
      kind: "dihedral_angle",
      targetId: target.id,
      prompt: "二面角要在垂直于公共棱的辅助截面里看平面角。",
      acceptedRefs: unique(["POM", "PM", "OM", ...target.correctRefs]),
      auxiliaryCandidates: [
        auxiliary("POM", "辅助截面 POM", "auxiliary_face", true, "它把空间二面角转成可观察的平面角。"),
        auxiliary("PM", "侧面内垂线 PM", "auxiliary_line", false, "PM 是辅助截面中的一边。"),
        auxiliary("OM", "底面内垂线 OM", "auxiliary_line", false, "OM 是辅助截面中的另一边。"),
      ],
      reasoningTrace: [
        "确认二面角的公共棱。",
        "过公共棱上的点作两个面内分别垂直于公共棱的线。",
        "两条垂线所在的截面就是观察二面角的辅助截面。",
        "二面角转化为该截面内的平面角。",
      ],
      stepAlignmentEvidence: [
        claim(target.id, "二面角需要构造垂直于公共棱的辅助截面。", ["POM", "PM", "OM"]),
      ],
    };
  }

  if (level.levelId === "G1-6" || target.type === "section") {
    return {
      kind: "section_construction",
      targetId: target.id,
      prompt: "截面不是凭直觉画，要用共面、延长、平行和交线逐步生成。",
      acceptedRefs: unique(["ABCDiag", ...target.correctRefs]),
      auxiliaryCandidates: [
        auxiliary("ABCDiag", "截面 ACC1A1", "section", true, "该截面同时经过 A、C、C1。"),
        auxiliary("AC", "底面对角线 AC", "auxiliary_line", false, "AC 是截面与底面的交线。"),
        auxiliary("A1C1", "顶面对角线 A1C1", "auxiliary_line", false, "与 AC 平行，帮助闭合截面。"),
      ],
      reasoningTrace: [
        "确认三个已知点。",
        "在同一已知平面内连接可连接的两点。",
        "利用平行面上的平行交线补全截面。",
        "检查截面是否经过所有给定点。",
      ],
      stepAlignmentEvidence: [
        claim(target.id, "截面构造必须由共面点和交线推出。", ["ABCDiag", "AC", "A1C1"]),
      ],
    };
  }

  return {
    kind: "generic_constraint",
    targetId: target.id,
    prompt: target.prompt,
    acceptedRefs: target.correctRefs,
    auxiliaryCandidates: target.correctRefs.map((refId) =>
      auxiliary(refId, refId, inferRole(target.type), true, "这是当前任务的关键对象。")
    ),
    reasoningTrace: ["选择目标对象。", "说明它与题目条件之间的几何关系。"],
    stepAlignmentEvidence: [
      claim(target.id, "目标对象需要和题目条件形成可验证的几何关系。", target.correctRefs),
    ],
  };
}

function classifyEdgeRelation(
  scene: GeometrySceneSpec,
  first: GeometrySceneSpec["edges"][number],
  second: GeometrySceneSpec["edges"][number]
): GeometryConstraint | null {
  const firstVector = edgeVector(scene, first);
  const secondVector = edgeVector(scene, second);
  if (!firstVector || !secondVector) {
    return null;
  }
  const dotValue = dot(firstVector, secondVector);
  const crossMagnitude = magnitude(cross(firstVector, secondVector));
  if (crossMagnitude < 0.0001) {
    return {
      id: `parallel:${first.id}:${second.id}`,
      type: "parallel",
      refs: [first.id, second.id],
      confidence: 0.96,
      reason: `${first.id} 与 ${second.id} 方向向量平行。`,
    };
  }
  if (Math.abs(dotValue) < 0.0001) {
    return {
      id: `perpendicular:${first.id}:${second.id}`,
      type: "perpendicular",
      refs: [first.id, second.id],
      confidence: 0.96,
      reason: `${first.id} 与 ${second.id} 方向向量点积为 0。`,
    };
  }
  return null;
}

function edgeVector(
  scene: GeometrySceneSpec,
  edge: GeometrySceneSpec["edges"][number]
): Vec3 | null {
  const from = scene.vertices.find((vertex) => vertex.id === edge.from);
  const to = scene.vertices.find((vertex) => vertex.id === edge.to);
  if (!from || !to) {
    return null;
  }
  return [
    to.position[0] - from.position[0],
    to.position[1] - from.position[1],
    to.position[2] - from.position[2],
  ];
}

function buildFeedbackMessages({
  level,
  selectedRefs,
  solvedTargetIds,
  wrongRefs,
  suggestedAuxiliaries,
}: {
  level: GeometryLevel;
  selectedRefs: string[];
  solvedTargetIds: string[];
  wrongRefs: string[];
  suggestedAuxiliaries: GeometryAuxiliaryCandidate[];
}): GeometrySelectionFeedback["messages"] {
  const messages: GeometrySelectionFeedback["messages"] = [];
  if (selectedRefs.length === 0) {
    return [
      {
        status: "warning",
        text: "先在图中选择一个点、线、面或候选辅助对象，推理引擎会立即判断它是否支持当前目标。",
      },
    ];
  }

  for (const refId of wrongRefs) {
    messages.push({
      refId,
      status: "error",
      text: explainWrongRef(level, refId),
    });
  }

  for (const targetId of solvedTargetIds) {
    messages.push({
      status: "success",
      text: `已命中 ${targetId} 的关键对象。下一步要用一句几何依据说明为什么选它。`,
    });
  }

  const nextRequired = suggestedAuxiliaries.find(
    (item) => item.required && !selectedRefs.includes(item.refId)
  );
  if (nextRequired) {
    messages.push({
      refId: nextRequired.refId,
      status: "warning",
      text: `还需要确认 ${nextRequired.label}：${nextRequired.reason}`,
    });
  }

  return messages;
}

function explainWrongRef(level: GeometryLevel, refId: string) {
  if (level.levelId === "G1-4") {
    return `${refId} 不能直接作为线面角对象。线面角要找斜线在底面上的投影，再看斜线与投影的夹角。`;
  }
  if (level.levelId === "G2-2") {
    return `${refId} 还不能确定二面角。二面角必须落到垂直于公共棱的辅助截面里。`;
  }
  if (level.levelId === "G1-6") {
    return `${refId} 还不足以生成截面。截面需要由共面点、交线或平行关系逐步推出。`;
  }
  return `${refId} 不是当前目标的关键对象，请回到题目条件重新确认点、线、面关系。`;
}

function auxiliary(
  refId: string,
  label: string,
  role: GeometryAuxiliaryCandidate["role"],
  required: boolean,
  reason: string
): GeometryAuxiliaryCandidate {
  return { refId, label, role, required, reason };
}

function claim(
  targetId: string,
  text: string,
  refs: string[]
): GeometrySolverResult["stepAlignmentEvidence"][number] {
  return {
    claimId: `geo-${targetId}-${refs.join("-")}`,
    text,
    refs,
    status: "pass",
  };
}

function inferRole(type: GeometryRefType): GeometryAuxiliaryCandidate["role"] {
  if (type === "section") {
    return "section";
  }
  if (type === "face") {
    return "auxiliary_face";
  }
  if (type === "angle" || type === "edge" || type === "distance") {
    return "auxiliary_line";
  }
  return "projection";
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function uniqueAuxiliaries(items: GeometryAuxiliaryCandidate[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.refId}:${item.role}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dot(first: Vec3, second: Vec3) {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
}

function cross(first: Vec3, second: Vec3): Vec3 {
  return [
    first[1] * second[2] - first[2] * second[1],
    first[2] * second[0] - first[0] * second[2],
    first[0] * second[1] - first[1] * second[0],
  ];
}

function magnitude(vector: Vec3) {
  return Math.sqrt(dot(vector, vector));
}
