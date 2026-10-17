import assert from "node:assert/strict";
import { test } from "node:test";
import { createConfigActions } from "./configActions.js";

/** @typedef {import('./configActions.js').ConfigActionDependencies} ConfigActionDependencies */

/**
 * @param {Partial<ConfigActionDependencies>} [overrides]
 */
function createDependencies(overrides = {}) {
  /** @type {{ drafts: string[]; notifications: string[]; reset: number; reload: number; downloads: string[]; copiedLocations: string[] }} */
  const calls = {
    drafts: [],
    notifications: [],
    reset: 0,
    reload: 0,
    downloads: [],
    copiedLocations: [],
  };
  return {
    calls,
    dependencies: {
      setDraft: (/** @type {string} */ text) => {
        calls.drafts.push(text);
      },
      notify: (/** @type {string} */ message) => {
        calls.notifications.push(message);
      },
      confirmReset: () => true,
      reload: () => {
        calls.reload += 1;
      },
      getLocation: () => "https://example.com/",
      importLink: async () => "imported config",
      readFile: async () => "file config",
      generateAndCopy: async (/** @type {string} */ _text, /** @type {string} */ location) => {
        calls.copiedLocations.push(location);
        return location;
      },
      download: (/** @type {string} */ text) => {
        calls.downloads.push(text);
      },
      reset: () => {
        calls.reset += 1;
      },
      ...overrides,
    },
  };
}

void test("link import updates draft and reports success", async () => {
  const { calls, dependencies } = createDependencies();
  const actions = createConfigActions(dependencies);

  assert.equal(await actions.importFromLink("#data=encoded"), true);
  assert.deepEqual(calls.drafts, ["imported config"]);
  assert.deepEqual(calls.notifications, ["Config imported from link! Click 'Save' to apply."]);
});

void test("file import updates draft and reports success", async () => {
  const { calls, dependencies } = createDependencies();
  const actions = createConfigActions(dependencies);

  assert.equal(await actions.importFromFile({ text: async () => "file config" }), true);
  assert.deepEqual(calls.drafts, ["file config"]);
  assert.deepEqual(calls.notifications, ["Config imported! Click 'Save' to apply."]);
});

void test("share generation and download delegate to configured workflows", async () => {
  const { calls, dependencies } = createDependencies();
  const actions = createConfigActions(dependencies);

  assert.equal(await actions.generateShareLink("draft"), true);
  actions.downloadDraft("draft");
  assert.deepEqual(calls.copiedLocations, ["https://example.com/"]);
  assert.deepEqual(calls.downloads, ["draft"]);
});

void test("reset only clears and reloads after confirmation", () => {
  const { calls, dependencies } = createDependencies({ confirmReset: () => false });
  const actions = createConfigActions(dependencies);

  assert.equal(actions.reset(), false);
  assert.equal(calls.reset, 0);
  assert.equal(calls.reload, 0);
});
