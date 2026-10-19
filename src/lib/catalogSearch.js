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
 * @param {CatalogApplication[]} catalog
 * @param {string} query
 * @returns {CatalogApplication[]}
 */
export function searchCatalog(catalog, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  const queryTerms = normalizedQuery.split(/\s+/);
  const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

  return catalog
    .flatMap((app) => {
      const name = app.name.toLocaleLowerCase();
      const id = app.id.toLocaleLowerCase();
      const publisher = app.publisher.toLocaleLowerCase();
      const description = app.description.toLocaleLowerCase();
      const categoryAndTags = `${app.category} ${app.tags.join(" ")}`.toLocaleLowerCase();
      const searchableText = `${name} ${id} ${publisher} ${description} ${categoryAndTags}`;
      if (!queryTerms.every((term) => searchableText.includes(term))) return [];

      let rank = 9;
      if (name === normalizedQuery) rank = 0;
      else if (name.startsWith(normalizedQuery)) rank = 1;
      else if (id === normalizedQuery) rank = 2;
      else if (id.startsWith(normalizedQuery)) rank = 3;
      else if (name.includes(normalizedQuery)) rank = 4;
      else if (id.includes(normalizedQuery)) rank = 5;
      else if (publisher.startsWith(normalizedQuery)) rank = 6;
      else if (publisher.includes(normalizedQuery)) rank = 7;
      else if (description.includes(normalizedQuery) || categoryAndTags.includes(normalizedQuery))
        rank = 8;

      return [{ app, rank }];
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
