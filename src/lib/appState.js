import { DEFAULTS, parseConfig, buildAppState } from "./config.js";
import { initBrotli, base64UrlToBytes } from "./utils.js";

export const STORAGE_KEY = "mdl_full_data";
/** @typedef {import('./types.js').AppConfig} AppConfig */

/**
 * @returns {AppConfig}
 */
export function createEmptyConfig() {
  return {
    theme: DEFAULTS.theme,
    markdown: "",
    title: DEFAULTS.title,
    rawText: "",
  };
}

/**
 * @param {string} text
 * @returns {AppConfig}
 */
export function hydrateConfig(text) {
  const parsed = parseConfig(text);
  return {
    ...parsed,
    state: buildAppState(parsed.markdown),
  };
}

/**
 * @param {string} text
 */
export function persistConfig(text) {
  const config = hydrateConfig(text);
  return persistHydratedConfig(config);
}

/**
 * @param {AppConfig} config
 * @returns {AppConfig}
 */
export function persistHydratedConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  return config;
}

/**
 * @param {string} baseUrl
 * @returns {Promise<AppConfig>}
 */
export async function loadInitialConfig(baseUrl) {
  let config = createEmptyConfig();

  const hash = window.location.hash;
  if (hash.startsWith("#data=")) {
    try {
      const brotli = await initBrotli();
      const compressedBytes = base64UrlToBytes(hash.substring(6));
      const decompressedBytes = brotli.decompress(compressedBytes);
      const minifiedText = new TextDecoder().decode(decompressedBytes);
      if (minifiedText) {
        config = hydrateConfig(minifiedText);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (e) {
      console.error("Failed to parse URL config with Brotli", e);
    }
  }

  if (!config.markdown) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        config = JSON.parse(saved);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (!config.markdown) {
      try {
        const res = await fetch(`${baseUrl}config.md`);
        if (res.ok) {
          const text = await res.text();
          config = hydrateConfig(text);
        } else {
          console.error("Failed to load config.md:", res.status, res.statusText);
        }
      } catch (err) {
        console.error("Error loading config.md", err);
      }
    }
  }

  if (!config.state) {
    config.state = buildAppState(config.markdown);
  }

  return config;
}
