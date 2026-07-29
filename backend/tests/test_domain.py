import pytest
from pydantic import ValidationError
from src.domain.enums import ProcessState, CPUStatus, EventType, SimulationStatus
from src.domain.models import (
    IOOperation,
    ProcessCreate,
    Process,
    CPU,
    Event,
    GanttBlock,
    Snapshot,
    Metric,
    GlobalMetrics,
    SimulationInput,
    SimulationResult,
    ValidationError as ValError,
    ValidationResult,
)


class TestEnums:
    def test_process_state_values(self):
        assert ProcessState.NEW == "NEW"
        assert ProcessState.READY == "READY"
        assert ProcessState.RUNNING == "RUNNING"
        assert ProcessState.BLOCKED == "BLOCKED"
        assert ProcessState.TERMINATED == "TERMINATED"

    def test_cpu_status_values(self):
        assert CPUStatus.BUSY == "BUSY"
        assert CPUStatus.IDLE == "IDLE"

    def test_event_type_values(self):
        assert EventType.PROCESS_ARRIVAL == "PROCESS_ARRIVAL"
        assert EventType.CPU_DISPATCH == "CPU_DISPATCH"
        assert EventType.CPU_EXECUTION == "CPU_EXECUTION"
        assert EventType.CPU_COMPLETION == "CPU_COMPLETION"
        assert EventType.IO_START == "IO_START"
        assert EventType.IO_COMPLETE == "IO_COMPLETE"
        assert EventType.PREEMPTION == "PREEMPTION"
        assert EventType.CPU_IDLE == "CPU_IDLE"
        assert EventType.CONTEXT_SWITCH == "CONTEXT_SWITCH"

    def test_simulation_status_values(self):
        assert SimulationStatus.CREATED == "CREATED"
        assert SimulationStatus.VALIDATED == "VALIDATED"
        assert SimulationStatus.RUNNING == "RUNNING"
        assert SimulationStatus.COMPLETED == "COMPLETED"
        assert SimulationStatus.ERROR == "ERROR"


class TestIOOperation:
    def test_valid_io_operation(self):
        io = IOOperation(activation_point=5, duration=3)
        assert io.activation_point == 5
        assert io.duration == 3

    def test_activation_point_must_be_positive(self):
        with pytest.raises(ValidationError):
            IOOperation(activation_point=0, duration=3)

    def test_duration_must_be_positive(self):
        with pytest.raises(ValidationError):
            IOOperation(activation_point=5, duration=0)


class TestProcessCreate:
    def test_valid_process(self):
        p = ProcessCreate(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=10,
            priority=3,
        )
        assert p.id == "P1"
        assert p.arrival_time == 0
        assert p.cpu_burst == 10
        assert p.priority == 3
        assert p.io_operations == []

    def test_with_io_operations(self):
        p = ProcessCreate(
            id="P2",
            name="P2",
            arrival_time=3,
            cpu_burst=15,
            priority=1,
            io_operations=[IOOperation(activation_point=5, duration=3)],
        )
        assert len(p.io_operations) == 1

    def test_negative_arrival_time(self):
        with pytest.raises(ValidationError):
            ProcessCreate(id="P1", name="P1", arrival_time=-1, cpu_burst=10, priority=3)

    def test_zero_cpu_burst(self):
        with pytest.raises(ValidationError):
            ProcessCreate(id="P1", name="P1", arrival_time=0, cpu_burst=0, priority=3)

    def test_priority_below_range(self):
        with pytest.raises(ValidationError):
            ProcessCreate(id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=0)

    def test_priority_above_range(self):
        with pytest.raises(ValidationError):
            ProcessCreate(id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=21)

    def test_priority_min_edge(self):
        p = ProcessCreate(id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=1)
        assert p.priority == 1

    def test_priority_max_edge(self):
        p = ProcessCreate(id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=20)
        assert p.priority == 20


