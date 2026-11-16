import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";

const defaultConfigPath = fileURLToPath(new URL("./public/config.md", import.meta.url));
const defaultConfigModuleId = "virtual:mdl-default-config";
const resolvedDefaultConfigModuleId = `\0${defaultConfigModuleId}`;

function defaultConfigPlugin() {
  return {
    name: "mdl-default-config",
    resolveId(id) {
      return id === defaultConfigModuleId ? resolvedDefaultConfigModuleId : null;
    },
    async load(id) {
      if (id !== resolvedDefaultConfigModuleId) return null;
      this.addWatchFile(defaultConfigPath);
      return `export default ${JSON.stringify(await readFile(defaultConfigPath, "utf8"))};`;
    },
  };
}

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  base: "/.mdl/",
  plugins: lazyPlugins(() => [defaultConfigPlugin(), svelte()]),
});
