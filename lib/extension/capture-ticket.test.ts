import assert from "node:assert/strict";
import test from "node:test";
import { createCaptureTicketMaterial, parseCaptureTicket } from "./capture-ticket";

test("creates a high-entropy capture ticket and stores only its digest", () => {
  const ticket = createCaptureTicketMaterial();
  assert.match(ticket.token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(ticket.digest, /^[a-f0-9]{64}$/);
  assert.notEqual(ticket.token, ticket.digest);
});

test("accepts only a well-formed extension capture ticket", () => {
  const { token } = createCaptureTicketMaterial();
  assert.equal(parseCaptureTicket(token), token);
  assert.equal(parseCaptureTicket("Bearer " + token), null);
  assert.equal(parseCaptureTicket("short"), null);
});
