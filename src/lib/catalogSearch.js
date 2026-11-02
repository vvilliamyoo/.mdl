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

/** @param {string} value */
function normalizeSearchText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * @param {CatalogApplication[]} catalog
 * @param {string} query
 * @returns {CatalogApplication[]}
 */
export function searchCatalog(catalog, query) {
  const normalizedQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalizedQuery) return [];

  const matches = [];
  const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

  for (const app of catalog) {
    const name = normalizeSearchText(app.name);
    const id = normalizeSearchText(app.id);
    const idSlug = normalizeSearchText(app.idSlug);
    const publisher = normalizeSearchText(app.publisher);
    const tags = app.tags.map(normalizeSearchText);
    const searchableFields = [
      id,
      idSlug,
      name,
      publisher,
      normalizeSearchText(app.description),
      ...tags,
    ];
    if (!searchableFields.some((field) => field.includes(normalizedQuery))) continue;

    let score;
    if (idSlug === normalizedQuery || name === normalizedQuery || id === normalizedQuery) {
      score = 100;
    } else if (
      idSlug.startsWith(normalizedQuery) ||
      name.startsWith(normalizedQuery) ||
      id.startsWith(normalizedQuery)
    ) {
      score = 80;
    } else if (idSlug.includes(normalizedQuery) || name.includes(normalizedQuery)) {
      score = 60;
    } else if (publisher.includes(normalizedQuery)) {
      score = 40;
    } else if (tags.some((tag) => tag.includes(normalizedQuery))) {
      score = 30;
    } else {
      score = 20;
    }

    matches.push({ app, score });
  }

  matches.sort((a, b) => b.score - a.score || collator.compare(a.app.name, b.app.name));
  return matches.slice(0, 50).map((m) => m.app);
}
