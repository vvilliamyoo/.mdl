import { PACKAGE_MANAGERS } from "./config.js";
/** @typedef {import('./types.js').PackageManagerType} PackageManagerType */
/** @typedef {import('./types.js').QueueItem} QueueItem */
/** @typedef {import('./types.js').PackageQueues} PackageQueues */
/** @typedef {import('./types.js').AppSection} AppSection */

/**
 * @returns {PackageQueues}
 */
export function createPmQueues() {
  return {
    winget: new Map(),
    choco: new Map(),
    apt: new Map(),
  };
}

/**
 * @param {AppSection[] | undefined} state
 * @param {PackageManagerType} pmType
 * @returns {QueueItem[]}
 */
export function getQueueItemsForManager(state, pmType) {
  if (!state) return [];

  return state.flatMap((section) =>
    section.apps
      .filter((app) => app.pmData.some((pm) => pm.type === pmType))
      .map((app) => {
        const match = app.pmData.find((pm) => pm.type === pmType);
        if (!match) return null;
        return {
          id: match.id,
          domain: app.domain ?? "",
          appName: app.name,
        };
      })
      .filter((item) => item !== null),
  );
}

/**
 * @param {PackageQueues} pmQueues
 * @param {PackageManagerType} pmType
 * @param {string | number} id
 * @returns {boolean}
 */
export function isQueueItemAdded(pmQueues, pmType, id) {
  return !!pmQueues[pmType]?.has(id);
}

/**
 * @param {PackageQueues} pmQueues
 * @param {PackageManagerType} pmType
 * @param {string | number} id
 * @param {string} domain
 * @param {string} appName
 * @returns {{ queues: PackageQueues; action: 'Added' | 'Removed'; key: string }}
 */
export function toggleQueueItem(pmQueues, pmType, id, domain, appName) {
  const queue = pmQueues[pmType];
  const key = `${pmType}-${id}`;
  const wasAdded = queue.has(id);

  if (wasAdded) {
    queue.delete(id);
  } else {
    queue.set(id, { id, domain, appName });
  }

  return {
    queues: { ...pmQueues },
    action: wasAdded ? "Removed" : "Added",
    key,
  };
}

/**
 * @param {PackageQueues} pmQueues
 * @param {AppSection[] | undefined} state
 * @param {PackageManagerType} pmType
 * @returns {{ queues: PackageQueues; areAllAdded: boolean }}
 */
export function toggleAllQueueItems(pmQueues, state, pmType) {
  const allItems = getQueueItemsForManager(state, pmType);
  const queue = pmQueues[pmType];
  const areAllAdded = allItems.length > 0 && allItems.every((item) => queue.has(item.id));

  allItems.forEach((item) => {
    if (areAllAdded) {
      queue.delete(item.id);
    } else {
      queue.set(item.id, item);
    }
  });

  return {
    queues: { ...pmQueues },
    areAllAdded: !areAllAdded,
  };
}

/**
 * @param {PackageQueues} pmQueues
 * @param {PackageManagerType} pmType
 * @returns {string}
 */
export function buildPmCommand(pmQueues, pmType) {
  return `${PACKAGE_MANAGERS[pmType]} ${Array.from(pmQueues[pmType].keys()).join(" ")}`;
}
