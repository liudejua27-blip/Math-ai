const defaultAlignmentData = [
  {
    id: "S1",
    status: "matched",
    student: "令 f'(x)=lnx+1-a=0，得到 x=e^(a-1)。",
    correct: "先由 C1 确认定义域 x>0，再由 F1 求导并求临界点。",
    evidence: ["C1", "F1", "P1"],
    note: "求导正确，缺少定义域前置说明。"
  },
  {
    id: "S2",
    status: "error",
    student: "所以函数一定有极小值，直接代入求最小值。",
    correct: "需要讨论临界点是否在定义域内，并比较边界趋势与参数 a。",
    evidence: ["C1", "C2", "A07", "A14", "V2"],
    note: "首个错误步骤：跳过端点比较和参数分类。"
  },
  {
    id: "S3",
    status: "warning",
    student: "最小值为 e^(a-1)(a-1)-a e^(a-1)。",
    correct: "代入表达式可化为 -e^(a-1)，但结论依赖前一步分类是否成立。",
    evidence: ["F2", "P3", "V3"],
    note: "代数化简可验证，结论条件不完整。"
  }
];

const defaultEvidenceNodes = [
  { id: "C1", type: "条件", text: "函数定义域为 (0,+∞)，所有临界点和端点讨论都必须受此约束。", confidence: 0.92 },
  { id: "F1", type: "公式", text: "f'(x)=lnx+1-a，临界点为 x=e^(a-1)。", confidence: 0.94 },
  { id: "A07", type: "错因原子", text: "定义域意识弱：先求解后补条件，导致结论边界不稳。", confidence: 0.9 },
  { id: "A14", type: "错因原子", text: "端点比较遗漏：没有检查 x→0+ 与 x→+∞ 的趋势。", confidence: 0.93 },
  { id: "V2", type: "验证", text: "SymPy 标记求导通过，条件使用检查未通过。", confidence: 0.88 }
];

const defaultAtomData = [
  { label: "定义域意识", value: 78, level: "高风险" },
  { label: "端点比较", value: 72, level: "高风险" },
  { label: "参数分类", value: 64, level: "中高" },
  { label: "代数变形", value: 28, level: "低风险" },
  { label: "公式记忆", value: 22, level: "低风险" },
  { label: "数形结合", value: 46, level: "中风险" }
];

const defaultVariants = [
  { title: "基础同原子题", tag: "定义域", text: "已知 f(x)=lnx-bx，讨论函数单调性并判断极值是否存在。" },
  { title: "中等综合题", tag: "端点比较", text: "已知 f(x)=xlnx-ax+1，求 f(x) 在 (0,+∞) 上的最小值。" },
  { title: "压轴风格题", tag: "参数分类", text: "设 f(x)=xlnx-ax，若 f(x)≥m 对任意 x>0 成立，求 m 的最大值。" }
];

const defaultMasteryData = [
  { label: "导数求导", value: 88, color: "#2f8b57" },
  { label: "定义域检查", value: 54, color: "#d95b43" },
  { label: "端点比较", value: 49, color: "#b77912" },
  { label: "参数分类", value: 58, color: "#246db4" },
  { label: "表达式化简", value: 81, color: "#0f8c7d" }
];

const defaultPipelineData = [
  { key: "upload", label: "输入接收", status: "done", cost_ms: 18 },
  { key: "parse", label: "公式解析", status: "done", cost_ms: 94 },
  { key: "confirm", label: "用户确认", status: "warning", cost_ms: 0 },
  { key: "schema", label: "MPES 构建", status: "pending", cost_ms: 0 },
  { key: "verify", label: "符号验证", status: "pending", cost_ms: 0 },
  { key: "diagnosis", label: "错因诊断", status: "pending", cost_ms: 0 },
  { key: "variants", label: "变式生成", status: "pending", cost_ms: 0 }
];

const defaultStrictChecks = [
  { id: "Q1", label: "定义域/约束", status: "fail", reason: "题干存在定义域/区间约束，但学生步骤没有先写入推理链。" },
  { id: "Q2", label: "求导公式", status: "pass", reason: "学生求导式与题目函数结构一致。" },
  { id: "Q3", label: "端点/边界趋势", status: "fail", reason: "开区间或无界区间最值题必须检查边界趋势。" }
];

const defaultQualityGate = {
  strict_pass: false,
  need_human_review: true,
  confidence: 0.74,
  message: "严格门禁未通过，需先补齐失败项或进入人工复核。"
};

