#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const UPSTREAM_URL = "https://github.com/microsoft/winget-pkgs.git";
const RAW_URL = "https://raw.githubusercontent.com/microsoft/winget-pkgs";
const FIELDS = [
  "id",
  "name",
  "publisher",
  "description",
  "version",
  "homepage",
  "category",
  "tags",
];
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,127}$/;
const CATALOG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATEGORY_RULES = [
  ["browsers", /(browser|chromium|gecko|firefox|chrome|brave|opera|vivaldi)/i],
  ["gaming", /(game|gaming|steam|emulator|minecraft|chess|tetris)/i],
  [
    "communication",
    /(chat|messag|email|mail|teams|zoom|slack|discord|telegram|voip|webinar|conferenc)/i,
  ],
  [
    "security",
    /(password|vpn|antivirus|firewall|secur|privacy|2fa|authenticat|keepass|bitwarden)/i,
  ],
  ["media", /(audio|video|media|music|photo|image|podcast|stream|player|camera|codec)/i],
  ["office", /(office|word|excel|pdf|note|markdown|todo|calendar|document|spreadsheet)/i],
  [
    "development",
    /(develop|editor|ide|code|git|python|node|java|jdk|docker|compiler|terminal|powershell|vim|debug|api|sdk|framework|languag|program)/i,
  ],
  [
    "utilities",
    /(util|tool|archiv|backup|driver|file|disk|search|compress|zip|sync|tweak|launcher|manager|clean|monitor)/i,
  ],
];

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}.`);
  return value;
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}

function positiveInteger(value, name) {
  const number = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(number) || number < 1)
    throw new Error(`--${name} must be a positive integer.`);
  return number;
}

function git(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error)
        reject(new Error(`git ${args.join(" ")} failed: ${stderr.trim() || error.message}`));
      else resolve(stdout.trim());
    });
  });
}

async function ensureCheckout(workdir) {
  const repoDir = path.join(workdir, "winget-pkgs");
  let hasCheckout = false;
  try {
    await fs.access(path.join(repoDir, ".git"));
    hasCheckout = true;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  if (hasCheckout) {
    console.log("[catalog] fetching the latest Winget manifests…");
    await git(["fetch", "--depth", "1", "origin", "master"], repoDir);
    const revision = "FETCH_HEAD";
    return { repoDir, revision, sha: await git(["rev-parse", "--short", revision], repoDir) };
  }

  await fs.mkdir(workdir, { recursive: true });
  console.log("[catalog] cloning a blobless Winget manifest index…");
  await git(
    ["clone", "--depth", "1", "--filter=blob:none", "--sparse", UPSTREAM_URL, repoDir],
    workdir,
  );
  return {
    repoDir,
    revision: "HEAD",
    sha: await git(["rev-parse", "--short", "HEAD"], repoDir),
  };
}

function listTree(repoDir, revision, directory) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["ls-tree", "-r", "-z", revision, "--", directory], {
      cwd: repoDir,
    });
    const chunks = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`git ls-tree failed for ${directory}: ${stderr.trim()}`));
        return;
      }
      const entries = Buffer.concat(chunks)
        .toString("utf8")
        .split("\0")
        .flatMap((record) => {
          const match = record.match(/^[0-9]+\s+blob\s+([0-9a-f]+)\t(.+)$/);
          return match ? [{ path: match[2], oid: match[1] }] : [];
        });
      resolve(entries);
    });
  });
}

async function listDirectories(repoDir, revision, treePath) {
  const output = await git(["ls-tree", "-d", "--name-only", `${revision}:${treePath}`], repoDir);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function compareVersions(left, right) {
  const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  return collator.compare(String(left), String(right));
}

async function collectLocaleManifests(repoDir, revision, maxPackages) {
  const buckets = await listDirectories(repoDir, revision, "manifests");
  const wanted = [];
  const manifestBlobs = new Map();
  let packageCount = 0;
  let versionCount = 0;

  for (const bucket of buckets) {
    const files = await listTree(repoDir, revision, `manifests/${bucket}`);
    const packages = new Map();
    for (const { path: filePath, oid } of files) {
      const relative = filePath.slice("manifests/".length);
      const parts = relative.split("/");
      if (parts.length < 4) continue;
      const file = parts.at(-1);
      const version = parts.at(-2);
      if (!/\.locale\.[^/]+\.ya?ml$/i.test(file)) continue;
      const packageKey = parts.slice(0, -2).join("/");
      const versions = packages.get(packageKey) ?? new Map();
      const versionFiles = versions.get(version) ?? [];
      versionFiles.push({ path: filePath, oid });
      versions.set(version, versionFiles);
      packages.set(packageKey, versions);
    }

    for (const versions of packages.values()) {
      packageCount += 1;
      versionCount += versions.size;
      if (maxPackages !== null && wanted.length >= maxPackages) continue;
      const candidates = [...versions.entries()].sort(([left], [right]) =>
        compareVersions(right, left),
      );
      for (const [, filesForVersion] of candidates) {
        const locales = filesForVersion.sort((left, right) => {
          const leftEnglish = /\.locale\.en-US\.ya?ml$/i.test(left.path) ? 0 : 1;
          const rightEnglish = /\.locale\.en-US\.ya?ml$/i.test(right.path) ? 0 : 1;
          return leftEnglish - rightEnglish || left.path.localeCompare(right.path);
        });
        const locale = locales[0];
        if (locale) {
          wanted.push(locale.path);
          manifestBlobs.set(locale.path, locale.oid);
          break;
        }
      }
    }
    console.log(`[catalog] indexed manifest bucket ${bucket}: ${packageCount} package IDs`);
  }

  return { wanted, manifestBlobs, packageCount, versionCount };
}

async function fetchText(url, attempts = 4) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "mdl-winget-catalog-builder" },
      });
      if (response.ok) return await response.text();
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      if (attempt === attempts - 1)
        throw new Error(`HTTP ${response.status} after ${attempts} attempts.`);
    } catch (error) {
      if (attempt === attempts - 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw new Error(`Could not fetch ${url}.`);
}

function gitBlobId(content) {
  const header = Buffer.from(`blob ${content.length}\0`);
  return createHash("sha1").update(header).update(content).digest("hex");
}

async function downloadManifests(
  workdir,
  repoDir,
  commit,
  wanted,
  manifestBlobs,
  allowCache,
  concurrency = 8,
) {
  const cacheRoot = path.join(workdir, "subset");
  const destination = path.join(cacheRoot, allowCache ? "manifests" : "source-manifests");
  const cacheMetadataPath = path.join(cacheRoot, "manifest-cache.json");
  await fs.mkdir(cacheRoot, { recursive: true });
  let cachedBlobs = {};
  try {
    cachedBlobs = JSON.parse(await fs.readFile(cacheMetadataPath, "utf8"));
    if (!cachedBlobs || typeof cachedBlobs !== "object" || Array.isArray(cachedBlobs)) {
      throw new Error(`Invalid manifest cache metadata in ${cacheMetadataPath}.`);
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const legacyDirectories = (await fs.readdir(cacheRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^[0-9a-f]{40}$/i.test(entry.name))
    .map((entry) => path.join(cacheRoot, entry.name));
  const currentBlobs = {};
  const queue = [...wanted];
  const failures = [];
  let completed = 0;
  let downloaded = 0;
  let reused = 0;

  async function worker() {
    while (queue.length > 0) {
      const manifestPath = queue.pop();
      if (!manifestPath) continue;
      const localPath = path.join(destination, manifestPath);
      try {
        const blobId = manifestBlobs.get(manifestPath);
        if (!blobId) throw new Error(`Missing Git blob ID for ${manifestPath}.`);
        let cacheIsCurrent = false;
        if (allowCache && cachedBlobs[manifestPath] === blobId) {
          const cached = await fs.stat(localPath).catch((error) => {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
            throw error;
          });
          cacheIsCurrent = Boolean(cached?.isFile() && cached.size > 0);
        }

        if (cacheIsCurrent) {
          reused += 1;
        } else {
          await fs.mkdir(path.dirname(localPath), { recursive: true });
          let migrated = false;
          if (allowCache) {
            for (const legacyDirectory of legacyDirectories) {
              const legacyPath = path.join(legacyDirectory, manifestPath);
              let content;
              try {
                content = await fs.readFile(legacyPath);
              } catch (error) {
                if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
                throw error;
              }
              if (gitBlobId(content) !== blobId) continue;
              await fs.writeFile(`${localPath}.${process.pid}.tmp`, content);
              await fs.rename(`${localPath}.${process.pid}.tmp`, localPath);
              migrated = true;
              reused += 1;
              break;
            }
          }

          if (!migrated) {
            const sourcePath = path.join(repoDir, manifestPath);
            const localSource = await fs.stat(sourcePath).catch((error) => {
              if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
              throw error;
            });
            const temporaryPath = `${localPath}.${process.pid}.tmp`;
            if (localSource?.isFile()) {
              await fs.copyFile(sourcePath, temporaryPath);
            } else {
              const encodedPath = manifestPath.split("/").map(encodeURIComponent).join("/");
              const text = await fetchText(`${RAW_URL}/${commit}/${encodedPath}`);
              await fs.writeFile(temporaryPath, text, "utf8");
            }
            await fs.rename(temporaryPath, localPath);
            downloaded += 1;
          }
        }
        currentBlobs[manifestPath] = blobId;
      } catch (error) {
        failures.push(`${manifestPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
      completed += 1;
      if (completed % 1000 === 0) {
        console.log(`[catalog] fetched ${completed}/${wanted.length} locale manifests`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(queue.length, 1)) }, worker),
  );
  if (allowCache) await writeJson(cacheMetadataPath, currentBlobs);
  console.log(
    `[catalog] downloaded ${downloaded} manifests; reused ${reused}; ${failures.length} failed`,
  );
  return { destination: path.join(destination, "manifests"), failures };
}

