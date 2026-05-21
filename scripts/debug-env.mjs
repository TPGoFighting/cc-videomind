import { readFileSync } from "fs";

import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "..", ".env.production.local"), "utf-8");
for (const line of content.split(/\r?\n/)) {
  if (line.startsWith("AI_API_KEY=")) {
    let v = line.slice(line.indexOf("=") + 1).trim();
    v = v.slice(1, -1); // remove quotes
    console.log("Value:", JSON.stringify(v));
    console.log("Length:", v.length);
    console.log("Last 2 chars hex:", [...v.slice(-2)].map(c => c.charCodeAt(0).toString(16)).join(" "));

    // Test regex
    const re = /\\n/g;
    console.log("Regex /\\\\n/g test:", re.test(v));
    console.log("Replace result:", JSON.stringify(v.replace(re, "")));
    console.log("After length:", v.replace(re, "").length);

    // Use String.replaceAll
    console.log("replaceAll result:", JSON.stringify(v.replaceAll("\\n", "")));
    break;
  }
}
