import type {
  GeometryLevel,
  GeometrySceneSpec,
  GeometryTemplate,
} from "./geometry-scene-types";

type Target = GeometrySceneSpec["targets"][number];
type TimelineItem = GeometrySceneSpec["timeline"][number];

const cubeVertices: GeometrySceneSpec["vertices"] = [
  { id: "A", label: "A", position: [-1, -1, -1] },
  { id: "B", label: "B", position: [1, -1, -1] },
  { id: "C", label: "C", position: [1, 1, -1] },
  { id: "D", label: "D", position: [-1, 1, -1] },
  { id: "A1", label: "A1", position: [-1, -1, 1] },
  { id: "B1", label: "B1", position: [1, -1, 1] },
  { id: "C1", label: "C1", position: [1, 1, 1] },
  { id: "D1", label: "D1", position: [-1, 1, 1] },
];

const cubeEdges: GeometrySceneSpec["edges"] = [
  edge("AB", "A", "B"),
  edge("BC", "B", "C"),
  edge("CD", "C", "D"),
  edge("DA", "D", "A", "hidden"),
  edge("A1B1", "A1", "B1"),
  edge("B1C1", "B1", "C1"),
  edge("C1D1", "C1", "D1"),
  edge("D1A1", "D1", "A1"),
  edge("AA1", "A", "A1"),
  edge("BB1", "B", "B1"),
  edge("CC1", "C", "C1"),
  edge("DD1", "D", "D1", "hidden"),
  edge("AC", "A", "C", "auxiliary"),
  edge("A1C", "A1", "C", "auxiliary"),
  edge("A1C1", "A1", "C1", "auxiliary"),
  edge("D1C", "D1", "C", "auxiliary"),
  edge("BD1", "B", "D1", "auxiliary"),
];

const cubeFaces: GeometrySceneSpec["faces"] = [
  face("ABCD", ["A", "B", "C", "D"], "base", "bottom"),
  face("A1B1C1D1", ["A1", "B1", "C1", "D1"], "side", "top"),
  face("ABB1A1", ["A", "B", "B1", "A1"], "side", "front"),
  face("BCC1B1", ["B", "C", "C1", "B1"], "side", "right"),
  face("DCC1D1", ["D", "C", "C1", "D1"], "side", "back"),
  face("ADD1A1", ["A", "D", "D1", "A1"], "side", "left"),
  face("ABCDiag", ["A", "C", "C1", "A1"], "section", "section", true),
];

const pyramidVertices: GeometrySceneSpec["vertices"] = [
  { id: "A", label: "A", position: [-1.1, -0.9, 0] },
  { id: "B", label: "B", position: [1.1, -0.8, 0] },
  { id: "C", label: "C", position: [0.15, 1, 0] },
  { id: "P", label: "P", position: [0.15, 0.05, 1.55] },
  { id: "O", label: "O", position: [0.15, 0.05, 0], visible: false },
  { id: "M", label: "M", position: [0, -0.85, 0], visible: false },
];

const pyramidEdges: GeometrySceneSpec["edges"] = [
  edge("AB", "A", "B"),
  edge("BC", "B", "C"),
  edge("CA", "C", "A", "hidden"),
  edge("PA", "P", "A"),
  edge("PB", "P", "B"),
  edge("PC", "P", "C"),
  edge("PO", "P", "O", "projection", "E_PO"),
  edge("PM", "P", "M", "auxiliary", "E_PM"),
  edge("OM", "O", "M", "auxiliary", "E_OM"),
];

const pyramidFaces: GeometrySceneSpec["faces"] = [
  face("ABC", ["A", "B", "C"], "base", "base", true, "E_BASE"),
  face("PAB", ["P", "A", "B"], "side", "front"),
  face("PBC", ["P", "B", "C"], "side", "right"),
  face("PCA", ["P", "C", "A"], "side", "left", true),
  face("POM", ["P", "O", "M"], "auxiliary", "auxiliary", true, "E_AUX"),
];