function cleanText(value, limit) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

function normalizeTags(value) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [
    ...new Set(
      values
        .map((tag) => cleanText(String(tag), 60).replace(/\s+/g, "-").toLowerCase())
        .filter((tag) => /^[a-z0-9][a-z0-9-]*$/.test(tag)),
    ),
  ].slice(0, 12);
}

function inferCategory(name, publisher, tags) {
  const searchableText = `${name} ${publisher} ${tags.join(" ")}`;
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(searchableText))?.[0] ?? "other";
}

function getWebUrl(...values) {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      const url = new URL(value.trim());
      if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch {
      continue;
    }
  }
  return "";
}

async function readCatalogApps(manifestsRoot, wanted, maxPackages) {
  const apps = [];
  const seen = new Set();
  const skipped = {
    "missing-id": 0,
    "invalid-id": 0,
    "missing-name": 0,
    "invalid-yaml": 0,
    "read-error": 0,
  };

  for (const relativePath of wanted) {
    if (maxPackages !== null && apps.length >= maxPackages) break;
    const filePath = path.join(manifestsRoot, relativePath.slice("manifests/".length));
    let manifest;
    try {
      manifest = parseYaml(await fs.readFile(filePath, "utf8"));
      if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
        skipped["invalid-yaml"] += 1;
        continue;
      }
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        skipped["read-error"] += 1;
      else skipped["invalid-yaml"] += 1;
      continue;
    }

    const id = cleanText(manifest.PackageIdentifier, 128);
    if (!id) {
      skipped["missing-id"] += 1;
      continue;
    }
    if (!ID_PATTERN.test(id)) {
      skipped["invalid-id"] += 1;
      continue;
    }
    if (seen.has(id.toLocaleLowerCase())) continue;

    const name = cleanText(manifest.PackageName, 120).replace(
      /\s+\([A-Za-z]{2}(?:[-_][A-Za-z]{2})?\)$/,
      "",
    );
    if (!name) {
      skipped["missing-name"] += 1;
      continue;
    }
    const publisher = cleanText(manifest.Publisher, 80);
    const tags = normalizeTags(manifest.Tags);
    apps.push({
      id,
      name,
      publisher,
      description: cleanText(manifest.ShortDescription || manifest.Description, 280),
      version: cleanText(manifest.PackageVersion, 60) || path.basename(path.dirname(filePath)),
      homepage: getWebUrl(manifest.PackageUrl, manifest.PublisherUrl),
      category: inferCategory(name, publisher, tags),
      tags,
    });
    seen.add(id.toLocaleLowerCase());
  }

  apps.sort((left, right) => left.id.localeCompare(right.id));
  return { apps, skipped };
}

