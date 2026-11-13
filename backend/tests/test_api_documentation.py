import importlib

import pytest
from fastapi.testclient import TestClient

import application.main


def test_documentationIsAvailableByDefault(client: TestClient) -> None:
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_documentationCanBeTurnedOffForProduction(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("API_DOCUMENTATION", "false")
    try:
        productionClient = TestClient(importlib.reload(application.main).application)
        assert productionClient.get("/docs").status_code == 404
        assert productionClient.get("/openapi.json").status_code == 404
        assert productionClient.get("/health").json() == {"status": "ok"}
    finally:
        monkeypatch.delenv("API_DOCUMENTATION")
        importlib.reload(application.main)
