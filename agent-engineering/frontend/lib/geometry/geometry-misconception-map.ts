import { getGeometryLevel } from "./geometry-levels";
import type { GeometryLabRecommendation } from "./geometry-scene-types";

export const GEOMETRY_ATOMS = {
  A31: {
    label: "几何约束遗漏",
    description: "没有把垂直、平行、夹角、长度关系等空间约束写入推理链。",
  },
  A32: {
    label: "投影意识薄弱",
    description: "线面角、点面距和高没有先找投影或垂足。",
  },
  A33: {
    label: "辅助平面意识薄弱",
    description: "遇到二面角或空间垂直关系时，不会构造可观察的辅助平面。",
  },
  A34: {
    label: "二面角转化薄弱",
    description: "没有把二面角转化为垂直于公共棱的平面角。",
  },
  A35: {
    label: "截面想象薄弱",
    description: "不会用共面、延长、平行等规则生成空间截面。",
  },
  A36: {
    label: "球心关系薄弱",
    description: "没有利用球心、半径、切面或外接球的核心约束。",
  },
  A37: {
    label: "空间坐标建系薄弱",
    description: "坐标系原点、轴方向和点坐标设置不稳定。",
  },
  A38: {
    label: "空间到平面迁移薄弱",
    description: "没有把空间关系转化成平面三角形、向量或坐标问题。",
  },
} as const;

const ATOM_TO_LEVELS: Record<string, string[]> = {
  A31: ["G0-2", "G1-1", "G1-2"],
  A32: ["G1-4", "G1-5", "G2-1"],
  A33: ["G2-1", "G2-2", "G2-3"],
  A34: ["G2-2", "G2-4"],
  A35: ["G1-6"],
  A36: ["G2-4"],
  A37: ["G0-2"],
  A38: ["G1-3", "G1-4", "G2-3"],
  A12: ["G0-2", "G1-3"],
};

export function isGeometryAtom(atomId: string) {
  return atomId in GEOMETRY_ATOMS;
}

export function recommendGeometryLabs(
  atomIds: string[],
  limit = 3
): GeometryLabRecommendation[] {
  const seen = new Set<string>();
  const recommendations: GeometryLabRecommendation[] = [];

  for (const atomId of atomIds) {
    for (const levelId of ATOM_TO_LEVELS[atomId] ?? []) {
      if (seen.has(levelId)) {
        continue;
      }
      const level = getGeometryLevel(levelId);
      if (!level) {
        continue;
      }
      seen.add(levelId);
      recommendations.push({
        levelId: level.levelId,
        title: level.title,
        reason: buildReason(atomId, level.targetAtoms),
        targetAtoms: level.targetAtoms,
        sceneSpecId: level.sceneSpecId,
      });
      if (recommendations.length >= limit) {
        return recommendations;
      }
    }
  }

  return recommendations;
}

function buildReason(atomId: string, targetAtoms: string[]) {
  const atomLabel =
    GEOMETRY_ATOMS[atomId as keyof typeof GEOMETRY_ATOMS]?.label ?? atomId;
  return `当前诊断命中 ${atomLabel}，建议用 ${targetAtoms.join(
    "/"
  )} 对应关卡做一次可视化补强。`;
}