const defaultStudentCoach = {
  mode: "student_only",
  headline: "先修正第一处断点，再做变式训练。",
  topic: "导数与函数综合",
  first_action: "先补：定义域/约束",
  why_it_matters: "首个错误步骤：跳过端点比较和参数分类。",
  paper_recognition: {
    status: "recognized",
    confidence: 0.91,
    problem_text: "已知函数 f(x)=xlnx-ax 在区间 (0,+∞) 上有极值，求参数 a 的取值范围，并讨论最小值。",
    question_type: "导数与函数综合",
    known_conditions: ["函数关系", "定义域或区间限制", "含参数，需要分类或范围讨论"],
    target: "求极值/最值并说明成立条件",
    low_confidence_fields: ["区间/定义域", "参数范围"]
  },
  thought_recognition: {
    detected_route: "导数法 → 代数化简",
    step_count: 3,
    recognized_steps: defaultAlignmentData.map((item) => ({ id: item.id, student: item.student, status: item.status, note: item.note }))
  },
  thought_judgement: {
    verdict: "思路可继续，但必须先补关键条件。",
    score: 74,
    first_wrong_step: "S2",
    first_wrong_reason: "开区间或无界区间最值题必须检查边界趋势。",
    failed_requirements: ["定义域/约束", "端点/边界趋势", "参数分类"],
    verification: "严格校验未完全通过，缺少端点和参数讨论。"
  },
  better_approach: [
    "本次订正重点：定义域/约束、端点/边界趋势、参数分类。",
    "1. 定义域：x>0。",
    "2. 求导：f'(x)=lnx+1-a。",
    "3. 临界点：令 f'(x)=0，得 x=e^(a-1)。",
    "4. 单调性：分别说明 f'(x) 的正负变化。",
    "5. 边界：比较 x→0+ 与 x→+∞ 的函数趋势。",
    "6. 结论：按参数范围写出极值/最小值是否成立。"
  ],
  solution_image_steps: [
    { title: "题目", detail: "已知函数 f(x)=xlnx-ax 在区间 (0,+∞) 上有极值，求参数 a 的取值范围，并讨论最小值。" },
    { title: "Step 1", detail: "定义域：x>0。" },
    { title: "Step 2", detail: "求导：f'(x)=lnx+1-a。" },
    { title: "Step 3", detail: "令 f'(x)=0，得 x=e^(a-1)，再讨论单调性、端点和参数范围。" }
  ],
  knowledge_points: [
    { name: "导数公式", level: "必会", why: "求 f'(x) 是后续单调性与极值判断的入口。" },
    { name: "定义域约束", level: "高频丢分", why: "临界点和最值结论必须落在定义域内。" },
    { name: "端点趋势", level: "压轴常考", why: "开区间或无界区间必须比较边界趋势。" },
    { name: "参数分类", level: "综合", why: "含参结论要写清适用范围。" }
  ],
  error_causes: [
    { label: "定义域意识弱", level: "高风险", description: "先求解后补条件，导致结论边界不稳。" },
    { label: "端点比较遗漏", level: "高风险", description: "没有检查 x→0+ 与 x→+∞ 的趋势。" },
    { label: "参数分析弱", level: "中高", description: "把含参条件当成固定数处理。" }
  ],
  hint_ladder: [
    "先不要代入临界点，先写定义域：x>0。",
    "求出 f'(x) 后，用 f'(x)>0 和 f'(x)<0 判断单调区间。",
    "开区间最值题必须看 x→0+ 与 x→+∞ 的趋势。",
    "含参数 a 时，把参数范围和最值结论绑定写出。"
  ],
  correction_template: [],
  daily_plan: [
    "用 3 分钟重写“定义域意识弱”相关步骤。",
    "照订正模板补齐失败门禁。",
    "只做 1 道基础同原子题，做对后再进入下一题。"
  ],
  self_check_questions: [
    "我有没有先写出题目的限制条件？",
    "我这一步用了哪个公式或证据？",
    "如果参数或边界改变，结论还成立吗？",
    "我的最终答案有没有写清楚适用范围？"
  ]
};

const defaultReport = {
  title: "学生单题诊断报告",
  job_id: "local_demo",
  first_error: "首个错误步骤：跳过端点比较和参数分类。",
  atom_summary: ["定义域意识：高风险", "端点比较：高风险", "参数分类：中高"],
  missing_requirements: ["定义域/约束", "端点/边界趋势", "参数分类"],
  verification_summary: "本地演示验证：求导模式通过，条件使用检查未通过。",
  next_action: "先补写定义域与端点趋势，再完成 3 道同原子变式题。",
  student_coach: defaultStudentCoach,
  quality_gate: {
    evidence_coverage: 1,
    unsupported_step_rate: 0.18,
    verification: "4/5"
  }
};

