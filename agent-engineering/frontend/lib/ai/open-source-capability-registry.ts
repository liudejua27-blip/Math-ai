export type OpenSourceCapabilityArea =
  | "draft_ocr"
  | "step_verifier"
  | "formal_verifier"
  | "visual_math_eval"
  | "agent_runtime_ui"
  | "geometry_reasoning";

export type IntegrationPriority = "P0" | "P1" | "P2";

export type OpenSourceCapability = {
  id: string;
  project: string;
  url: string;
  license: string;
  area: OpenSourceCapabilityArea;
  priority: IntegrationPriority;
  borrowedStrengths: string[];
  adaptedAs: string[];
  riskNotes: string[];
};

export const openSourceCapabilities: OpenSourceCapability[] = [
  {
    id: "pix2text",
    project: "Pix2Text",
    url: "https://github.com/breezedeus/Pix2Text",
    license: "MIT",
    area: "draft_ocr",
    priority: "P0",
    borrowedStrengths: [
      "mixed text/formula OCR pipeline",
      "LaTeX formula extraction from screenshots and draft images",
      "layout-aware line item output",
    ],
    adaptedAs: [
      "DraftOCRResult pageBlocks -> lineItems -> formulaItems contract",
      "low-confidence confirmation gate before diagnosis",
      "OCR-to-step-alignment evaluation fixtures",
    ],
    riskNotes: [
      "keep model runtime in Python service; do not move heavy OCR into Next.js",
      "persist raw crop only with privacy controls",
    ],
  },
  {
    id: "paddleocr",
    project: "PaddleOCR",
    url: "https://github.com/PaddlePaddle/PaddleOCR",
    license: "Apache-2.0",
    area: "draft_ocr",
    priority: "P0",
    borrowedStrengths: [
      "robust Chinese OCR",
      "document detection and text line recognition",
      "production-grade OCR ecosystem",
    ],
    adaptedAs: [
      "Chinese stem and handwritten annotation recognizer in OCR adapter chain",
      "confidence aggregation for student confirmation editor",
      "OCR issue tags for full-width symbols and step index noise",
    ],
    riskNotes: [
      "large model footprint needs separate Python worker",
      "handwriting quality must be evaluated with real student samples",
    ],
  },
  {
    id: "latex-ocr",
    project: "LaTeX-OCR / pix2tex",
    url: "https://github.com/lukas-blecher/LaTeX-OCR",
    license: "MIT",
    area: "draft_ocr",
    priority: "P0",
    borrowedStrengths: [
      "image-to-LaTeX recognition",
      "formula crop workflow",
      "practical CLI/server patterns",
    ],
    adaptedAs: [
      "formulaItems latex candidate list",
      "formula confidence and correction memory",
      "no-diagnosis gate when formula confidence is too low",
    ],
    riskNotes: [
      "formula OCR output must be student-confirmed before first-wrong-step diagnosis",
    ],
  },
  {
    id: "openr",
    project: "OpenR",
    url: "https://github.com/openreasoner/openr",
    license: "Apache-2.0",
    area: "step_verifier",
    priority: "P0",
    borrowedStrengths: [
      "process supervision",
      "step-aware candidate ranking",
      "verifier-guided reasoning evaluation",
    ],
    adaptedAs: [
      "multi-candidate first-wrong-step scoring",
      "margin-based confidence calibration",
      "human-label feedback sample generation",
    ],
    riskNotes: [
      "do not depend on OpenR training stack for MVP",
      "use local deterministic calibration until labeled data exists",
    ],
  },
  {
    id: "safe-lean-step-verifier",
    project: "Safe",
    url: "https://github.com/liuchengwucn/Safe",
    license: "check-before-vendoring",
    area: "formal_verifier",
    priority: "P1",
    borrowedStrengths: [
      "step-aware formal verification framing",
      "claim-level verification discipline",
      "Lean-backed proof checking idea",
    ],
    adaptedAs: [
      "claim trace contract with formal_adapter signal",
      "Lean review plan only for high-stakes low-confidence claims",
      "no direct vendoring until license audit is complete",
    ],
    riskNotes: [
      "license must be manually confirmed before copying code",
      "formal verifier should be optional because many高中题 are informal",
    ],
  },
  {
    id: "leanagent",
    project: "LeanAgent / LeanDojo",
    url: "https://github.com/lean-dojo/LeanAgent",
    license: "MIT",
    area: "formal_verifier",
    priority: "P1",
    borrowedStrengths: [
      "retrieval-augmented theorem proving",
      "dynamic knowledge base",
      "curriculum-style verifier improvement",
    ],
    adaptedAs: [
      "formalReviewPlan knowledgeRetrievalHints",
      "reusable lemma hints for verifier traces",
      "long-term verifier curriculum notes",
    ],
    riskNotes: [
      "Lean is a review tier, not the default高中数学 solver",
    ],
  },
  {
    id: "mathvista-mathverse-mathvision",
    project: "MathVista / MathVerse / MATH-Vision",
    url: "https://github.com/lupantech/MathVista",
    license: "benchmark-specific",
    area: "visual_math_eval",
    priority: "P1",
    borrowedStrengths: [
      "visual math benchmark methodology",
      "diagram understanding task taxonomy",
      "multi-modal reasoning evaluation",
    ],
    adaptedAs: [
      "Geometry Lab evaluation rubric",
      "visual math OCR-to-diagnosis benchmark categories",
      "diagram misread tags for LearnerMemory",
    ],
    riskNotes: [
      "benchmarks are for evaluation; do not copy datasets into product without license review",
    ],
  },
  {
    id: "agent-chat-ui",
    project: "langchain-ai/agent-chat-ui",
    url: "https://github.com/langchain-ai/agent-chat-ui",
    license: "MIT",
    area: "agent_runtime_ui",
    priority: "P0",
    borrowedStrengths: [
      "thread state view",
      "tool-call table",
      "interrupt / review / resume UX",
      "artifact side-panel idea",
    ],
    adaptedAs: [
      "assistant-ui styled AgentProcessRibbon",
      "visible tool/state/review controls without exposing hidden reasoning",
      "future correction-card artifact panel",
    ],
    riskNotes: [
      "keep assistant-ui as primary UI framework; borrow runtime observability ideas only",
    ],
  },
];

export function getCapabilitiesByPriority(priority: IntegrationPriority) {
  return openSourceCapabilities.filter((capability) => capability.priority === priority);
}

export function getCapabilitiesByArea(area: OpenSourceCapabilityArea) {
  return openSourceCapabilities.filter((capability) => capability.area === area);
}

export function buildCapabilityAuditMarkdown() {
  const rows = openSourceCapabilities.map((capability) =>
    [
      capability.project,
      capability.area,
      capability.priority,
      capability.license,
      capability.borrowedStrengths.join("; "),
      capability.adaptedAs.join("; "),
      capability.url,
    ].join(" | ")
  );

  return [
    "| Project | Area | Priority | License | Strengths | Adapted as | URL |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
  ].join("\n");
}
