import pytest
from src.domain.models import Process, IOOperation
from src.domain.enums import ProcessState, EventType
from src.engine.state_manager import StateManager
from src.engine.cpl_manager import CPLManager
from src.engine.scheduler import Scheduler
from src.engine.cpu_unit import CPUUnit
from src.engine.io_manager import IOManager
from src.engine.event_manager import EventManager
from src.engine.metrics_calculator import MetricsCalculator


def make_process(id: str, priority: int = 5, burst: int = 10, arrival: int = 0, logical: int = 0, state: ProcessState = ProcessState.READY, fifo: int = 0):
    return Process(
        id=id, name=id, arrival_time=arrival, cpu_burst=burst,
        priority=priority, remaining_cpu=burst, executed_cpu=0,
        current_state=state, logical_order=logical, fifo_order=fifo,
    )


class TestStateManager:
    def test_new_to_ready(self):
        sm = StateManager()
        p = make_process("P1", state=ProcessState.NEW)
        sm.change_state(p, ProcessState.READY)
        assert p.current_state == ProcessState.READY

    def test_ready_to_running(self):
        sm = StateManager()
        p = make_process("P1", state=ProcessState.READY)
        sm.change_state(p, ProcessState.RUNNING)
        assert p.current_state == ProcessState.RUNNING

    def test_running_to_ready(self):
        sm = StateManager()
        p = make_process("P1", state=ProcessState.RUNNING)
        sm.change_state(p, ProcessState.READY)
        assert p.current_state == ProcessState.READY

    def test_running_to_blocked(self):
        sm = StateManager()
        p = make_process("P1", state=ProcessState.RUNNING)
        sm.change_state(p, ProcessState.BLOCKED)
        assert p.current_state == ProcessState.BLOCKED

    def test_running_to_terminated(self):
        sm = StateManager()
        p = make_process("P1", state=ProcessState.RUNNING)
        sm.change_state(p, ProcessState.TERMINATED)
        assert p.current_state == ProcessState.TERMINATED

    def test_blocked_to_ready(self):
        sm = StateManager()
        p = make_process("P1", state=ProcessState.BLOCKED)
        sm.change_state(p, ProcessState.READY)
        assert p.current_state == ProcessState.READY

    def test_invalid_transition(self):
        sm = StateManager()
        p = make_process("P1", state=ProcessState.NEW)
        with pytest.raises(ValueError):
            sm.change_state(p, ProcessState.RUNNING)

    def test_terminated_no_transition(self):
        sm = StateManager()
        p = make_process("P1", state=ProcessState.TERMINATED)
        with pytest.raises(ValueError):
            sm.change_state(p, ProcessState.READY)


class TestCPLManager:
    def test_add_and_remove(self):
        cpl = CPLManager()
        p = make_process("P1", state=ProcessState.READY)
        cpl.add_process(p)
        assert cpl.size() == 1
        cpl.remove_process(p)
        assert cpl.is_empty()

    def test_add_non_ready_raises(self):
        cpl = CPLManager()
        p = make_process("P1", state=ProcessState.NEW)
        with pytest.raises(ValueError):
            cpl.add_process(p)

    def test_logical_order_preserved(self):
        cpl = CPLManager()
        p1 = make_process("P1", logical=0, state=ProcessState.READY)
        p2 = make_process("P2", logical=1, state=ProcessState.READY)
        cpl.add_process(p1)
        cpl.add_process(p2)
        q = cpl.get_logical_queue()
        assert q[0].id == "P1"
        assert q[1].id == "P2"


class TestScheduler:
    def test_select_highest_priority(self):
        s = Scheduler()
        p1 = make_process("P1", priority=5)
        p2 = make_process("P2", priority=1)
        p3 = make_process("P3", priority=3)
        decision = s.select_process(None, [p1, p2, p3])
        assert decision.selected.id == "P2"

    def test_fifo_tie_break(self):
        s = Scheduler()
        p1 = make_process("P1", priority=3, fifo=0)
        p2 = make_process("P2", priority=3, fifo=1)
        p3 = make_process("P3", priority=3, fifo=2)
        decision = s.select_process(None, [p3, p1, p2])
        assert decision.selected.id == "P1"

    def test_preemption_higher_priority(self):
        s = Scheduler()
        current = make_process("P1", priority=5, state=ProcessState.RUNNING)
        p2 = make_process("P2", priority=1)
        decision = s.select_process(current, [p2])
        assert decision.selected.id == "P2"
        assert decision.preempted.id == "P1"
        assert decision.reason == "PREEMPTION"

    def test_no_preemption_same_priority(self):
        s = Scheduler()
        current = make_process("P1", priority=3, state=ProcessState.RUNNING)
        p2 = make_process("P2", priority=3)
        decision = s.select_process(current, [p2])
        assert decision.selected.id == "P1"
        assert decision.preempted is None
        assert decision.reason == "CONTINUE"

    def test_no_preemption_lower_priority(self):
        s = Scheduler()
        current = make_process("P1", priority=1, state=ProcessState.RUNNING)
        p2 = make_process("P2", priority=5)
        decision = s.select_process(current, [p2])
        assert decision.selected.id == "P1"
        assert decision.preempted is None

    def test_empty_ready_queue(self):
        s = Scheduler()
        current = make_process("P1", state=ProcessState.RUNNING)
        decision = s.select_process(current, [])
        assert decision.selected.id == "P1"

    def test_idle_when_no_process(self):
        s = Scheduler()
        decision = s.select_process(None, [])
        assert decision.selected is None


