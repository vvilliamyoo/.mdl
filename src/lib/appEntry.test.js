import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAppState } from "./config.js";
import { searchCatalog } from "./catalogSearch.js";
import {
  addApplicationEntry,
  addNewSectionEntry,
  formatApplicationEntry,
  getSectionNames,
  getSuggestedSection,
  hasAlphabeticalSections,
  hasWingetId,
} from "./appEntry.js";

const app = {
  id: "Mozilla.Firefox",
  name: "Firefox",
  url: "https://www.mozilla.org/firefox/",
  tags: ["browsers", "web browser"],
};

/**
 * @param {string} id
 * @param {string} name
 * @param {Partial<{ publisher: string; description: string; tags: string[] }>} [overrides]
 */
function catalogApp(id, name, overrides = {}) {
  return {
    id,
    name,
    publisher: "",
    description: "",
    version: "",
    homepage: "",
    category: "",
    tags: [],
    ...overrides,
  };
}

void test("ranks the exact application-name match ahead of earlier catalog substring matches", () => {
  const searchFixture = [
    catalogApp("A.First", "Alpha", { description: "Supports Firefox bookmarks" }),
    catalogApp("B.Second", "Beta", { tags: ["Firefox compatible"] }),
    catalogApp("Mozilla.Firefox", "Firefox"),
  ];

  assert.deepEqual(
    searchCatalog(searchFixture, "Firefox").map(({ id }) => id),
    ["Mozilla.Firefox", "A.First", "B.Second"],
  );
});

void test("matches query terms across fields and ranks IDs above descriptions", () => {
  assert.deepEqual(
    searchCatalog(
      [
        catalogApp("Mozilla.Firefox", "Browser", {
          publisher: "Mozilla",
          description: "Fast web browser",
        }),
      ],
      "mozilla firefox",
    ).map(({ id }) => id),
    ["Mozilla.Firefox"],
  );
});

void test("applies the result limit after relevance ranking", () => {
  const broadMatches = Array.from({ length: 55 }, (_, index) => ({
    ...catalogApp(`A.Description${index}`, `Browser ${index}`, {
      description: "Firefox compatible",
    }),
  }));
  const exactMatch = catalogApp("Z.Mozilla.Firefox", "Firefox");

  assert.equal(searchCatalog([...broadMatches, exactMatch], "Firefox").length, 50);
  assert.equal(searchCatalog([...broadMatches, exactMatch], "Firefox")[0]?.id, exactMatch.id);
});

void test("formats a Winget application as a valid Markdown entry with tags", () => {
  const entry = formatApplicationEntry(app);
  assert.equal(
    entry,
    "- [Firefox](https://www.mozilla.org/firefox/) #[winget:Mozilla.Firefox] #[browsers] #[web browser]",
  );
  const parsed = buildAppState(`# F\n${entry}`)[0]?.apps[0];
  assert.ok(parsed);
  assert.equal(parsed.name, "Firefox");
  assert.deepEqual(parsed.pmData, [{ type: "winget", id: "Mozilla.Firefox" }]);
  assert.ok(parsed.tags.includes("browsers"));
});

void test("inserts entries in alphabetical order when entries are already sorted", () => {
  const text =
    "# Apps\n\n- [Chrome](https://example.com/chrome)\n- [VLC](https://example.com/vlc)\n";
  const result = addApplicationEntry(text, "Apps", app);
  assert.match(result, /Chrome[\s\S]*Firefox[\s\S]*VLC/);
});

void test("preserves existing application order when it is not alphabetical", () => {
  const text =
    "# Apps\n\n- [VLC](https://example.com/vlc)\n- [Chrome](https://example.com/chrome)\n";
  const result = addApplicationEntry(text, "Apps", app);
  assert.match(result, /VLC[\s\S]*Chrome[\s\S]*Firefox/);
});

void test("adds an entry to an empty section without losing heading spacing", () => {
  const result = addApplicationEntry(
    "# Apps\n\n# Other\n\n- [Other](https://example.com)\n",
    "Apps",
    app,
  );
  assert.match(result, /# Apps\n\n- \[Firefox\]\([\s\S]*\n\n# Other/);
});

void test("ignores headings and entries in HTML comments and fenced code", () => {
  const text =
    "<!--\n# Template\n- [Placeholder](https://example.com)\n-->\n# Apps\n\n```md\n# Hidden\n- [Hidden](https://example.com)\n```\n\n- [Chrome](https://example.com/chrome)\n";
  assert.deepEqual(getSectionNames(text), ["Apps"]);
  const result = addApplicationEntry(text, "Apps", app);
  assert.deepEqual(
    buildAppState(result)[0]?.apps.map(({ name }) => name),
    ["Chrome", "Firefox"],
  );
});

void test("adds alphabetic sections in order and suggests an existing initial", () => {
  const text =
    "---\ntitle: Demo\n---\n\n# A\n\n- [Alacritty](https://example.com)\n\n# C\n\n- [Chrome](https://example.com)\n";
  assert.equal(hasAlphabeticalSections(text), true);
  assert.equal(getSuggestedSection(text, "Chrome"), "C");
  const result = addNewSectionEntry(text, "B", app);
  assert.match(result, /# A[\s\S]*# B[\s\S]*Firefox[\s\S]*# C/);
  assert.match(result, /^---\ntitle: Demo\n---/);
});

void test("defaults to the first section when headings are not alphabetically ordered", () => {
  assert.equal(getSuggestedSection("# Utilities\n\n# Apps\n", "Firefox"), "Utilities");
  assert.equal(
    hasWingetId("# Apps\n- [Firefox](https://example.com) #[winget:Mozilla.Firefox]", app.id),
    true,
  );
  assert.equal(hasWingetId("# Apps\n", app.id), false);
});
