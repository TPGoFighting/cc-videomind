# Teach Player Android App

React Native + Expo client for Teach Player.

## Development

```powershell
npm ci
npm run mobile:start
```

Create `apps/mobile/.env` with:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-teach-player-web-app.example.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

For an Android emulator talking to a local Next.js backend, use:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

## Backend Integration

The mobile app sends Supabase access tokens as Bearer auth. See:

- `docs/backend-mobile-auth.md`
- `docs/android-qa-performance.md`

## Release checks

Run the checks that protect the Android release contract before building:

```powershell
npm run test:release-contract
npm run mobile:typecheck
```

Android release artifacts must be signed with the production keystore. On the
secure build machine, copy `apps/mobile/android/release-signing.properties.example`
to `apps/mobile/android/release-signing.properties`, fill in the keystore values,
then run the Gradle release task. The properties file and keystores are ignored by
Git on purpose; the build fails instead of silently falling back to a debug key.

Release APKs are generated per CPU architecture to avoid shipping four native
library sets in every direct download. Publish the `arm64-v8a` artifact for most
modern physical Android devices; use the matching ABI artifact for other devices.

The Android build requires a local JDK in addition to the Android SDK.

## Web configuration parity

For a production Android build, copy `apps/mobile/.env.production.example` to
`apps/mobile/.env.production` on the secure build machine. Its API origin must
match the target Web deployment's `NEXT_PUBLIC_APP_URL`; the Android file is
ignored by Git.

Before signing an APK, verify the two files without printing their values:

```powershell
npm run verify:mobile-web-config -- `
  --web-env /secure/path/to/web/.env.production `
  --mobile-env apps/mobile/.env.production
```

The command rejects an API-origin mismatch, so a release cannot silently point
at another Web environment.
