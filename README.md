# Transformer 3D Explainer

A scaffold for a performant, browser-based 3D explainer for modern decoder-only LLM internals. The frontend renders abstract transformer architecture objects from a canonical `TransformerTrace` IR. The backend produces one compact trace per prompt, and the browser animates locally from that trace instead of calling the model server for every visualization step.

## Architecture

```text
User browser
  |
  | static assets + same-origin /api/trace calls
  v
Cloudflare Pages (Direct Upload from GitHub Actions)
  |
  | protected /app and /api routes
  v
Cloudflare Worker auth/proxy
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

Required for Cloudflare deploy workflows:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional for Hugging Face Space deployment workflow:

- `HF_TOKEN`
- `HF_SPACE_REPO` such as `your-org/transformer-3d-explainer-model`

## Deployment

### Cloudflare Pages Direct Upload

The frontend workflow builds `apps/web` and deploys `apps/web/dist` with:

```bash
npx wrangler pages deploy apps/web/dist --project-name transformer-3d-explainer
```

Do not enable Cloudflare Pages automatic Git integration by default. Direct Upload prevents random Codex or preview branch commits from triggering production builds.

### Cloudflare Worker

Deploy the auth/proxy Worker with:

```bash
pnpm deploy:worker
```

Set Worker secrets with `wrangler secret put ACCESS_PASSWORD_HASH`, `COOKIE_SIGNING_SECRET`, and `BACKEND_SHARED_SECRET`. Set `BACKEND_BASE_URL` to the Hugging Face Space URL.

### Hugging Face Docker Space

Create a Docker Space on Hugging Face CPU Basic and deploy only `apps/model-server` contents. The conservative GitHub workflow can push to a separate Space repo when `HF_TOKEN` and `HF_SPACE_REPO` are configured. Otherwise, manually push the model-server directory to the Space repository.

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

## Branch and deploy workflow

- `main`: integration branch; tests only.
- `codex/*`: Codex work branches; tests only.
- `preview/*`: optional manual preview branches; no automatic production deployment unless added later.
- `release`: production deployment branch.
- Production deploys run only by `workflow_dispatch` or pushes to `release`.

## Testing commands

```bash
pnpm typecheck
pnpm test:ts
pnpm build:web
pnpm test:e2e
cd apps/model-server && USE_FAKE_TRACE=true pytest
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
