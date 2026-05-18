from fastapi.testclient import TestClient
from app.fake_trace import build_fake_trace
from app.main import app


def test_fake_trace_shape_contains_modern_architecture_flags():
    trace = build_fake_trace('hello grouped attention')
    assert trace['modelMetadata']['usesGroupedQueryAttention'] is True
    assert trace['modelMetadata']['usesRotaryPositionEmbeddings'] is True
    assert trace['layers'][0]['operations'][1]['kind'] == 'attention'
    assert trace['layers'][0]['operations'][1]['topAttentionLinks']


def test_api_trace_uses_fake_trace_by_default():
    client = TestClient(app)
    response = client.post('/api/trace', json={'prompt': 'hello world'})
    assert response.status_code == 200
    body = response.json()
    assert body['traceId'].startswith('fake-')
    assert body['prompt']['tokenCount'] == 2
