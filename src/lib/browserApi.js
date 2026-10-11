/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = typeof ev.target?.result === 'string' ? ev.target.result : '';
            if (!text) {
                reject(new Error('File is empty.'));
                return;
            }
            resolve(text);
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsText(file);
    });
}

/**
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function copyText(text) {
    if (!navigator.clipboard) {
        throw new Error('Clipboard API unavailable.');
    }
    await navigator.clipboard.writeText(text);
}

/**
 * @param {string} message
 */
export function showAlert(message) {
    window.alert(message);
}

/**
 * @param {string} message
 * @returns {boolean}
 */
export function showConfirm(message) {
    return window.confirm(message);
}
