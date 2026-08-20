#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const ignoredDirectories = new Set([".git", "node_modules"]);
const localHosts = new Set(["swellmarketing.xyz", "www.swellmarketing.xyz", "local.test"]);
const managedStoragePrefix = "/manus-storage/";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(absolute));
    } else {
      files.push(absolute);
    }
  }

  return files;
}

function pageUrl(file) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (relative === "index.html") return new URL("https://local.test/");
  if (relative.endsWith("/index.html")) {
    return new URL(`https://local.test/${relative.slice(0, -"index.html".length)}`);
  }
  return new URL(`https://local.test/${relative}`);
}

async function resolveLocalPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded.replace(/^\/+/, "");
  const candidates = [];

  if (decoded.endsWith("/")) {
    candidates.push(path.join(root, relative, "index.html"));
  } else {
    candidates.push(path.join(root, relative));
    candidates.push(path.join(root, `${relative}.html`));
    candidates.push(path.join(root, relative, "index.html"));
  }

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next supported static-route shape.
    }
  }

  return null;
}

function attributes(markup, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')`, "gi");
  return [...markup.matchAll(pattern)].map((match) => match[1] ?? match[2] ?? "");
}

function ids(markup) {
  return attributes(markup, "id");
}

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const htmlCache = new Map();
const issues = [];

for (const file of htmlFiles) {
  const markup = await readFile(file, "utf8");
  htmlCache.set(file, markup);
  const source = path.relative(root, file);

  const h1Count = (markup.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) {
    issues.push(`${source}: expected exactly one h1, found ${h1Count}`);
  }

  if (!/<title>[^<]+<\/title>/i.test(markup)) {
    issues.push(`${source}: missing a non-empty title element`);
  }

  const jsonLdPattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of markup.matchAll(jsonLdPattern)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      issues.push(`${source}: invalid JSON-LD (${error.message})`);
    }
  }

  const seenIds = new Set();
  for (const id of ids(markup)) {
    if (seenIds.has(id)) {
      issues.push(`${path.relative(root, file)}: duplicate id "#${id}"`);
    }
    seenIds.add(id);
  }
}

for (const file of htmlFiles) {
  const markup = htmlCache.get(file);
  const source = path.relative(root, file);
  const references = [
    ...attributes(markup, "href").map((value) => ({ attribute: "href", value })),
    ...attributes(markup, "src").map((value) => ({ attribute: "src", value }))
  ];

  for (const { attribute, value } of references) {
    if (!value || value === "#") {
      issues.push(`${source}: empty ${attribute} target "${value}"`);
      continue;
    }

    if (/^(?:mailto:|tel:|data:|javascript:)/i.test(value)) continue;

    let url;
    try {
      url = new URL(value.replaceAll("&amp;", "&"), pageUrl(file));
    } catch {
      issues.push(`${source}: invalid ${attribute} URL "${value}"`);
      continue;
    }

    if (!localHosts.has(url.hostname)) continue;
    if (url.pathname.startsWith("/_vercel/")) continue;
    if (url.pathname.startsWith(managedStoragePrefix)) continue;

    const target = await resolveLocalPath(url.pathname);
    if (!target) {
      issues.push(`${source}: missing local target "${value}"`);
      continue;
    }

    if (url.hash && target.endsWith(".html")) {
      const fragment = decodeURIComponent(url.hash.slice(1));
      const targetMarkup = htmlCache.get(target) ?? await readFile(target, "utf8");
      if (!ids(targetMarkup).includes(fragment)) {
        issues.push(`${source}: missing fragment "#${fragment}" in ${path.relative(root, target)}`);
      }
    }
  }
}

if (issues.length) {
  console.error(`Link check failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Link check passed: ${htmlFiles.length} HTML files, all local href/src targets and fragments resolved.`);
}
