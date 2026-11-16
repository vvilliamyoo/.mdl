import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { expect, test } from "vite-plus/test";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("production CSS preserves the standard backdrop filter declaration", async () => {
  await build({ root: projectRoot });

  const assetDirectory = path.join(projectRoot, "dist", "assets");
  const cssFiles = (await readdir(assetDirectory)).filter((file) => file.endsWith(".css"));
  const css = (
    await Promise.all(cssFiles.map((file) => readFile(path.join(assetDirectory, file), "utf8")))
  ).join("\n");
  const declarations = css
    .replace(/@supports[^{}]*\{/g, "")
    .replaceAll("-webkit-backdrop-filter:var(--blur)", "");

  expect(declarations.includes("backdrop-filter:var(--blur)")).toBe(true);
});
