# Mobile Bearer Auth Bridge

The Expo app stores the Supabase session in `expo-secure-store` and sends API requests with:

```http
Authorization: Bearer <supabase_access_token>
```

The existing Next.js backend should keep cookie auth for web users, but API routes used by the Android app need to accept Bearer tokens too.

## Recommended Server Change

Add a helper beside the existing Supabase quota/auth helper:

```ts
import { getAuthenticatedUserIdFromBearer } from "@teach-player/next-auth-bridge";

export async function getAuthenticatedUserIdFromRequest(request: Request) {
  const bearerUserId = await getAuthenticatedUserIdFromBearer(request, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  });

  if (bearerUserId) {
    return bearerUserId;
  }

  return getAuthenticatedUserId();
}
```

Then update mobile-facing routes to call `getAuthenticatedUserIdFromRequest(request)` instead of cookie-only `getAuthenticatedUserId()`:

- `GET /api/me`
- `GET /api/history`
- `POST /api/notes`
- `POST /api/user-vocabulary`
- `POST /api/user-quotes`
- `POST /api/stripe/create-checkout-session`
- Any future expensive route that should count authenticated quota

Do not accept `userId` from the client body. The server must derive it from Supabase auth only.

## Stripe Deep Links

Allow optional `successUrl` and `cancelUrl` in checkout creation:

```ts
const RequestSchema = z.object({
  priceId: z.string().min(1).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});
```

Use these values only after the authenticated user is resolved:

```ts
success_url: parsed.data.successUrl ?? `${appUrl}/?checkout=success`,
cancel_url: parsed.data.cancelUrl ?? `${appUrl}/?checkout=cancelled`,
```

The Android app sends:

- `teachplayer://checkout/success`
- `teachplayer://checkout/cancelled`
