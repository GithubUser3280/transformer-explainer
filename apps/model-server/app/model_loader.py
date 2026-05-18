from __future__ import annotations

from typing import Any

_tokenizer: Any | None = None
_model: Any | None = None
_loaded_model_id: str | None = None


def is_model_loaded() -> bool:
    return _tokenizer is not None and _model is not None


def load_model(model_id: str) -> tuple[Any, Any]:
    global _tokenizer, _model, _loaded_model_id
    if is_model_loaded() and _loaded_model_id == model_id:
        return _tokenizer, _model

    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch

    _tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    _model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.float32,
        device_map=None,
        low_cpu_mem_usage=True,
        trust_remote_code=True,
    )
    _model.eval()
    _model.to('cpu')
    _loaded_model_id = model_id
    return _tokenizer, _model
