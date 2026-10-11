import {
    DEFAULTS,
    PACKAGE_MANAGERS,
    parseConfig,
    buildAppState,
    escapeHTML,
    isValidConfigStructure,
    isValidHex
} from './config.js';

export {
    DEFAULTS,
    PACKAGE_MANAGERS,
    parseConfig,
    buildAppState,
    escapeHTML,
    isValidConfigStructure,
    isValidHex
};

/** @type {any | null} */
let brotliModule = null;

/**
 * @returns {Promise<any>}
 */
export async function initBrotli() {
    if (!brotliModule) {
        const brotli = await import('brotli-wasm');
        brotliModule = brotli.default;
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
 * @param {string} domain
 * @returns {string}
 */
export function getFaviconUrl(domain) {
    return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
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
