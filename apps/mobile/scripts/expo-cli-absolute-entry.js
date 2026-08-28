#!/usr/bin/env node

const path = require("path");

const entryFileArgIndex = process.argv.indexOf("--entry-file");
const entryFile = process.argv[entryFileArgIndex + 1];

if (entryFileArgIndex !== -1 && entryFile && !path.isAbsolute(entryFile)) {
  process.argv[entryFileArgIndex + 1] = path.resolve(process.cwd(), entryFile);
}

require("@expo/cli/build/bin/cli");
