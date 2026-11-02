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
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * @typedef {object} NormalizedSearchFields
 * @property {string} name
 * @property {string} id
 * @property {string} idSlug
 * @property {string} publisher
 * @property {string} description
 * @property {string[]} tags
 * @property {string[]} nameTokens
 * @property {string[]} idTokens
 * @property {string[]} idSlugTokens
 * @property {string[]} publisherTokens
 * @property {string[][]} tagTokens
 * @property {string[]} descriptionTokens
 */

/**
 * @typedef {object} CatalogMatch
 * @property {CatalogApplication} app
 * @property {number} score
 * @property {number} exactMatchRank
 */

/** @type {WeakMap<CatalogApplication, NormalizedSearchFields>} */
const normalizedFieldsCache = new WeakMap();
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** @param {string} value */
function tokenize(value) {
  return value ? value.split(" ") : [];
}

/**
 * Catalog records are built once when loaded and remain unchanged during search.
 * @param {CatalogApplication} app
 * @returns {NormalizedSearchFields}
 */
function getNormalizedSearchFields(app) {
  const cached = normalizedFieldsCache.get(app);
  if (cached) return cached;

  const name = normalizeSearchText(app.name);
  const id = normalizeSearchText(app.id);
  const idSlug = normalizeSearchText(app.idSlug);
  const publisher = normalizeSearchText(app.publisher);
  const description = normalizeSearchText(app.description);
  const tags = app.tags.map(normalizeSearchText);
  const fields = {
    name,
    id,
    idSlug,
    publisher,
    description,
    tags,
    nameTokens: tokenize(name),
    idTokens: tokenize(id),
    idSlugTokens: tokenize(idSlug),
    publisherTokens: tokenize(publisher),
    tagTokens: tags.map(tokenize),
    descriptionTokens: tokenize(description),
  };
  normalizedFieldsCache.set(app, fields);
  return fields;
}

/**
 * @param {string} left
 * @param {string} right
 * @param {number} maxDistance
 * @returns {number}
 */
function editDistanceWithin(left, right, maxDistance) {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  if (Math.abs(leftChars.length - rightChars.length) > maxDistance) {
    return maxDistance + 1;
  }

  const sentinel = maxDistance + 1;
  let previous = new Uint8Array(rightChars.length + 1);
  let current = new Uint8Array(rightChars.length + 1);
  for (let column = 0; column <= rightChars.length; column += 1) {
    previous[column] = Math.min(column, sentinel);
  }

  for (let row = 1; row <= leftChars.length; row += 1) {
    current.fill(sentinel);
    current[0] = Math.min(row, sentinel);
    const firstColumn = Math.max(1, row - maxDistance);
    const lastColumn = Math.min(rightChars.length, row + maxDistance);
    let rowMinimum = current[0];

    for (let column = firstColumn; column <= lastColumn; column += 1) {
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (leftChars[row - 1] === rightChars[column - 1] ? 0 : 1),
      );
      rowMinimum = Math.min(rowMinimum, current[column]);
    }

    if (rowMinimum > maxDistance) return maxDistance + 1;
    const previousRow = previous;
    previous = current;
    current = previousRow;
  }

  return previous[rightChars.length];
}

/**
 * @param {string} queryToken
 * @param {string[]} fieldTokens
 * @param {{ exact: number; prefix: number; partial: number }} weights
 * @param {number} fuzzyMaxDistance
 * @returns {number}
 */
function scoreTokenMatch(queryToken, fieldTokens, weights, fuzzyMaxDistance = 0) {
  let bestScore = 0;
  for (const fieldToken of fieldTokens) {
    if (fieldToken === queryToken) {
      bestScore = Math.max(bestScore, weights.exact);
    } else if (fieldToken.startsWith(queryToken)) {
      bestScore = Math.max(bestScore, weights.prefix);
    } else if (fieldToken.includes(queryToken)) {
      bestScore = Math.max(bestScore, weights.partial);
    } else if (fuzzyMaxDistance > 0) {
      const distance = editDistanceWithin(queryToken, fieldToken, fuzzyMaxDistance);
      if (distance <= fuzzyMaxDistance) {
        bestScore = Math.max(bestScore, 45 - distance * 5);
      }
    }
  }
  return bestScore;
}

