import type { GeometryLevel } from "./geometry-scene-types";

export const FEATURED_GEOMETRY_LEVEL_IDS = ["G1-4", "G2-2", "G1-6"] as const;

const FEATURED_COPY: Record<
  string,
  {
    title: string;
    summary: string;
    exampleProblem: string;
    variantPrompt: string;
    completionHint: string;
  }
> = {
  "G1-4": {
    title: "正方体线面角",
    summary: "先找斜线在底面上的投影，再把线面角转成平面角。",
    exampleProblem:
      "正方体 ABCD-A1B1C1D1 中，求 A1C 与底面 ABCD 所成的角。",
    variantPrompt:
      "变式：把斜线改为 B1D，先指出它在底面上的投影，再说明线面角是哪一个平面角。",
    completionHint: "订正完成后，下一题优先练“找投影再看角”。",
  },
  "G2-2": {
    title: "三棱锥二面角",
    summary:
      "二面角不能直接看空间夹角，要在垂直于公共棱的辅助截面里看平面角。",
    exampleProblem:
      "三棱锥 P-ABC 中，求二面角 P-AB-C，先选择辅助线或辅助面。",
    variantPrompt:
      "变式：把公共棱换成 AC，先判断应该作哪一个垂直于 AC 的辅助截面。",
    completionHint: "订正完成后，重点复盘“垂直于公共棱的截面”。",
  },
  "G1-6": {
    title: "截面/辅助面构造",
    summary: "用共面、延长、平行和交线一步步生成截面，不凭直觉画图。",
    exampleProblem:
      "正方体中经过 A、C、C1 的截面是什么？请先选出截面对象。",
    variantPrompt:
      "变式：截面经过 A、B1、D1，先判断需要延长或连接哪些线来生成交线。",
    completionHint: "订正完成后，进入“辅助面构造”迁移题。",
  },
};

export function isFeaturedGeometryLevel(levelId: string) {
  return (FEATURED_GEOMETRY_LEVEL_IDS as readonly string[]).includes(levelId);
}

export function getGeometryLevelDisplay(level: GeometryLevel) {
  const featured = FEATURED_COPY[level.levelId];
  return {
    title: featured?.title ?? level.title,
    summary: featured?.summary ?? level.summary,
    exampleProblem:
      featured?.exampleProblem ??
      "选择一个目标对象，并说明它为什么支持当前几何结论。",
    variantPrompt:
      featured?.variantPrompt ??
      "变式：更换一个点、线或面，重新说明你的辅助构造依据。",
    completionHint:
      featured?.completionHint ??
      "订正完成后，用同因变式检查是否真正迁移。",
  };
}

export function sortGeometryLevelsForLearningPath(levels: GeometryLevel[]) {
  const featuredOrder = new Map<string, number>(
    FEATURED_GEOMETRY_LEVEL_IDS.map((levelId, index) => [levelId, index])
  );

  return [...levels].sort((first, second) => {
    const firstFeatured = featuredOrder.get(first.levelId);
    const secondFeatured = featuredOrder.get(second.levelId);
    if (firstFeatured !== undefined || secondFeatured !== undefined) {
      return (firstFeatured ?? 99) - (secondFeatured ?? 99);
    }
    return first.levelId.localeCompare(second.levelId);
  });
}
