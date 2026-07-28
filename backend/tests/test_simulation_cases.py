import pytest
from src.domain.models import ProcessCreate, IOOperation, SimulationInput
from src.engine.simulation_engine import SimulationEngine


def make_process(id: str, arrival: int, cpu: int, priority: int, ios: list | None = None):
    return ProcessCreate(
        id=id, name=id, arrival_time=arrival, cpu_burst=cpu, priority=priority,
        io_operations=ios or [],
    )


def make_io(point: int, duration: int):
    return IOOperation(activation_point=point, duration=duration)


def extract_gantt(result) -> list[dict]:
    return [{"process": g.process_id, "start": g.start, "end": g.end} for g in result.gantt]


def run(processes: list[ProcessCreate]):
    engine = SimulationEngine()
    return engine.execute(SimulationInput(processes=processes))


class TestCasosOficiales:
    def test_caso_01_basico_sin_io(self):
        """10_modelo_pruebas.md Caso 01"""
        inp = [
            make_process("P1", 0, 5, 3),
        ]
        expected = [
            {"process": "P1", "start": 0, "end": 5},
        ]
        result = run(inp)
        assert extract_gantt(result) == expected

    def test_caso_02_llegadas_simultaneas(self):
        """10_modelo_pruebas.md Caso 02: misma llegada, misma prioridad -> FIFO"""
        inp = [
            make_process("P1", 0, 5, 2),
            make_process("P2", 0, 5, 2),
            make_process("P3", 0, 5, 2),
        ]
        expected = [
            {"process": "P1", "start": 0, "end": 5},
            {"process": "P2", "start": 5, "end": 10},
            {"process": "P3", "start": 10, "end": 15},
        ]
        result = run(inp)
        assert extract_gantt(result) == expected

    def test_caso_03_prioridad_durante_espera(self):
        """10_modelo_pruebas.md Caso 03"""
        inp = [
            make_process("P1", 0, 10, 5),
            make_process("P2", 0, 5, 2),
        ]
        expected = [
            {"process": "P2", "start": 0, "end": 5},
            {"process": "P1", "start": 5, "end": 15},
        ]
        result = run(inp)
        assert extract_gantt(result) == expected

    def test_caso_04_apropiacion_por_prioridad(self):
        """10_modelo_pruebas.md Caso 04: P2 llega en t=3 con pr=1, apropia a P1(pr=5)"""
        inp = [
            make_process("P1", 0, 10, 5),
            make_process("P2", 3, 5, 1),
        ]
        expected = [
            {"process": "P1", "start": 0, "end": 3},
            {"process": "P2", "start": 3, "end": 8},
            {"process": "P1", "start": 8, "end": 15},
        ]
        result = run(inp)
        gantt = extract_gantt(result)
        assert gantt == expected, f"Expected {expected}, got {gantt}"

    def test_caso_05_igual_prioridad_no_apropia(self):
        """10_modelo_pruebas.md Caso 05"""
        inp = [
            make_process("P1", 0, 10, 3),
            make_process("P2", 3, 5, 3),
        ]
        expected = [
            {"process": "P1", "start": 0, "end": 10},
            {"process": "P2", "start": 10, "end": 15},
        ]
        result = run(inp)
        assert extract_gantt(result) == expected

    def test_caso_06_operacion_io(self):
        """10_modelo_pruebas.md Caso 06: P1 IO en punto 5, duración 3"""
        inp = [
            make_process("P1", 0, 10, 2, [make_io(5, 3)]),
        ]
        expected = [
            {"process": "P1", "start": 0, "end": 5},
            {"process": "IDLE", "start": 5, "end": 8},
            {"process": "P1", "start": 8, "end": 13},
        ]
        result = run(inp)
        gantt = extract_gantt(result)
        assert gantt == expected, f"Expected {expected}, got {gantt}"

    def test_caso_07_competencia_despues_io(self):
        """10_modelo_pruebas.md Caso 07:
        P1(pr=2, IO en 5, dur 3), P2(pr=3, arr=4).
        P1 arranca, hace IO en t=4, vuelve en t=8, apropia a P2."""
        inp = [
            make_process("P1", 0, 10, 2, [make_io(5, 3)]),
            make_process("P2", 4, 5, 3),
        ]
        result = run(inp)
        gantt = extract_gantt(result)
        # P1 runs t=0-4 (5 ticks), IO returns t=8, preempts P2
        assert gantt[0] == {"process": "P1", "start": 0, "end": 5}
        assert gantt[1] == {"process": "P2", "start": 5, "end": 8}
        # P1 returns at t=8 and preempts P2 (pr 2 < 3)
        assert gantt[2] == {"process": "P1", "start": 8, "end": 13}
        assert gantt[3] == {"process": "P2", "start": 13, "end": 15}
        assert len(gantt) == 4

    def test_caso_08_multiples_io(self):
        """10_modelo_pruebas.md Caso 08: P1 con 2 operaciones E/S"""
        inp = [
            make_process("P1", 0, 20, 2, [
                make_io(5, 3),
                make_io(12, 4),
            ]),
        ]
        result = run(inp)
        gantt = extract_gantt(result)
        # P1 runs t=0-4 (5), IO(5-7), runs t=8-14 (7, exec=12), IO(15-18), runs t=19-26 (8)
        assert gantt[0] == {"process": "P1", "start": 0, "end": 5}
        assert gantt[1] == {"process": "IDLE", "start": 5, "end": 8}
        assert gantt[2] == {"process": "P1", "start": 8, "end": 15}
        assert gantt[3] == {"process": "IDLE", "start": 15, "end": 19}
        assert gantt[4] == {"process": "P1", "start": 19, "end": 27}

    def test_caso_09_prioridades_extremas(self):
        """10_modelo_pruebas.md Caso 09: P1 pr=1 siempre gana a P2 pr=20"""
        inp = [
            make_process("P1", 0, 3, 1),
            make_process("P2", 0, 3, 20),
        ]
        expected = [
            {"process": "P1", "start": 0, "end": 3},
            {"process": "P2", "start": 3, "end": 6},
        ]
        result = run(inp)
        assert extract_gantt(result) == expected

    def test_caso_10_validacion_error_io_invalida(self):
        """10_modelo_pruebas.md Caso 10: E/S con activationPoint == cpuBurst es inválido"""
        from src.validation.validator import Validator
        p = ProcessCreate.model_construct(
            id="P1", name="P1", arrival_time=0, cpu_burst=5, priority=3,
            io_operations=[IOOperation.model_construct(activation_point=5, duration=3)],
        )
        val = Validator()
        result = val.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-102" in codes
