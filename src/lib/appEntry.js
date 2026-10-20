const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/**
 * @typedef {object} ApplicationEntry
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {string[]} [tags]
 */

/** @param {string} rawText @returns {number} */
function getMarkdownOffset(rawText) {
  return FRONTMATTER_PATTERN.exec(rawText)?.[0].match(/\n/g)?.length ?? 0;
}

/**
 * @param {string[]} lines
 * @param {number} offset
 * @returns {string[]}
 */
function getVisibleMarkdownLines(lines, offset) {
  const visible = [...lines];
  let insideComment = false;
  let fence = null;

  for (let index = offset; index < lines.length; index += 1) {
    let line = lines[index];
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.char}{${fence.length},}\\s*$`).test(line)) fence = null;
      visible[index] = "";
      continue;
    }

    let text = "";
    let cursor = 0;
    while (cursor < line.length) {
      if (insideComment) {
        const end = line.indexOf("-->", cursor);
        if (end === -1) {
          cursor = line.length;
          break;
        }
        cursor = end + 3;
        insideComment = false;
        continue;
      }

      const start = line.indexOf("<!--", cursor);
      if (start === -1) {
        text += line.slice(cursor);
        break;
      }
      text += line.slice(cursor, start);
      const end = line.indexOf("-->", start + 4);
      if (end === -1) {
        insideComment = true;
        cursor = line.length;
        break;
      }
      cursor = end + 3;
    }

    line = text;
    const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (openingFence) {
      fence = { char: openingFence[1][0], length: openingFence[1].length };
      visible[index] = "";
      continue;
    }
    visible[index] = line;
  }
  return visible;
}

/** @param {string[]} lines @param {number} offset @returns {{ index: number; title: string }[]} */
function getHeadingLines(lines, offset) {
  /** @type {{ index: number; title: string }[]} */
  const headings = [];
  for (let index = offset; index < lines.length; index += 1) {
    const match = lines[index].match(/^ {0,3}#\s+(.+?)\s*#*\s*$/);
    if (match) headings.push({ index, title: match[1].trim() });
  }
  return headings;
}

/** @param {string} left @param {string} right @returns {number} */
function compareText(left, right) {
  return left.localeCompare(right, undefined, { sensitivity: "base", numeric: true });
}

/** @param {string[]} values @returns {boolean} */
function isSorted(values) {
  return values.every((value, index) => index === 0 || compareText(values[index - 1], value) <= 0);
}

/** @param {string[]} lines @param {number} start @param {number} end @returns {string[]} */
function getAppNames(lines, start, end) {
  return lines.slice(start, end).flatMap((line) => {
    const match = line.match(/^\s*[-*+]\s+\[([^\]]+)\]\(/);
    return match ? [match[1].replace(/\\([\\[\]])/g, "$1")] : [];
  });
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeAppName(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/**
 * @param {string} line
 * @returns {{ name: string; bullet: string } | null}
 */
function parseApplicationLine(line) {
  const match = line.match(/^(\s*)([-*+])\s+\[([^\]]+)\]\((?:\\.|[^)])*\)(.*)$/);
  if (!match) return null;
  return {
    name: match[3].replace(/\\([\\[\]])/g, "$1"),
    bullet: `${match[1]}${match[2]}`,
  };
}

/** @param {string} rawText @returns {string[]} */
export function getSectionNames(rawText) {
  const lines = rawText.split(/\r?\n/);
  const offset = getMarkdownOffset(rawText);
  const visibleLines = getVisibleMarkdownLines(lines, offset);
  return getHeadingLines(visibleLines, offset).map(({ title }) => title);
}

/** @param {string} rawText @returns {boolean} */
export function hasAlphabeticalSections(rawText) {
  return isSorted(getSectionNames(rawText));
}

/** @param {string} rawText @param {string} applicationName @returns {string | null} */
export function getSuggestedSection(rawText, applicationName) {
  const lines = rawText.split(/\r?\n/);
  const offset = getMarkdownOffset(rawText);
  const headings = getHeadingLines(getVisibleMarkdownLines(lines, offset), offset);
  if (headings.length === 0) return null;

  if (!isSorted(headings.map(({ title }) => title))) return headings[0].title;

  const initial = Array.from(applicationName.trim())[0]?.toLocaleUpperCase() || "";
  return headings.find(({ title }) => title.toLocaleUpperCase() === initial)?.title ?? null;
}

/** @param {string} value @returns {string} */
function escapeMarkdownText(value) {
  return value.replace(/([\\[\]])/g, "\\$1");
}

/** @param {string} value @returns {string} */
function escapeMarkdownUrl(value) {
  return value.replace(/[\\\s()<>]/g, (char) => encodeURIComponent(char));
}

/** @param {string[]} tags @returns {string[]} */
function normalizeTags(tags) {
  const result = [];
  const seen = new Set();
  for (const value of tags) {
    const tag = String(value).trim().replace(/\s+/g, " ").slice(0, 60);
    const key = tag.toLocaleLowerCase();
    if (!tag || key === "winget" || key.startsWith("winget:") || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

/** @param {ApplicationEntry} application @returns {string} */
export function formatApplicationEntry(application) {
  const tags = normalizeTags(application.tags ?? []);
  const tagText = tags.map((tag) => `#[${tag.replace(/[\\\]]/g, "\\$&")}]`).join(" ");
  const suffix = [`#[winget:${application.id}]`, tagText].filter(Boolean).join(" ");
  return `- [${escapeMarkdownText(application.name.trim())}](${escapeMarkdownUrl(application.url.trim())}) ${suffix}`;
}

