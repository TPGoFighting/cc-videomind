- Milestone 10: Add Stripe Checkout and webhook subscription sync.

  Add:
  - lib/stripe/client.ts
  - lib/stripe/prices.ts
  - app/api/stripe/create-checkout-session/route.ts
  - app/api/webhooks/stripe/route.ts
  - app/settings/page.tsx

  Plans:
  - free: 3 videos/month
  - pro: 100 videos/month
  - top-up credits can be added later, but design schema to support it.

  Checkout:
  - Authenticated users can create a checkout session for Pro.
  - Use Stripe customer ID if profile already has one.
  - Store userId and plan in checkout metadata.
  - Return checkout URL.

  Webhook:
  - Verify Stripe signature.
  - Handle checkout.session.completed.
  - Handle customer.subscription.updated.
  - Handle customer.subscription.deleted.
  - Handle invoice.payment_succeeded.
  - Handle invoice.payment_failed.
  - Use stripe_events table for idempotency.
  - Update profiles plan, subscription id, billing period, and limits.

  Security:
  - Never trust client metadata alone without validating user/profile.
  - Never process duplicate Stripe events twice.

  Acceptance criteria:
  - Test checkout session can be created.
  - Webhook can update a user to Pro.
  - Duplicate webhook event is ignored safely.
  - Typecheck and lint pass.