/**
 * @param {string} token
 * @param {NormalizedSearchFields} fields
 * @param {number} fuzzyMaxDistance
 * @returns {number}
 */
function scoreSearchToken(token, fields, fuzzyMaxDistance) {
  let bestScore = scoreTokenMatch(token, fields.nameTokens, {
    exact: 100,
    prefix: 80,
    partial: 60,
  });
  if (bestScore < 90) {
    bestScore = Math.max(
      bestScore,
      scoreTokenMatch(token, fields.idTokens, { exact: 90, prefix: 70, partial: 55 }),
    );
  }
  if (bestScore < 85) {
    bestScore = Math.max(
      bestScore,
      scoreTokenMatch(token, fields.idSlugTokens, { exact: 85, prefix: 65, partial: 50 }),
    );
  }
  if (bestScore < 40) {
    bestScore = Math.max(
      bestScore,
      scoreTokenMatch(token, fields.publisherTokens, { exact: 40, prefix: 30, partial: 20 }),
    );
    if (bestScore < 40) {
      for (const tagTokens of fields.tagTokens) {
        bestScore = Math.max(
          bestScore,
          scoreTokenMatch(token, tagTokens, { exact: 40, prefix: 30, partial: 20 }),
        );
      }
    }
  }
  if (bestScore < 15) {
    bestScore = scoreTokenMatch(token, fields.descriptionTokens, {
      exact: 15,
      prefix: 12,
      partial: 10,
    });
  }
  if (bestScore < 45 && fuzzyMaxDistance > 0) {
    bestScore = Math.max(
      bestScore,
      scoreTokenMatch(
        token,
        fields.nameTokens,
        { exact: 100, prefix: 80, partial: 60 },
        fuzzyMaxDistance,
      ),
    );
  }
  return bestScore;
}

/**
 * @param {CatalogApplication[]} catalog
 * @param {string} query
 * @returns {CatalogApplication[]}
 */
export function searchCatalog(catalog, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  const queryTokens = [...new Set(tokenize(normalizedQuery))].map((token) => {
    const tokenLength = Array.from(token).length;
    return {
      token,
      fuzzyMaxDistance: tokenLength >= 7 ? 2 : tokenLength >= 4 ? 1 : 0,
    };
  });
  const hasPhrase = queryTokens.length > 1;

  /** @type {CatalogMatch[]} */
  const matches = [];

  for (const app of catalog) {
    const fields = getNormalizedSearchFields(app);
    let score = 0;
    for (const { token, fuzzyMaxDistance } of queryTokens) {
      const tokenScore = scoreSearchToken(token, fields, fuzzyMaxDistance);
      if (tokenScore === 0) {
        score = 0;
        break;
      }
      score += tokenScore;
    }
    if (score === 0) continue;

    if (hasPhrase) {
      if (fields.name.includes(normalizedQuery)) score += 200;
      if (fields.id.includes(normalizedQuery)) score += 160;
      if (fields.idSlug.includes(normalizedQuery)) score += 140;
      if (
        fields.publisher.includes(normalizedQuery) ||
        fields.tags.some((tag) => tag.includes(normalizedQuery))
      ) {
        score += 40;
      }
      if (fields.description.includes(normalizedQuery)) score += 20;
    }
    const exactMatchRank =
      fields.id === normalizedQuery
        ? 3
        : fields.name === normalizedQuery
          ? 2
          : fields.idSlug === normalizedQuery
            ? 1
            : 0;
    matches.push({ app, score, exactMatchRank });
  }

  matches.sort(
    (a, b) =>
      b.exactMatchRank - a.exactMatchRank ||
      b.score - a.score ||
      collator.compare(a.app.name, b.app.name) ||
      collator.compare(a.app.id, b.app.id) ||
      (a.app.id < b.app.id ? -1 : a.app.id > b.app.id ? 1 : 0),
  );
  return matches.slice(0, 50).map((m) => m.app);
}
