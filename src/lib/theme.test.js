import assert from "node:assert/strict";
import { afterEach, test } from "vite-plus/test";
import { DEFAULTS } from "./config.js";
import { applyTheme, normalizeHex, updateThemeValue } from "./theme.js";

const originalDocument = globalThis.document;

afterEach(() => {
  if (originalDocument === undefined) {
    Reflect.deleteProperty(globalThis, "document");
  } else {
    globalThis.document = originalDocument;
  }
});

test("normalizes short and long hex colors and falls back on invalid values", () => {
  assert.equal(normalizeHex("#AbC"), "#aabbcc");
  assert.equal(normalizeHex("123456"), "#123456");
  assert.equal(normalizeHex("invalid"), DEFAULTS.theme.background);
  assert.equal(normalizeHex(undefined, "#ffffff"), "#ffffff");
});

test("updates an existing theme key without replacing other frontmatter", () => {
  const text = "---\ntitle: Apps\naccent: #000000\n---\n\n# A";
  assert.equal(
    updateThemeValue(text, "accent", "#123456"),
    "---\ntitle: Apps\naccent: #123456\n---\n\n# A",
  );
});

test("adds frontmatter when updating a theme value in a plain config", () => {
  assert.equal(updateThemeValue("# A", "accent", "#123456"), "---\naccent: #123456\n---\n\n# A");
});

test("applies validated colors and configured fonts to document variables", () => {
  /** @type {Map<string, string>} */
  const variables = new Map();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: {
        style: {
          setProperty: (/** @type {string} */ key, /** @type {string} */ value) =>
            variables.set(key, value),
        },
      },
    },
  });

  applyTheme({
    background: "#ffffff",
    window: "invalid",
    text: "#123",
    accent: "#abcdef",
    sansFont: "  Arial  ",
    monoFont: "",
  });

  assert.equal(variables.get("--background-color"), "#ffffff");
  assert.equal(variables.get("--window-color"), DEFAULTS.theme.window);
  assert.equal(variables.get("--text-color"), "#123");
  assert.equal(variables.get("--accent-color"), "#abcdef");
  assert.equal(variables.get("--sans-font"), "Arial");
  assert.equal(variables.get("--mono-font"), DEFAULTS.theme.monoFont);
});