const API_BASE_URL = "http://127.0.0.1:8008";
let alignmentData = cloneData(defaultAlignmentData);
let evidenceNodes = cloneData(defaultEvidenceNodes);
let atomData = cloneData(defaultAtomData);
let variants = cloneData(defaultVariants);
let masteryData = cloneData(defaultMasteryData);
let pipelineData = cloneData(defaultPipelineData);
let strictChecks = cloneData(defaultStrictChecks);
let qualityGate = cloneData(defaultQualityGate);
let latestReport = cloneData(defaultReport);
let studentCoach = cloneData(defaultStudentCoach);

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  const htmlMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  };
  return String(value ?? "").replace(/[&<>"']/g, (character) => htmlMap[character]);
}

function renderAlignment() {
  const container = qs("#alignmentList");
  container.innerHTML = alignmentData.map((item) => {
    const classNames = ["alignment-item"];
    if (item.status === "error") classNames.push("is-error");
    if (item.status === "warning") classNames.push("is-warning");
    const stateText = item.status === "error" ? "需修正" : item.status === "warning" ? "待补条件" : "已匹配";
    const evidenceTags = (item.evidence || []).map((tag) => `<button type="button" data-evidence-ref="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("");
    return `
      <article class="${classNames.join(" ")}">
        <div class="step-tag">
          <strong>${escapeHtml(item.id)}</strong>
          <span>${stateText}</span>
        </div>
        <div class="step-content">
          <p>${escapeHtml(item.student)}</p>
          <div class="correct-path">${escapeHtml(item.correct)}</div>
          <div class="evidence-tags">${evidenceTags}</div>
          <div class="correct-path">${escapeHtml(item.note)}</div>
        </div>
      </article>
    `;
  }).join("");
}

function renderEvidence() {
  const container = qs("#evidenceStack");
  container.innerHTML = evidenceNodes.map((node) => {
    const confidence = typeof node.confidence === "number" ? ` · ${Math.round(node.confidence * 100)}%` : "";
    return `
      <article class="evidence-node" data-evidence-id="${escapeHtml(node.id)}">
        <strong>${escapeHtml(node.id)} · ${escapeHtml(node.type)}${confidence}</strong>
        <p>${escapeHtml(node.text)}</p>
      </article>
    `;
  }).join("");
}

function renderAtoms() {
  qs("#atomList").innerHTML = atomData.map((atom) => `
    <article class="atom-item">
      <strong>${escapeHtml(atom.label)}</strong>
      <span>${escapeHtml(atom.level)} · ${escapeHtml(atom.value)}</span>
    </article>
  `).join("");
}

function renderVariants() {
  const container = qs("#variantList");
  container.innerHTML = variants.map((variant, variantIndex) => `
    <article class="variant-item" data-index="${variantIndex}">
      <header>
        <strong>${escapeHtml(variant.title)}</strong>
        <span class="mini-status">${escapeHtml(variant.tag)}</span>
      </header>
      <p>${escapeHtml(variant.text)}</p>
      <button type="button" data-complete="${variantIndex}">标记完成</button>
    </article>
  `).join("");
  syncVariantStatus();
}

function renderMastery() {
  qs("#masteryList").innerHTML = masteryData.map((item) => `
    <article class="mastery-item">
      <header>
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.value)}%</span>
      </header>
      <div class="mastery-track"><span style="width:${Number(item.value)}%; background:${escapeHtml(item.color)}"></span></div>
    </article>
  `).join("");
}

function renderPipeline() {
  const container = qs("#computeStrip");
  if (!container) return;
  container.innerHTML = pipelineData.map((stage) => {
    const statusText = stage.status === "done" ? "完成" : stage.status === "running" ? "计算中" : stage.status === "warning" ? "待确认" : "等待";
    const costText = stage.cost_ms ? `${stage.cost_ms}ms` : statusText;
    return `
      <article class="compute-stage ${escapeHtml(stage.status)}">
        <strong>${escapeHtml(stage.label)}</strong>
        <span>${escapeHtml(costText)}</span>
      </article>
    `;
  }).join("");
}

function renderStrictGate() {
  const gateTitle = qs("#strictGateTitle");
  const gateList = qs("#strictGateList");
  if (!gateTitle || !gateList) return;
  gateTitle.textContent = qualityGate.strict_pass ? `通过 · ${Math.round(Number(qualityGate.confidence || 0) * 100)}%` : `未通过 · ${Math.round(Number(qualityGate.confidence || 0) * 100)}%`;
  gateList.innerHTML = strictChecks.slice(0, 7).map((check) => {
    const statusText = check.status === "pass" ? "通过" : check.status === "warn" || check.status === "warning" ? "提醒" : "失败";
    return `
      <article class="gate-item ${escapeHtml(check.status)}">
        <strong>${escapeHtml(check.id || "Q")} · ${escapeHtml(check.label)} · ${statusText}</strong>
        <span>${escapeHtml(check.reason)}</span>
      </article>
    `;
  }).join("");
}

function updateDiagnosisSummary(result = {}) {
  const firstError = (alignmentData || []).find((item) => item.status === "error") || (alignmentData || []).find((item) => item.status === "warning");
  const topicLabel = result.topic?.label || "导数与函数综合";
  const reviewText = qualityGate.need_human_review ? "需要复核" : "可继续训练";
  qs("#firstErrorTitle").textContent = firstError ? `${firstError.id}：${firstError.note}` : "未发现明确错误步骤";
  qs("#firstErrorDetail").textContent = `${topicLabel} · ${qualityGate.message || "严格门禁等待结果"} · ${reviewText}`;
}

function renderListItems(items) {
  return (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>等待诊断后生成</li>";
}

function renderStudentChain() {
  const paperCard = qs("#paperRecognition");
  if (!paperCard) return;
  const paper = studentCoach.paper_recognition || {};
  const thought = studentCoach.thought_recognition || {};
  const judgement = studentCoach.thought_judgement || {};
  const knowledge = studentCoach.knowledge_points || [];
  const causes = studentCoach.error_causes || [];
  const betterApproach = studentCoach.better_approach || studentCoach.correction_template || [];
  const dailyPlan = studentCoach.daily_plan || [];

  paperCard.innerHTML = `
    <div class="student-card-head"><span>01</span><strong>试卷识别</strong></div>
    <p>${escapeHtml(paper.problem_text || "等待上传或输入题目")}</p>
    <div class="student-kv"><span>题型</span><strong>${escapeHtml(paper.question_type || studentCoach.topic || "待识别")}</strong></div>
    <div class="student-kv"><span>目标</span><strong>${escapeHtml(paper.target || "待识别")}</strong></div>
    <div class="student-kv"><span>识别置信</span><strong>${Math.round(Number(paper.confidence || 0) * 100)}%</strong></div>
    <ul>${renderListItems(paper.known_conditions)}</ul>
  `;

  qs("#thoughtRecognition").innerHTML = `
    <div class="student-card-head"><span>02</span><strong>解题思路识别</strong></div>
    <p>${escapeHtml(thought.detected_route || "未形成稳定解题路线")}</p>
    <div class="student-kv"><span>步骤数</span><strong>${escapeHtml(thought.step_count || 0)}</strong></div>
    <div class="mini-step-list">
      ${(thought.recognized_steps || []).map((step) => `
        <article><strong>${escapeHtml(step.id)} · ${escapeHtml(step.status)}</strong><span>${escapeHtml(step.note)}</span></article>
      `).join("")}
    </div>
  `;

  qs("#thoughtJudgement").innerHTML = `
    <div class="student-card-head"><span>03</span><strong>判断思路与错误步骤</strong></div>
    <p>${escapeHtml(judgement.verdict || "等待严格诊断")}</p>
    <div class="student-kv"><span>思路分</span><strong>${escapeHtml(judgement.score || 0)} / 100</strong></div>
    <div class="student-kv"><span>第一处错误</span><strong>${escapeHtml(judgement.first_wrong_step || "待定位")}</strong></div>
    <p>${escapeHtml(judgement.first_wrong_reason || "暂无")}</p>
    <ul>${renderListItems(judgement.failed_requirements)}</ul>
  `;

  qs("#betterApproach").innerHTML = `
    <div class="student-card-head"><span>04</span><strong>更好的解题思路</strong></div>
    <ol>${betterApproach.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
  `;

  qs("#knowledgeList").innerHTML = knowledge.map((item) => `
    <article class="knowledge-item">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.level)}</span>
      <p>${escapeHtml(item.why)}</p>
    </article>
  `).join("");

  qs("#errorCauseList").innerHTML = causes.map((item) => `
    <article class="knowledge-item is-error">
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.level)}</span>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `).join("");

  qs("#dailyPlanList").innerHTML = renderListItems(dailyPlan);
  qs("#hintLadderList").innerHTML = renderListItems(studentCoach.hint_ladder);
  renderSolutionCanvas();
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  let line = "";
  let currentY = y;
  for (const character of String(text)) {
    const nextLine = line + character;
    if (context.measureText(nextLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = character;
      currentY += lineHeight;
    } else {
      line = nextLine;
    }
  }
  if (line) {
    context.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function renderSolutionCanvas() {
  const canvas = qs("#solutionCanvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const steps = studentCoach.solution_image_steps || [];
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0f8c7d";
  context.fillRect(0, 0, width, 88);
  context.fillStyle = "#ffffff";
  context.font = "700 34px Microsoft YaHei, Arial";
  context.fillText("高中数学错题订正卡", 44, 56);
  context.fillStyle = "#2c3a35";
  context.font = "700 24px Microsoft YaHei, Arial";
  context.fillText(studentCoach.first_action || "先补关键步骤", 44, 132);
  let y = 178;
  steps.forEach((step, index) => {
    if (y > height - 120) return;
    context.fillStyle = index === 0 ? "#246db4" : "#0f8c7d";
    context.font = "700 22px Microsoft YaHei, Arial";
    context.fillText(step.title || `Step ${index}`, 44, y);
    context.fillStyle = "#45534d";
    context.font = "20px Microsoft YaHei, Arial";
    y = wrapCanvasText(context, step.detail || "", 44, y + 34, width - 88, 32) + 18;
  });
  context.fillStyle = "#7a8a83";
  context.font = "18px Microsoft YaHei, Arial";
  context.fillText("先把第一处断点订正清楚，再进入变式训练。", 44, height - 48);
}

function downloadSolutionImage() {
  renderSolutionCanvas();
  const canvas = qs("#solutionCanvas");
  const link = document.createElement("a");
  link.download = "高中数学错题订正卡.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawRadar() {
  const canvas = qs("#radarCanvas");
  const drawingContext = canvas.getContext("2d");
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  drawingContext.clearRect(0, 0, canvasWidth, canvasHeight);

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2 + 8;
  const radius = Math.min(canvasWidth, canvasHeight) * 0.34;
  const labels = atomData.map((item) => item.label);
  const values = atomData.map((item) => Number(item.value) / 100);
  const pointCount = labels.length;

  drawingContext.lineWidth = 1;
  drawingContext.font = "14px Microsoft YaHei, Arial";
  drawingContext.textAlign = "center";
  drawingContext.textBaseline = "middle";

  for (let ringIndex = 1; ringIndex <= 4; ringIndex += 1) {
    const ringRadius = radius * (ringIndex / 4);
    drawingContext.beginPath();
    for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * pointIndex) / pointCount;
      const pointX = centerX + Math.cos(angle) * ringRadius;
      const pointY = centerY + Math.sin(angle) * ringRadius;
      if (pointIndex === 0) drawingContext.moveTo(pointX, pointY);
      else drawingContext.lineTo(pointX, pointY);
    }
    drawingContext.closePath();
    drawingContext.strokeStyle = ringIndex === 4 ? "#c6d2cc" : "#e3ebe7";
    drawingContext.stroke();
  }

  for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * pointIndex) / pointCount;
    const pointX = centerX + Math.cos(angle) * radius;
    const pointY = centerY + Math.sin(angle) * radius;
    drawingContext.beginPath();
    drawingContext.moveTo(centerX, centerY);
    drawingContext.lineTo(pointX, pointY);
    drawingContext.strokeStyle = "#e3ebe7";
    drawingContext.stroke();

    const labelX = centerX + Math.cos(angle) * (radius + 46);
    const labelY = centerY + Math.sin(angle) * (radius + 26);
    drawingContext.fillStyle = "#45534d";
    drawingContext.fillText(labels[pointIndex], labelX, labelY);
  }

  drawingContext.beginPath();
  values.forEach((value, pointIndex) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * pointIndex) / pointCount;
    const pointX = centerX + Math.cos(angle) * radius * value;
    const pointY = centerY + Math.sin(angle) * radius * value;
    if (pointIndex === 0) drawingContext.moveTo(pointX, pointY);
    else drawingContext.lineTo(pointX, pointY);
  });
  drawingContext.closePath();
  drawingContext.fillStyle = "rgba(15, 140, 125, 0.22)";
  drawingContext.strokeStyle = "#0f8c7d";
  drawingContext.lineWidth = 3;
  drawingContext.fill();
  drawingContext.stroke();

  values.forEach((value, pointIndex) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * pointIndex) / pointCount;
    const pointX = centerX + Math.cos(angle) * radius * value;
    const pointY = centerY + Math.sin(angle) * radius * value;
    drawingContext.beginPath();
    drawingContext.arc(pointX, pointY, 5, 0, Math.PI * 2);
    drawingContext.fillStyle = pointIndex < 2 ? "#d95b43" : "#0f8c7d";
    drawingContext.fill();
  });
}

function drawTrend() {
  const canvas = qs("#trendCanvas");
  const drawingContext = canvas.getContext("2d");
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const trendData = [11, 10, 9, 8, 7, 5, 4];
  const padding = 38;
  const maxValue = 12;

  drawingContext.clearRect(0, 0, canvasWidth, canvasHeight);
  drawingContext.strokeStyle = "#dfe7e3";
  drawingContext.lineWidth = 1;
  for (let lineIndex = 0; lineIndex <= 4; lineIndex += 1) {
    const lineY = padding + ((canvasHeight - padding * 2) * lineIndex) / 4;
    drawingContext.beginPath();
    drawingContext.moveTo(padding, lineY);
    drawingContext.lineTo(canvasWidth - padding, lineY);
    drawingContext.stroke();
  }

  const points = trendData.map((value, dataIndex) => ({
    x: padding + ((canvasWidth - padding * 2) * dataIndex) / (trendData.length - 1),
    y: canvasHeight - padding - ((canvasHeight - padding * 2) * value) / maxValue
  }));

  drawingContext.beginPath();
  points.forEach((point, pointIndex) => {
    if (pointIndex === 0) drawingContext.moveTo(point.x, point.y);
    else drawingContext.lineTo(point.x, point.y);
  });
  drawingContext.strokeStyle = "#d95b43";
  drawingContext.lineWidth = 3;
  drawingContext.stroke();

  points.forEach((point, pointIndex) => {
    drawingContext.beginPath();
    drawingContext.arc(point.x, point.y, 5, 0, Math.PI * 2);
    drawingContext.fillStyle = pointIndex >= 5 ? "#2f8b57" : "#d95b43";
    drawingContext.fill();
  });

  drawingContext.fillStyle = "#62706a";
  drawingContext.font = "13px Microsoft YaHei, Arial";
  drawingContext.textAlign = "center";
  ["一", "二", "三", "四", "五", "六", "日"].forEach((label, labelIndex) => {
    drawingContext.fillText(label, points[labelIndex].x, canvasHeight - 16);
  });
}

function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function setBackendStatus(isOnline, text) {
  const status = qs("#backendStatus");
  status.classList.toggle("backend-online", isOnline);
  status.classList.toggle("backend-offline", !isOnline);
  status.innerHTML = `<span></span>${escapeHtml(text)}`;
}

function updateConfirmStatus() {
  const chips = qsa(".confirm-chip");
  const confirmed = chips.filter((chip) => chip.dataset.confirmed === "true").length;
  qs("#confirmStatus").textContent = confirmed === chips.length ? "已确认" : `${confirmed}/${chips.length} 已确认`;
}

function syncVariantStatus() {
  const doneCount = qsa(".variant-item.done").length;
  const totalCount = qsa(".variant-item").length || variants.length;
  const status = qs("#variantStatus");
  if (status) status.textContent = `${doneCount}/${totalCount} 完成`;
}

function collectConfirmedEvidence() {
  return qsa(".confirm-chip")
    .filter((chip) => chip.dataset.confirmed === "true")
    .map((chip) => chip.textContent.trim().split(/\s+/)[0]);
}

function collectAnalyzePayload() {
  const problemText = qs("#problemSheet p")?.textContent?.trim() || "";
  const formulaText = qsa(".formula-row:not(.muted)").map((row) => row.textContent.trim()).join("\n");
  return {
    problem_text: [problemText, formulaText].filter(Boolean).join("\n"),
    student_steps: qs("#studentSteps").value,
    confirmed_evidence: collectConfirmedEvidence(),
    client: "static-prototype"
  };
}

async function requestBackendAnalysis() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectAnalyzePayload()),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function checkBackendHealth() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 900);
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal });
    if (!response.ok) throw new Error("health check failed");
    setBackendStatus(true, "后端已连接");
  } catch {
    setBackendStatus(false, "后端待连接");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function setPipelineRunning() {
  pipelineData = cloneData(defaultPipelineData).map((stage) => {
    if (["schema", "verify", "diagnosis"].includes(stage.key)) {
      return { ...stage, status: "running" };
    }
    return stage;
  });
  renderPipeline();
}

function applyAnalysisResult(result) {
  alignmentData = cloneData(result.alignment || defaultAlignmentData);
  evidenceNodes = cloneData(result.evidence_nodes || defaultEvidenceNodes);
  atomData = cloneData(result.atoms || defaultAtomData);
  variants = cloneData(result.variants || defaultVariants);
  masteryData = cloneData(result.profile_update || defaultMasteryData);
  pipelineData = cloneData(result.pipeline || defaultPipelineData);
  strictChecks = cloneData(result.strict_checks || defaultStrictChecks);
  qualityGate = cloneData(result.quality_gate || defaultQualityGate);
  latestReport = cloneData(result.report || defaultReport);
  studentCoach = cloneData(result.student_coach || result.report?.student_coach || defaultStudentCoach);

  const metrics = result.metrics || {};
  const confidence = Number(result.confidence || 0.78);
  qs("#confidenceValue").textContent = confidence.toFixed(2);
  qs("#confidenceBar").style.width = `${Math.round(confidence * 100)}%`;
  qs("#localizationMetric").textContent = `${Math.round(Number(metrics.localization_accuracy || 0.82) * 100)}%`;
  qs("#evidenceMetric").textContent = `${Math.round(Number(metrics.evidence_coverage || 1) * 100)}%`;
  qs("#verifyMetric").textContent = `${metrics.verification_passed || 4}/${metrics.verification_total || 5}`;

  renderAlignment();
  renderEvidence();
  renderAtoms();
  renderVariants();
  renderMastery();
  renderPipeline();
  renderStrictGate();
  renderStudentChain();
  updateDiagnosisSummary(result);
  drawRadar();
  drawTrend();
}

function applyLocalAnalysisFallback() {
  alignmentData = cloneData(defaultAlignmentData);
  evidenceNodes = cloneData(defaultEvidenceNodes);
  atomData = cloneData(defaultAtomData);
  variants = cloneData(defaultVariants);
  masteryData = cloneData(defaultMasteryData);
  pipelineData = cloneData(defaultPipelineData).map((stage) => ({ ...stage, status: stage.status === "pending" ? "done" : stage.status }));
  strictChecks = cloneData(defaultStrictChecks);
  qualityGate = cloneData(defaultQualityGate);
  latestReport = cloneData(defaultReport);
  studentCoach = cloneData(defaultStudentCoach);
  qsa(".confirm-chip").forEach((chip) => {
    chip.dataset.confirmed = "true";
  });
  updateConfirmStatus();
  qs("#confidenceValue").textContent = "0.86";
  qs("#confidenceBar").style.width = "86%";
  qs("#localizationMetric").textContent = "86%";
  qs("#evidenceMetric").textContent = "100%";
  qs("#verifyMetric").textContent = "4/5";
  renderAlignment();
  renderEvidence();
  renderAtoms();
  renderVariants();
  renderMastery();
  renderPipeline();
  renderStrictGate();
  renderStudentChain();
  updateDiagnosisSummary();
  drawRadar();
}

function highlightEvidence(evidenceId) {
  qsa(".evidence-node").forEach((node) => {
    node.classList.toggle("is-highlighted", node.dataset.evidenceId === evidenceId);
  });
  const matchedNode = qsa(".evidence-node").find((node) => node.dataset.evidenceId === evidenceId);
  if (matchedNode) matchedNode.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderReport(report) {
  qs("#reportTitle").textContent = report.title || "单题诊断报告";
  const qualityGate = report.quality_gate || {};
  const coach = report.student_coach || studentCoach || {};
  const atomItems = (report.atom_summary || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const missingItems = (report.missing_requirements || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const coachHints = renderListItems(coach.hint_ladder || []);
  const coachPlan = renderListItems(coach.daily_plan || []);
  const qualityRows = Object.entries(qualityGate).map(([label, value]) => `
    <div class="audit-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");
  qs("#reportBody").innerHTML = `
    <section class="report-block">
      <strong>报告编号</strong>
      <span>${escapeHtml(report.job_id || "local_demo")}</span>
    </section>
    <section class="report-block">
      <strong>首个错误步骤</strong>
      <span>${escapeHtml(report.first_error || "暂无明确错误步骤")}</span>
    </section>
    <section class="report-block">
      <strong>错因原子</strong>
      <ul>${atomItems}</ul>
    </section>
    <section class="report-block">
      <strong>严格门禁失败项</strong>
      <ul>${missingItems || "<li>暂无</li>"}</ul>
    </section>
    <section class="report-block">
      <strong>符号验证</strong>
      <span>${escapeHtml(report.verification_summary || "暂无验证摘要")}</span>
    </section>
    <section class="report-block">
      <strong>下一步训练</strong>
      <span>${escapeHtml(report.next_action || "完成同原子变式训练")}</span>
    </section>
    <section class="report-block">
      <strong>学生提示阶梯</strong>
      <ul>${coachHints}</ul>
    </section>
    <section class="report-block">
      <strong>今日订正计划</strong>
      <ul>${coachPlan}</ul>
    </section>
    <section class="report-block">
      <strong>质量门禁</strong>
      ${qualityRows}
    </section>
  `;
}

