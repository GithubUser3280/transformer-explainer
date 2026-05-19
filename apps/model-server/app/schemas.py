from typing import Any, Literal
from pydantic import BaseModel, Field


class TraceRequest(BaseModel):
    prompt: str = Field(min_length=0, max_length=4000)
    maxGeneratedTokens: int | None = Field(default=1, ge=1, le=4)
    topK: int | None = Field(default=10, ge=1, le=50)
    modelName: str | None = None


class HealthResponse(BaseModel):
    status: Literal['ok'] = 'ok'
    modelLoaded: bool
    modelId: str


TransformerTrace = dict[str, Any]
