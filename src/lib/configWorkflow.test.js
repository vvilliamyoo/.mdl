import assert from "node:assert/strict";
import { test } from "node:test";
import { get } from "svelte/store";
import { appStore, beginEditing, setEditorDraft } from "./appStore.js";
import { queueStore, toggleQueuedItem } from "./queueStore.js";
import {
  generateAndCopyShareLink,
  importConfigFile,
  resetConfiguration,
} from "./configWorkflow.js";

void test("share workflow copies the generated link and returns it", async () => {
  /** @type {string[]} */
  const copied = [];
  const link = await generateAndCopyShareLink(
    "# Apps",
    "https://example.com/",
    async (text, location) => `${location}#encoded=${text.length}`,
    async (text) => {
      copied.push(text);
    },
  );

  assert.equal(link, "https://example.com/#encoded=6");
  assert.deepEqual(copied, [link]);
});

void test("share workflow propagates clipboard failures", async () => {
  await assert.rejects(
    generateAndCopyShareLink(
      "# Apps",
      "https://example.com/",
      async () => "https://example.com/#data=encoded",
      async () => {
        throw new Error("clipboard unavailable");
      },
    ),
    /clipboard unavailable/,
  );
});

void test("imports a non-empty file as configuration text", async () => {
  const file = { text: async () => "# Apps\n- [Example](https://example.com)" };

  assert.equal(await importConfigFile(file), "# Apps\n- [Example](https://example.com)");
});

void test("rejects an empty config file", async () => {
  await assert.rejects(importConfigFile({ text: async () => "" }), /empty/);
});

void test("reset removes persisted config and resets in-memory app and queue state", () => {
  appStore.set({
    theme: {},
    markdown: "# Apps",
    title: "Apps",
    rawText: "# Apps",
    state: [],
  });
  beginEditing();
  setEditorDraft("# Edited");
  toggleQueuedItem("winget", "Example.App", "example.com", "Example");
  /** @type {string[]} */
  const removedKeys = [];

  resetConfiguration({ removeItem: (key) => removedKeys.push(key) });

  assert.deepEqual(removedKeys, ["mdl_full_data"]);
  assert.equal(get(appStore).rawText, "");
  assert.deepEqual(get(queueStore).winget, new Map());
});
