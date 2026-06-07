import type { MathDiagnosisResult } from "./math-diagnosis-types";
import type {
  RemediationPlan,
  VariantLevel,
  VariantTransferRecord,
  VariantTrainingItem,
} from "./remediation-loop-types";

type RemediationInput = {
  misconceptionAtoms: MathDiagnosisResult["misconceptionAtoms"];
  variants: MathDiagnosisResult["variants"];
  recommendedGeometryLabs?: MathDiagnosisResult["recommendedGeometryLabs"];
};

export function buildRemediationPlan(input: RemediationInput): RemediationPlan {
  const sourceAtoms = input.misconceptionAtoms.map((atom) => atom.id);
  const atomItems = input.misconceptionAtoms.flatMap((atom) =>
    buildAtomVariantItems(atom.id, atom.label || atom.id)
  );
  const variantItems = input.variants.slice(0, 3).map((variant, index) => ({
    atomId: sourceAtoms[0] ?? "general",
    atomLabel: variant.tag,
    level: (index + 1) as VariantLevel,
    title: variant.title,
    prompt: variant.text,
    purpose: `围绕 ${variant.tag} 做同因迁移检测。`,
  }));
  const items = [...atomItems, ...variantItems].slice(0, 6);
  const hasGeometryLab = (input.recommendedGeometryLabs?.length ?? 0) > 0;

  return {
    sourceAtoms,
    nextStep: hasGeometryLab ? "geometry_lab" : "practice_variants",
    items,
    masteryImpact: items.some((item) => item.level >= 3)
      ? "high"
      : items.length > 0
        ? "medium"
        : "low",
  };
}

export function computeVariantTransferRate(records: VariantTransferRecord[]) {
  if (records.length === 0) {
    return 0;
  }
  return Number(
    (
      records.filter((record) => record.correct && record.verifierPassed).length /
      records.length
    ).toFixed(2)
  );
}

function buildAtomVariantItems(
  atomId: string,
  atomLabel: string
): VariantTrainingItem[] {
  if (atomId === "A07") {
    return [
      item(atomId, atomLabel, 1, "定义域表层变式", "含 ln x 或分式的函数，先写定义域再求导。"),
      item(atomId, atomLabel, 3, "定义域迁移变式", "把定义域检查迁移到复合函数或参数函数。"),
    ];
  }
  if (atomId === "A08" || atomId === "A18") {
    return [
      item(atomId, atomLabel, 1, "参数分类表层变式", "只改变参数取值，让学生列出分类边界。"),
      item(atomId, atomLabel, 3, "分类讨论迁移变式", "换成恒成立或存在性问题，检查分类是否完整。"),
    ];
  }
  if (atomId === "A31" || atomId === "A32" || atomId === "A33" || atomId === "A34") {
    return [
      item(atomId, atomLabel, 2, "几何关系结构变式", "换一个空间图形，先找投影、垂足或辅助面。"),
      item(atomId, atomLabel, 3, "Geometry Lab 迁移训练", "进入 Geometry Lab，用操作证明空间关系。"),
    ];
  }
  return [
    item(atomId, atomLabel, 1, `${atomLabel} 表层变式`, "同知识点同结构改数字，检查能否避免同错因。"),
    item(atomId, atomLabel, 2, `${atomLabel} 结构变式`, "同错因换条件，检查是否理解规则适用范围。"),
  ];
}

function item(
  atomId: string,
  atomLabel: string,
  level: VariantLevel,
  title: string,
  prompt: string
): VariantTrainingItem {
  return {
    atomId,
    atomLabel,
    level,
    title,
    prompt,
    purpose:
      level >= 3
        ? "检测是否能跨题型迁移，而不是只会原题。"
        : "先确认同结构下是否能修正同一错因。",
  };
}
