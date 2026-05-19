from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from fastapi import Depends, FastAPI
from .fake_trace import build_fake_trace
from .model_loader import is_model_loaded, load_model
from .qwen3_tracer import build_qwen3_trace
from .schemas import HealthResponse, TraceRequest
from .security import require_shared_secret
from .settings import Settings, get_settings


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if settings.preload_model and not settings.use_fake_trace:
        load_model(settings.model_id)
    yield


app = FastAPI(title='Transformer 3D Explainer Model API', lifespan=lifespan)


@app.get('/health', response_model=HealthResponse)
def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(modelLoaded=is_model_loaded(), modelId=settings.model_id)


@app.get('/api/health', response_model=HealthResponse)
def api_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return health(settings)


@app.post('/api/trace')
def create_trace(
    request: TraceRequest,
    settings: Settings = Depends(get_settings),
    _: None = Depends(require_shared_secret),
) -> dict:
    model_name = request.modelName or settings.model_id
    if settings.use_fake_trace:
        return build_fake_trace(request.prompt)
    return build_qwen3_trace(request.prompt, settings, model_name=model_name, top_k=request.topK or 10)
