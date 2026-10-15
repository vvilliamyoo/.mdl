import { base64UrlToBytes, bytesToBase64Url, initBrotli } from "./utils.js";

/**
 * @param {string} rawInput
 * @returns {string}
 */
export function normalizeShareHash(rawInput) {
  const input = rawInput.trim();
  if (!input) return "";

  let hashData = input;
  if (hashData.includes("#data=")) {
    hashData = hashData.split("#data=")[1];
  }
  if (hashData.startsWith("data=")) {
    hashData = hashData.substring(5);
  }
  return hashData;
}

/**
 * @param {string} hashData
 * @returns {Promise<string>}
 */
export async function decodeShareHash(hashData) {
  const brotli = await initBrotli();
  const compressedBytes = base64UrlToBytes(hashData);
  const decompressedBytes = brotli.decompress(compressedBytes);
  return new TextDecoder().decode(decompressedBytes);
}

/**
 * @param {string} rawInput
 * @returns {Promise<string>}
 */
export async function importShareLink(rawInput) {
  const hashData = normalizeShareHash(rawInput);
  if (!hashData) {
    throw new Error("Share link or hash is empty.");
  }
  return decodeShareHash(hashData);
}

/**
 * @param {string} rawText
 * @param {string} location
 * @returns {Promise<string>}
 */
export async function buildShareLink(rawText, location) {
  const brotli = await initBrotli();
  const textBytes = new TextEncoder().encode(rawText);
  const compressed = brotli.compress(textBytes);
  const base64 = bytesToBase64Url(compressed);
  return `${location}#data=${base64}`;
}

/**
 * @param {string} rawText
 * @param {string} [filename='config.md']
 */
export function downloadConfig(rawText, filename = "config.md") {
  const blob = new Blob([rawText], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
