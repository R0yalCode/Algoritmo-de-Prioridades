from typing import Sequence

from src.domain.models import ProcessCreate, IOOperation, SimulationInput
from src.engine.simulation_engine import SimulationEngine
from src.history.models import (
    CPUTimelineEntry,
    EventTimelineEntry,
    IOTimelineEntry,
    ReadyStateObservation,
    ReadyTimelineEntry,
    SimulationHistory,
)
from src.history.pedagogical_history_builder import PedagogicalHistoryBuilder
from src.history.ports import EventView, HistoryBuilder, SnapshotView
from src.history.visual_index import VisualIndexRegistry


def make_process(id: str, arrival: int, cpu: int, priority: int, ios: list | None = None):
    return ProcessCreate(
        id=id, name=id, arrival_time=arrival, cpu_burst=cpu, priority=priority,
        io_operations=ios or [],
    )


def make_io(point: int, duration: int):
    return IOOperation(activation_point=point, duration=duration)


def run(processes: list[ProcessCreate], history_builder: HistoryBuilder | None = None):
    engine = SimulationEngine(history_builder=history_builder)
    result = engine.execute(SimulationInput(processes=processes))
    return engine, result


def extract_gantt(result) -> list[dict]:
    return [{"process": g.process_id, "start": g.start, "end": g.end} for g in result.gantt]


class RecordingBuilder(HistoryBuilder):
    """Doble de prueba: verifica el contrato del motor con el builder."""

    def __init__(self) -> None:
        self.resets = 0
        self.initial_times: list[int] = []
        self.tick_times: list[int] = []
        self.tick_event_times: list[list[int]] = []
        self.builds = 0

    def reset(self) -> None:
        self.resets += 1

    def observe_initial_state(self, snapshot: SnapshotView) -> None:
        self.initial_times.append(snapshot.time)

    def observe_tick(self, snapshot: SnapshotView, events: Sequence[EventView]) -> None:
        self.tick_times.append(snapshot.time)
        self.tick_event_times.append([e.time for e in events])

    def build(self) -> SimulationHistory:
        self.builds += 1
        return SimulationHistory()


class TestSimulationHistoryModel:
    def test_history_vacia_por_defecto(self):
        h = SimulationHistory()
        assert h.ready_timeline == []
        assert h.io_timeline == []
        assert h.cpu_timeline == []
        assert h.event_timeline == []

    def test_listas_no_compartidas_entre_instancias(self):
        a = SimulationHistory()
        a.ready_timeline.append(ReadyTimelineEntry(
            process_id="P1", priority=3, first_appearance=0, visual_index=0,
            history=[ReadyStateObservation(time=0, state="READY", active=True)],
        ))
        assert SimulationHistory().ready_timeline == []

    def test_cpu_entry_deriva_duration(self):
        entry = CPUTimelineEntry(process_id="P1", start=3, end=8)
        assert entry.duration == 5
        assert entry.idle is False

    def test_cpu_entry_respeta_duration_explicita(self):
        entry = CPUTimelineEntry(process_id="P1", start=3, end=8, duration=5)
        assert entry.duration == 5

    def test_io_entry_deriva_duration(self):
        entry = IOTimelineEntry(process_id="P1", start=5, end=8, priority=2)
        assert entry.duration == 3

    def test_io_entry_admite_operacion_abierta(self):
        entry = IOTimelineEntry(
            process_id="P1", start=5, priority=2, remaining_cpu=5, visual_index=0,
        )
        assert entry.end is None
        assert entry.duration is None
        assert entry.completed is False

    def test_event_entry_campos_minimos(self):
        entry = EventTimelineEntry(time=4, type="PREEMPTION", process_id="P1")
        assert entry.description == ""


class TestVisualIndexRegistry:
    def test_asigna_indices_en_orden_de_aparicion(self):
        reg = VisualIndexRegistry()
        assert reg.register("P1", 0) == 0
        assert reg.register("P2", 3) == 1
        assert reg.known_processes() == ["P1", "P2"]

    def test_registro_es_idempotente_y_permanente(self):
        reg = VisualIndexRegistry()
        reg.register("P1", 0)
        reg.register("P2", 1)
        assert reg.register("P1", 9) == 0
        assert reg.first_appearance_of("P1") == 0
        assert reg.size() == 2

    def test_proceso_desconocido(self):
        reg = VisualIndexRegistry()
        assert reg.index_of("PX") is None
        assert reg.first_appearance_of("PX") is None

    def test_reset(self):
        reg = VisualIndexRegistry()
        reg.register("P1", 0)
        reg.reset()
        assert reg.size() == 0
        assert reg.register("P2", 0) == 0


