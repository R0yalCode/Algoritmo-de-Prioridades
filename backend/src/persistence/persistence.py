import json
import os
import uuid
from datetime import date
from src.domain.models import ProcessCreate, IOOperation, SimulationInput


STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "exercises")
VERSION = "1.0"


class ExerciseFile:
    def __init__(self, file_id: str, name: str, processes: list[ProcessCreate]):
        self.file_id = file_id
        self.name = name
        self.processes = processes


class Persistence:
    def __init__(self, storage_dir: str | None = None):
        self._dir = storage_dir or STORAGE_DIR
        os.makedirs(self._dir, exist_ok=True)

    def save(self, name: str, inp: SimulationInput) -> str:
        file_id = str(uuid.uuid4())
        data = self._build_exercise_data(file_id, name, inp)
        filepath = os.path.join(self._dir, f"{file_id}.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return file_id

    def load(self, file_id: str) -> ExerciseFile:
        filepath = os.path.join(self._dir, f"{file_id}.json")
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Ejercicio {file_id} no encontrado")

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        self._validate_version(data)

        processes = self._parse_processes(data.get("processes", []))
        name = data.get("metadata", {}).get("name", "Sin nombre")
        return ExerciseFile(file_id=file_id, name=name, processes=processes)

    def list_exercises(self) -> list[dict]:
        exercises = []
        if not os.path.exists(self._dir):
            return exercises
        for fname in os.listdir(self._dir):
            if fname.endswith(".json"):
                filepath = os.path.join(self._dir, fname)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    metadata = data.get("metadata", {})
                    processes = data.get("processes", [])
                    exercises.append({
                        "id": fname.replace(".json", ""),
                        "name": metadata.get("name", "Sin nombre"),
                        "createdAt": metadata.get("createdAt", ""),
                        "processCount": len(processes),
                    })
                except (json.JSONDecodeError, KeyError):
                    continue
        return exercises

    def delete(self, file_id: str) -> None:
        filepath = os.path.join(self._dir, f"{file_id}.json")
        if os.path.exists(filepath):
            os.remove(filepath)

    def _build_exercise_data(self, file_id: str, name: str, inp: SimulationInput) -> dict:
        return {
            "version": VERSION,
            "exerciseId": file_id,
            "metadata": {
                "name": name,
                "createdAt": str(date.today()),
            },
            "processes": [
                {
                    "id": p.id,
                    "name": p.name,
                    "arrivalTime": p.arrival_time,
                    "cpuBurst": p.cpu_burst,
                    "priority": p.priority,
                    "ioOperations": [
                        {
                            "activationPoint": io.activation_point,
                            "duration": io.duration,
                        }
                        for io in p.io_operations
                    ],
                }
                for p in inp.processes
            ],
        }

    def _validate_version(self, data: dict) -> None:
        version = data.get("version", "")
        if version != VERSION:
            raise ValueError(
                f"Versión {version} no compatible. Versión esperada: {VERSION}"
            )

    def _parse_processes(self, processes_data: list[dict]) -> list[ProcessCreate]:
        result = []
        for p in processes_data:
            ios = [
                IOOperation(activation_point=io["activationPoint"], duration=io["duration"])
                for io in p.get("ioOperations", [])
            ]
            proc = ProcessCreate(
                id=p["id"],
                name=p.get("name", p["id"]),
                arrival_time=p["arrivalTime"],
                cpu_burst=p["cpuBurst"],
                priority=p["priority"],
                io_operations=ios,
            )
            result.append(proc)
        return result
