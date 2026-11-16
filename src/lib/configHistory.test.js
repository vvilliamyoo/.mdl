import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import {
  CONFIG_HISTORY_KEY,
  CONFIG_HISTORY_LIMIT,
  deleteConfigVersion,
  diffConfigText,
  getConfigHistory,
  recordConfigVersion,
  renameConfigVersion,
} from "./configHistory.js";

/**
 * @param {Map<string, string>} [values]
 * @returns {Pick<Storage, 'getItem' | 'setItem'>}
 */
function createStorage(values = new Map()) {
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("records only distinct changed saves and retains the ten newest versions", () => {
  const values = new Map();
  const storage = createStorage(values);

  assert.equal(recordConfigVersion("A", "A", storage), false);
  for (let index = 0; index < CONFIG_HISTORY_LIMIT + 2; index++) {
    const text = `Config ${index}`;
    assert.equal(recordConfigVersion(text, `Previous ${index}`, storage), true);
  }

  const versions = getConfigHistory(storage);
  assert.equal(versions.length, CONFIG_HISTORY_LIMIT);
  assert.deepEqual(
    versions.map((version) => version.rawText),
    [
      "Config 11",
      "Config 10",
      "Config 9",
      "Config 8",
      "Config 7",
      "Config 6",
      "Config 5",
      "Config 4",
      "Config 3",
      "Config 2",
    ],
  );
  assert.ok(versions.every((version) => !Number.isNaN(Date.parse(version.savedAt))));
  assert.ok(values.has(CONFIG_HISTORY_KEY));
});

test("rejects malformed saved history instead of silently discarding it", () => {
  const storage = createStorage(new Map([[CONFIG_HISTORY_KEY, '{"unexpected":true}']]));

  assert.throws(() => getConfigHistory(storage), /invalid format/);
});

test("renames a version without changing its content or timestamp", () => {
  const storage = createStorage(
    new Map([
      [
        CONFIG_HISTORY_KEY,
        JSON.stringify([{ savedAt: "2026-01-01T00:00:00.000Z", rawText: "config" }]),
      ],
    ]),
  );

  const versions = renameConfigVersion(0, "  Before update  ", storage);

  assert.deepEqual(versions, [
    { savedAt: "2026-01-01T00:00:00.000Z", rawText: "config", name: "Before update" },
  ]);
  assert.deepEqual(getConfigHistory(storage), versions);
  assert.throws(() => renameConfigVersion(0, "  ", storage), /cannot be empty/);
  assert.throws(() => renameConfigVersion(1, "Missing", storage), /no longer exists/);
});

test("deletes only the selected version and rejects stale indexes", () => {
  const versions = [
    { savedAt: "2026-01-03T00:00:00.000Z", rawText: "new" },
    { savedAt: "2026-01-02T00:00:00.000Z", rawText: "middle" },
    { savedAt: "2026-01-01T00:00:00.000Z", rawText: "old" },
  ];
  const storage = createStorage(new Map([[CONFIG_HISTORY_KEY, JSON.stringify(versions)]]));

  assert.deepEqual(deleteConfigVersion(1, storage), [versions[0], versions[2]]);
  assert.deepEqual(getConfigHistory(storage), [versions[0], versions[2]]);
  assert.throws(() => deleteConfigVersion(4, storage), /no longer exists/);
});

test("diffs multiple changed lines while preserving unchanged context", () => {
  assert.deepEqual(diffConfigText("A\nB\nC\nD", "A\nBee\nC\nDee"), [
    { type: "unchanged", text: "A" },
    { type: "removed", text: "B" },
    { type: "added", text: "Bee" },
    { type: "unchanged", text: "C" },
    { type: "removed", text: "D" },
    { type: "added", text: "Dee" },
  ]);
});

test("diffs additions and removals and declines an oversized comparison", () => {
  assert.deepEqual(diffConfigText("A\nB", "A\nB\nC"), [
    { type: "unchanged", text: "A" },
    { type: "unchanged", text: "B" },
    { type: "added", text: "C" },
  ]);
  assert.deepEqual(diffConfigText("A\nB\nC", "A\nC"), [
    { type: "unchanged", text: "A" },
    { type: "removed", text: "B" },
    { type: "unchanged", text: "C" },
  ]);
  const manyLines = Array.from({ length: 1_001 }, () => "line").join("\n");
  assert.equal(diffConfigText(manyLines, manyLines), null);
});