function openReportDrawer() {
  renderReport(latestReport);
  qs("#reportBackdrop").hidden = false;
  qs("#reportDrawer").classList.add("open");
  qs("#reportDrawer").setAttribute("aria-hidden", "false");
}

function closeReportDrawer() {
  qs("#reportDrawer").classList.remove("open");
  qs("#reportDrawer").setAttribute("aria-hidden", "true");
  qs("#reportBackdrop").hidden = true;
}

function bindInteractions() {
  qsa(".confirm-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.dataset.confirmed = chip.dataset.confirmed === "true" ? "false" : "true";
      updateConfirmStatus();
    });
  });

  qs("#analyzeBtn").addEventListener("click", async () => {
    const analyzeButton = qs("#analyzeBtn");
    analyzeButton.disabled = true;
    analyzeButton.textContent = "计算中";
    setPipelineRunning();
    try {
      const result = await requestBackendAnalysis();
      applyAnalysisResult(result);
      setBackendStatus(true, "后端已连接");
      showToast(`后端诊断完成：${result.job_id}`);
    } catch {
      applyLocalAnalysisFallback();
      setBackendStatus(false, "后端未启动，已用本地演示");
      showToast("未连接本地后端，已使用前端演示结果。启动 backend/server.py 可启用真实 API。");
    } finally {
      analyzeButton.disabled = false;
      analyzeButton.textContent = "开始诊断";
    }
  });

  qs("#resetBtn").addEventListener("click", () => {
    alignmentData = cloneData(defaultAlignmentData);
    evidenceNodes = cloneData(defaultEvidenceNodes);
    atomData = cloneData(defaultAtomData);
    variants = cloneData(defaultVariants);
    masteryData = cloneData(defaultMasteryData);
    pipelineData = cloneData(defaultPipelineData);
    strictChecks = cloneData(defaultStrictChecks);
    qualityGate = cloneData(defaultQualityGate);
    latestReport = cloneData(defaultReport);
    studentCoach = cloneData(defaultStudentCoach);
    qsa(".confirm-chip").forEach((chip) => {
      chip.dataset.confirmed = "false";
    });
    qs("#confidenceValue").textContent = "0.78";
    qs("#confidenceBar").style.width = "78%";
    qs("#localizationMetric").textContent = "82%";
    qs("#verifyMetric").textContent = "4/5";
    qs("#fileName").textContent = "当前使用导数题演示样本";
    qs("#problemSheet").classList.remove("has-preview");
    qs("#problemSheet").style.backgroundImage = "";
    updateConfirmStatus();
    renderAlignment();
    renderEvidence();
    renderAtoms();
    renderVariants();
    renderMastery();
    renderPipeline();
    renderStrictGate();
    renderStudentChain();
    updateDiagnosisSummary();
    drawRadar();
    showToast("演示样本已恢复。");
  });

  qs("#problemFile").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    qs("#fileName").textContent = file.name;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const sheet = qs("#problemSheet");
        sheet.classList.add("has-preview");
        sheet.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.18)), url(${reader.result})`;
      };
      reader.readAsDataURL(file);
    }
    showToast("题目文件已载入，低置信度字段等待确认。");
  });

  qs("#alignmentList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-evidence-ref]");
    if (!button) return;
    highlightEvidence(button.dataset.evidenceRef);
  });

  qs("#variantList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-complete]");
    if (!button) return;
    const item = button.closest(".variant-item");
    item.classList.toggle("done");
    button.textContent = item.classList.contains("done") ? "已完成" : "标记完成";
    syncVariantStatus();
  });

  const renderImageButton = qs("#renderSolutionImage");
  if (renderImageButton) {
    renderImageButton.addEventListener("click", () => {
      renderSolutionCanvas();
      showToast("解题步骤图片已重新生成。");
    });
  }

  const downloadImageButton = qs("#downloadSolutionImage");
  if (downloadImageButton) {
    downloadImageButton.addEventListener("click", downloadSolutionImage);
  }

  qs("#refreshRadar").addEventListener("click", () => {
    atomData.forEach((atom, atomIndex) => {
      const direction = atomIndex % 2 === 0 ? -1 : 1;
      atom.value = Math.max(18, Math.min(86, Number(atom.value) + direction * 3));
    });
    renderAtoms();
    drawRadar();
    showToast("错因雷达已按最新变式结果刷新。");
  });

  qs("#exportReport").addEventListener("click", openReportDrawer);
  qs("#closeReport").addEventListener("click", closeReportDrawer);
  qs("#reportBackdrop").addEventListener("click", closeReportDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeReportDrawer();
  });

  const navLinks = qsa(".side-nav a");
  const sections = navLinks.map((link) => qs(link.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-25% 0px -65% 0px" });
  sections.forEach((section) => observer.observe(section));
}

function init() {
  renderAlignment();
  renderEvidence();
  renderAtoms();
  renderVariants();
  renderMastery();
  renderPipeline();
  renderStrictGate();
  renderStudentChain();
  updateDiagnosisSummary();
  updateConfirmStatus();
  drawRadar();
  drawTrend();
  bindInteractions();
  checkBackendHealth();
}

window.addEventListener("load", init);
window.addEventListener("resize", () => {
  drawRadar();
  drawTrend();
});
