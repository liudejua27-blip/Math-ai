export type GeometryTemplate =
  | "cube"
  | "cuboid"
  | "triangular_pyramid"
  | "quadrangular_pyramid"
  | "sphere_polyhedron"
  | "cone_cylinder"
  | "coordinate_3d";

export type GeometryRefType =
  | "point"
  | "edge"
  | "face"
  | "angle"
  | "distance"
  | "section";

export type GeometrySceneSpec = {
  type: "geometry_lab_scene";
  version: "1.0";
  sceneId: string;
  levelId: string;
  template: GeometryTemplate;
  vertices: Array<{
    id: string;
    label: string;
    position: [number, number, number];
    visible?: boolean;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    label?: string;
    kind?: "solid" | "hidden" | "auxiliary" | "projection";
    evidenceId?: string;
  }>;
  faces: Array<{
    id: string;
    vertices: string[];
    label?: string;
    kind?: "base" | "side" | "auxiliary" | "section";
    transparent?: boolean;
    evidenceId?: string;
  }>;
  targets: Array<{
    id: string;
    type: GeometryRefType;
    prompt: string;
    correctRefs: string[];
    evidenceIds: string[];
    misconceptionIfWrong: string[];
  }>;
  animationSteps?: Array<{
    id: string;
    label: string;
    action:
      | "condition_highlight"
      | "draw_auxiliary"
      | "rotate_to_view"
      | "wrong_object_flash"
      | "correct_object_lock";
    refs: string[];
    durationMs?: number;
    cameraPresetId?: string;
    evidenceIds?: string[];
  }>;
  wrongObjectHighlights?: Array<{
    id: string;
    refs: string[];
    message: string;
    atomIds: string[];
  }>;
  cameraPresets?: Array<{
    id: string;
    label: string;
    position: [number, number, number];
    target: [number, number, number];
  }>;
  linkedEvidenceIds?: string[];
  timeline: Array<{
    id: string;
    action:
      | "focus"
      | "highlight_vertex"
      | "highlight_edge"
      | "highlight_face"
      | "draw_auxiliary_edge"
      | "draw_auxiliary_face"
      | "show_projection"
      | "show_angle"
      | "show_distance"
      | "rotate_camera"
      | "ask_user";
    refs: string[];
    text: string;
    evidenceIds?: string[];
  }>;
  assessment: {
    maxAttempts: number;
    passRule: {
      minCorrectTargets: number;
      requireReason: boolean;
      requireEvidence: boolean;
    };
  };
};

export type GeometryAction = {
  id: string;
  type:
    | "rotate"
    | "select_ref"
    | "draw_auxiliary"
    | "choose_reason"
    | "submit";
  refIds?: string[];
  reason?: string;
  timestampMs: number;
};

export type GeometryAttempt = {
  studentId: string;
  levelId: string;
  sceneId: string;
  actions: GeometryAction[];
  selectedEvidenceIds: string[];
  answerCorrect: boolean;
  reasoningCorrect: boolean;
  attempts: number;
  timeSpentSec: number;
  misconceptionAtoms: string[];
  transferScore?: number;
};

export type GeometryLevel = {
  levelId: string;
  title: string;
  chapter: "G0" | "G1" | "G2";
  template: GeometryTemplate;
  sceneSpecId: string;
  targetAtoms: string[];
  summary: string;
  scene: GeometrySceneSpec;
  suggestedNextLevelIds?: string[];
};

export type GeometryLabRecommendation = {
  levelId: string;
  title: string;
  reason: string;
  targetAtoms: string[];
  sceneSpecId: string;
};

export type GeometryProfile = {
  studentId: string;
  completedLevelIds: string[];
  weakAtoms: string[];
  spatialTransferScore: number;
  lastAttemptAt?: string;
};
