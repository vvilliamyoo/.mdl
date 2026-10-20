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
 */

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeSearchText(value) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

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
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const queryTerms = normalizedQuery.split(" ");
  const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

  return catalog
    .flatMap((app) => {
      const fields = [
        { value: app.name, weight: 0, kind: "name" },
        { value: app.id, weight: 1, kind: "id" },
        { value: app.publisher, weight: 10, kind: "other" },
        { value: app.description, weight: 20, kind: "other" },
        { value: `${app.category} ${app.tags.join(" ")}`, weight: 30, kind: "other" },
      ].map(({ value, weight, kind }) => ({
        text: normalizeSearchText(value),
        tokens: normalizeSearchText(value).split(" ").filter(Boolean),
        weight,
        kind,
      }));

      if (
        !queryTerms.every((term) =>
          fields.some(({ tokens }) => tokens.some((token) => token.startsWith(term))),
        )
      )
        return [];

      const phraseMatch = fields.reduce((best, field) => {
        if (field.text === normalizedQuery) return Math.min(best, field.weight);
        if (field.text.startsWith(`${normalizedQuery} `))
          return Math.min(best, field.weight + (field.kind === "name" ? 3 : 2));
        return best;
      }, Number.POSITIVE_INFINITY);

      const termScore = fields.reduce((best, field) => {
        const qualities = queryTerms.map((term) =>
          field.tokens.includes(term)
            ? 0
            : field.tokens.some((token) => token.startsWith(term))
              ? 1
              : Infinity,
        );
        if (qualities.some((quality) => !Number.isFinite(quality))) return best;
        const exactTerms = qualities.filter((quality) => quality === 0).length;
        const rank =
          field.weight +
          (field.kind === "id"
            ? 1 + (exactTerms === queryTerms.length ? 0 : 0.5)
            : field.kind === "name"
              ? 5 + (exactTerms === queryTerms.length ? 0 : 1)
              : 20);
        return Math.min(best, rank);
      }, Number.POSITIVE_INFINITY);

      const splitFieldScore = queryTerms.reduce((total, term) => {
        const bestMatch = fields.reduce((best, field) => {
          const exact = field.tokens.includes(term);
          const prefix = field.tokens.some((token) => token.startsWith(term));
          if (!prefix) return best;
          const rank = field.weight + (exact ? 0 : 1);
          return Math.min(best, rank);
        }, Number.POSITIVE_INFINITY);
        return total + bestMatch;
      }, 0);

      return [{ app, rank: Math.min(phraseMatch, termScore, 40 + splitFieldScore) }];
    })
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        collator.compare(left.app.name, right.app.name) ||
        collator.compare(left.app.id, right.app.id),
    )
    .slice(0, 50)
    .map(({ app }) => app);
}