export const GEOMETRY_LEVELS: GeometryLevel[] = [
  level("G0-1", "G0", "点线面识别", "cube", ["A31"], "先把顶点、棱、面说清楚，再进入推理。", cubeScene("G0-1", [
    target("T_VERTEX", "point", "请选择顶点 A1。", ["A1"], ["A31"]),
    target("T_EDGE", "edge", "请选择棱 BB1。", ["BB1"], ["A31"]),
    target("T_FACE", "face", "请选择面 ABB1A1。", ["ABB1A1"], ["A31"]),
  ])),
  level("G0-2", "G0", "证据选择训练", "cube", ["A31", "A38"], "先选证据，再说结论，训练几何推理的证据链。", cubeScene("G0-2", [
    target("T_EVIDENCE", "face", "要证明 AB 平行 C1D1，应先选择哪个平面或平行棱证据？", ["A1B1C1D1", "AB"], ["A31", "A38"]),
  ])),
  level("G1-1", "G1", "正方体平行线", "cube", ["A31"], "在正方体中找平行棱，建立方向族。", cubeScene("G1-1", [
    target("T_PARALLEL", "edge", "请选择与 AB 平行的一条棱。", ["CD", "A1B1", "C1D1"], ["A31"]),
  ])),
  level("G1-2", "G1", "正方体垂直线", "cube", ["A31"], "区分相交垂直和由面关系推出的垂直。", cubeScene("G1-2", [
    target("T_PERP", "edge", "请选择与 AB 垂直且相交的一条棱。", ["BC", "AA1"], ["A31"]),
  ])),
  level("G1-3", "G1", "异面直线夹角", "cube", ["A31", "A38"], "把异面线平移到同一平面内，再求夹角。", cubeScene("G1-3", [
    target("T_SKEW", "edge", "求 AB 与 D1C 的夹角时，应选择哪条与 AB 平行的辅助线？", ["C1D1", "CD"], ["A31", "A38"]),
  ], [
    timeline("TL1", "highlight_edge", ["AB"], "先固定第一条直线 AB。"),
    timeline("TL2", "draw_auxiliary_edge", ["C1D1"], "把 AB 的方向平移到过 D1 的位置。"),
    timeline("TL3", "show_angle", ["C1D1", "D1C"], "把异面线夹角转化为同一平面内的角。"),
  ])),
  level("G1-4", "G1", "线面角投影", "cube", ["A32", "A38"], "找到斜线在平面上的射影，线面角才有可计算对象。", cubeScene("G1-4", [
    target("T_PROJECTION", "edge", "求 A1C 与底面 ABCD 的线面角，应先找哪条射影？", ["AC"], ["A32", "A38"]),
  ], [
    timeline("TL1", "highlight_edge", ["A1C"], "斜线是 A1C。"),
    timeline("TL2", "show_projection", ["AC"], "A1 落到底面为 A，所以射影是 AC。"),
    timeline("TL3", "show_angle", ["A1C", "AC"], "线面角转化为斜线和射影的夹角。"),
  ])),
  level("G1-5", "G1", "点面距离", "cube", ["A32", "A38"], "点到面的距离必须沿垂线或等价高来找。", cubeScene("G1-5", [
    target("T_DISTANCE", "distance", "点 A1 到底面 ABCD 的距离对应哪条线段？", ["AA1"], ["A32", "A38"]),
  ])),
  level("G1-6", "G1", "截面入门", "cube", ["A35", "A38"], "用共面、延长、平行来逐步生成截面。", cubeScene("G1-6", [
    target("T_SECTION", "section", "经过 A、C、C1 的截面是哪一个？", ["ABCDiag"], ["A35", "A38"]),
  ])),
  level("G2-1", "G2", "三棱锥找高", "triangular_pyramid", ["A32", "A33"], "先找顶点到底面的垂足，再把空间问题落到平面。", pyramidScene("G2-1", [
    target("T_HEIGHT", "distance", "三棱锥 P-ABC 的高应选择哪条线段？", ["PO"], ["A32", "A33"]),
  ])),
  level("G2-2", "G2", "三棱锥二面角", "triangular_pyramid", ["A33", "A34"], "二面角需要在垂直于棱的截面里看平面角。", pyramidScene("G2-2", [
    target("T_DIHEDRAL", "angle", "求二面角 P-AB-C，应先作哪个辅助平面或线段？", ["POM", "PM", "OM"], ["A33", "A34"]),
  ])),
  level("G2-3", "G2", "辅助平面选择", "triangular_pyramid", ["A33", "A38"], "选择能同时包含目标线和垂线关系的辅助平面。", pyramidScene("G2-3", [
    target("T_AUX_FACE", "face", "为了证明高和底面关系，应该选择哪个辅助面？", ["POM"], ["A33", "A38"]),
  ])),
  level("G2-4", "G2", "三棱锥综合挑战", "triangular_pyramid", ["A32", "A33", "A34", "A38"], "综合处理高、二面角和辅助平面。", pyramidScene("G2-4", [
    target("T_BOSS_HEIGHT", "distance", "先确认三棱锥的高。", ["PO"], ["A32"]),
    target("T_BOSS_AUX", "face", "再选择能观察二面角的辅助面。", ["POM"], ["A33", "A34"]),
  ])),
];

