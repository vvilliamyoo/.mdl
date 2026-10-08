import { marked } from 'marked';
import brotliPromise from 'brotli-wasm';

/**
 * @typedef {object} ThemeConfig
 * @property {string} monoFont
 * @property {string} sansFont
 * @property {string} background
 * @property {string} window
 * @property {string} text
 * @property {string} accent
 */

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
 * @typedef {object} AppPackageData
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {object} AppEntry
 * @property {string} name
 * @property {string} url
 * @property {string} domain
 * @property {string[]} tags
 * @property {AppPackageData[]} pmData
 * @property {string} chipHtml
 */

/**
 * @typedef {object} SectionState
 * @property {string} letter
 * @property {AppEntry[]} apps
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
    markdown: ""
});

/** @type {Record<string, string>} */
export const PACKAGE_MANAGERS = {
    'winget': 'winget install',
    'choco': 'choco install -y',
    'apt': 'sudo apt install -y'
};

/** @type {any | null} */
let brotliModule = null;

/**
 * @returns {Promise<any>}
 */
export async function initBrotli() {
    if (!brotliModule) {
        brotliModule = await brotliPromise;
    }
    return brotliModule;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64Url(bytes) {
    const binString = Array.from(bytes, (b) => String.fromCodePoint(b)).join("");
    return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {string} base64Url
 * @returns {Uint8Array}
 */
export function base64UrlToBytes(base64Url) {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    if (padding) base64 += '='.repeat(4 - padding);
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.charCodeAt(0));
}

/**
 * Validates 3-digit or 6-digit hex color strings.
 * @param {string | undefined} color
 * @returns {boolean}
 */
export function isValidHex(color) {
    return typeof color === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color.trim());
}

/**
 * @param {string} rawText
 * @returns {ParsedConfigResult}
 */
