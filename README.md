---
title: Transformer Explainer
emoji: 🧠
colorFrom: blue
colorTo: indigo
sdk: docker
app_file: app.py
pinned: false
---

# Transformer Explainer

A scaffold for a performant, browser-based 3D explainer for modern decoder-only LLM internals. The frontend renders abstract transformer architecture objects from a canonical `TransformerTrace` IR. The backend produces one compact trace per prompt, and the browser animates locally from that trace instead of calling the model server for every visualization step.

## Architecture

```text
User browser
  |
  | static assets + same-origin /api/trace calls
  v
Cloudflare Pages (Git integration from the release branch)
  |
  | Pages Functions handle /api/*, /login, /logout, and protected /app/*
  v
Same Pages project auth/proxy layer
  |  - verifies signed HttpOnly session cookie
  |  - attaches X-Backend-Shared-Secret
  v
Hugging Face Docker Space CPU Basic
  |
  | Model-specific tracer
  v
Qwen/Qwen3-0.6B tracer -> canonical TransformerTrace IR -> model-agnostic React Three Fiber renderer
```

## Why Qwen/Qwen3-0.6B first?

Qwen/Qwen3-0.6B is the primary real model target because it is modern enough to represent grouped-query attention, RoPE, RMSNorm, pre-normalization, and SwiGLU-style visualization concepts while remaining small enough to have a chance on free or low-cost CPU hosting. GPT-2 is intentionally not the architecture baseline.

## Static frontend vs dynamic backend

The frontend is a static Vite/React/Three.js app deployable to Cloudflare Pages. It only knows about same-origin `/api/trace`; it never embeds a Hugging Face Space URL. The model server is dynamic and computes a compact trace once per prompt. The scene consumes only the canonical `TransformerTrace` IR so Qwen, Gemma, Mistral, or later model tracers can be added without rewriting the renderer.

The frontend now includes a password login modal. Live trace generation requires a successful `/login` call and session cookie.

## Local setup

Install JavaScript dependencies:

```bash
pnpm install
```

Run the web app with local fake traces available in the UI:

```bash
pnpm dev:web
```

Run the backend in fake trace mode:

```bash
cd apps/model-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
USE_FAKE_TRACE=true uvicorn app.main:app --reload
```

Run the backend against the real model on CPU:

```bash
cd apps/model-server
source .venv/bin/activate
USE_FAKE_TRACE=false MODEL_ID=Qwen/Qwen3-0.6B uvicorn app.main:app --reload
```

Run the Worker locally:

```bash
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
pnpm dev:worker
```

Generate a local password hash for `ACCESS_PASSWORD_HASH`:

```bash
node -e 'const crypto=require("crypto"); const password=process.argv[1]; const salt=crypto.randomBytes(16).toString("hex"); const hash=crypto.createHash("sha256").update(salt + ":" + password).digest("hex"); console.log(salt + ":" + hash);' 'your-local-password'
```

## Environment variables

### Root `.env.example`

- `BACKEND_BASE_URL=http://localhost:7860`
- `MODEL_ID=Qwen/Qwen3-0.6B`
- `USE_FAKE_TRACE=true`

### Frontend

- No Hugging Face URL is required in frontend code.
- Local Vite dev proxies `/api` to `http://localhost:7860`.
- Production API access is same-origin through the Worker.

### Worker

Configure in `.dev.vars` locally and Cloudflare secrets in production:

- `ACCESS_PASSWORD_HASH`: salted SHA-256 value in `salt:hash` format.
- `COOKIE_SIGNING_SECRET`: high-entropy secret for HMAC session cookies.
- `BACKEND_BASE_URL`: Hugging Face Space base URL or local backend URL.
- `BACKEND_SHARED_SECRET`: secret forwarded to the model server.

### Model server

- `MODEL_ID` default: `Qwen/Qwen3-0.6B`
- `USE_FAKE_TRACE` default: `true`
- `PRELOAD_MODEL` default: `false`
- `MAX_PROMPT_TOKENS` default: `48`
- `MAX_SELECTED_LAYERS` default: `6`
- `REQUIRE_BACKEND_SECRET` default: `false` locally; set `true` when hosted.
- `BACKEND_SHARED_SECRET`: required when `REQUIRE_BACKEND_SECRET=true`.

