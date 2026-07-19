import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function parseEnv(source) {
  const variables = {};

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator < 1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^("|')|("|')$/g, "");
    variables[key] = value;
  }

  return variables;
}

function toOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function comparePublicRuntimeConfig(webEnv, mobileEnv) {
  const issues = [];
  const webOrigin = toOrigin(webEnv.NEXT_PUBLIC_APP_URL ?? "");
  const mobileOrigin = toOrigin(mobileEnv.EXPO_PUBLIC_API_BASE_URL ?? "");

  if (!webOrigin) {
    issues.push("NEXT_PUBLIC_APP_URL is missing or invalid");
  }
  if (!mobileOrigin) {
    issues.push("EXPO_PUBLIC_API_BASE_URL is missing");
  } else if (webOrigin && mobileOrigin !== webOrigin) {
    issues.push("EXPO_PUBLIC_API_BASE_URL does not match NEXT_PUBLIC_APP_URL");
  }

  return issues;
}

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const webEnvPath = getArgument("--web-env");
  const mobileEnvPath = getArgument("--mobile-env");
  if (!webEnvPath || !mobileEnvPath) {
    throw new Error("Usage: verifyMobileWebConfig --web-env <web .env> --mobile-env <mobile .env.production>");
  }

  const [webSource, mobileSource] = await Promise.all([
    readFile(webEnvPath, "utf8"),
    readFile(mobileEnvPath, "utf8"),
  ]);
  const issues = comparePublicRuntimeConfig(parseEnv(webSource), parseEnv(mobileSource));
  if (issues.length > 0) {
    throw new Error(`Mobile/Web public configuration drift:\n- ${issues.join("\n- ")}`);
  }

  console.log("Mobile/Web public configuration matches.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Configuration verification failed.");
    process.exitCode = 1;
  });
}
