import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { get } from "svelte/store";
import {
  appStore,
  beginEditing,
  cancelEditorDraft,
  closeEditor,
  editorSessionStore,
  flushEditorDraftParse,
  saveEditorDraft,
  setEditorDraft,
  updateDraftText,
} from "./appStore.js";

const originalLocalStorage = globalThis.localStorage;

/**
 * @param {Map<string, string>} values
 * @returns {Storage}
 */
function createLocalStorage(values) {
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

afterEach(() => {
  appStore.set({
    theme: {
      monoFont: "'Source Code Pro', monospace",
      sansFont: "system-ui, sans-serif",
      background: "#191919",
      window: "#29292b",
      text: "#d4d4d4",
      accent: "#375534",
    },
    markdown: "",
    title: ".mdl",
    rawText: "",
  });
  editorSessionStore.set({ draftText: "", initialText: "", isEditing: false });
  if (originalLocalStorage === undefined) {
    Reflect.deleteProperty(globalThis, "localStorage");
  } else {
    globalThis.localStorage = originalLocalStorage;
  }
});

test("editor session tracks draft changes and blocks closing unsaved edits", () => {
  updateDraftText("# A\n- [App](https://example.com)");
  beginEditing();
  setEditorDraft("# B\n- [Other](https://example.org)");

  assert.equal(closeEditor(), false);
  assert.equal(get(editorSessionStore).draftText, "# B\n- [Other](https://example.org)");
  assert.equal(get(editorSessionStore).isEditing, true);
});

test("editor draft parsing is scheduled and can be flushed immediately", () => {
  updateDraftText("# A\n- [App](https://example.com)");
  beginEditing();
  setEditorDraft("# B\n- [Other](https://example.org)");

  assert.equal(get(appStore).state?.[0]?.letter, "A");
  flushEditorDraftParse();
  assert.equal(get(appStore).state?.[0]?.letter, "B");
  assert.equal(get(appStore).rawText, get(editorSessionStore).draftText);
});

test("cancel restores the initial text and parsed config", () => {
  const original = "# A\n- [App](https://example.com)";
  updateDraftText(original);
  beginEditing();
  setEditorDraft("# B\n- [Other](https://example.org)");

  const restored = cancelEditorDraft();

  assert.equal(restored.rawText, original);
  assert.equal(restored.state?.[0]?.letter, "A");
  assert.deepEqual(get(editorSessionStore), {
    draftText: original,
    initialText: original,
    isEditing: false,
  });
});

test("save parses, persists, and closes the current draft", () => {
  const savedValues = new Map();
  globalThis.localStorage = createLocalStorage(savedValues);
  updateDraftText("# A\n- [App](https://example.com)");
  beginEditing();
  const draft = "# B\n- [Other](https://example.org)";
  setEditorDraft(draft);

  const result = saveEditorDraft();

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.config.rawText, draft);
  assert.equal(result.config.state?.[0]?.letter, "B");
  assert.equal(JSON.parse(savedValues.get("mdl_full_data")).rawText, draft);
  assert.deepEqual(get(editorSessionStore), {
    draftText: draft,
    initialText: draft,
    isEditing: false,
  });
});

test("invalid drafts are not persisted and remain editable", () => {
  const savedValues = new Map();
  globalThis.localStorage = createLocalStorage(savedValues);
  updateDraftText("# A\n- [App](https://example.com)");
  beginEditing();
  setEditorDraft("# Invalid\n- missing link");

  const result = saveEditorDraft();

  assert.equal(result.valid, false);
  assert.equal(savedValues.size, 0);
  assert.equal(get(editorSessionStore).isEditing, true);
});
