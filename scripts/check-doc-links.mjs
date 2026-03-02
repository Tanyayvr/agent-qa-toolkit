#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs);
    if (entry.isDirectory()) {
      if (
        rel.startsWith('node_modules') ||
        rel.startsWith('.git') ||
        rel.startsWith('coverage') ||
        rel.startsWith('apps/runner/runs') ||
        rel.startsWith('apps/evaluator/reports') ||
        rel.startsWith('docs/internal') ||
        rel.startsWith('docs/demo')
      ) {
        continue;
      }
      walk(abs, out);
      continue;
    }
    if (entry.isFile() && abs.endsWith('.md')) out.push(abs);
  }
  return out;
}

function shouldSkip(link) {
  return (
    !link ||
    link.startsWith('#') ||
    link.startsWith('http://') ||
    link.startsWith('https://') ||
    link.startsWith('mailto:') ||
    link.startsWith('data:') ||
    link.startsWith('file://')
  );
}

const roots = [path.join(ROOT, 'README.md'), path.join(ROOT, 'docs')]
  .filter((p) => existsSync(p));

const files = [];
for (const root of roots) {
  if (root.endsWith('.md')) files.push(root);
  else walk(root, files);
}

const uniqueFiles = [...new Set(files.map((p) => path.resolve(p)))];
const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
const broken = [];

for (const file of uniqueFiles) {
  const text = readFileSync(file, 'utf-8');
  let match;
  while ((match = linkRe.exec(text))) {
    const raw = match[1].trim();
    if (shouldSkip(raw)) continue;
    const target = raw.split('#')[0].split('?')[0];
    if (!target) continue;
    const abs = path.resolve(path.dirname(file), target);
    if (!existsSync(abs)) {
      broken.push({ file: path.relative(ROOT, file), link: raw });
    }
  }
}

if (broken.length > 0) {
  console.error(`Broken markdown links: ${broken.length}`);
  for (const item of broken) {
    console.error(`- ${item.file} -> ${item.link}`);
  }
  process.exit(1);
}

console.log(`OK: checked ${uniqueFiles.length} markdown files, no broken local links.`);
