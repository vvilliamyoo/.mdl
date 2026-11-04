export const CONFIG_HISTORY_KEY = "mdl_config_history";
export const CONFIG_HISTORY_LIMIT = 10;

/** @typedef {import('./types.js').ConfigVersion} ConfigVersion */
/** @typedef {import('./types.js').ConfigDiffLine} ConfigDiffLine */

/**
 * @param {Pick<Storage, 'getItem' | 'setItem'>} [storage=localStorage]
 * @returns {ConfigVersion[]}
 */
export function getConfigHistory(storage = localStorage) {
  const saved = storage.getItem(CONFIG_HISTORY_KEY);
  if (saved === null) return [];

  const parsed = /** @type {unknown} */ (JSON.parse(saved));
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (version) =>
        typeof version === "object" &&
        version !== null &&
        typeof version.savedAt === "string" &&
        typeof version.rawText === "string" &&
        (version.name === undefined || typeof version.name === "string"),
    )
  ) {
    throw new Error("Stored configuration history has an invalid format.");
  }

  return parsed.slice(0, CONFIG_HISTORY_LIMIT);
}

/**
 * Record a validated save only when its text differs from the previous saved text.
 * @param {string} rawText
 * @param {string} previousRawText
 * @param {Pick<Storage, 'getItem' | 'setItem'>} [storage=localStorage]
 * @returns {boolean} Whether a version was recorded.
 */
export function recordConfigVersion(rawText, previousRawText, storage = localStorage) {
  if (rawText === previousRawText) return false;

  const versions = getConfigHistory(storage);
  versions.unshift({ savedAt: new Date().toISOString(), rawText });
  storage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(versions.slice(0, CONFIG_HISTORY_LIMIT)));
  return true;
}

/**
 * Rename a saved version.
 * @param {number} index
 * @param {string} name
 * @param {Pick<Storage, 'getItem' | 'setItem'>} [storage=localStorage]
 * @returns {ConfigVersion[]}
 */
export function renameConfigVersion(index, name, storage = localStorage) {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("A version name cannot be empty.");

  const versions = getConfigHistory(storage);
  if (!Number.isInteger(index) || index < 0 || index >= versions.length) {
    throw new Error("The selected configuration version no longer exists.");
  }

  versions[index] = { ...versions[index], name: normalizedName };
  storage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(versions));
  return versions;
}

/**
 * Delete a saved version without changing the active configuration.
 * @param {number} index
 * @param {Pick<Storage, 'getItem' | 'setItem'>} [storage=localStorage]
 * @returns {ConfigVersion[]}
 */
export function deleteConfigVersion(index, storage = localStorage) {
  const versions = getConfigHistory(storage);
  if (!Number.isInteger(index) || index < 0 || index >= versions.length) {
    throw new Error("The selected configuration version no longer exists.");
  }

  versions.splice(index, 1);
  storage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(versions));
  return versions;
}

/**
 * Return an LCS-based line diff, or null when the comparison is too large to compute safely.
 * @param {string} previousText
 * @param {string} nextText
 * @returns {ConfigDiffLine[] | null}
 */
export function diffConfigText(previousText, nextText) {
  const previousLines = previousText.split(/\r?\n/);
  const nextLines = nextText.split(/\r?\n/);
  const rowCount = previousLines.length + 1;
  const columnCount = nextLines.length + 1;

  if (rowCount * columnCount > 1_000_000) return null;

  const lcs = Array.from({ length: rowCount }, () => new Uint32Array(columnCount));
  for (let previousIndex = previousLines.length - 1; previousIndex >= 0; previousIndex--) {
    for (let nextIndex = nextLines.length - 1; nextIndex >= 0; nextIndex--) {
      lcs[previousIndex][nextIndex] =
        previousLines[previousIndex] === nextLines[nextIndex]
          ? lcs[previousIndex + 1][nextIndex + 1] + 1
          : Math.max(lcs[previousIndex + 1][nextIndex], lcs[previousIndex][nextIndex + 1]);
    }
  }

  /** @type {ConfigDiffLine[]} */
  const diff = [];
  let previousIndex = 0;
  let nextIndex = 0;
  while (previousIndex < previousLines.length && nextIndex < nextLines.length) {
    const previousLine = previousLines[previousIndex];
    const nextLine = nextLines[nextIndex];
    if (previousLine === nextLine) {
      diff.push({ type: "unchanged", text: previousLine });
      previousIndex++;
      nextIndex++;
    } else if (lcs[previousIndex + 1][nextIndex] >= lcs[previousIndex][nextIndex + 1]) {
      diff.push({ type: "removed", text: previousLine });
      previousIndex++;
    } else {
      diff.push({ type: "added", text: nextLine });
      nextIndex++;
    }
  }

  while (previousIndex < previousLines.length) {
    diff.push({ type: "removed", text: previousLines[previousIndex++] });
  }
  while (nextIndex < nextLines.length) {
    diff.push({ type: "added", text: nextLines[nextIndex++] });
  }

  return diff;
}
