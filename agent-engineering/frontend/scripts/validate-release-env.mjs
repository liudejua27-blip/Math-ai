const required = [
  {
    name: "AUTH_SECRET",
    reason: "protects NextAuth sessions and signed auth cookies",
  },
  {
    name: "AI_GATEWAY_API_KEY",
    reason: "enables model access through Vercel AI Gateway outside Vercel OIDC",
  },
  {
    name: "POSTGRES_URL",
    reason: "stores chats, users, artifacts, and learning records",
  },
  {
    name: "REDIS_URL",
    reason: "supports resumable streams and runtime state",
  },
];

const recommended = [
  {
    name: "BLOB_READ_WRITE_TOKEN",
    reason: "stores generated artifacts and student-uploaded assets",
  },
  {
    name: "MATH_AGENT_BACKEND_URL",
    reason: "connects the TypeScript workflow to the Python verifier and draft OCR service",
  },
  {
    name: "MATH_REQUIRE_DRAFT_OCR",
    reason: "controls whether draft paper OCR is mandatory before image diagnosis",
    expected: "false",
  },
  {
    name: "MATH_DRAFT_OCR_ENGINES",
    reason: "sets the draft OCR engine chain",
    expected: "pix2text,paddleocr,latex_ocr",
  },
  {
    name: "MATH_DIAGNOSIS_MODEL",
    reason: "pins the default fast diagnosis model",
    expected: "deepseek/deepseek-v4-flash",
  },
  {
    name: "MATH_REVIEW_MODEL",
    reason: "pins the high-confidence review model",
    expected: "deepseek/deepseek-v4-pro",
  },
  {
    name: "MATH_TEACHING_STYLE",
    reason: "keeps the tutoring policy in Socratic mode",
    expected: "socratic",
  },
  {
    name: "MATH_VISUAL_MODE",
    reason: "keeps generated explanations on the safe HTML card protocol",
    expected: "html_card",
  },
];

const strict =
  process.argv.includes("--strict") ||
  process.env.MATH_SEARAG_RELEASE_ENV_STRICT === "true";

function hasValue(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function statusFor(item) {
  const configured = hasValue(item.name);
  const expectedMatches =
    !item.expected || process.env[item.name] === item.expected;

  return {
    ...item,
    configured,
    expectedMatches,
  };
}

const requiredStatus = required.map(statusFor);
const recommendedStatus = recommended.map(statusFor);
const missingRequired = requiredStatus.filter((item) => !item.configured);
const missingRecommended = recommendedStatus.filter((item) => !item.configured);
const mismatchedRecommended = recommendedStatus.filter(
  (item) => item.configured && !item.expectedMatches
);

console.log("[release-env] Math-SEARAG release environment check");
console.log(`[release-env] strict=${strict}`);

for (const item of requiredStatus) {
  console.log(
    `[release-env] required ${item.configured ? "ok" : "missing"} ${item.name}`
  );
}

for (const item of recommendedStatus) {
  const suffix =
    item.expected && item.configured && !item.expectedMatches
      ? ` expected=${item.expected}`
      : "";
  console.log(
    `[release-env] recommended ${
      item.configured ? "ok" : "missing"
    } ${item.name}${suffix}`
  );
}

if (missingRequired.length > 0) {
  console.log(
    `[release-env] missing required: ${missingRequired
      .map((item) => item.name)
      .join(", ")}`
  );
}

if (missingRecommended.length > 0) {
  console.log(
    `[release-env] missing recommended: ${missingRecommended
      .map((item) => item.name)
      .join(", ")}`
  );
}

if (mismatchedRecommended.length > 0) {
  console.log(
    `[release-env] non-standard values: ${mismatchedRecommended
      .map((item) => `${item.name} should be ${item.expected}`)
      .join("; ")}`
  );
}

if (strict && missingRequired.length > 0) {
  console.error(
    "[release-env] strict mode failed. Configure required environment variables before production deploy."
  );
  process.exit(1);
}

console.log("[release-env] check complete");