export function parseConfig(rawText) {
    const frontmatterRegex = /^\s*---\s*([\s\S]*?)\s*---/;
    const match = rawText.match(frontmatterRegex);

    /** @type {ThemeConfig} */
    let theme = { ...DEFAULTS.theme };
    let markdown = rawText;
    let title = DEFAULTS.title;

    if (match) {
        markdown = rawText.substring(match[0].length).trim();
        const yamlLines = match[1].split('\n');

        /** @type {Record<string, (val: string) => void>} */
        const setters = {
            'background': (v) => { theme.background = v; },
            'window': (v) => { theme.window = v; },
            'text': (v) => { theme.text = v; },
            'accent': (v) => { theme.accent = v; },
            'sansFont': (v) => { theme.sansFont = v; },
            'monoFont': (v) => { theme.monoFont = v; },
            'title': (v) => { title = v; }
        };

        yamlLines.forEach((/** @type {string} */ line) => {
            const parts = line.split(':');
            if (parts.length < 2) return;
            
            const cleanKey = parts[0].trim();
            const val = parts.slice(1).join(':').trim();
            
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

    tokens.forEach(/** @param {any} token */ token => {
        if (token.type === 'heading' && token.depth === 1) {
            currentSection = { letter: token.text.trim(), apps: [] };
            state.push(currentSection);
        } else if (token.type === 'list' && currentSection) {
            token.items.forEach(/** @param {any} item */ item => {
                let appName = '';
                let appUrl = '';
                let tagsText = '';
                let foundLink = false;

                /**
                 * @param {any[] | undefined} tks
                 */
                function processTokens(tks) {
                    if (!tks) return;
                    tks.forEach(/** @param {any} t */ t => {
                        if (t.type === 'link' && !foundLink) {
                            appName = t.text;
                            appUrl = t.href;
                            foundLink = true;
                        } else if (foundLink) {
                            tagsText += t.raw || t.text || '';
                        } else if (t.tokens) {
                            processTokens(t.tokens);
                        }
                    });
                }
                processTokens(item.tokens);

                if (foundLink) {
                    if (!currentSection) return;

                    let domain = '';
                    if (appUrl && appUrl.startsWith('http')) {
                        try { domain = new URL(appUrl).hostname; } catch (e) {}
                    }

                    /** @type {string[]} */
                    let appTags = [];
                    /** @type {AppPackageData[]} */
                    let pmData = [];

                    const chipHtml = tagsText.replace(tagRegex, (/** @type {string} */ _m, /** @type {string} */ g1, /** @type {string} */ g2) => {
                        const tag = g1 || g2;
                        const pmMatch = tag.match(/^([^:]+):(.+)$/);
                        if (pmMatch && PACKAGE_MANAGERS[pmMatch[1]]) {
                            const type = pmMatch[1];
                            const id = pmMatch[2].trim();
                            pmData.push({ type, id });
                            appTags.push(type);
                            return `<span class="chip">${escapeHTML(type)}</span>`;
                        }
                        appTags.push(tag);
                        return `<span class="chip">${escapeHTML(tag)}</span>`;
                    });

                    currentSection.apps.push({
                        name: appName,
                        url: appUrl,
                        domain,
                        tags: appTags,
                        pmData,
                        chipHtml
                    });
                }
            });
        }
    });
    return state.filter(/** @param {SectionState} section */ section => section.apps.length > 0);
}

/**
 * @param {string} domain
 * @returns {string}
 */
export function getFaviconUrl(domain) {
    return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
}

/**
 * @param {string | number | null | undefined} str
 * @returns {string}
 */
export function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * @param {string} url
 * @returns {string}
 */
export function sanitizeURL(url) {
    try {
        const parsed = new URL(url);
        if (['http:', 'https:'].includes(parsed.protocol)) {
            return escapeHTML(url);
        }
    } catch (e) {}
    return '#';
}

/**
 * @param {string} rawText
 * @returns {ValidationResult}
 */
export function isValidConfigStructure(rawText) {
    const frontmatterRegex = /^\s*---\s*([\s\S]*?)\s*---/;
    const match = rawText.match(frontmatterRegex);
    let markdownContent = rawText;

    if (match) {
        const yamlLines = match[1].split('\n');
        const allowedKeys = ['title', 'monoFont', 'sansFont', 'background', 'window', 'text', 'accent'];
        const colorKeys = ['background', 'window', 'text', 'accent'];

        for (let i = 0; i < yamlLines.length; i++) {
            const line = yamlLines[i].trim();
            if (!line || line.startsWith('#') || line.startsWith('<!--')) continue;
            if (!line.includes(':')) return { valid: false, error: `YAML Error: Missing colon in key-value pair '${line}'.` };
            const [key, ...rest] = line.split(':');
            const cleanKey = key.trim();
            const val = rest.join(':').trim();
            if (!allowedKeys.includes(cleanKey)) return { valid: false, error: `YAML Error: Unsupported key '${cleanKey}'.` };
            
            if (colorKeys.includes(cleanKey) && !isValidHex(val)) {
                return { valid: false, error: `YAML Error: '${cleanKey}' must be a 3 or 6-digit HEX code.` };
            }
        }
        markdownContent = rawText.substring(match[0].length);
    }
    markdownContent = markdownContent.replace(/<!--[\s\S]*?-->/g, '');
    const lines = markdownContent.split('\n');
    let hasAtLeastOneSection = false;
    let hasAtLeastOneEntry = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.match(/^#\s+.+/)) { hasAtLeastOneSection = true; continue; }
        const listMatch = line.match(/^([*\-+])\s+(.*)/);
        if (listMatch) {
            hasAtLeastOneEntry = true;
            const linkMatch = listMatch[2].match(/^\[(.+?)\]\((.+?)\)/);
            if (!linkMatch) return { valid: false, error: `Syntax Error on line ${i + 1}: Missing [Name](URL).` };
        }
    }
    if (!hasAtLeastOneSection) return { valid: false, error: "Config must contain at least one Section." };
    if (!hasAtLeastOneEntry) return { valid: false, error: "Config must contain at least one application entry." };
    return { valid: true };
}