/** @param {string} rawText @param {string} sectionTitle @param {ApplicationEntry} application @returns {string} */
export function addApplicationEntry(rawText, sectionTitle, application) {
  const entry = formatApplicationEntry(application);
  const lines = rawText.split(/\r?\n/);
  const offset = getMarkdownOffset(rawText);
  const visibleLines = getVisibleMarkdownLines(lines, offset);
  const headings = getHeadingLines(visibleLines, offset);
  const targetIndex = headings.findIndex(({ title }) => title === sectionTitle);

  if (targetIndex === -1) {
    throw new Error(`Section "${sectionTitle}" was not found.`);
  }

  const current = headings[targetIndex];
  const next = headings[targetIndex + 1];
  const sectionEnd = next?.index ?? lines.length;
  const apps = getAppNames(visibleLines, current.index + 1, sectionEnd);
  const alphabetical = apps.length < 2 || isSorted(apps);
  let insertAt = sectionEnd;

  if (alphabetical) {
    for (let index = current.index + 1; index < sectionEnd; index += 1) {
      const match = visibleLines[index].match(/^\s*[-*+]\s+\[([^\]]+)\]\(/);
      if (match && compareText(match[1], application.name) > 0) {
        insertAt = index;
        break;
      }
    }
  }

  while (insertAt > current.index + 1 && lines[insertAt - 1].trim() === "") insertAt -= 1;
  if (insertAt === current.index + 1) {
    if (lines[insertAt]?.trim() === "") insertAt += 1;
    else {
      lines.splice(insertAt, 0, "");
      insertAt += 1;
    }
  }
  lines.splice(insertAt, 0, entry);
  if (next && /^ {0,3}#\s+/.test(lines[insertAt + 1] ?? "")) {
    lines.splice(insertAt + 1, 0, "");
  }
  return lines.join("\n");
}