export const GEOMETRY_LEVEL_BY_ID = new Map(
  GEOMETRY_LEVELS.map((levelItem) => [levelItem.levelId, levelItem])
);

export function getGeometryLevel(levelId: string) {
  return GEOMETRY_LEVEL_BY_ID.get(levelId);
}

function level(
  levelId: string,
  chapter: GeometryLevel["chapter"],
  title: string,
  template: GeometryTemplate,
  targetAtoms: string[],
  summary: string,
  scene: GeometrySceneSpec
): GeometryLevel {
  return {
    levelId,
    title,
    chapter,
    template,
    sceneSpecId: scene.sceneId,
    targetAtoms,
    summary,
    scene,
  };
}

function cubeScene(
  levelId: string,
  targets: Target[],
  customTimeline?: TimelineItem[]
): GeometrySceneSpec {
  return scene(
    levelId,
    "cube",
    cubeVertices,
    cubeEdges,
    cubeFaces,
    targets,
    customTimeline ?? [
      timeline("TL1", "rotate_camera", [], "先旋转模型，确认前后、上下和隐藏棱。"),
      timeline("TL2", "ask_user", targets.map((item) => item.id), "再点击目标对象，不急着算答案。"),
      timeline("TL3", "focus", targets.flatMap((item) => item.correctRefs), "最后说出你选择它的几何依据。"),
    ]
  );
}

function pyramidScene(
  levelId: string,
  targets: Target[],
  customTimeline?: TimelineItem[]
): GeometrySceneSpec {
  return scene(
    levelId,
    "triangular_pyramid",
    pyramidVertices,
    pyramidEdges,
    pyramidFaces,
    targets,
    customTimeline ?? [
      timeline("TL1", "rotate_camera", [], "先观察顶点 P、底面 ABC 和可能的垂足。"),
      timeline("TL2", "show_projection", ["PO"], "把空间距离或角度投影到底面。"),
      timeline("TL3", "ask_user", targets.map((item) => item.id), "选择关键辅助线或辅助面，并说明理由。"),
    ]
  );
}

function scene(
  levelId: string,
  template: GeometryTemplate,
  vertices: GeometrySceneSpec["vertices"],
  edges: GeometrySceneSpec["edges"],
  faces: GeometrySceneSpec["faces"],
  targets: Target[],
  timelineItems: TimelineItem[]
): GeometrySceneSpec {
  return {
    type: "geometry_lab_scene",
    version: "1.0",
    sceneId: `scene_${levelId.toLowerCase()}`,
    levelId,
    template,
    vertices,
    edges,
    faces,
    targets,
    timeline: timelineItems,
    assessment: {
      maxAttempts: 3,
      passRule: {
        minCorrectTargets: Math.max(1, targets.length),
        requireReason: true,
        requireEvidence: true,
      },
    },
  };
}

function edge(
  id: string,
  from: string,
  to: string,
  kind: GeometrySceneSpec["edges"][number]["kind"] = "solid",
  evidenceId?: string
): GeometrySceneSpec["edges"][number] {
  return { id, from, to, label: id, kind, evidenceId };
}

function face(
  id: string,
  vertices: string[],
  kind: GeometrySceneSpec["faces"][number]["kind"],
  label = id,
  transparent = false,
  evidenceId?: string
): GeometrySceneSpec["faces"][number] {
  return { id, vertices, label, kind, transparent, evidenceId };
}

function target(
  id: string,
  type: Target["type"],
  prompt: string,
  correctRefs: string[],
  misconceptionIfWrong: string[]
): Target {
  return {
    id,
    type,
    prompt,
    correctRefs,
    evidenceIds: correctRefs.map((refId) => `geo:${id}:${refId}`),
    misconceptionIfWrong,
  };
}

function timeline(
  id: string,
  action: TimelineItem["action"],
  refs: string[],
  text: string,
  evidenceIds?: string[]
): TimelineItem {
  return { id, action, refs, text, evidenceIds };
}