class TestCPUUnit:
    def test_execute_reduces_remaining(self):
        cpu = CPUUnit()
        p = make_process("P1", burst=10)
        result = cpu.execute_unit(p)
        assert p.remaining_cpu == 9
        assert p.executed_cpu == 1
        assert result.finished is False

    def test_execute_finishes(self):
        cpu = CPUUnit()
        p = make_process("P1", burst=1)
        result = cpu.execute_unit(p)
        assert p.remaining_cpu == 0
        assert result.finished is True

    def test_io_triggered(self):
        cpu = CPUUnit()
        p = make_process("P1", burst=10)
        p.io_operations = [IOOperation(activation_point=3, duration=2)]
        p.executed_cpu = 2
        result = cpu.execute_unit(p)
        assert p.executed_cpu == 3
        assert result.io_triggered is True
        assert result.io_point == 3


class TestIOManager:
    def test_start_and_tick_io(self):
        io = IOManager()
        p = make_process("P1")
        p.io_operations = [IOOperation(activation_point=5, duration=3)]
        p.executed_cpu = 5
        io.start_io(p, 10)
        assert io.has_active_io() is True
        assert len(io.get_blocked_processes()) == 1

    def test_io_completes_after_duration(self):
        io = IOManager()
        p = make_process("P1")
        p.io_operations = [IOOperation(activation_point=5, duration=2)]
        p.executed_cpu = 5
        io.start_io(p, 0)

        # return_time = 0 + 2 + 1 = 3
        completed = io.tick_io(1)
        assert len(completed) == 0
        completed = io.tick_io(2)
        assert len(completed) == 0
        completed = io.tick_io(3)
        assert len(completed) == 1
        assert completed[0].id == "P1"

    def test_clear(self):
        io = IOManager()
        p = make_process("P1")
        p.io_operations = [IOOperation(activation_point=5, duration=3)]
        p.executed_cpu = 5
        io.start_io(p, 0)
        io.clear()
        assert io.has_active_io() is False


class TestEventManager:
    def test_register_event(self):
        em = EventManager()
        e = em.register(5, EventType.PREEMPTION, "P1", "P1 interrumpido")
        assert e.id == "evt-001"
        assert e.time == 5
        assert e.type == EventType.PREEMPTION

    def test_get_events_at_time(self):
        em = EventManager()
        em.register(5, EventType.PROCESS_ARRIVAL, "P1")
        em.register(5, EventType.PREEMPTION, "P2")
        em.register(6, EventType.CPU_COMPLETION, "P1")
        assert len(em.get_events_at_time(5)) == 2
        assert len(em.get_events_at_time(6)) == 1


class TestMetricsCalculator:
    def test_single_process(self):
        mc = MetricsCalculator()
        p = make_process("P1", burst=10, arrival=0)
        p.finish_time = 10
        p.current_state = ProcessState.TERMINATED
        metrics, global_m = mc.calculate([p], 10, 0)
        assert metrics[0].turnaround_time == 10
        assert metrics[0].waiting_time == 0
        assert global_m.cpu_utilization == 100.0

    def test_with_io(self):
        mc = MetricsCalculator()
        p = make_process("P1", burst=10, arrival=0)
        p.io_operations = [IOOperation(activation_point=5, duration=3)]
        p.finish_time = 18
        p.current_state = ProcessState.TERMINATED
        metrics, global_m = mc.calculate([p], 18, 5)
        # TR = 18 - 0 = 18
        # TE = 18 - 10 - 3 = 5
        assert metrics[0].turnaround_time == 18
        assert metrics[0].waiting_time == 5
