# Agent Instructions

This repository is a pnpm workspace for a model-agnostic 3D transformer explainer.

## Required workflow
- Use `pnpm` for JavaScript/TypeScript dependency management and scripts.
- Run `pnpm typecheck`, `pnpm test:ts`, `pnpm build:web`, and backend pytest checks before finalizing whenever dependencies are available.
- Keep changes on branches/PRs. Do not design automatic production deploys for every branch.
- Favor descriptive names and simple, explicit code over clever abstractions.

## Architecture rules
- The renderer must stay model-agnostic and consume the canonical `TransformerTrace` IR only.
- Do not hardcode GPT-2 assumptions or any model-specific tensor layout in frontend rendering code.
- Any model-specific tracing belongs in `apps/model-server/app/*_tracer.py`, not in the renderer.
- Shared API and trace types belong in `packages/shared-types`.
- Keep frontend animation out of React state loops; do not call React setters from `useFrame`.
- Keep backend trace payloads compact.
- Do not serialize full hidden states, full attention tensors, full Q/K/V tensors, or model weights.

## Security and deployment
- Do not add real secrets to source code, examples, tests, or `wrangler.toml`.
- Use obvious placeholders in `.env.example` and `.dev.vars.example`.
- Production deploys must remain manual or release-branch-only.
- Cloudflare Pages should use Direct Upload from GitHub Actions, not automatic Git integration.
