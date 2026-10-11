/**
 * @param {(text: string) => void} onPause
 * @param {number} delay
 * @returns {{ schedule: (text: string) => void, flush: () => void, clear: () => void }}
 */
export function createParseScheduler(onPause, delay = 300) {
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null;
    /** @type {string | null} */
    let pendingText = null;

    /** @param {string} text */
    function schedule(text) {
        pendingText = text;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            const textToParse = pendingText;
            pendingText = null;
            if (textToParse !== null) onPause(textToParse);
        }, delay);
    }

    function flush() {
        if (!timer || pendingText === null) return false;
        clearTimeout(timer);
        timer = null;
        const textToParse = pendingText;
        pendingText = null;
        onPause(textToParse);
        return true;
    }

    function clear() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        pendingText = null;
    }

    return { schedule, flush, clear };
}
