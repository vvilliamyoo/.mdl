import { buildShareLink, downloadConfig, importShareLink } from './configIO.js';
import { generateAndCopyShareLink, importConfigFile, resetConfiguration } from './configWorkflow.js';

/**
 * @typedef {object} ConfigActionDependencies
 * @property {(text: string) => void} setDraft
 * @property {(message: string) => void} notify
 * @property {(message: string) => boolean} confirmReset
 * @property {() => void} reload
 * @property {() => string} getLocation
 * @property {(input: string) => Promise<string>} [importLink]
 * @property {(file: Pick<File, 'text'>) => Promise<string>} [readFile]
 * @property {(text: string, location: string) => Promise<string>} [generateAndCopy]
 * @property {(text: string) => void} [download]
 * @property {() => void} [reset]
 */

/**
 * @param {ConfigActionDependencies} dependencies
 */
export function createConfigActions(dependencies) {
    const importLink = dependencies.importLink ?? importShareLink;
    const readFile = dependencies.readFile ?? importConfigFile;
    const generateAndCopy = dependencies.generateAndCopy ?? generateAndCopyShareLink;
    const download = dependencies.download ?? downloadConfig;
    const reset = dependencies.reset ?? resetConfiguration;

    return {
        /** @param {string} input */
        async importFromLink(input) {
            try {
                const text = await importLink(input);
                if (!text) return false;
                dependencies.setDraft(text);
                dependencies.notify("Config imported from link! Click 'Save' to apply.");
                return true;
            } catch (error) {
                console.error('Failed to import from link', error);
                dependencies.notify('Invalid share link or hash.');
                return false;
            }
        },

        /** @param {Pick<File, 'text'>} file */
        async importFromFile(file) {
            try {
                const text = await readFile(file);
                dependencies.setDraft(text);
                dependencies.notify("Config imported! Click 'Save' to apply.");
                return true;
            } catch (error) {
                console.error('Failed to read file', error);
                return false;
            }
        },

        /** @param {string} text */
        downloadDraft(text) {
            download(text);
        },

        /** @param {string} text */
        async generateShareLink(text) {
            try {
                await generateAndCopy(text, dependencies.getLocation());
                dependencies.notify('Share link copied to clipboard!');
                return true;
            } catch (error) {
                console.error('Failed to generate share link', error);
                dependencies.notify('Failed to generate share link.');
                return false;
            }
        },

        reset() {
            if (!dependencies.confirmReset('Reset everything?')) return false;
            reset();
            dependencies.reload();
            return true;
        }
    };
}
