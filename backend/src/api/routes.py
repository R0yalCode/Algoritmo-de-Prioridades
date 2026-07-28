import uuid
from fastapi import APIRouter, HTTPException
from src.domain.models import ProcessCreate, IOOperation, SimulationInput
from src.validation.validator import Validator
from src.engine.simulation_engine import SimulationEngine
from src.persistence.persistence import Persistence
from src.api.schemas import (
    ProcessRequest, SimulationCreateRequest, ExerciseSaveRequest,
    ApiResponse, ApiError,
)

router = APIRouter(prefix="/api/v1")
validator = Validator()
persistence = Persistence()

simulations: dict[str, SimulationInput] = {}
results: dict[str, dict] = {}


def _to_domain_process(req: ProcessRequest) -> ProcessCreate:
    return ProcessCreate(
        id=req.id,
        name=req.name or req.id,
        arrival_time=req.arrivalTime,
        cpu_burst=req.cpuBurst,
        priority=req.priority,
        io_operations=[
            IOOperation(activation_point=io.activationPoint, duration=io.duration)
            for io in req.ioOperations
        ],
    )


def _snapshot_to_dict(snap) -> dict:
    return {
        "time": snap.time,
        "cpu": {
            "id": snap.cpu.current_process,
            "status": snap.cpu.status.value,
        } if snap.cpu else None,
        "readyQueue": [{"id": p.id, "priority": p.priority, "state": p.current_state.value} for p in snap.ready_queue],
        "blockedQueue": [{"id": p.id, "state": p.current_state.value} for p in snap.blocked_queue],
        "terminatedProcesses": [{"id": p.id, "finishTime": p.finish_time} for p in snap.terminated_processes],
        "events": [
            {"time": e.time, "type": e.type.value, "processId": e.process_id, "description": e.description}
            for e in snap.events
        ],
    }


@router.post("/simulations/validate")
def validate(body: SimulationCreateRequest):
    processes = [_to_domain_process(p) for p in body.processes]
    result = validator.validate(processes)
    if result.valid:
        return {"success": True, "data": {"valid": True}}
    return ApiError(
        error={"code": result.errors[0].code, "message": result.errors[0].message}
    )


@router.post("/simulations")
def create_simulation(body: SimulationCreateRequest):
    processes = [_to_domain_process(p) for p in body.processes]
    result = validator.validate(processes)
    if not result.valid:
        return ApiError(
            error={"code": result.errors[0].code, "message": result.errors[0].message}
        )
    sim_id = str(uuid.uuid4())[:8]
    simulations[sim_id] = SimulationInput(processes=processes)
    return {
        "success": True,
        "data": {"simulationId": sim_id, "status": "CREATED"},
        "message": "Simulación creada correctamente",
    }


@router.post("/simulations/{sim_id}/execute")
def execute_simulation(sim_id: str):
    if sim_id not in simulations:
        return ApiError(error={"code": "SIM-001", "message": "Simulación inexistente"})
    inp = simulations[sim_id]
    engine = SimulationEngine()
    result = engine.execute(inp)

    snapshots = [_snapshot_to_dict(s) for s in result.snapshots]

    total_time = result.snapshots[-1].time if result.snapshots else 0

    results[sim_id] = {
        "snapshots": snapshots,
        "events": [
            {"time": e.time, "type": e.type.value, "processId": e.process_id, "description": e.description,
             "reason": e.reason}
            for e in result.events
        ],
        "gantt": [
            {"processId": g.process_id, "start": g.start, "end": g.end}
            for g in result.gantt
        ],
        "metrics": [
            {"processId": m.process_id, "turnaroundTime": m.turnaround_time, "waitingTime": m.waiting_time}
            for m in result.metrics
        ],
        "globalMetrics": {
            "averageWaitingTime": result.global_metrics.average_waiting_time,
            "averageTurnaroundTime": result.global_metrics.average_turnaround_time,
            "cpuUtilization": result.global_metrics.cpu_utilization,
        } if result.global_metrics else None,
    }

    return {
        "success": True,
        "data": {"status": "COMPLETED", "totalTime": total_time},
    }


@router.get("/simulations/{sim_id}/results")
def get_results(sim_id: str):
    if sim_id not in results:
        if sim_id not in simulations:
            return ApiError(error={"code": "SIM-001", "message": "Simulación inexistente"})
        return ApiError(error={"code": "SIM-002", "message": "Simulación no ejecutada"})
    return {
        "success": True,
        "data": {
            "simulationId": sim_id,
            **results[sim_id],
        },
    }


@router.get("/simulations/{sim_id}/snapshot/{time}")
def get_snapshot(sim_id: str, time: int):
    if sim_id not in results:
        return ApiError(error={"code": "SIM-002", "message": "Simulación no ejecutada"})
    snapshots = results[sim_id].get("snapshots", [])
    for s in snapshots:
        if s["time"] == time:
            return {"success": True, "data": s}
    return ApiError(error={"code": "SIM-002", "message": f"Snapshot t={time} no encontrado"})


@router.post("/exercises/save")
def save_exercise(body: ExerciseSaveRequest):
    processes = [_to_domain_process(p) for p in body.simulation.processes]
    inp = SimulationInput(processes=processes)
    file_id = persistence.save(body.name, inp)
    return {
        "success": True,
        "data": {"fileId": file_id},
        "message": "Ejercicio guardado correctamente",
    }


@router.get("/exercises/{file_id}")
def load_exercise(file_id: str):
    try:
        ex = persistence.load(file_id)
    except FileNotFoundError:
        return ApiError(error={"code": "ERR-FILE-001", "message": "No se encontró el archivo solicitado"})
    except ValueError as e:
        return ApiError(error={"code": "ERR-FILE-003", "message": str(e)})
    return {
        "success": True,
        "data": {
            "name": ex.name,
            "processes": [
                {
                    "id": p.id,
                    "arrivalTime": p.arrival_time,
                    "cpuBurst": p.cpu_burst,
                    "priority": p.priority,
                    "ioOperations": [
                        {"activationPoint": io.activation_point, "duration": io.duration}
                        for io in p.io_operations
                    ],
                }
                for p in ex.processes
            ],
        },
    }


@router.delete("/exercises/{file_id}")
def delete_exercise(file_id: str):
    try:
        persistence.delete(file_id)
        return {"success": True, "message": "Ejercicio eliminado correctamente"}
    except Exception:
        return ApiError(error={"code": "ERR-FILE-002", "message": "Error al eliminar el ejercicio"})


@router.get("/exercises")
def list_exercises():
    exercises = persistence.list_exercises()
    return {"success": True, "data": {"exercises": exercises}}
