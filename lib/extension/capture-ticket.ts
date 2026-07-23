import { createHash, randomBytes } from "node:crypto";
import { queryTencent } from "@/lib/tencent-db";

const TICKET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type CaptureTicketMaterial = {
  token: string;
  digest: string;
};

/** A ticket is scoped server-side to one user and source BV id, and is single-use. */
export function createCaptureTicketMaterial(): CaptureTicketMaterial {
  const token = randomBytes(32).toString("base64url");
  return { token, digest: digestCaptureTicket(token) };
}

export function digestCaptureTicket(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseCaptureTicket(value: string | null | undefined): string | null {
  const token = value?.trim() ?? "";
  return TICKET_PATTERN.test(token) ? token : null;
}

export async function issueCaptureTicket(input: { userId: string; sourceVideoId: string; expiresAt: Date }) {
  const material = createCaptureTicketMaterial();
  await queryTencent(
    `INSERT INTO extension_capture_tickets (token_digest, user_id, source_video_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [material.digest, input.userId, input.sourceVideoId, input.expiresAt],
  );
  return material.token;
}

export async function consumeCaptureTicket(token: string, sourceVideoId: string): Promise<string | null> {
  const result = await queryTencent<{ user_id: string }>(
    `UPDATE extension_capture_tickets
     SET used_at = NOW()
     WHERE token_digest = $1 AND source_video_id = $2 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [digestCaptureTicket(token), sourceVideoId],
  );
  return result.rows[0]?.user_id ?? null;
}
