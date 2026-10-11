import { STORAGE_KEY } from './appState.js';
import { resetAppStore } from './appStore.js';
import { resetQueueState } from './queueStore.js';
import { buildShareLink } from './configIO.js';
import { copyText } from './browserApi.js';

/**
 * Generate a share URL and copy it to the clipboard.
 * @param {string} rawText
 * @param {string} location
 * @param {(text: string, location: string) => Promise<string>} [linkBuilder]
 * @param {(text: string) => Promise<void>} [copy]
 * @returns {Promise<string>}
 */
export async function generateAndCopyShareLink(rawText, location, linkBuilder = buildShareLink, copy = copyText) {
    const url = await linkBuilder(rawText, location);
    await copy(url);
    return url;
}

/**
 * Read an uploaded configuration file as text.
 * @param {Pick<File, 'text'>} file
 * @returns {Promise<string>}
 */
export async function importConfigFile(file) {
    const text = await file.text();
    if (!text) {
        throw new Error('The selected configuration file is empty.');
    }
    return text;
}

/**
 * Clear persisted and in-memory configuration state.
 * @param {Pick<Storage, 'removeItem'>} [storage=localStorage]
 */
export function resetConfiguration(storage = localStorage) {
    storage.removeItem(STORAGE_KEY);
    resetAppStore();
    resetQueueState();
}
