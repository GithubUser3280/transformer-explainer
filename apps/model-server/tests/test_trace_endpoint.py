from fastapi.testclient import TestClient
from app.main import app


def test_trace_endpoint_shape():
    client = TestClient(app)
    response = client.post('/api/trace', json={'prompt': 'The cat sat'})
    assert response.status_code == 200
    body = response.json()
    assert body['schemaVersion'] == '1.0'
    assert len(body['input']['tokens']) > 0
    token_count = len(body['input']['tokens'])
    first_head = body['layers'][0]['attention']['heads'][0]
    assert len(first_head['weights']) == token_count
    assert len(first_head['weights'][0]) == token_count
    assert len(body['output']['nextTokenTopK']) > 0
