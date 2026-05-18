# Model Server

FastAPI service that returns compact, canonical `TransformerTrace` JSON for the 3D frontend. Local defaults use fake traces so development does not download a model.

## Local fake trace mode

```bash
cd apps/model-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
USE_FAKE_TRACE=true uvicorn app.main:app --reload
```

## Real Qwen3 trace mode

```bash
cd apps/model-server
source .venv/bin/activate
USE_FAKE_TRACE=false MODEL_ID=Qwen/Qwen3-0.6B uvicorn app.main:app --reload
```

The initial real tracer uses `AutoTokenizer` and `AutoModelForCausalLM` on CPU, requests hidden states and attentions when supported, and serializes only summaries, compact heatmaps, and top attention links. It intentionally does not emit full hidden states, full attention tensors, Q/K/V tensors, or weights.

## Security

Set `REQUIRE_BACKEND_SECRET=true` in hosted deployments and configure `BACKEND_SHARED_SECRET`. Requests must include `X-Backend-Shared-Secret` with the matching value. Never log or commit the shared secret.
