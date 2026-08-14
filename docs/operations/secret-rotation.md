# Secret rotation runbook

This runbook covers third-party API credentials used by Teach Player, including `ASR_API_KEY`. It never contains a real credential value.

## Trigger

Use this procedure when a credential is committed, printed in logs, shared through an unsafe channel, exposed to a client bundle, or suspected to be compromised.

## Authorization boundary

Provider-console rotation, production environment updates, history rewriting, deployment and credential revocation require explicit user authorization. Code changes may prepare safe failure behavior before that authorization.

## Procedure

1. Record the provider, affected environment, first known exposure commit and consumers without copying the credential value.
2. In the provider console, create a replacement credential with the minimum required scope and an identifiable owner.
3. Store the replacement in the approved server-side secret store. Do not paste it into source code, shell history, tickets, chat, screenshots or application logs.
4. Deploy a candidate that reads only the environment variable and fails safely when it is missing.
5. Verify the candidate with a non-sensitive fixture:
   - missing configuration returns a generic 5xx configuration response;
   - no outbound provider request is made before configuration is validated;
   - configured transcription succeeds without logging request headers, response bodies, uploaded paths or transcript text.
6. Switch production traffic to the candidate and observe only status code, latency, model alias and request result counts.
7. Revoke the exposed credential in the provider console after the replacement is confirmed.
8. Search tracked files and approved history scope for credential patterns. Record only file paths, commit IDs and remediation status.

## Rollback

If the replacement fails, roll back the application version while keeping the exposed credential revoked. Create another replacement credential; never restore the exposed value. If production must remain unavailable, return the documented configuration error instead of silently using a fallback credential.

## Evidence checklist

- Provider-console rotation timestamp and operator
- Candidate build ID and deployment timestamp
- Missing-configuration test result
- Configured non-sensitive fixture result
- Redacted log review
- Exposed credential revocation confirmation
- Approved history-scan result