async function writeJson(destination, value) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value), "utf8");
  await fs.rename(temporary, destination);
}

async function main() {
  const startedAt = Date.now();
  const workdir = path.resolve(
    option("workdir", path.join(CATALOG_ROOT, ".cache", "winget-pkgs-src")),
  );
  const outputDir = path.resolve(option("output", path.join(CATALOG_ROOT, "public", "data")));
  const minPackages = positiveInteger(option("min-packages", "2000"), "min-packages");
  const maxPackages = option("max-packages", null);
  const maximum = maxPackages === null ? null : positiveInteger(maxPackages, "max-packages");
  let repoDir;
  let revision;
  let upstreamSha;

  if (option("source", null) || flag("no-clone")) {
    repoDir = path.resolve(option("source", path.join(workdir, "winget-pkgs")));
    revision = "HEAD";
    upstreamSha = await git(["rev-parse", "--short", revision], repoDir);
    console.log(`[catalog] using local source ${repoDir} (${upstreamSha})`);
  } else {
    ({ repoDir, revision, sha: upstreamSha } = await ensureCheckout(workdir));
    console.log(`[catalog] upstream commit ${upstreamSha}`);
  }

  const { wanted, manifestBlobs, packageCount, versionCount } = await collectLocaleManifests(
    repoDir,
    revision,
    maximum,
  );
  if (wanted.length === 0) throw new Error("No Winget locale manifests were found.");
  console.log(
    `[catalog] ${packageCount} package IDs, ${versionCount} versions, fetching ${wanted.length} manifests`,
  );

  const fullCommit = await git(["rev-parse", revision], repoDir);
  const { destination, failures } = await downloadManifests(
    workdir,
    repoDir,
    fullCommit,
    wanted,
    manifestBlobs,
    !option("source", null) && !flag("no-clone"),
  );
  const { apps, skipped } = await readCatalogApps(destination, wanted, maximum);
  if (apps.length === 0)
    throw new Error("No valid application records could be built from the manifests.");

  const smokeTest = maximum !== null;
  const generatedAt = new Date().toISOString();
  const complete = !smokeTest && failures.length === 0 && apps.length >= minPackages;
  const meta = {
    generator: "tools/build-catalog.mjs",
    source: UPSTREAM_URL,
    upstreamCommit: upstreamSha,
    generatedAt,
    complete,
    smokeTest,
    count: apps.length,
    upstreamPackageIds: packageCount,
    upstreamVersions: versionCount,
    downloadFailed: failures.length,
    skipped,
    fields: FIELDS,
  };
  const rows = apps.map((app) => [
    app.id,
    app.name,
    app.publisher,
    app.description,
    app.version,
    app.homepage,
    app.category,
    app.tags.join(" "),
  ]);

  await writeJson(path.join(outputDir, "catalog-full.json"), { meta, fields: FIELDS, apps: rows });

  const popularIdsPath = path.join(CATALOG_ROOT, "tools", "popular-ids.txt");
  let popularIds = [];
  try {
    const content = await fs.readFile(popularIdsPath, "utf8");
    const requestedIds = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    const available = new Set(apps.map((app) => app.id));
    popularIds = requestedIds.filter((id) => available.has(id));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  await writeJson(path.join(outputDir, "popular.json"), {
    meta: { generatedAt, count: popularIds.length },
    ids: popularIds,
  });

  const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[catalog] wrote ${apps.length} applications; download failures=${failures.length}; skipped=${JSON.stringify(skipped)}`,
  );
  console.log(`[catalog] COMPLETE=${complete}; elapsed=${duration}s`);
  if (!smokeTest && !complete) {
    throw new Error(
      `Catalog is incomplete: indexed ${apps.length} applications (minimum ${minPackages}); ${failures.length} download failures.`,
    );
  }
}

const invokedAsScript =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedAsScript) {
  main().catch((error) => {
    console.error(`[catalog] FATAL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
