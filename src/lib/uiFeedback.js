import { writable } from 'svelte/store';

/** @typedef {Record<string, 'Added' | 'Removed' | null>} FeedbackState */

/** @type {import('svelte/store').Writable<FeedbackState>} */
export const feedbackStore = writable({});

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const feedbackTimers = new Map();

/**
 * @param {string} key
 * @param {'Added' | 'Removed'} action
 * @param {number} [duration=1000]
 */
export function showFeedback(key, action, duration = 1000) {
    const existingTimer = feedbackTimers.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    feedbackStore.update((feedback) => ({ ...feedback, [key]: action }));
    feedbackTimers.set(key, setTimeout(() => {
        feedbackTimers.delete(key);
        feedbackStore.update((feedback) => ({ ...feedback, [key]: null }));
    }, duration));
}

/** Clears feedback and its pending timeout, if any. */
export function clearAllFeedback() {
    for (const timer of feedbackTimers.values()) {
        clearTimeout(timer);
    }
    feedbackTimers.clear();
    feedbackStore.set({});
}
