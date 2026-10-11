import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { get } from 'svelte/store';
import { clearAllFeedback, feedbackStore, showFeedback } from './uiFeedback.js';

afterEach(() => {
    clearAllFeedback();
});

test('new feedback replaces the previous action and timeout for the same key', async () => {
    showFeedback('winget-app', 'Added', 15);
    await new Promise((resolve) => setTimeout(resolve, 5));
    showFeedback('winget-app', 'Removed', 35);

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(get(feedbackStore)['winget-app'], 'Removed');

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(get(feedbackStore)['winget-app'], null);
});

test('clearing all feedback cancels pending timers and resets state', async () => {
    showFeedback('choco-app', 'Added', 15);
    clearAllFeedback();

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.deepEqual(get(feedbackStore), {});
});
