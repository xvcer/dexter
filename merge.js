#!/usr/bin/env bun

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dirname,
  DIR = join(ROOT, "task");
const OUTPUT = "task.md";

const readMd = async (file_path) => {
  const content = await readFile(file_path, "utf-8");
  return content.trim() + "\n\n";
};

const getSortedFiles = (files) => {
  const sorted = files
    .filter((f) => f.endsWith(".md") && f !== OUTPUT)
    .sort((a, b) => {
      if (a === "design.md") return -1;
      if (b === "design.md") return 1;
      return a.localeCompare(b);
    });
  return sorted;
};

const main = async () => {
  const files = await readdir(DIR);
  const sorted_files = getSortedFiles(files);

  const contents = await Promise.all(sorted_files.map((f) => readMd(join(DIR, f))));

  await writeFile(join(ROOT, OUTPUT), contents.join(""));
};

await main();
