import os
import threading
import time
import pytest
import requests
import uvicorn


BASE_URL = os.environ.get("TEST_API_URL", "http://localhost:18273")


class ServerThread(threading.Thread):
    def __init__(self, app, host="127.0.0.1", port=18273):
        super().__init__(daemon=True)
        self._config = uvicorn.Config(app, host=host, port=port, log_level="error")
        self._server = uvicorn.Server(self._config)

    def run(self):
        self._server.run()


@pytest.fixture(scope="session", autouse=True)
def _server():
    from src.main import app
    from src.persistence.persistence import Persistence
    thread = ServerThread(app)
    thread.start()
    time.sleep(1)
    yield
    thread._server.should_exit = True
    thread.join(timeout=3)
    # Cleanup any leftover exercise files from tests
    p = Persistence()
    for ex in p.list_exercises():
        p.delete(ex["id"])


@pytest.fixture
def processes():
    return [
        {
            "id": "P1", "name": "P1", "arrivalTime": 0, "cpuBurst": 10,
            "priority": 3, "ioOperations": [],
        },
        {
            "id": "P2", "name": "P2", "arrivalTime": 3, "cpuBurst": 5,
            "priority": 1,
            "ioOperations": [{"activationPoint": 2, "duration": 4}],
        },
    ]


def test_health():
    resp = requests.get(f"{BASE_URL}/health", timeout=5)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_validate_valid(processes):
    resp = requests.post(f"{BASE_URL}/api/v1/simulations/validate", json={
        "algorithm": "PREEMPTIVE_PRIORITY", "processes": processes,
    }, timeout=5)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True


def test_create_and_execute(processes):
    create_resp = requests.post(f"{BASE_URL}/api/v1/simulations", json={
        "algorithm": "PREEMPTIVE_PRIORITY", "processes": processes,
    }, timeout=5)
    assert create_resp.status_code == 200
    sim_id = create_resp.json()["data"]["simulationId"]
    assert len(sim_id) == 8

    exec_resp = requests.post(f"{BASE_URL}/api/v1/simulations/{sim_id}/execute", timeout=5)
    assert exec_resp.status_code == 200
    assert exec_resp.json()["data"]["status"] == "COMPLETED"

    res_resp = requests.get(f"{BASE_URL}/api/v1/simulations/{sim_id}/results", timeout=5)
    assert res_resp.status_code == 200
    data = res_resp.json()["data"]
    assert "snapshots" in data
    assert "metrics" in data
    assert "gantt" in data
    assert len(data["snapshots"]) > 0
    assert "globalMetrics" in data


def test_execute_nonexistent():
    resp = requests.post(f"{BASE_URL}/api/v1/simulations/XXXXXXXX/execute", timeout=5)
    assert resp.status_code == 200
    assert resp.json()["success"] is False


def test_get_nonexistent_results():
    resp = requests.get(f"{BASE_URL}/api/v1/simulations/XXXXXXXX/results", timeout=5)
    assert resp.status_code == 200
    assert resp.json()["success"] is False


def test_save_and_load_exercise(processes):
    save_resp = requests.post(f"{BASE_URL}/api/v1/exercises/save", json={
        "name": "Ejercicio prueba",
        "simulation": {
            "algorithm": "PREEMPTIVE_PRIORITY",
            "processes": processes,
        },
    }, timeout=5)
    assert save_resp.status_code == 200
    file_id = save_resp.json()["data"]["fileId"]

    load_resp = requests.get(f"{BASE_URL}/api/v1/exercises/{file_id}", timeout=5)
    assert load_resp.status_code == 200
    data = load_resp.json()["data"]
    assert data["name"] == "Ejercicio prueba"
    assert len(data["processes"]) == 2

    del_resp = requests.delete(f"{BASE_URL}/api/v1/exercises/{file_id}", timeout=5)
    assert del_resp.status_code == 200
