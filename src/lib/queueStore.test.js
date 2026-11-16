import assert from "node:assert/strict";
import { afterEach, test } from "vite-plus/test";
import { get } from "svelte/store";
import {
  clearQueuedItems,
  getQueuedCommand,
  getQueueState,
  queueStore,
  resetQueueState,
  toggleAllQueuedItems,
  toggleQueuedItem,
} from "./queueStore.js";

afterEach(() => resetQueueState());

test("queue store toggles, clears, and resets queued items", () => {
  toggleQueuedItem("winget", "Example.App", "example.com", "Example");
  assert.equal(getQueueState().winget.size, 1);
  assert.equal(getQueuedCommand("winget"), "winget install -e --id Example.App");

  clearQueuedItems("winget");
  assert.equal(getQueueState().winget.size, 0);

  toggleQueuedItem("choco", "example", "example.com", "Example");
  resetQueueState();
  assert.equal(get(queueStore).choco.size, 0);
});

test("queue store adds and removes all manager items from app state", () => {
  /** @type {import("./types.js").AppSection[]} */
  const state = [
    {
      letter: "A",
      apps: [
        {
          name: "Example",
          url: "https://example.com",
          domain: "example.com",
          chipHtml: "",
          pmData: [{ type: "port", id: "example" }],
        },
      ],
    },
  ];

  assert.equal(toggleAllQueuedItems(state, "port").areAllAdded, true);
  assert.equal(getQueueState().port.size, 1);
  assert.equal(toggleAllQueuedItems(state, "port").areAllAdded, false);
  assert.equal(getQueueState().port.size, 0);
});
