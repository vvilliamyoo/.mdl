import assert from "node:assert/strict";
import { test } from "node:test";
import { createParseScheduler } from "./editorScheduler.js";

test("scheduler emits only the latest text after the pause", async () => {
  /** @type {string[]} */
  const emitted = [];
  const scheduler = createParseScheduler((text) => emitted.push(text), 10);
  scheduler.schedule("first");
  scheduler.schedule("latest");

  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.deepEqual(emitted, ["latest"]);
});

test("flush immediately emits pending text once", () => {
  /** @type {string[]} */
  const emitted = [];
  const scheduler = createParseScheduler((text) => emitted.push(text), 1000);
  scheduler.schedule("draft");

  assert.equal(scheduler.flush(), true);
  assert.equal(scheduler.flush(), false);
  assert.deepEqual(emitted, ["draft"]);
  scheduler.clear();
});

test("clear discards pending text", async () => {
  /** @type {string[]} */
  const emitted = [];
  const scheduler = createParseScheduler((text) => emitted.push(text), 10);
  scheduler.schedule("discard");
  scheduler.clear();

  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.deepEqual(emitted, []);
});
