import assert from "node:assert/strict";
import { afterEach, test } from "vite-plus/test";
import { saveConfig, updateConfigFromText, updateThemeForConfig } from "./appController.js";

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

/** @returns {{ values: Map<string, string>; setItem: (key: string, value: string) => void }} */
function createLocalStorage() {
  /** @type {Map<string, string>} */
  const values = new Map();
  return {
    values,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

afterEach(() => {
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  } else {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("updates parsed config fields from Markdown text", () => {
  const config = updateConfigFromText(
    { theme: {}, markdown: "", title: "", rawText: "" },
    "---\ntitle: Applications\n---\n# A\n- [App](https://example.com)",
  );

  assert.equal(config.title, "Applications");
  assert.equal(config.state?.[0]?.apps[0]?.name, "App");
});

test("updates theme values in text while preserving parsed application state", () => {
  const current = updateConfigFromText(
    { theme: {}, markdown: "", title: "", rawText: "" },
    "# A\n- [App](https://example.com)",
  );

  const updated = updateThemeForConfig(current, "accent", "#123456");
  assert.equal(updated.theme.accent, "#123456");
  assert.equal(updated.state?.[0]?.apps[0]?.name, "App");
  assert.match(updated.rawText, /^---\naccent: #123456/);
});

test("persists valid configuration and returns the hydrated save result", () => {
  const storage = createLocalStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  const config = updateConfigFromText(
    { theme: {}, markdown: "", title: "", rawText: "" },
    "# A\n- [App](https://example.com)",
  );

  const result = saveConfig(config);

  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.config.state?.[0]?.apps[0]?.name, "App");
  assert.equal(JSON.parse(storage.values.get("mdl_full_data") ?? "").rawText, config.rawText);
});

test("does not persist invalid configuration", () => {
  const storage = createLocalStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  const config = updateConfigFromText(
    { theme: {}, markdown: "", title: "", rawText: "" },
    "# A\n- missing a link",
  );

  const result = saveConfig(config);

  assert.equal(result.valid, false);
  assert.equal(storage.values.size, 0);
});
