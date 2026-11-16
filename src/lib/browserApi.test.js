import assert from "node:assert/strict";
import { afterEach, test } from "vite-plus/test";
import { copyText, readFileAsText, showAlert, showConfirm } from "./browserApi.js";

const originalFileReader = Object.getOwnPropertyDescriptor(globalThis, "FileReader");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

afterEach(() => {
  if (originalFileReader) Object.defineProperty(globalThis, "FileReader", originalFileReader);
  else Reflect.deleteProperty(globalThis, "FileReader");

  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else Reflect.deleteProperty(globalThis, "navigator");

  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

test("reads file text and rejects empty or unreadable files", async () => {
  let result = "configuration";
  class MockFileReader {
    /** @type {((event: ProgressEvent<FileReader>) => void) | null} */
    onload = null;
    /** @type {((event: ProgressEvent<FileReader>) => void) | null} */
    onerror = null;

    readAsText() {
      if (this.onload) Reflect.apply(this.onload, this, [{ target: { result } }]);
    }
  }
  Object.defineProperty(globalThis, "FileReader", { configurable: true, value: MockFileReader });

  assert.equal(await readFileAsText(/** @type {File} */ ({})), "configuration");

  result = "";
  await assert.rejects(readFileAsText(/** @type {File} */ ({})), /File is empty/);

  class FailedFileReader extends MockFileReader {
    readAsText() {
      if (this.onerror) Reflect.apply(this.onerror, this, []);
    }
  }
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: FailedFileReader,
  });
  await assert.rejects(readFileAsText(/** @type {File} */ ({})), /Failed to read file/);
});

test("copies text and reports when clipboard support is unavailable", async () => {
  /** @type {string[]} */
  const copied = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (/** @type {string} */ text) => {
          copied.push(text);
        },
      },
    },
  });
  await copyText("copied");
  assert.deepEqual(copied, ["copied"]);

  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} });
  await assert.rejects(copyText("not copied"), /Clipboard API unavailable/);
});

test("delegates alerts and confirmation to the browser window", () => {
  /** @type {string[]} */
  const alerts = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      alert: (/** @type {string} */ message) => {
        alerts.push(message);
      },
      confirm: (/** @type {string} */ message) => message === "confirm?",
    },
  });

  showAlert("notice");
  assert.deepEqual(alerts, ["notice"]);
  assert.equal(showConfirm("confirm?"), true);
  assert.equal(showConfirm("other"), false);
});
