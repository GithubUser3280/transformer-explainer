from fastapi.testclient import TestClient
from app.main import app


def test_health_reports_fake_safe_defaults():
    client = TestClient(app)
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
    assert response.json()['modelId'] == 'Qwen/Qwen3-0.6B'
