from enum import Enum


class ProcessState(str, Enum):
    NEW = "NEW"
    READY = "READY"
    RUNNING = "RUNNING"
    BLOCKED = "BLOCKED"
    TERMINATED = "TERMINATED"


class CPUStatus(str, Enum):
    BUSY = "BUSY"
    IDLE = "IDLE"


class EventType(str, Enum):
    PROCESS_ARRIVAL = "PROCESS_ARRIVAL"
    CPU_DISPATCH = "CPU_DISPATCH"
    CPU_EXECUTION = "CPU_EXECUTION"
    CPU_COMPLETION = "CPU_COMPLETION"
    IO_START = "IO_START"
    IO_COMPLETE = "IO_COMPLETE"
    PREEMPTION = "PREEMPTION"
    CPU_IDLE = "CPU_IDLE"
    CONTEXT_SWITCH = "CONTEXT_SWITCH"


class SimulationStatus(str, Enum):
    CREATED = "CREATED"
    VALIDATED = "VALIDATED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"
