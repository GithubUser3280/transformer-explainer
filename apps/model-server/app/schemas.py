from typing import Any, Literal
from pydantic import BaseModel, Field


class TraceRequest(BaseModel):
    prompt: str = Field(min_length=0, max_length=4000)
    max_prompt_tokens: int | None = Field(default=None, ge=1, le=256)
    selected_layer_indices: list[int] | None = None


class HealthResponse(BaseModel):
    status: Literal['ok'] = 'ok'
    modelLoaded: bool
    modelId: str


TransformerTrace = dict[str, Any]
