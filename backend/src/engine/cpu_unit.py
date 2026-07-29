from src.domain.models import Process


class CPUExecutionResult:
    def __init__(self, finished: bool, io_triggered: bool, io_point: int = 0):
        self.finished = finished
        self.io_triggered = io_triggered
        self.io_point = io_point


class CPUUnit:
    def execute_unit(self, process: Process) -> CPUExecutionResult:
        process.remaining_cpu -= 1
        process.executed_cpu += 1

        finished = process.remaining_cpu == 0

        io_triggered = False
        io_point = 0
        if not finished:
            for op in process.io_operations:
                if process.executed_cpu == op.activation_point:
                    io_triggered = True
                    io_point = op.activation_point
                    break

        return CPUExecutionResult(finished=finished, io_triggered=io_triggered, io_point=io_point)
