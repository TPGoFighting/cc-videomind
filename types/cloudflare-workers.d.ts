/**
 * Minimal Durable Object contracts used by the server-only rate limiter.
 * Wrangler's generated runtime declaration intentionally replaces the standard
 * Fetch types, which makes Next client `Response.json()` resolve to `unknown`.
 * Keep this narrow shim for the shared TypeScript project; Wrangler still
 * supplies the complete runtime types during the Cloudflare deployment build.
 */
declare module "@cloudflare/workers-types" {
  interface DurableObjectStorage {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
  }

  interface DurableObjectState {
    storage: DurableObjectStorage;
  }
}

declare module "cloudflare:workers" {
  import type { DurableObjectState } from "@cloudflare/workers-types";

  export class DurableObject {
    protected readonly ctx: DurableObjectState;
    constructor(ctx: DurableObjectState, env: unknown);
  }
}