### GitHub Actions secrets

Normal Cloudflare Pages Git integration does not require Cloudflare deploy secrets in GitHub Actions:

- `CLOUDFLARE_API_TOKEN` is not needed for frontend deployment.
- `CLOUDFLARE_ACCOUNT_ID` is not needed for frontend deployment.

Required only when using GitHub Actions for Worker deployment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional/required for Hugging Face Space sync, depending on whether you use the GitHub workflow or deploy the Space manually:

- `HF_TOKEN`
- `HF_SPACE_REPO` such as `your-org/transformer-explainer-model`

### Production runtime secrets and hosted variables

Cloudflare Worker runtime secrets must be configured in Cloudflare and must not be committed:

- `ACCESS_PASSWORD_HASH`
- `COOKIE_SIGNING_SECRET`
- `BACKEND_BASE_URL`
- `BACKEND_SHARED_SECRET`

Hugging Face Space variables/secrets:

- `MODEL_ID=Qwen/Qwen3-0.6B-Base`
- `USE_FAKE_TRACE=false`
- `PRELOAD_MODEL=false`
- `MAX_PROMPT_TOKENS=48`
- `MAX_SELECTED_LAYERS=6`
- `REQUIRE_BACKEND_SECRET=true`
- `BACKEND_SHARED_SECRET=<same value as Worker BACKEND_SHARED_SECRET>`

## Deployment

### Cloudflare Pages Git integration

The frontend production deployment path is Cloudflare Pages Git integration, not GitHub Actions Direct Upload. Configure the Pages project manually in Cloudflare with these exact settings:

- Create application → Pages → Connect to Git.
- Select this GitHub repository.
- Production branch: `release`.
- Build command: `pnpm install --frozen-lockfile && pnpm build:web`.
- Build output directory: `apps/web/dist`.
- Root directory: repository root.
- Preview branch control:
  - include `main`
  - include `preview/*`
  - exclude `codex/*`

Branch intent:

- `release` is the only production frontend deployment branch.
- `main` is the integration/testing branch and can have Cloudflare Pages preview deployments.
- `preview/*` branches are intentional preview deployment branches.
- `codex/*` branches are for Codex PR work and must not deploy to Cloudflare Pages.

Cloudflare Pages preview deployments are public by default unless protected with Cloudflare Access. Protect preview deployments with Cloudflare Access or keep the app/API password-gated so preview URLs do not expose an unprotected app.

### Optional Cloudflare Pages Direct Upload fallback

Direct Upload is no longer the primary frontend deployment path. Use it only as a manual fallback after building `apps/web/dist`, for example:

```bash
pnpm build:web
pnpm deploy:web:fallback
```

Do not add automatic GitHub Actions push triggers for Pages Direct Upload or for `codex/*` branches.

### Cloudflare Worker

Recommended deployment posture:

- Cloudflare Pages uses Git integration for the frontend.
- The Worker can use either Cloudflare Workers Git integration or the existing GitHub Actions workflow.
- If using Workers Git integration, configure the root directory as `apps/worker`, ensure the Worker name in `apps/worker/wrangler.toml` matches the Worker name configured in Cloudflare, set production deployment to the `release` branch, and do not enable automatic deploys from `codex/*` branches.
- If using GitHub Actions for Worker deployment, keep `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` configured as GitHub secrets. The existing `deploy-worker.yml` workflow deploys only from `workflow_dispatch` or a push to `release`.

Set Worker secrets with `wrangler secret put ACCESS_PASSWORD_HASH`, `COOKIE_SIGNING_SECRET`, and `BACKEND_SHARED_SECRET`. Set `BACKEND_BASE_URL` to the Hugging Face Space URL.

### Hugging Face Docker Space

Create a Docker Space on Hugging Face CPU Basic and deploy only `apps/model-server` contents. The conservative GitHub workflow can push to a separate Space repo on `workflow_dispatch` or a push to `release` when `HF_TOKEN` and `HF_SPACE_REPO` are configured. It does not deploy on PRs. Otherwise, manually push the model-server directory to the Space repository.


### Cloudflare Pages Functions routing (production)

This repo now uses **Cloudflare Pages Functions in `/functions` (repository root)** for production auth/proxy routing when you do not have a custom domain:

