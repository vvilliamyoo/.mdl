import { writable, get } from "svelte/store";
import { buildPmCommand, createPmQueues, toggleAllQueueItems, toggleQueueItem } from "./pmQueue.js";
import { PACKAGE_MANAGERS } from "./packageManagers.js";
/** @typedef {import('./types.js').PackageManagerType} PackageManagerType */
/** @typedef {import('./types.js').PackageQueues} PackageQueues */
/** @typedef {import('./types.js').AppSection} AppSection */

/** @type {import('svelte/store').Writable<PackageQueues>} */
export const queueStore = writable(createPmQueues());

/** @returns {PackageQueues} */
export function getQueueState() {
  return get(queueStore);
}

/** @param {PackageQueues} queues @returns {PackageQueues} */
function cloneQueues(queues) {
  /** @type {Partial<PackageQueues>} */
  const cloned = {};
  for (const pm of /** @type {PackageManagerType[]} */ (Object.keys(PACKAGE_MANAGERS))) {
    cloned[pm] = new Map(queues[pm] || []);
  }
  return /** @type {PackageQueues} */ (cloned);
}

/**
 * @param {PackageManagerType} type
 * @param {string | number} id
 * @param {string} domain
 * @param {string} appName
 */
export function toggleQueuedItem(type, id, domain, appName) {
  const result = toggleQueueItem(cloneQueues(getQueueState()), type, id, domain, appName);
  queueStore.set(result.queues);
  return result;
}

/**
 * @param {AppSection[] | undefined} state
 * @param {PackageManagerType} type
 */
export function toggleAllQueuedItems(state, type) {
  const result = toggleAllQueueItems(cloneQueues(getQueueState()), state, type);
  queueStore.set(result.queues);
  return result;
}

/** @param {PackageManagerType} type */
export function getQueuedCommand(type) {
  return buildPmCommand(getQueueState(), type);
}

/** @param {PackageManagerType} type */
export function clearQueuedItems(type) {
  const queues = cloneQueues(getQueueState());
  if (queues[type]) {
    queues[type].clear();
    queueStore.set(queues);
  }
}

export function resetQueueState() {
  queueStore.set(createPmQueues());
}
