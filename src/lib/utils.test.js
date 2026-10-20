import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChipContent } from "./chipContent.js";

void test("app chips escape unrecognized HTML without rendering package manager chips", () => {
  const chips = buildChipContent(" #portable #[winget:Example.App] <img src=x onerror=alert(1)>", {
    winget: "winget install",
  });
  assert.equal(
    chips.chipHtml,
    ' <span class="chip">portable</span>  &lt;img src=x onerror=alert(1)&gt;',
  );
  assert.deepEqual(chips.tags, ["portable", "winget"]);
  assert.deepEqual(chips.pmData, [{ type: "winget", id: "Example.App" }]);
});