class TestEngineIntegration:
    def test_result_expone_snapshots_e_history(self):
        _, result = run([make_process("P1", 0, 5, 3)])
        assert result.snapshots
        assert result.history is not None

    def test_builder_observa_un_tick_por_snapshot(self):
        spy = RecordingBuilder()
        _, result = run([make_process("P1", 0, 5, 3)], history_builder=spy)
        assert spy.resets == 1
        assert spy.builds == 1
        assert spy.initial_times == [0]
        assert spy.tick_times == [s.time for s in result.snapshots[1:]]

    def test_builder_recibe_los_eventos_del_tick_cerrado(self):
        spy = RecordingBuilder()
        _, result = run([make_process("P1", 0, 3, 3)], history_builder=spy)
        # Cada tick t entrega sus propios eventos junto al snapshot t+1
        for tick, times in enumerate(spy.tick_event_times):
            assert times, f"el tick {tick} no entregó eventos"
            assert set(times) == {tick}
        entregados = sum(len(t) for t in spy.tick_event_times)
        assert entregados == len(result.events)

    def test_builder_por_defecto_acumula_estado(self):
        engine, result = run([
            make_process("P1", 0, 10, 5),
            make_process("P2", 3, 5, 1),
        ])
        builder = engine.history_builder
        assert isinstance(builder, PedagogicalHistoryBuilder)
        assert builder.observed_ticks == len(result.snapshots) - 1
        assert builder.last_observed_time == result.snapshots[-1].time
        assert builder.observed_event_count == len(result.events)
        assert set(builder.known_process_ids()) == {"P1", "P2"}

    def test_indice_visual_permanece_tras_apropiacion(self):
        """Caso 04: P2 apropia a P1; P1 sale y vuelve a la CPL."""
        engine, _ = run([
            make_process("P1", 0, 10, 5),
            make_process("P2", 3, 5, 1),
        ])
        builder = engine.history_builder
        assert builder.visual_index_of("P1") == 0
        assert builder.visual_index_of("P2") == 1
        assert builder.first_appearance_of("P1") == 0
        assert builder.first_appearance_of("P2") == 3

    def test_build_es_repetible(self):
        engine, result = run([make_process("P1", 0, 5, 3), make_process("P2", 2, 4, 1)])
        # el motor ya llamó build() al cerrar la simulación
        assert engine.history_builder.build().model_dump() == result.history.model_dump()

    def test_proceso_bloqueado_es_observado(self):
        engine, _ = run([make_process("P1", 0, 10, 2, [make_io(5, 3)])])
        builder = engine.history_builder
        assert builder.visual_index_of("P1") == 0
        assert builder.observed_ticks > 0


class TestNoAlteraLaSimulacion:
    """El historial es un producto derivado: no puede cambiar el resultado."""

    def test_gantt_y_metricas_identicos_con_y_sin_builder_propio(self):
        processes = [
            make_process("P1", 0, 10, 2, [make_io(5, 3)]),
            make_process("P2", 4, 5, 3),
        ]
        _, con_defecto = run(processes)
        _, con_spy = run(processes, history_builder=RecordingBuilder())

        assert extract_gantt(con_defecto) == extract_gantt(con_spy)
        assert [(m.process_id, m.turnaround_time, m.waiting_time) for m in con_defecto.metrics] == \
               [(m.process_id, m.turnaround_time, m.waiting_time) for m in con_spy.metrics]
        assert con_defecto.global_metrics == con_spy.global_metrics
        assert len(con_defecto.snapshots) == len(con_spy.snapshots)
        assert len(con_defecto.events) == len(con_spy.events)

    def test_reejecucion_no_arrastra_estado_del_historial(self):
        engine = SimulationEngine()
        inp = SimulationInput(processes=[make_process("P1", 0, 3, 3)])
        engine.execute(inp)
        primeros_ticks = engine.history_builder.observed_ticks

        engine2 = SimulationEngine()
        engine2.execute(inp)
        assert engine2.history_builder.observed_ticks == primeros_ticks
