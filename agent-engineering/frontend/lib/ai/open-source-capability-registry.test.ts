import assert from "node:assert/strict";
import {
  buildCapabilityAuditMarkdown,
  getCapabilitiesByArea,
  getCapabilitiesByPriority,
  openSourceCapabilities,
} from "./open-source-capability-registry";

const p0 = getCapabilitiesByPriority("P0");
assert.ok(p0.some((capability) => capability.id === "pix2text"));
assert.ok(p0.some((capability) => capability.id === "openr"));
assert.ok(p0.some((capability) => capability.id === "agent-chat-ui"));

const ocr = getCapabilitiesByArea("draft_ocr");
assert.ok(ocr.length >= 3);
assert.ok(
  ocr.every((capability) =>
    capability.adaptedAs.some((item) => /OCR|ocr|formula|DraftOCR/.test(item))
  )
);

const audit = buildCapabilityAuditMarkdown();
assert.match(audit, /Pix2Text/);
assert.match(audit, /OpenR/);
assert.match(audit, /agent-chat-ui/);
assert.equal(openSourceCapabilities.length >= 8, true);

console.log("open-source-capability-registry tests passed");
