import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { buildAppState, isValidConfigStructure, isValidHex, parseConfig } from "./config.js";

test("app tags escape unrecognized HTML without rendering package manager chips", () => {
  const state = buildAppState(
    "# Apps\n- [Example](https://example.com) #portable #[winget:Example.App] <img src=x onerror=alert(1)>",
  );
  const app = state[0]?.apps[0];

  assert.ok(app);
  assert.equal(
    app.chipHtml,
    ' <span class="chip">portable</span>  &lt;img src=x onerror=alert(1)&gt;',
  );
  assert.deepEqual(app.pmData, [{ type: "winget", id: "Example.App" }]);
});

test("parses frontmatter and preserves Markdown and title", () => {
  const rawText =
    "---\ntitle: Applications\naccent: #123456\n---\n\n# Apps\n- [Example](https://example.com)";
  const config = parseConfig(rawText);

  assert.equal(config.title, "Applications");
  assert.equal(config.theme.accent, "#123456");
  assert.equal(config.markdown, "# Apps\n- [Example](https://example.com)");
  assert.equal(config.rawText, rawText);
});

test("validates config structure and reports invalid entries", () => {
  assert.deepEqual(isValidConfigStructure("# Apps\n- [Example](https://example.com)"), {
    valid: true,
  });
  assert.deepEqual(isValidConfigStructure("# Apps\n- missing link"), {
    valid: false,
    error: "Syntax Error on line 2: Missing [Name](URL).",
  });
  assert.deepEqual(isValidConfigStructure("# Apps"), {
    valid: false,
    error: "Config must contain at least one application entry.",
  });
});

test("validates hexadecimal colors, including quoted values", () => {
  assert.equal(isValidHex("#abc"), true);
  assert.equal(isValidHex("'#123456'"), true);
  assert.equal(isValidHex("#abcd"), false);
  assert.equal(isValidHex("red"), false);
});
