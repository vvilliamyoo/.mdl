import { DEFAULTS, isValidHex } from './config.js';

/**
 * @param {string | undefined} color
 * @param {string} defaultHex
 * @returns {string}
 */
export function normalizeHex(color, defaultHex = DEFAULTS.theme.background) {
    if (!color) return defaultHex;
    let c = color.trim();
    if (c.startsWith('#')) c = c.slice(1);
    if (c.length === 3) {
        c = c.split('').map((char) => char + char).join('');
    }
    if (/^[0-9a-fA-F]{6}$/.test(c)) {
        return `#${c.toLowerCase()}`;
    }
    return defaultHex;
}

/**
 * @param {{ background?: string; window?: string; text?: string; accent?: string; sansFont?: string; monoFont?: string } | undefined} theme
 */
export function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;
    const bg = String((isValidHex(theme.background) && theme.background) ? theme.background : (DEFAULTS.theme.background ?? '#000000'));
    const win = String((isValidHex(theme.window) && theme.window) ? theme.window : (DEFAULTS.theme.window ?? '#111827'));
    const txt = String((isValidHex(theme.text) && theme.text) ? theme.text : (DEFAULTS.theme.text ?? '#f8fafc'));
    const acc = String((isValidHex(theme.accent) && theme.accent) ? theme.accent : (DEFAULTS.theme.accent ?? '#7dd3fc'));
    const sans = String((theme.sansFont && theme.sansFont.trim()) || (DEFAULTS.theme.sansFont ?? 'system-ui, sans-serif'));
    const mono = String((theme.monoFont && theme.monoFont.trim()) || (DEFAULTS.theme.monoFont ?? 'ui-monospace, SFMono-Regular, monospace'));

    root.style.setProperty('--background-color', bg);
    root.style.setProperty('--window-color', win);
    root.style.setProperty('--text-color', txt);
    root.style.setProperty('--accent-color', acc);
    root.style.setProperty('--button-text-color', txt);
    root.style.setProperty('--sans-font', sans);
    root.style.setProperty('--mono-font', mono);
}

/**
 * @param {string} rawText
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
export function updateThemeValue(rawText, key, value) {
    let text = rawText;
    const frontmatterRegex = /^\s*---\s*([\s\S]*?)\s*---/;
    const match = text.match(frontmatterRegex);

    if (match) {
        const fullMatch = match[0];
        const fmContent = match[1];

        const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keyRegex = new RegExp(`^(\\s*${safeKey}\\s*:).*$`, 'm');

        let newFmContent;
        if (keyRegex.test(fmContent)) {
            newFmContent = fmContent.replace(keyRegex, `$1 ${value}`);
        } else {
            newFmContent = fmContent.trimEnd() + `\n${key}: ${value}\n`;
        }

        text = text.replace(fullMatch, () => fullMatch.replace(fmContent, () => newFmContent));
        return text;
    }

    return `---\n${key}: ${value}\n---\n\n` + text;
}
