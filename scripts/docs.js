#!/usr/bin/env node

/**
 * Lightweight Documentation Discovery and Validation Tool for Sirona
 * 
 * Usage:
 *   node scripts/docs.js list
 *   node scripts/docs.js search <keyword>
 *   node scripts/docs.js validate
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.resolve(REPO_ROOT, "docs");

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const yaml = match[1];
  const metadata = {};
  
  for (const line of yaml.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      metadata[key] = val;
    }
  }
  return metadata;
}

function scanDocs(dir = DOCS_DIR, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "_archive") {
        scanDocs(fullPath, fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function listDocs() {
  const files = scanDocs();
  console.log(`\nFound ${files.length} markdown documentation files:\n`);

  for (const file of files) {
    const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const fm = extractFrontmatter(content);
    const title = fm?.title || path.basename(file, ".md");
    console.log(`- [${title}] (${relPath})`);
    if (fm?.summary) {
      console.log(`  ${fm.summary}`);
    }
  }
  console.log("");
}

function searchDocs(query) {
  if (!query) {
    console.error("Please provide a search term.");
    process.exit(1);
  }
  const q = query.toLowerCase();
  const files = scanDocs();
  const results = [];

  for (const file of files) {
    const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const fm = extractFrontmatter(content);
    const title = fm?.title || path.basename(file, ".md");
    const summary = fm?.summary || "";
    
    let score = 0;
    if (title.toLowerCase().includes(q)) score += 10;
    if (summary.toLowerCase().includes(q)) score += 5;
    if (content.toLowerCase().includes(q)) score += 1;

    if (score > 0) {
      results.push({ relPath, title, summary, score });
    }
  }

  results.sort((a, b) => b.score - a.score);

  console.log(`\nSearch results for "${query}":\n`);
  if (results.length === 0) {
    console.log("No matching documentation found.");
  } else {
    for (const res of results) {
      console.log(`- [${res.title}] (${res.relPath}) (relevance: ${res.score})`);
      if (res.summary) console.log(`  ${res.summary}`);
    }
  }
  console.log("");
}

function validateDocs() {
  console.log("\nValidating documentation files, links, and source references...\n");
  const files = scanDocs();
  let errors = 0;

  for (const file of files) {
    const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");

    // Check markdown links: [text](target.md)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const target = match[2];
      if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("#") || target.startsWith("mailto:") || target.startsWith("file://")) {
        continue;
      }
      
      const cleanTarget = target.split("#")[0];
      if (!cleanTarget) continue;

      const resolved = path.resolve(path.dirname(file), cleanTarget);
      if (!fs.existsSync(resolved)) {
        console.error(`[BROKEN LINK] in ${relPath}: Target "${target}" does not exist`);
        errors++;
      }
    }
  }

  if (errors === 0) {
    console.log(`All ${files.length} documentation files validated successfully. No broken links.`);
  } else {
    console.error(`Validation failed with ${errors} error(s).`);
    process.exit(1);
  }
}

const command = process.argv[2] || "list";
if (command === "list") {
  listDocs();
} else if (command === "search") {
  searchDocs(process.argv[3]);
} else if (command === "validate") {
  validateDocs();
} else {
  console.log("Usage: node scripts/docs.js [list|search <term>|validate]");
}
