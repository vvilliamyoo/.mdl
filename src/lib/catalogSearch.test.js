import assert from "node:assert/strict";
import { test } from "node:test";
import { getCatalogTags, searchCatalog } from "./catalogSearch.js";

/**
 * @param {string} id
 * @param {string} name
 * @param {Partial<{ publisher: string; description: string; tags: string[] }>} [overrides]
 */
function catalogApp(id, name, overrides = {}) {
  const app = {
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
  const dotIndex = app.id.indexOf(".");
  const idSlug = (dotIndex < 0 ? app.id : app.id.slice(dotIndex + 1))
    .replace(/\./g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return { ...app, idSlug };
}

void test("returns no catalog results for blank queries", () => {
  assert.deepEqual(searchCatalog([catalogApp("Mozilla.Firefox", "Firefox")], "   "), []);
});

void test("normalizes catalog fields once and reuses them across searches", () => {
  const app = catalogApp("Mozilla.Firefox", "Firefox");
  let nameReads = 0;
  Object.defineProperty(app, "name", {
    get() {
      nameReads += 1;
      return "Firefox";
    },
  });

  assert.equal(searchCatalog([app], "fire").length, 1);
  assert.equal(searchCatalog([app], "fox").length, 1);
  assert.equal(nameReads, 1);
});

void test("ranks exact name matches above earlier catalog substring matches", () => {
  const searchFixture = [
    catalogApp("A.First", "Alpha", { description: "Supports Firefox bookmarks" }),
    catalogApp("B.Second", "Beta", { tags: ["Firefox compatible"] }),
    catalogApp("Mozilla.Firefox", "Firefox"),
  ];

  assert.deepEqual(
    searchCatalog(searchFixture, "Firefox").map(({ id }) => id),
    ["Mozilla.Firefox", "B.Second", "A.First"],
  );
});

void test("ranks exact package IDs above exact names and partial name matches", () => {
  const exactId = catalogApp("Mozilla.Firefox", "Web Browser");
  const exactName = catalogApp("Example.Firefox", "Mozilla Firefox");
  const partialName = catalogApp("Other.Browser", "Mozilla Firefox ESR");

  assert.deepEqual(
    searchCatalog([partialName, exactName, exactId], "Mozilla.Firefox").map(({ id }) => id),
    ["Mozilla.Firefox", "Example.Firefox", "Other.Browser"],
  );
});

void test("matches all query words across catalog fields, including package IDs", () => {
  const result = searchCatalog(
    [
      catalogApp("Mozilla.Firefox", "Browser", {
        publisher: "Mozilla",
        description: "Fast web browser",
      }),
    ],
    "mozilla firefox",
  );

  assert.deepEqual(
    result.map(({ id }) => id),
    ["Mozilla.Firefox"],
  );
});

void test("sorts by relevance before applying the 50-result limit", () => {
  const broadMatches = Array.from({ length: 55 }, (_, index) =>
    catalogApp(`A.Description${index}`, `Browser ${index}`, {
      description: "Firefox compatible",
    }),
  );
  const exactMatch = catalogApp("Z.Mozilla.Firefox", "Firefox");
  const results = searchCatalog([...broadMatches, exactMatch], "Firefox");

  assert.equal(results.length, 50);
  assert.equal(results[0]?.id, exactMatch.id);
});

void test("ranks package-name matches above description matches", () => {
  const broadMatches = Array.from({ length: 55 }, (_, index) =>
    catalogApp(`A.Tool${index}`, `Browser Tool ${index}`, {
      description: "Firefox compatible",
    }),
  );
  const firefox = catalogApp("Mozilla.Firefox", "Mozilla Firefox");

  assert.equal(searchCatalog([...broadMatches, firefox], "Firefox")[0]?.id, firefox.id);
});

void test("normalizes punctuation for multi-word names and package IDs", () => {
  const desktop = catalogApp("GitHub.GitHubDesktop", "GitHub Desktop");
  const noise = catalogApp("GitHub.NotDesktop", "GitHub Utility");

  assert.deepEqual(
    searchCatalog([noise, desktop], "Github desktop").map(({ id }) => id),
    [desktop.id],
  );
  assert.deepEqual(
    searchCatalog([catalogApp("Mozilla.Firefox", "Web Browser")], "Mozilla.Firefox").map(
      ({ id }) => id,
    ),
    ["Mozilla.Firefox"],
  );
});

void test("offers inferred category and unique catalog tags", () => {
  assert.deepEqual(getCatalogTags("development", ["git", "editor", "git"]), [
    "development",
    "git",
    "editor",
  ]);
  assert.deepEqual(getCatalogTags("other", []), []);
});
