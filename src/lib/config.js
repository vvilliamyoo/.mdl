import { marked } from "marked";
/** @typedef {import('./types.js').ThemeConfig} ThemeConfig */
/** @typedef {import('./types.js').PackageManagerItem} AppPackageData */
/** @typedef {import('./types.js').AppItem} AppEntry */
/** @typedef {import('./types.js').AppSection} SectionState */

/**
 * @typedef {object} DefaultConfig
 * @property {ThemeConfig} theme
 * @property {string} title
 * @property {string} markdown
 */

/**
 * @typedef {object} ParsedConfigResult
 * @property {ThemeConfig} theme
 * @property {string} markdown
 * @property {string} title
 * @property {string} rawText
 */

/**
 * @typedef {{ valid: true } | { valid: false, error: string }} ValidationResult
 */

export const DEFAULTS = /** @type {DefaultConfig} */ ({
  theme: {
    monoFont: "'Source Code Pro', monospace",
    sansFont: "system-ui, sans-serif",
    background: "#191919",
    window: "#29292b",
    text: "#d4d4d4",
    accent: "#375534",
  },
  title: ".mdl",
  markdown: "",
});

/** @type {Record<string, string>} */
export const PACKAGE_MANAGERS = {
  winget: "winget install",
  choco: "choco install -y",
  apt: "sudo apt install -y",
};

/**
 * @param {string} type
 * @returns {type is import('./types.js').PackageManagerType}
 */
function isPackageManagerType(type) {
  return Object.hasOwn(PACKAGE_MANAGERS, type);
}

/**
 * @param {string} text
 * @returns {{ frontmatter: string | null, markdown: string }}
 */
function getFrontmatter(text) {
  const frontmatterRegex = /^\s*---\s*([\s\S]*?)\s*---/;
  const match = text.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: null, markdown: text };
  }

  return {
    frontmatter: match[1],
    markdown: text.substring(match[0].length).trim(),
  };
}

/**
 * @param {string} rawText
 * @returns {ParsedConfigResult}
 */
export function parseConfig(rawText) {
  const { frontmatter, markdown } = getFrontmatter(rawText);

  /** @type {ThemeConfig} */
  let theme = { ...DEFAULTS.theme };
  let title = DEFAULTS.title;

  if (frontmatter) {
    const yamlLines = frontmatter.split("\n");
    const setters = /** @type {Record<string, (value: string) => void>} */ ({
      background: (v) => {
        theme.background = v;
      },
      window: (v) => {
        theme.window = v;
      },
      text: (v) => {
        theme.text = v;
      },
      accent: (v) => {
        theme.accent = v;
      },
      sansFont: (v) => {
        theme.sansFont = v;
      },
      monoFont: (v) => {
        theme.monoFont = v;
      },
      title: (v) => {
        title = v;
      },
    });

    yamlLines.forEach((line) => {
      const parts = line.split(":");
      if (parts.length < 2) return;

      const cleanKey = parts[0].trim();
      const val = parts.slice(1).join(":").trim();
      const setter = setters[cleanKey];
      if (setter) {
        setter(val);
      }
    });
  }

  return { theme, markdown, title, rawText };
}

/**
 * @param {string} markdownText
 * @returns {SectionState[]}
 */
