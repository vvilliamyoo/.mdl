import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAppState } from "./config.js";

void test("app chips escape unrecognized HTML while preserving parsed tags", () => {
  const state = buildAppState(
    "# Apps\n- [Example](https://example.com) #portable #[winget:Example.App] <img src=x onerror=alert(1)>",
  );
  const app = state[0]?.apps[0];

  assert.ok(app);
  assert.equal(
    app.chipHtml,
    ' <span class="chip">portable</span> <span class="chip">winget</span> &lt;img src=x onerror=alert(1)&gt;',
  );
  assert.deepEqual(app.tags, ["portable", "winget"]);
  assert.deepEqual(app.pmData, [{ type: "winget", id: "Example.App" }]);
});
