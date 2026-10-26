/**
 * @typedef {object} CatalogApplication
 * @property {string} id
 * @property {string} name
 * @property {string} publisher
 * @property {string} description
 * @property {string} version
 * @property {string} homepage
 * @property {string} category
 * @property {string[]} tags
 * @property {string} searchableText
 * @property {string} idSlug
 */

/**
 * @param {string} category
 * @param {string[]} tags
 * @returns {string[]}
 */
export function getCatalogTags(category, tags) {
  return [
    ...new Set(
      [category === "other" ? "" : category, ...tags].map((tag) => tag.trim()).filter(Boolean),
    ),
  ];
}

/**
 * @param {CatalogApplication[]} catalog
 * @param {string} query
 * @returns {CatalogApplication[]}
 */
export function searchCatalog(catalog, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const matches = [];
  const q = normalizedQuery;
  const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

  for (let i = 0; i < catalog.length; i++) {
    const app = catalog[i];
    if (!app.searchableText.includes(q)) continue;

    let score = 0;
    const lowerName = app.name.toLowerCase();
    const lowerId = app.id.toLowerCase();
    const lowerPub = app.publisher.toLowerCase();
    const { idSlug } = app;

    if (idSlug === q || lowerName === q || lowerId === q) {
      score = 100;
    } else if (idSlug.startsWith(q) || lowerName.startsWith(q) || lowerId.startsWith(q)) {
      score = 80;
    } else if (lowerName.includes(q) || idSlug.includes(q)) {
      score = 60;
    } else if (lowerPub.includes(q)) {
      score = 40;
    } else {
      score = 20; // Description or tags match
    }

    matches.push({ app, score });
  }

  matches.sort((a, b) => b.score - a.score || collator.compare(a.app.name, b.app.name));
  return matches.slice(0, 50).map((m) => m.app);
}
