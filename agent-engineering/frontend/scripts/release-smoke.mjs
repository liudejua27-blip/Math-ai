import { spawn, spawnSync } from "node:child_process";

const baseUrl = process.env.MATH_SEARAG_BASE_URL ?? "http://localhost:3210";
const isExternal = /^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(baseUrl);

let server;

async function main() {
  if (!isExternal) {
    server = await startDevServer();
  }

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });

  try {
    await assertHealth(baseUrl);
    if (isExternal || process.env.MATH_RELEASE_READINESS_STRICT === "true") {
      await assertReadiness(baseUrl);
    } else {
      console.log("[release-smoke] skipped readiness smoke for local dev server");
    }
    await assertPage(browser, `${baseUrl}/workbench-preview`, {
      name: "workbench-preview-desktop",
      viewport: { width: 1440, height: 900 },
      requiredText: [
        "AI 数学思维导师",
        "Math-SEARAG",
        "新建诊断",
        "今天想诊断哪一道高中数学题？",
      ],
      maxHorizontalOverflow: 0,
    });
    await assertPage(browser, `${baseUrl}/workbench-preview`, {
      name: "workbench-preview-mobile",
      viewport: { width: 390, height: 844 },
      requiredText: ["AI 数学思维导师", "今天想诊断哪一道高中数学题？"],
      maxHorizontalOverflow: 0,
    });
    if (process.env.POSTGRES_URL) {
      await assertPage(browser, `${baseUrl}/`, {
        name: "formal-chat-empty-profile",
        viewport: { width: 1440, height: 900 },
        requiredText: ["AI 数学思维导师", "Math-SEARAG"],
        maxHorizontalOverflow: 0,
      });
    } else {
      console.log("[release-smoke] skipped formal chat smoke without POSTGRES_URL");
    }
    await assertPage(browser, `${baseUrl}/geometry-lab`, {
      name: "geometry-lab-desktop",
      viewport: { width: 1440, height: 900 },
      requiredText: [
        "Geometry Lab",
        "Spec OK",
        "正方体线面角",
        "新手引导",
        "我订正完了",
      ],
      maxHorizontalOverflow: 0,
    });
    await assertPage(browser, `${baseUrl}/reports`, {
      name: "human-readable-reports",
      viewport: { width: 1280, height: 900 },
      requiredText: [
        "家长/教师端学习报告",
        "家长端",
        "教师端",
        "下一步建议",
      ],
      maxHorizontalOverflow: 0,
    });
  } finally {
    await browser.close();
    if (server) {
      stopServer(server);
    }
  }
}

async function assertHealth(url) {
  const response = await fetch(`${url}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  const body = await response.json();
  if (body.ok !== true || body.service !== "math-searag-learning-agent") {
    throw new Error(`Unexpected health payload: ${JSON.stringify(body)}`);
  }
  console.log(`[release-smoke] health ok at ${url}/api/health`);
}

async function assertReadiness(url) {
  const response = await fetch(`${url}/api/readiness`, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) {
    throw new Error(`Readiness check failed: ${JSON.stringify(body)}`);
  }
  console.log(`[release-smoke] readiness ok at ${url}/api/readiness`);
}

async function assertPage(browser, url, options) {
  const page = await browser.newPage({ viewport: options.viewport });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(750);
    if (options.requiredText.length > 0) {
      await page.getByText(options.requiredText[0]).first().waitFor({
        state: "visible",
        timeout: 15_000,
      });
    }
    const text = await page.locator("body").innerText();
    for (const required of options.requiredText) {
      if (!text.includes(required)) {
        throw new Error(`${options.name} missing text: ${required}`);
      }
    }
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    const horizontalOverflow = overflow.scrollWidth - overflow.clientWidth;
    if (horizontalOverflow > options.maxHorizontalOverflow) {
      throw new Error(
        `${options.name} horizontal overflow ${horizontalOverflow}px`
      );
    }
    if (consoleErrors.length > 0) {
      throw new Error(
        `${options.name} console errors: ${consoleErrors.join(" | ")}`
      );
    }
    console.log(`[release-smoke] ${options.name} ok`);
  } finally {
    await page.close();
  }
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      AUTH_SECRET:
        process.env.AUTH_SECRET ?? "math-searag-release-smoke-local-secret",
      MATH_PYTHON_VERIFIER_ENABLED:
        process.env.MATH_PYTHON_VERIFIER_ENABLED ?? "false",
    };

    const port = new URL(baseUrl).port || "3210";
    const command =
      process.platform === "win32"
        ? ["cmd.exe", ["/c", `corepack pnpm exec next dev --turbo -p ${port}`]]
        : ["corepack", ["pnpm", "exec", "next", "dev", "--turbo", "-p", port]];

    const child = spawn(command[0], command[1], {
      cwd: process.cwd(),
      env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Timed out waiting for Next dev server"));
    }, 45_000);

    const onData = (chunk) => {
      const output = chunk.toString();
      process.stdout.write(output);
      if (output.includes("Ready")) {
        clearTimeout(timeout);
        child.stdout.off("data", onData);
        resolve(child);
      }
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", (chunk) => process.stderr.write(chunk.toString()));
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== null && code !== 0) {
        reject(new Error(`Next dev server exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  if (server) {
    stopServer(server);
  }
  console.error(`[release-smoke] ${error.stack ?? error.message}`);
  process.exit(1);
});

function stopServer(child) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}
