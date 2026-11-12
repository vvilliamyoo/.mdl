import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { buildChipContent } from "./chipContent.js";
import { base64UrlToBytes, bytesToBase64Url, getFaviconUrl, sanitizeURL } from "./utils.js";

test("app chips escape unrecognized HTML without rendering package manager chips", () => {
  const chips = buildChipContent(" #portable #[winget:Example.App] <img src=x onerror=alert(1)>", {
    winget: "winget install",
  });
  assert.equal(
    chips.chipHtml,
    ' <span class="chip">portable</span>  &lt;img src=x onerror=alert(1)&gt;',
  );
  assert.deepEqual(chips.pmData, [{ type: "winget", id: "Example.App" }]);
});

test("only own package manager properties are recognized as manager tags", () => {
  const packageManagers = Object.assign(Object.create({ toString: "inherited command" }), {
    winget: "winget install",
  });
  const chips = buildChipContent(
    "#[toString:Example.App] #[constructor:Example.App] #[__proto__:Example.App] #[winget:Example.App]",
    packageManagers,
  );
  assert.equal(
    chips.chipHtml,
    '<span class="chip">toString:Example.App</span> <span class="chip">constructor:Example.App</span> <span class="chip">__proto__:Example.App</span> ',
  );
  assert.deepEqual(chips.pmData, [{ type: "winget", id: "Example.App" }]);
});

test("encodes and decodes URL-safe base64 bytes", () => {
  const bytes = new TextEncoder().encode("configuration \u2713");

  assert.deepEqual(base64UrlToBytes(bytesToBase64Url(bytes)), bytes);
});

test("only uses safe web URLs and builds favicon URLs for non-empty domains", () => {
  assert.equal(sanitizeURL("javascript:alert(1)"), "#");
  assert.equal(sanitizeURL("https://example.com/a?x=1&y=2"), "https://example.com/a?x=1&amp;y=2");
  assert.equal(
    getFaviconUrl("example.com"),
    "https://www.google.com/s2/favicons?domain=example.com&sz=64&format=webp",
  );
  assert.equal(getFaviconUrl(""), "");
});
