from __future__ import annotations

from typing import Any
import numpy as np


def _to_numpy(tensor: Any) -> np.ndarray:
    if hasattr(tensor, 'detach'):
        tensor = tensor.detach().cpu().float().numpy()
    return np.asarray(tensor, dtype=np.float32)


def summarize_tensor(tensor: Any) -> dict[str, Any]:
    array = _to_numpy(tensor)
    if array.size == 0:
        return {'shape': list(array.shape), 'min': 0.0, 'max': 0.0, 'mean': 0.0, 'std': 0.0}
    return {
        'shape': list(array.shape),
        'min': float(np.min(array)),
        'max': float(np.max(array)),
        'mean': float(np.mean(array)),
        'std': float(np.std(array)),
    }


def make_compact_heatmap(matrix: Any, max_width: int = 64, max_height: int = 64) -> dict[str, Any]:
    array = _to_numpy(matrix)
    if array.ndim > 2:
        array = np.squeeze(array)
    if array.ndim != 2:
        array = array.reshape(1, -1)
    height, width = array.shape
    row_indices = np.linspace(0, max(0, height - 1), min(height, max_height)).astype(int)
    col_indices = np.linspace(0, max(0, width - 1), min(width, max_width)).astype(int)
    sampled = array[np.ix_(row_indices, col_indices)] if height and width else np.zeros((0, 0), dtype=np.float32)
    min_value = float(np.min(sampled)) if sampled.size else 0.0
    max_value = float(np.max(sampled)) if sampled.size else 0.0
    denominator = max(max_value - min_value, 1e-12)
    normalized = (sampled - min_value) / denominator if sampled.size else sampled
    return {
        'width': int(sampled.shape[1]) if sampled.ndim == 2 else 0,
        'height': int(sampled.shape[0]) if sampled.ndim == 2 else 0,
        'values': [float(value) for value in normalized.flatten()],
        'minValue': min_value,
        'maxValue': max_value,
    }


def extract_top_attention_links(attention_matrix: Any, top_k_per_token: int = 3, layer_index: int = 0, head_index: int | None = None) -> list[dict[str, Any]]:
    array = _to_numpy(attention_matrix)
    if array.ndim > 2:
        array = np.squeeze(array)
    if array.ndim != 2:
        return []
    links: list[dict[str, Any]] = []
    for source_token_index, row in enumerate(array):
        if row.size == 0:
            continue
        top_indices = np.argsort(row)[-top_k_per_token:][::-1]
        for target_token_index in top_indices:
            link = {
                'sourceTokenIndex': int(source_token_index),
                'targetTokenIndex': int(target_token_index),
                'weight': float(row[target_token_index]),
                'layerIndex': int(layer_index),
            }
            if head_index is not None:
                link['headIndex'] = int(head_index)
            links.append(link)
    return links
