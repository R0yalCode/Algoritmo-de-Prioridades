"""Serialización de SimulationHistory en la API (Fase 2).

Se invocan las funciones de ruta directamente: no hace falta levantar el
servidor y se verifica que el historial viaja sin romper el contrato previo.
"""

from src.api.routes import create_simulation, execute_simulation, get_results
from src.api.schemas import ProcessRequest, SimulationCreateRequest, IOOperationRequest


def build_request() -> SimulationCreateRequest:
    return SimulationCreateRequest(processes=[
        ProcessRequest(
            id="P1", name="P1", arrivalTime=0, cpuBurst=10, priority=2,
            ioOperations=[IOOperationRequest(activationPoint=5, duration=3)],
        ),
        ProcessRequest(id="P2", name="P2", arrivalTime=4, cpuBurst=5, priority=3),
    ])


def run_api() -> dict:
    created = create_simulation(build_request())
    sim_id = created["data"]["simulationId"]
    execute_simulation(sim_id)
    return get_results(sim_id)["data"]


class TestApiHistory:
    def test_contrato_previo_intacto(self):
        data = run_api()
        for key in ("simulationId", "snapshots", "events", "gantt", "metrics", "globalMetrics"):
            assert key in data, key
        assert data["gantt"] == [
            {"processId": "P1", "start": 0, "end": 5},
            {"processId": "P2", "start": 5, "end": 8},
            {"processId": "P1", "start": 8, "end": 13},
            {"processId": "P2", "start": 13, "end": 15},
        ]

    def test_history_viaja_en_la_respuesta(self):
        history = run_api()["history"]
        assert set(history) == {"readyTimeline", "ioTimeline", "cpuTimeline", "eventTimeline"}
        # P1 hace una E/S y regresa -> 2 apariciones; P2 nunca hace E/S -> 1
        assert len(history["readyTimeline"]) == 3
        assert len(history["ioTimeline"]) == 1
        assert len(history["cpuTimeline"]) == 4
        assert history["eventTimeline"]

    def test_ready_timeline_serializado_en_camel_case(self):
        entry = run_api()["history"]["readyTimeline"][0]
        assert entry["processId"] == "P1"
        assert entry["visualIndex"] == 0
        assert entry["firstAppearance"] == 0
        assert entry["priority"] == 2
        observation = entry["history"][0]
        assert set(observation) == {
            "time", "state", "active", "priority",
            "remainingCpu", "executedCpu", "fifoOrder", "readyPosition",
        }
        assert observation["time"] == 0
        assert observation["state"] == "RUNNING"

    def test_cpu_timeline_serializado(self):
        cpu = run_api()["history"]["cpuTimeline"]
        assert cpu[0] == {
            "processId": "P1", "start": 0, "end": 5, "duration": 5, "idle": False,
        }

    def test_io_timeline_serializado(self):
        io = run_api()["history"]["ioTimeline"]
        assert io == [{
            "processId": "P1", "start": 5, "end": 8, "duration": 3,
            "priority": 2, "remainingCpu": 5, "visualIndex": 0, "completed": True,
        }]

    def test_event_timeline_serializado_y_ordenado(self):
        data = run_api()
        eventos = data["history"]["eventTimeline"]
        assert len(eventos) == len(data["events"])
        assert [e["time"] for e in eventos] == sorted(e["time"] for e in eventos)
        assert set(eventos[0]) == {"time", "type", "processId", "description", "reason"}