/** @param {string} rawText @param {string} sectionTitle @param {ApplicationEntry} application @returns {string} */
export function addNewSectionEntry(rawText, sectionTitle, application) {
  const existingNames = getSectionNames(rawText);
  if (existingNames.some((name) => name.toLocaleLowerCase() === sectionTitle.toLocaleLowerCase())) {
    throw new Error(`Section "${sectionTitle}" already exists.`);
  }

  const lines = rawText.split(/\r?\n/);
  const offset = getMarkdownOffset(rawText);
  const headings = getHeadingLines(getVisibleMarkdownLines(lines, offset), offset);
  const insertAlphabetically = isSorted(headings.map(({ title }) => title));
  let insertAt = lines.length;

  if (insertAlphabetically) {
    const next = headings.find(({ title }) => compareText(title, sectionTitle) > 0);
    if (next) insertAt = next.index;
  }

  if (insertAt > offset && lines[insertAt - 1]?.trim() !== "") {
    lines.splice(insertAt, 0, "");
    insertAt += 1;
  }
  const sectionLines = [`# ${sectionTitle}`, "", formatApplicationEntry(application), ""];
  lines.splice(insertAt, 0, ...sectionLines);
  return lines.join("\n");
}

/**
 * @param {string} rawText
 * @param {string} applicationName
 * @returns {{ name: string; section: string; lineIndex: number }[]}
 */
export function findApplicationNameConflicts(rawText, applicationName) {
  const lines = rawText.split(/\r?\n/);
  const offset = getMarkdownOffset(rawText);
  const visibleLines = getVisibleMarkdownLines(lines, offset);
  const headings = getHeadingLines(visibleLines, offset);
  const normalizedName = normalizeAppName(applicationName);
  /** @type {{ name: string; section: string; lineIndex: number }[]} */
  const matches = [];

  headings.forEach((heading, headingIndex) => {
    const end = headings[headingIndex + 1]?.index ?? lines.length;
    for (let lineIndex = heading.index + 1; lineIndex < end; lineIndex += 1) {
      const entry = parseApplicationLine(visibleLines[lineIndex]);
      if (entry && normalizeAppName(entry.name) === normalizedName) {
        matches.push({ name: entry.name, section: heading.title, lineIndex });
      }
    }
  });

  return matches;
}

/**
 * @param {string} rawText
 * @param {number} lineIndex
 * @param {ApplicationEntry} application
 * @returns {string}
 */
export function replaceApplicationEntry(rawText, lineIndex, application) {
  const lines = rawText.split(/\r?\n/);
  const existing = lines[lineIndex];
  if (existing === undefined || !parseApplicationLine(existing)) {
    throw new Error("The selected application entry could not be found.");
  }
  const bullet = parseApplicationLine(existing)?.bullet ?? "-";
  lines[lineIndex] = formatApplicationEntry(application).replace(/^-/, bullet);
  return lines.join("\n");
}

/**
 * @param {string} rawText
 * @param {number} lineIndex
 * @param {string} id
 * @returns {string}
 */
export function mergeWingetIdIntoEntry(rawText, lineIndex, id) {
  const lines = rawText.split(/\r?\n/);
  const existing = lines[lineIndex];
  if (existing === undefined || !parseApplicationLine(existing)) {
    throw new Error("The selected application entry could not be found.");
  }
  if (hasWingetId(existing, id)) return rawText;
  lines[lineIndex] = `${existing.trimEnd()} #[winget:${id}]`;
  return lines.join("\n");
}

/**
 * @param {string} rawText
 * @param {string} id
 * @returns {number[]}
 */
export function findWingetIdEntryLines(rawText, id) {
  const lines = rawText.split(/\r?\n/);
  const visibleLines = getVisibleMarkdownLines(lines, getMarkdownOffset(rawText));
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`#\\[winget:${escapedId}\\]`, "i");
  return visibleLines.flatMap((line, lineIndex) =>
    parseApplicationLine(line) && pattern.test(line) ? [lineIndex] : [],
  );
}

/** @param {string} rawText @param {string} id @returns {boolean} */
export function hasWingetId(rawText, id) {
  return findWingetIdEntryLines(rawText, id).length > 0;
}
