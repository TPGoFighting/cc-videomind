import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "..", ".env.production.local"), "utf-8");

for (const line of content.split(/\r?\n/)) {
  if (line.startsWith("AI_API_KEY=")) {
    let v = line.slice(line.indexOf("=") + 1).trim();
    v = v.slice(1, -1).replace(/\\n/g, "");
    writeFileSync(join(__dirname, "_apikey_clean.txt"), v);
    console.log("Key:", v.slice(0, 5) + "..." + v.slice(-4));
    console.log("Length:", v.length);
    break;
  }
}
