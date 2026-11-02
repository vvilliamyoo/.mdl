import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  STORAGE_KEY,
  createEmptyConfig,
  hydrateConfig,
  loadInitialConfig,
  persistConfig,
} from "./appState.js";

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalFetch = globalThis.fetch;

/**
 * @param {Map<string, string>} [values]
 * @returns {{
 *   values: Map<string, string>;
 *   getItem: (key: string) => string | null;
 *   setItem: (key: string, value: string) => void;
 *   removeItem: (key: string) => void;
 * }}
 */
function createStorage(values = new Map()) {
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

afterEach(() => {
  if (originalLocalStorage) Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");

  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");

  globalThis.fetch = originalFetch;
});

void test("creates and hydrates the default config shape", () => {
  assert.deepEqual(createEmptyConfig(), {
    theme: {
      monoFont: "'Source Code Pro', monospace",
      sansFont: "system-ui, sans-serif",
      background: "#191919",
      window: "#29292b",
      text: "#d4d4d4",
      accent: "#375534",
    },
    markdown: "",
    title: ".mdl",
    rawText: "",
  });

  const config = hydrateConfig("# Apps\n- [Example](https://example.com) #[port:example]");
  assert.equal(config.state?.[0]?.apps[0]?.name, "Example");
  assert.deepEqual(config.state?.[0]?.apps[0]?.pmData, [{ type: "port", id: "example" }]);
});

void test("persists config as parsed state under the configured storage key", () => {
  const storage = createStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  const config = persistConfig("# Apps\n- [Example](https://example.com)");

  assert.equal(config.state?.[0]?.apps[0]?.name, "Example");
  assert.deepEqual(JSON.parse(storage.values.get(STORAGE_KEY) ?? ""), config);
});

void test("prefers saved configuration to the network default", async () => {
  const saved = hydrateConfig("# Saved\n- [Saved](https://saved.example)");
  const storage = createStorage(new Map([[STORAGE_KEY, JSON.stringify(saved)]]));
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { hash: "", pathname: "/" } },
  });
  globalThis.fetch = async () => {
    throw new Error("should not fetch when saved config is available");
  };

  const config = await loadInitialConfig("/");
  assert.equal(config.markdown, saved.markdown);
});

void test("removes corrupt saved data and falls back to the default config", async () => {
  const storage = createStorage(new Map([[STORAGE_KEY, "{invalid json"]]));
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { hash: "", pathname: "/" } },
  });
  globalThis.fetch = async () => new Response("# Default\n- [Default](https://default.example)");

  const config = await loadInitialConfig("/");
  assert.equal(storage.values.has(STORAGE_KEY), false);
  assert.equal(config.state?.[0]?.apps[0]?.name, "Default");
});
