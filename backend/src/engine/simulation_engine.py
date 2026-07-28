from src.domain.models import ProcessCreate, Process, SimulationInput, SimulationResult, Snapshot, CPU, GanttBlock
from src.domain.enums import ProcessState, CPUStatus, EventType
from src.engine.state_manager import StateManager
from src.engine.cpl_manager import CPLManager
from src.engine.scheduler import Scheduler
from src.engine.cpu_unit import CPUUnit
from src.engine.io_manager import IOManager
from src.engine.event_manager import EventManager
from src.engine.metrics_calculator import MetricsCalculator


class SimulationEngine:
    def __init__(self) -> None:
        self.state_mgr = StateManager()
        self.cpl = CPLManager()
        self.scheduler = Scheduler()
        self.cpu_unit = CPUUnit()
        self.io_mgr = IOManager()
        self.events = EventManager()
        self.metrics_calc = MetricsCalculator()
        self._processes: list[Process] = []

    def execute(self, inp: SimulationInput) -> SimulationResult:
        self._processes = self._create_domain_processes(inp.processes)
        snapshots: list[Snapshot] = []
        gantt_blocks: list[GanttBlock] = []
        cpu = CPU()
        time = 0
        idle_ticks = 0

        snapshots.append(self._build_snapshot(time, cpu, gantt_blocks))

        while not self._is_simulation_complete(cpu):
            time_events: list[tuple[int, EventType, str | None, str, str]] = []

            # Step 1: Process arrivals
            for p in self._process_arrivals_at(time):
                self.state_mgr.change_state(p, ProcessState.READY)
                self.cpl.add_process(p)
                self.events.register(
                    time, EventType.PROCESS_ARRIVAL, p.id,
                    f"{p.id} ingresó al sistema",
                    f"Llegada en t={time}",
                )

            # Step 2: Process IO returns
            io_completed = self.io_mgr.tick_io(time)
            for p in io_completed:
                self.state_mgr.change_state(p, ProcessState.READY)
                self.cpl.add_process(p)
                self.events.register(
                    time, EventType.IO_COMPLETE, p.id,
                    f"{p.id} finalizó operación E/S",
                    f"Retorno de E/S en t={time}",
                )

            # Step 3: CPL already updated

            # Step 4: Scheduler
            ready = self.cpl.get_logical_queue()
            running = self._get_running(cpu)
            decision = self.scheduler.select_process(running, ready)

            # Step 5: Context switch
            if decision.preempted is not None:
                preempted = decision.preempted
                self.state_mgr.change_state(preempted, ProcessState.READY)
                self.cpl.add_process(preempted)
                self.events.register(
                    time, EventType.PREEMPTION, preempted.id,
                    f"{preempted.id} fue interrumpido por {decision.selected.id}",
                    f"Prioridad {decision.selected.id}={decision.selected.priority} < {preempted.id}={preempted.priority}",
                )

            if decision.selected is not None and (
                cpu.current_process != decision.selected.id
            ):
                old_id = cpu.current_process
                cpu.current_process = decision.selected.id
                cpu.status = CPUStatus.BUSY
                self.state_mgr.change_state(decision.selected, ProcessState.RUNNING)
                self.cpl.remove_process(decision.selected)
                if old_id is not None:
                    self.events.register(
                        time, EventType.CONTEXT_SWITCH, decision.selected.id,
                        f"Cambio de contexto: {old_id} → {decision.selected.id}",
                    )
                self.events.register(
                    time, EventType.CPU_DISPATCH, decision.selected.id,
                    f"{decision.selected.id} fue enviado a CPU",
                    f"Razón: {decision.reason}",
                )

            # Step 6: CPU execution
            running = self._get_running(cpu)
            if running is not None:
                result = self.cpu_unit.execute_unit(running)
                self.events.register(
                    time, EventType.CPU_EXECUTION, running.id,
                    f"{running.id} ejecutó 1 unidad (restante={running.remaining_cpu})",
                )

                gantt_blocks.append(GanttBlock(
                    process_id=running.id,
                    start=time,
                    end=time + 1,
                ))

                # Step 7: CPU events
                if result.finished:
                    self.state_mgr.change_state(running, ProcessState.TERMINATED)
                    running.finish_time = time + 1
                    self.cpl.remove_process(running)
                    cpu.current_process = None
                    cpu.status = CPUStatus.IDLE
                    self.events.register(
                        time, EventType.CPU_COMPLETION, running.id,
                        f"{running.id} finalizó su ejecución",
                        f"Tiempo finalización: {running.finish_time}",
                    )
                elif result.io_triggered:
                    self.state_mgr.change_state(running, ProcessState.BLOCKED)
                    self.cpl.remove_process(running)
                    self.io_mgr.start_io(running, time)
                    cpu.current_process = None
                    cpu.status = CPUStatus.IDLE
                    self.events.register(
                        time, EventType.IO_START, running.id,
                        f"{running.id} inició operación E/S",
                        f"Punto de activación: {result.io_point}",
                    )
            else:
                idle_ticks += 1
                gantt_blocks.append(GanttBlock(
                    process_id="IDLE",
                    start=time,
                    end=time + 1,
                ))
                self.events.register(
                    time, EventType.CPU_IDLE, None,
                    "CPU permanece inactiva",
                    "No hay procesos disponibles",
                )

            # Step 8: snapshot (handled after clock advance)
            # Step 9: advance clock
            time += 1

            snapshots.append(self._build_snapshot(time, cpu, gantt_blocks))

        metrics, global_metrics = self.metrics_calc.calculate(
            self._processes, time, idle_ticks,
        )
        merged = self._merge_gantt(gantt_blocks)

        return SimulationResult(
            snapshots=snapshots,
            metrics=metrics,
            global_metrics=global_metrics,
            events=self.events.get_events(),
            gantt=merged,
        )

    def _create_domain_processes(self, creates: list[ProcessCreate]) -> list[Process]:
        return [
            Process(
                id=c.id, name=c.name,
                arrival_time=c.arrival_time, cpu_burst=c.cpu_burst,
                priority=c.priority,
                io_operations=c.io_operations.copy(),
                remaining_cpu=c.cpu_burst,
                executed_cpu=0,
                current_state=ProcessState.NEW,
                finish_time=None,
                logical_order=i,
            )
            for i, c in enumerate(creates)
        ]

    def _process_arrivals_at(self, time: int) -> list[Process]:
        return [
            p for p in self._processes
            if p.arrival_time == time and p.current_state == ProcessState.NEW
        ]

    def _get_running(self, cpu: CPU) -> Process | None:
        if cpu.current_process is None:
            return None
        for p in self._processes:
            if p.id == cpu.current_process:
                return p
        return None

    def _is_simulation_complete(self, cpu: CPU) -> bool:
        all_terminated = all(
            p.current_state == ProcessState.TERMINATED for p in self._processes
        )
        return (
            all_terminated
            and self.cpl.is_empty()
            and cpu.status == CPUStatus.IDLE
            and not self.io_mgr.has_active_io()
        )

    def _build_snapshot(
        self, time: int, cpu: CPU, gantt_blocks: list[GanttBlock]
    ) -> Snapshot:
        return Snapshot(
            time=time,
            cpu=CPU(
                current_process=cpu.current_process,
                status=cpu.status,
            ),
            ready_queue=self.cpl.get_visual_queue(),
            blocked_queue=self.io_mgr.get_blocked_processes(),
            terminated_processes=[
                p for p in self._processes
                if p.current_state == ProcessState.TERMINATED
            ],
            events=self.events.get_events_at_time(time),
            gantt_block=gantt_blocks[-1] if gantt_blocks else None,
        )

    def _merge_gantt(self, blocks: list[GanttBlock]) -> list[GanttBlock]:
        if not blocks:
            return []
        merged: list[GanttBlock] = []
        cur = GanttBlock(process_id=blocks[0].process_id, start=blocks[0].start, end=blocks[0].end)
        for b in blocks[1:]:
            if b.process_id == cur.process_id and b.start == cur.end:
                cur.end = b.end
            else:
                merged.append(cur)
                cur = GanttBlock(process_id=b.process_id, start=b.start, end=b.end)
        merged.append(cur)
        return merged
