import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { importShareLink, normalizeShareHash } from "./configIO.js";

test("normalizes share URLs and data hashes", () => {
  const encoded = "abc-123_";
  assert.equal(normalizeShareHash(`https://example.com/#data=${encoded}`), encoded);
  assert.equal(normalizeShareHash(`#data=${encoded}`), encoded);
  assert.equal(normalizeShareHash(`data=${encoded}`), encoded);
  assert.equal(normalizeShareHash(`  ${encoded}  `), encoded);
});

test("normalizes an empty input to an empty hash", () => {
  assert.equal(normalizeShareHash("   "), "");
});

test("rejects empty share input", async () => {
  await assert.rejects(importShareLink("  "), /Share link or hash is empty/);
});
