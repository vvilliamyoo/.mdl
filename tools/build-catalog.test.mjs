import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { compareVersions } from "./build-catalog.mjs";

test("compares manifest versions numerically and without case sensitivity", () => {
  assert.ok(compareVersions("1.10.0", "1.9.0") > 0);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.ok(compareVersions("2.0-beta", "2.0-Alpha") > 0);
});
