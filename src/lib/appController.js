import { buildAppState, isValidConfigStructure, parseConfig } from './config.js';
import { persistHydratedConfig } from './appState.js';
import { updateThemeValue } from './theme.js';
/** @typedef {import('./types.js').AppConfig} AppConfig */
/** @typedef {import('./types.js').SaveResult} SaveResult */

/**
 * @param {AppConfig} currentConfig
 * @param {string} text
 * @returns {AppConfig}
 */
export function updateConfigFromText(currentConfig, text) {
    const parsed = parseConfig(text);
    return {
        ...currentConfig,
        rawText: text,
        theme: parsed.theme,
        markdown: parsed.markdown,
        title: parsed.title,
        state: buildAppState(parsed.markdown)
    };
}

/**
 * @param {AppConfig} currentConfig
 * @param {string} key
 * @param {string} value
 * @returns {AppConfig}
 */
export function updateThemeForConfig(currentConfig, key, value) {
    return updateConfigFromText(currentConfig, updateThemeValue(currentConfig.rawText, key, value));
}

/**
 * @param {AppConfig} currentConfig
 * @returns {SaveResult}
 */
export function saveConfig(currentConfig) {
    const validation = isValidConfigStructure(currentConfig.rawText);
    if (!validation.valid) {
        return { valid: false, error: validation.error, config: currentConfig };
    }

    return { valid: true, config: persistHydratedConfig(currentConfig) };
}
