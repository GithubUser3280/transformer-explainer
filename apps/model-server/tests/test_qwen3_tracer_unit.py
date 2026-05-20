import torch

from app.qwen3_tracer import build_qwen3_trace
from app.settings import Settings


class DummyTokenizer:
    def __call__(self, prompt, return_tensors='pt', truncation=True, max_length=32):
        return {'input_ids': torch.tensor([[10, 11, 12]]), 'attention_mask': torch.tensor([[1, 1, 1]])}

    def convert_ids_to_tokens(self, ids):
        return [f't{token_id}' for token_id in ids]

    def decode(self, ids):
        return f'd{ids[0]}'


class DummyModel:
    def __init__(self):
        self.config = type('cfg', (), {
            'n_layer': 4,
            'n_head': 2,
            'hidden_size': 6,
            'vocab_size': 20,
            'model_type': 'qwen2',
            'num_key_value_heads': 1,
        })
        self.transformer = type('t', (), {'wpe': type('w', (), {'weight': torch.ones((32, 6))})})
        self.embed = type('e', (), {'weight': torch.ones((50, 6))})

    def get_input_embeddings(self):
        return self.embed

    def __call__(self, **kwargs):
        attentions = tuple(torch.softmax(torch.ones((1, 2, 3, 3)), dim=-1) for _ in range(4))
        hidden_states = tuple(torch.ones((1, 3, 6)) * (i + 1) for i in range(5))
        logits = torch.arange(20, dtype=torch.float32).reshape(1, 1, 20)
        return type('o', (), {'attentions': attentions, 'hidden_states': hidden_states, 'logits': logits})


def test_qwen3_tracer_exposes_attention_topk_and_residual(monkeypatch):
    monkeypatch.setattr('app.qwen3_tracer.load_model', lambda model_name: (DummyTokenizer(), DummyModel()))
    trace = build_qwen3_trace('The cat sat', Settings(use_fake_trace=False), model_name='dummy', top_k=5)

    assert trace['model']['sampledLayerIndices']
    assert trace['layers'][0]['attention']['heads']
    assert trace['layers'][0]['attention']['heads'][0]['weights']
    assert trace['output']['nextTokenTopK']
    assert len(trace['output']['nextTokenTopK']) == 5
    assert trace['layers'][0]['residualStream']['tokenNormsAfterMlp']
    assert trace['layers'][0]['residualStream']['tokenMeanAfterMlp']
    assert trace['layers'][0]['residualStream']['tokenMaxAbsAfterMlp']
