from fastapi.testclient import TestClient
from app.fake_trace import build_fake_trace
from app.main import app


def test_fake_trace_shape_contains_schema_version():
    trace = build_fake_trace('hello grouped attention')
    assert trace['schemaVersion'] == '1.0'
    assert trace['layers'][0]['attention']['heads'][0]['weights']


def test_api_trace_uses_fake_trace_by_default():
    client = TestClient(app)
    response = client.post('/api/trace', json={'prompt': 'hello world'})
    assert response.status_code == 200
    body = response.json()
    assert body['input']['prompt'] == 'hello world'
    assert len(body['input']['tokens']) == 2
