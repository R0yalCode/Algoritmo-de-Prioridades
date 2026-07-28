from pydantic import BaseModel, Field
from typing import Optional


class IOOperationRequest(BaseModel):
    activationPoint: int
    duration: int


class ProcessRequest(BaseModel):
    id: str
    name: str = ""
    arrivalTime: int
    cpuBurst: int
    priority: int
    ioOperations: list[IOOperationRequest] = []


class SimulationCreateRequest(BaseModel):
    algorithm: str = "PREEMPTIVE_PRIORITY"
    processes: list[ProcessRequest]


class ExerciseSaveRequest(BaseModel):
    name: str
    simulation: SimulationCreateRequest


class ApiResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    message: str = ""


class ApiError(BaseModel):
    success: bool = False
    error: dict


class ValidationResponse(BaseModel):
    success: bool = True
    data: dict


class SimulationResultResponse(BaseModel):
    simulationId: str
    snapshots: list
    metrics: dict
    events: list
    gantt: list


class ExerciseResponse(BaseModel):
    name: str
    processes: list