class TestProcess:
    def test_domain_process_auto_remaining(self):
        p = Process(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=10,
            priority=3,
        )
        assert p.remaining_cpu == 10
        assert p.executed_cpu == 0
        assert p.current_state == ProcessState.NEW
        assert p.finish_time is None
        assert p.logical_order == 0

    def test_domain_process_explicit_remaining(self):
        p = Process(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=10,
            priority=3,
            remaining_cpu=8,
            executed_cpu=2,
        )
        assert p.remaining_cpu == 8
        assert p.executed_cpu == 2


class TestCPU:
    def test_cpu_idle_by_default(self):
        c = CPU()
        assert c.status == CPUStatus.IDLE
        assert c.current_process is None

    def test_cpu_busy(self):
        c = CPU(current_process="P1", status=CPUStatus.BUSY)
        assert c.current_process == "P1"
        assert c.status == CPUStatus.BUSY


class TestEvent:
    def test_valid_event(self):
        e = Event(
            id="evt-001",
            time=5,
            type=EventType.PREEMPTION,
            process_id="P1",
            description="P1 fue interrumpido",
            reason="Prioridad superior",
        )
        assert e.id == "evt-001"
        assert e.time == 5
        assert e.type == EventType.PREEMPTION
        assert e.process_id == "P1"


class TestGanttBlock:
    def test_gantt_block_process(self):
        g = GanttBlock(process_id="P1", start=0, end=5)
        assert g.process_id == "P1"
        assert g.start == 0
        assert g.end == 5

    def test_gantt_block_idle(self):
        g = GanttBlock(process_id="IDLE", start=0, end=3)
        assert g.process_id == "IDLE"


class TestSnapshot:
    def test_empty_snapshot(self):
        s = Snapshot(time=0)
        assert s.time == 0
        assert s.cpu is None
        assert s.ready_queue == []
        assert s.blocked_queue == []
        assert s.terminated_processes == []
        assert s.events == []
        assert s.gantt_block is None

    def test_snapshot_with_cpu(self):
        cpu = CPU(current_process="P1", status=CPUStatus.BUSY)
        s = Snapshot(time=5, cpu=cpu)
        assert s.cpu is not None
        assert s.cpu.current_process == "P1"


class TestMetric:
    def test_metric_fields(self):
        m = Metric(process_id="P1", turnaround_time=15, waiting_time=5)
        assert m.process_id == "P1"
        assert m.turnaround_time == 15
        assert m.waiting_time == 5


class TestGlobalMetrics:
    def test_global_metrics_defaults(self):
        gm = GlobalMetrics()
        assert gm.average_waiting_time == 0.0
        assert gm.average_turnaround_time == 0.0
        assert gm.cpu_utilization == 0.0

    def test_global_metrics_values(self):
        gm = GlobalMetrics(
            average_waiting_time=5.4,
            average_turnaround_time=12.7,
            cpu_utilization=85.0,
        )
        assert gm.average_waiting_time == 5.4
        assert gm.average_turnaround_time == 12.7
        assert gm.cpu_utilization == 85.0


class TestSimulationInput:
    def test_valid_input(self):
        p = ProcessCreate(id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=3)
        inp = SimulationInput(processes=[p])
        assert len(inp.processes) == 1


class TestSimulationResult:
    def test_empty_result(self):
        r = SimulationResult()
        assert r.snapshots == []
        assert r.metrics == []
        assert r.global_metrics is None
        assert r.events == []
        assert r.gantt == []


class TestValidationResult:
    def test_valid(self):
        vr = ValidationResult(valid=True)
        assert vr.valid is True
        assert vr.errors == []

    def test_invalid(self):
        err = ValError(code="VD-004", message="Prioridad fuera de rango")
        vr = ValidationResult(valid=False, errors=[err])
        assert vr.valid is False
        assert len(vr.errors) == 1
        assert vr.errors[0].code == "VD-004"
