from src.domain.models import Process, Metric, GlobalMetrics, Snapshot


class MetricsCalculator:
    def calculate(self, processes: list[Process], total_time: int, idle_ticks: int) -> tuple[list[Metric], GlobalMetrics]:
        metrics: list[Metric] = []
        total_waiting = 0
        total_turnaround = 0

        for p in processes:
            turnaround = p.finish_time - p.arrival_time if p.finish_time is not None else 0
            total_cpu = p.cpu_burst
            total_io_blocked = self._calculate_total_io_time(p)
            waiting = turnaround - total_cpu - total_io_blocked

            metrics.append(Metric(
                process_id=p.id,
                turnaround_time=turnaround,
                waiting_time=waiting,
            ))
            total_waiting += waiting
            total_turnaround += turnaround

        n = len(processes)
        avg_waiting = round(total_waiting / n, 2) if n > 0 else 0.0
        avg_turnaround = round(total_turnaround / n, 2) if n > 0 else 0.0

        if total_time > 0:
            cpu_busy = total_time - idle_ticks
            utilization = round((cpu_busy / total_time) * 100, 2)
        else:
            utilization = 0.0

        global_metrics = GlobalMetrics(
            average_waiting_time=avg_waiting,
            average_turnaround_time=avg_turnaround,
            cpu_utilization=utilization,
        )

        return metrics, global_metrics

    def _calculate_total_io_time(self, process: Process) -> int:
        return sum(op.duration for op in process.io_operations)