export function buildAppState(markdownText) {
  /** @type {SectionState[]} */
  const state = [];
  const tagRegex = /#(\w+)|#\[(.*?)\]/g;
  /** @type {any[]} */
  const tokens = marked.lexer(markdownText);
  /** @type {SectionState | null} */
  let currentSection = null;

  tokens.forEach((token) => {
    if (token.type === "heading" && token.depth === 1) {
      currentSection = { letter: token.text.trim(), apps: [] };
      state.push(currentSection);
    } else if (token.type === "list" && currentSection) {
      token.items.forEach((/** @type {any} */ item) => {
        let appName = "";
        let appUrl = "";
        let tagsText = "";
        let foundLink = false;

        /**
         * @param {any[] | undefined} tks
         */
        function processTokens(tks) {
          if (!tks) return;
          tks.forEach((t) => {
            if (t.type === "link" && !foundLink) {
              appName = t.text;
              appUrl = t.href;
              foundLink = true;
            } else if (foundLink) {
              tagsText += t.raw || t.text || "";
            } else if (t.tokens) {
              processTokens(t.tokens);
            }
          });
        }

        processTokens(item.tokens);

        if (foundLink) {
          if (!currentSection) return;

          let domain = "";
          if (appUrl && appUrl.startsWith("http")) {
            try {
              domain = new URL(appUrl).hostname;
            } catch {}
          }

          /** @type {string[]} */
          let appTags = [];
          /** @type {AppPackageData[]} */
          let pmData = [];

          let lastTagEnd = 0;
          let chipHtml = "";
          for (const match of tagsText.matchAll(tagRegex)) {
            const offset = match.index ?? 0;
            const matchedTag = match[0];
            const tag = match[1] || match[2];
            chipHtml += escapeHTML(tagsText.slice(lastTagEnd, offset));
            lastTagEnd = offset + matchedTag.length;
            const pmMatch = tag.match(/^([^:]+):(.+)$/);
            if (pmMatch && isPackageManagerType(pmMatch[1])) {
              const type = pmMatch[1];
              const id = pmMatch[2].trim();
              pmData.push({ type, id });
              appTags.push(type);
              chipHtml += `<span class="chip">${escapeHTML(type)}</span>`;
            } else {
              appTags.push(tag);
              chipHtml += `<span class="chip">${escapeHTML(tag)}</span>`;
            }
          }
          chipHtml += escapeHTML(tagsText.slice(lastTagEnd));

          currentSection.apps.push({
            name: appName,
            url: appUrl,
            domain,
            tags: appTags,
            pmData,
            chipHtml,
          });
        }
      });
    }
  });

  return state.filter((section) => section.apps.length > 0);
}

/**
 * @param {string | number | null | undefined} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (!str) return "";
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {string} rawText
 * @returns {ValidationResult}
 */
export function isValidConfigStructure(rawText) {
  const { frontmatter, markdown } = getFrontmatter(rawText);
  let markdownContent = markdown;

  if (frontmatter) {
    const yamlLines = frontmatter.split("\n");
    const allowedKeys = ["title", "monoFont", "sansFont", "background", "window", "text", "accent"];
    const colorKeys = ["background", "window", "text", "accent"];

    for (let i = 0; i < yamlLines.length; i++) {
      const line = yamlLines[i].trim();
      if (!line || line.startsWith("#") || line.startsWith("<!--")) continue;
      if (!line.includes(":"))
        return { valid: false, error: `YAML Error: Missing colon in key-value pair '${line}'.` };
      const [key, ...rest] = line.split(":");
      const cleanKey = key.trim();
      const val = rest.join(":").trim();
      if (!allowedKeys.includes(cleanKey))
        return { valid: false, error: `YAML Error: Unsupported key '${cleanKey}'.` };

      if (colorKeys.includes(cleanKey) && !isValidHex(val)) {
        return {
          valid: false,
          error: `YAML Error: '${cleanKey}' must be a 3 or 6-digit HEX code.`,
        };
      }
    }
  }

  markdownContent = markdownContent.replace(/<!--[\s\S]*?-->/g, "");
  const lines = markdownContent.split("\n");
  let hasAtLeastOneSection = false;
  let hasAtLeastOneEntry = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.match(/^#\s+.+/)) {
      hasAtLeastOneSection = true;
      continue;
    }
    const listMatch = line.match(/^([*\-+])\s+(.*)/);
    if (listMatch) {
      hasAtLeastOneEntry = true;
      const linkMatch = listMatch[2].match(/^\[(.+?)\]\((.+?)\)/);
      if (!linkMatch)
        return { valid: false, error: `Syntax Error on line ${i + 1}: Missing [Name](URL).` };
    }
  }

  if (!hasAtLeastOneSection)
    return { valid: false, error: "Config must contain at least one Section." };
  if (!hasAtLeastOneEntry)
    return { valid: false, error: "Config must contain at least one application entry." };
  return { valid: true };
}

/**
 * @param {string | undefined} color
 * @returns {boolean}
 */
export function isValidHex(color) {
  return typeof color === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color.trim());
}