- `/api/*` → requires signed session cookie, proxies to `BACKEND_BASE_URL`, injects `X-Backend-Shared-Secret`.
- `/login` (POST) → verifies password hash, sets signed cookie.
- `/logout` (POST) → clears signed cookie.
- `/app/*` → requires signed session cookie and returns `X-Robots-Tag: noindex, nofollow`.

This removes ambiguity where same-origin `/api/trace` could be treated as static Pages content and return `405 Method Not Allowed`.


Troubleshooting:

- If `POST /api/trace` returns `405 Method Not Allowed`, Cloudflare Pages likely did not deploy Functions from the repository-root `/functions` directory, or the deployment is serving an older commit. Verify the latest production deployment commit in the Cloudflare Pages dashboard and redeploy if needed.

- If `POST /api/trace` returns `401 Unauthorized`, auth is active and the frontend should prompt for the shared password modal before retrying real trace generation.
- Users must log in through the UI before real trace generation succeeds; fake trace generation remains available when logged out.

## Cloudflare deployment checklist

### Frontend Pages

- [ ] Cloudflare Pages project created through Connect to Git.
- [ ] Production branch set to `release`.
- [ ] Preview branch controls set to `main` and `preview/*` only.
- [ ] `codex/*` excluded.
- [ ] Build command is `pnpm install --frozen-lockfile && pnpm build:web`.
- [ ] Output directory is `apps/web/dist`.
- [ ] Environment variables are set if needed.
- [ ] Preview deployments are either Access-protected or password-gated.

### Worker

- [ ] Worker secrets configured.
- [ ] `/health` works.
- [ ] `/login` works.
- [ ] `/api/*` rejects requests without session cookie.
- [ ] Proxied `/api/trace` attaches `X-Backend-Shared-Secret`.

### Backend

- [ ] Hugging Face Docker Space deployed.
- [ ] `/health` works.
- [ ] Direct backend request without `X-Backend-Shared-Secret` fails when `REQUIRE_BACKEND_SECRET=true`.
- [ ] Worker-proxied request succeeds.

## Branch behavior

| Branch | CI | Frontend deploy | Worker deploy | Model server deploy |
|---|---|---|---|---|
| codex/* | yes on PR | no | no | no |
| main | yes | preview only | no | no |
| preview/* | optional | preview only | no | no |
| release | yes | production | production if configured | model sync/deploy |

## Security model

- Production `/app` and `/api/*` are protected by the Worker.
- The Worker verifies a signed `HttpOnly; Secure; SameSite=Strict` session cookie.
- Passwords are not stored in plaintext; `ACCESS_PASSWORD_HASH` uses `salt:sha256(salt:password)`.
- The Worker attaches `X-Backend-Shared-Secret` to backend requests.
- Hosted model servers should set `REQUIRE_BACKEND_SECRET=true`.
- No real secrets belong in source code, examples, `wrangler.toml`, or tests.

## Performance rules

- The React Three Fiber canvas caps device pixel ratio to `[1, 1.5]`.
- Shadows and heavy postprocessing are avoided by default.
- Repeated token objects use instancing.
- Most UI text is plain HTML; Drei Text is limited to selected 3D labels.
- The renderer consumes compact summaries, heatmaps, and sparse top-k attention links, never full tensors.
- Frontend animation should avoid React state updates inside `useFrame`.

## Testing commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:ts
pnpm build:web
pnpm build
pnpm lint
cd apps/model-server && USE_FAKE_TRACE=true pytest -q
pnpm test:e2e
```

The root `pnpm test` runs TS tests and attempts backend pytest only when a Python pytest environment is available.

## API endpoints

Model server:

- `GET /health`
- `GET /api/health`
- `POST /api/trace`

Worker:

- `GET /health`
- `POST /login` with `{ "password": "..." }`
- `POST /logout`
- Protected proxy for `/api/*`

## Future roadmap

- Deeper Q/K/V forward-hook tracing without changing the external `TransformerTrace` API.
- Optional Qwen3-1.7B mode for environments with more CPU/RAM.
- Gemma comparison later.
- Architecture comparison mode across Qwen, Gemma, Mistral, and other decoder-only families.
