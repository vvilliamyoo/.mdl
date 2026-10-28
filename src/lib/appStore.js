import { derived, get, writable } from "svelte/store";
import { createEmptyConfig, loadInitialConfig } from "./appState.js";
import { saveConfig, updateConfigFromText } from "./appController.js";
import { parseConfig } from "./config.js";
import { updateThemeValue } from "./theme.js";
import { getQueueItemsForManager } from "./pmQueue.js";
import { createParseScheduler } from "./editorScheduler.js";
import { PACKAGE_MANAGERS } from "./packageManagers.js";

/** @typedef {import('./types.js').AppConfig} AppConfig */
/** @typedef {import('./types.js').EditorSession} EditorSession */
/** @typedef {import('./types.js').SaveResult} SaveResult */
/** @typedef {import('./types.js').PackageManagerType} PackageManagerType */
/** @typedef {import('./types.js').AppSection} AppSection */
/** @typedef {import('./types.js').QueueItem} QueueItem */

/** @type {import('svelte/store').Writable<AppConfig>} */
export const appStore = writable(createEmptyConfig());

/** @type {import('svelte/store').Writable<EditorSession>} */
export const editorSessionStore = writable({
  draftText: "",
  initialText: "",
  isEditing: false,
});

/** @type {import('svelte/store').Readable<Record<PackageManagerType, QueueItem[]>>} */
export const pmItemsStore = derived(appStore, ($config) => {
  /** @type {Partial<Record<PackageManagerType, QueueItem[]>>} */
  const queues = {};
  for (const type of /** @type {PackageManagerType[]} */ (Object.keys(PACKAGE_MANAGERS))) {
    queues[type] = getQueueItemsForManager($config.state, type);
  }
  return /** @type {Record<PackageManagerType, QueueItem[]>} */ (queues);
});

const draftParseScheduler = createParseScheduler((text) => {
  const next = updateConfigFromText(get(appStore), text);
  appStore.set(next);
});

/** @param {string} baseUrl @returns {Promise<AppConfig>} */
export async function initializeAppStore(baseUrl) {
  const config = await loadInitialConfig(baseUrl);
  appStore.set(config);
  editorSessionStore.set({
    draftText: config.rawText,
    initialText: config.rawText,
    isEditing: false,
  });
  return config;
}

/** Starts an editor session from the current draft. */
export function beginEditing() {
  const { draftText } = get(editorSessionStore);
  editorSessionStore.set({
    draftText,
    initialText: draftText,
    isEditing: true,
  });
}

export function closeEditor() {
  const session = get(editorSessionStore);
  if (session.draftText !== session.initialText) return false;
  editorSessionStore.set({ ...session, isEditing: false });
  return true;
}

/** @param {string} text */
export function setEditorDraft(text) {
  editorSessionStore.update((session) => ({ ...session, draftText: text }));
  draftParseScheduler.schedule(text);
}

export function flushEditorDraftParse() {
  draftParseScheduler.flush();
  const { draftText } = get(editorSessionStore);
  const current = get(appStore);
  if (current.rawText !== draftText) {
    appStore.set(updateConfigFromText(current, draftText));
  }
}

export function cancelEditorDraft() {
  draftParseScheduler.clear();
  const session = get(editorSessionStore);
  const config = updateConfigFromText(get(appStore), session.initialText);
  appStore.set(config);
  editorSessionStore.set({
    draftText: session.initialText,
    initialText: session.initialText,
    isEditing: false,
  });
  return config;
}

/** @returns {SaveResult} */
export function saveEditorDraft() {
  flushEditorDraftParse();
  const session = get(editorSessionStore);
  let config = get(appStore);

  if (config.rawText !== session.draftText) {
    config = updateConfigFromText(config, session.draftText);
    appStore.set(config);
  }

  const result = saveConfig(config);
  if (!result.valid) return result;

  appStore.set(result.config);
  editorSessionStore.set({
    draftText: result.config.rawText,
    initialText: result.config.rawText,
    isEditing: false,
  });
  return result;
}

/** @returns {AppConfig} */
export function getAppState() {
  return get(appStore);
}

/** @param {string} text @returns {AppConfig} */
export function updateDraftText(text) {
  draftParseScheduler.clear();
  const next = updateConfigFromText(get(appStore), text);
  appStore.set(next);
  editorSessionStore.update((session) => ({ ...session, draftText: text }));
  return next;
}

/**
 * Updates frontmatter-derived values without rebuilding the Markdown app list.
 * @param {string} key
 * @param {string} value
 * @returns {AppConfig}
 */
export function updateDraftThemeText(key, value) {
  flushEditorDraftParse();
  const session = get(editorSessionStore);
  const nextText = updateThemeValue(session.draftText, key, value);
  const current = get(appStore);
  const parsed = parseConfig(nextText);
  const next = {
    ...current,
    rawText: nextText,
    theme: parsed.theme,
    markdown: parsed.markdown,
    title: parsed.title,
  };
  appStore.set(next);
  editorSessionStore.update((currentSession) => ({ ...currentSession, draftText: nextText }));
  return next;
}

export function resetAppStore() {
  appStore.set(createEmptyConfig());
  editorSessionStore.set({ draftText: "", initialText: "", isEditing: false });
}
