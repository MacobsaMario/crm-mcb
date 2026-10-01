# vinext-starter

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from `oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build and verify the rendered development-preview metadata
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Heroku Production (PostgreSQL + Backblaze B2)

The Cloudflare/Vite development path remains local and continues to use Miniflare D1/R2. Heroku uses the Next.js Node runtime, PostgreSQL through Drizzle, and Backblaze B2's S3-compatible API. A standard database backup/migration from the local D1 SQLite file is not performed automatically; review and import business records separately before switching production traffic.

Create a Heroku app, attach a Heroku Postgres plan, create a private Backblaze B2 bucket, and create an application key restricted to that bucket with read/write access. Configure these Heroku Config Vars:

- `MACOBSA_AUTH_SECRET`: a random secret of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
- `B2_BUCKET`: the bucket name.
- `B2_REGION`: the B2 S3 region, for example `us-west-004`.
- `B2_KEY_ID`: the B2 application key ID.
- `B2_APPLICATION_KEY`: the B2 application key secret.
- `B2_ENDPOINT`: optional; defaults to `https://s3.<B2_REGION>.backblazeb2.com`.
- `CEO_PRESENTATION_PIN`, `CEO_PRESENTATION_SIGNING_SECRET`, and `MACOBSA_IMPORT_SECRET`: set these if the corresponding protected operations are needed.

Heroku supplies `DATABASE_URL` when its Postgres add-on is attached. The `Procfile` applies PostgreSQL migrations in the release phase and starts the Next.js server on Heroku's assigned port. The production build adds the `crm_users` account table; only emails already authorized in `app/access-control.ts` can sign in.

Provision each user's password from an interactive terminal so it is not included in shell history or a deployment command:

```sh
heroku run "npm run auth:provision -- mario@mariocoka.com" -a YOUR_HEROKU_APP
```

Enter a password of at least 12 printable ASCII characters twice when prompted. Repeat for each approved email. The command stores a salted scrypt hash and can also reset a password. Users sign in at `/login`; sessions use an eight-hour, signed, HttpOnly, Secure cookie. Do not set `MACOBSA_LOCAL_DEV_EMAIL` or `VITE_MACOBSA_LOCAL_DEV_EMAIL` on Heroku.

Deploy only after the production database and B2 keys are configured. The D1 snapshot/manifest and legacy D1 audit-processing endpoints are intentionally unavailable on Heroku until they are ported to PostgreSQL; they remain available in the Cloudflare runtime. Files already stored in Cloudflare R2 are not copied to Backblaze automatically. Copy and verify those objects before changing production traffic.

Use build commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
