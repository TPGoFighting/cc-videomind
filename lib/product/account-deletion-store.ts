import { createHash, randomBytes, randomUUID } from "node:crypto";
import { queryTencent, withTencentTransaction } from "@/lib/tencent-db";
import {
  canCancelAccountDeletion,
  getAccountDeletionProcessAfter,
  type AccountDeletionStatus,
} from "./account-deletion";

export type AccountDeletionRequest = {
  id: string;
  status: AccountDeletionStatus;
  requestedAt: string;
  processAfter: string;
  completedAt: string | null;
  errorCode: string | null;
  canCancel: boolean;
};

type DeletionRow = {
  id: string;
  user_id: string | null;
  status: AccountDeletionStatus;
  requested_at: Date;
  process_after: Date;
  completed_at: Date | null;
  error_code: string | null;
};

function toDeletionRequest(row: DeletionRow): AccountDeletionRequest {
  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at.toISOString(),
    processAfter: row.process_after.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    errorCode: row.error_code,
    canCancel: canCancelAccountDeletion({ status: row.status, processAfter: row.process_after }),
  };
}

export async function getLatestAccountDeletionRequest(userId: string): Promise<AccountDeletionRequest | null> {
  const result = await queryTencent<DeletionRow>(
    `SELECT id, user_id, status, requested_at, process_after, completed_at, error_code
     FROM account_deletion_requests WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 1`,
    [userId],
  );
  return result.rows[0] ? toDeletionRequest(result.rows[0]) : null;
}

export async function createAccountDeletionRequest(userId: string, email: string): Promise<AccountDeletionRequest> {
  const current = await getLatestAccountDeletionRequest(userId);
  if (current && (current.status === "pending" || current.status === "processing")) return current;

  const id = randomUUID();
  const processAfter = getAccountDeletionProcessAfter();
  const emailHash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const result = await queryTencent<DeletionRow>(
    `INSERT INTO account_deletion_requests (id, user_id, account_email_hash, process_after)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, status, requested_at, process_after, completed_at, error_code`,
    [id, userId, emailHash, processAfter],
  );
  return toDeletionRequest(result.rows[0]);
}

export async function cancelAccountDeletionRequest(userId: string): Promise<AccountDeletionRequest | null> {
  const result = await queryTencent<DeletionRow>(
    `UPDATE account_deletion_requests SET status = 'cancelled', error_code = NULL
     WHERE id = (
       SELECT id FROM account_deletion_requests
       WHERE user_id = $1 AND status = 'pending' AND process_after > NOW()
       ORDER BY requested_at DESC LIMIT 1
     )
     RETURNING id, user_id, status, requested_at, process_after, completed_at, error_code`,
    [userId],
  );
  return result.rows[0] ? toDeletionRequest(result.rows[0]) : null;
}

export async function processDueAccountDeletions(limit = 20): Promise<{
  completed: number;
  failed: number;
  expiredProductEvents: number;
  expiredAuditEvents: number;
}> {
  const [expiredProductEvents, expiredAuditEvents] = await Promise.all([
    queryTencent(`DELETE FROM product_events WHERE expires_at <= NOW()`),
    queryTencent(`DELETE FROM admin_audit_events WHERE expires_at <= NOW()`),
  ]);
  const due = await queryTencent<{ id: string }>(
    `SELECT id FROM account_deletion_requests
     WHERE status = 'pending' AND process_after <= NOW()
     ORDER BY process_after ASC LIMIT $1`,
    [limit],
  );
  let completed = 0;
  let failed = 0;

  for (const { id } of due.rows) {
    try {
      const didComplete = await withTencentTransaction(async (client) => {
        const claimed = await client.query<{ user_id: string | null }>(
          `UPDATE account_deletion_requests SET status = 'processing', error_code = NULL
           WHERE id = $1 AND status = 'pending' RETURNING user_id`,
          [id],
        );
        const userId = claimed.rows[0]?.user_id;
        if (!userId) return false;

        const userResult = await client.query<{ role: string }>(
          `SELECT role FROM app_users WHERE id = $1 FOR UPDATE`,
          [userId],
        );
        if (userResult.rows[0]?.role === "admin") {
          await client.query(
            `UPDATE account_deletion_requests SET status = 'failed', error_code = 'admin_requires_manual_review' WHERE id = $1`,
            [id],
          );
          return false;
        }

        for (const table of [
          "app_sessions",
          "user_ai_settings",
          "user_review_preferences",
          "user_quote_reviews",
          "user_word_reviews",
          "user_vocabulary",
          "user_quotes",
          "user_notes",
          "user_checkins",
          "user_videos",
          "async_tasks",
        ]) {
          await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        }
        await client.query(`DELETE FROM user_privacy_preferences WHERE user_id = $1`, [userId]);
        await client.query(`UPDATE product_events SET user_id = NULL WHERE user_id = $1`, [userId]);
        await client.query(
          `UPDATE payment_submissions
           SET transaction_id = md5(transaction_id), admin_notes = NULL
           WHERE user_id = $1`,
          [userId],
        );

        const tombstone = createHash("sha256").update(userId).digest("hex").slice(0, 24);
        await client.query(
          `UPDATE app_users SET
             email = $2,
             password_hash = $3,
             password_salt = $4,
             role = 'deleted',
             subscription_tier = 'free'
           WHERE id = $1`,
          [
            userId,
            `deleted+${tombstone}@invalid.local`,
            randomBytes(64).toString("hex"),
            randomBytes(16).toString("hex"),
          ],
        );
        await client.query(
          `UPDATE account_deletion_requests
           SET status = 'completed', completed_at = NOW(), error_code = NULL
           WHERE id = $1`,
          [id],
        );
        return true;
      });
      if (didComplete) completed += 1;
      else failed += 1;
    } catch {
      failed += 1;
      await queryTencent(
        `UPDATE account_deletion_requests SET status = 'failed', error_code = 'processing_failed' WHERE id = $1`,
        [id],
      );
    }
  }
  return {
    completed,
    failed,
    expiredProductEvents: expiredProductEvents.rowCount ?? 0,
    expiredAuditEvents: expiredAuditEvents.rowCount ?? 0,
  };
}
