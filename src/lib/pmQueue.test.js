import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { PACKAGE_MANAGERS } from "./packageManagers.js";
import {
  buildPmCommand,
  createPmQueues,
  getQueueItemsForManager,
  isQueueItemAdded,
  toggleAllQueueItems,
  toggleQueueItem,
} from "./pmQueue.js";

/** @type {import("./types.js").AppSection[]} */
const state = [
  {
    letter: "A",
    apps: [
      {
        name: "Alpha",
        url: "https://alpha.example",
        domain: "alpha.example",
        chipHtml: "",
        pmData: [
          { type: "winget", id: "Alpha.App" },
          { type: "choco", id: "alpha" },
        ],
      },
      {
        name: "Beta",
        url: "https://beta.example",
        domain: "",
        chipHtml: "",
        pmData: [{ type: "winget", id: "Beta.App" }],
      },
    ],
  },
];

test("creates an independent empty queue for each registered package manager", () => {
  const queues = createPmQueues();

  assert.deepEqual(Object.keys(queues), Object.keys(PACKAGE_MANAGERS));
  assert.ok(Object.values(queues).every((queue) => queue instanceof Map && queue.size === 0));
  assert.notStrictEqual(queues.winget, queues.choco);
});

test("returns application items for the requested manager", () => {
  assert.deepEqual(getQueueItemsForManager(state, "winget"), [
    { id: "Alpha.App", domain: "alpha.example", appName: "Alpha" },
    { id: "Beta.App", domain: "", appName: "Beta" },
  ]);
  assert.deepEqual(getQueueItemsForManager(state, "choco"), [
    { id: "alpha", domain: "alpha.example", appName: "Alpha" },
  ]);
  assert.deepEqual(getQueueItemsForManager(undefined, "winget"), []);
});

test("toggles a queue item and reports its stable feedback key", () => {
  const queues = createPmQueues();
  const added = toggleQueueItem(queues, "winget", "Alpha.App", "alpha.example", "Alpha");

  assert.equal(added.action, "Added");
  assert.equal(added.key, "winget-Alpha.App");
  assert.equal(isQueueItemAdded(added.queues, "winget", "Alpha.App"), true);

  const removed = toggleQueueItem(added.queues, "winget", "Alpha.App", "alpha.example", "Alpha");
  assert.equal(removed.action, "Removed");
  assert.equal(isQueueItemAdded(removed.queues, "winget", "Alpha.App"), false);
});

test("toggles all matching items on, then off", () => {
  const queues = createPmQueues();
  const added = toggleAllQueueItems(queues, state, "winget");

  assert.equal(added.areAllAdded, true);
  assert.equal(added.queues.winget.size, 2);

  const removed = toggleAllQueueItems(added.queues, state, "winget");
  assert.equal(removed.areAllAdded, false);
  assert.equal(removed.queues.winget.size, 0);
});

test("builds commands from queued IDs and preserves registry commands", () => {
  const queues = createPmQueues();
  queues.winget.set("Alpha.App", {
    id: "Alpha.App",
    domain: "alpha.example",
    appName: "Alpha",
  });

  assert.equal(buildPmCommand(queues, "winget"), "winget install -e --id Alpha.App");
  assert.equal(buildPmCommand(createPmQueues(), "port"), "sudo port install");
});
