from src.domain.models import ProcessCreate, IOOperation, ValidationResult, ValidationError
from src.domain.enums import EventType


ERROR_CATALOG = {
    "VD-001": "ID de proceso duplicado",
    "VD-002": "Tiempo de llegada inválido",
    "VD-003": "La ráfaga CPU debe ser mayor que cero",
    "VD-004": "La prioridad debe estar entre 1 y 20",
    "VD-101": "El punto de activación debe ser mayor que cero",
    "VD-102": "Una operación E/S no puede activarse cuando termina la CPU total",
    "VD-103": "La duración de E/S debe ser mayor que cero",
    "VD-104": "Las operaciones E/S deben estar ordenadas cronológicamente",
    "VD-105": "No pueden existir múltiples operaciones E/S en el mismo punto de activación",
    "VD-201": "Debe existir al menos un proceso",
    "VD-202": "Ejercicio incompleto",
}


class Validator:
    def validate(self, processes: list[ProcessCreate]) -> ValidationResult:
        errors: list[ValidationError] = []

        errors.extend(self._validate_min_processes(processes))
        if errors:
            return ValidationResult(valid=False, errors=errors)

        errors.extend(self._validate_unique_ids(processes))
        errors.extend(self._validate_processes(processes))

        if errors:
            return ValidationResult(valid=False, errors=errors)

        return ValidationResult(valid=True, errors=[])

    def _validate_min_processes(
        self, processes: list[ProcessCreate]
    ) -> list[ValidationError]:
        if not processes:
            return [ValidationError(code="VD-201", message=ERROR_CATALOG["VD-201"])]
        return []

    def _validate_unique_ids(
        self, processes: list[ProcessCreate]
    ) -> list[ValidationError]:
        ids = [p.id for p in processes]
        if len(ids) != len(set(ids)):
            return [
                ValidationError(
                    code="VD-001",
                    message=ERROR_CATALOG["VD-001"],
                )
            ]
        return []

    def _validate_processes(
        self, processes: list[ProcessCreate]
    ) -> list[ValidationError]:
        errors: list[ValidationError] = []
        for p in processes:
            errors.extend(self._validate_process(p))
        return errors

    def _validate_process(self, p: ProcessCreate) -> list[ValidationError]:
        errors: list[ValidationError] = []
        errors.extend(self._validate_arrival_time(p))
        errors.extend(self._validate_cpu_burst(p))
        errors.extend(self._validate_priority(p))
        errors.extend(self._validate_io_operations(p))
        return errors

    def _validate_arrival_time(self, p: ProcessCreate) -> list[ValidationError]:
        if p.arrival_time < 0:
            return [
                ValidationError(
                    code="VD-002",
                    message=f"Proceso {p.id}: tiempo de llegada inválido",
                )
            ]
        return []

    def _validate_cpu_burst(self, p: ProcessCreate) -> list[ValidationError]:
        if p.cpu_burst <= 0:
            return [
                ValidationError(
                    code="VD-003",
                    message=f"Proceso {p.id}: {ERROR_CATALOG['VD-003']}",
                )
            ]
        return []

    def _validate_priority(self, p: ProcessCreate) -> list[ValidationError]:
        if p.priority < 1 or p.priority > 20:
            return [
                ValidationError(
                    code="VD-004",
                    message=f"Proceso {p.id}: la prioridad debe estar entre 1 y 20",
                )
            ]
        return []

    def _validate_io_operations(
        self, p: ProcessCreate
    ) -> list[ValidationError]:
        errors: list[ValidationError] = []
        ios = p.io_operations

        for idx, io in enumerate(ios):
            errors.extend(self._validate_io_activation_point(p, io, idx))
            errors.extend(self._validate_io_duration(io, idx))

        errors.extend(self._validate_io_order(ios))
        errors.extend(self._validate_io_duplicates(ios))

        return errors

    def _validate_io_activation_point(
        self, p: ProcessCreate, io: IOOperation, idx: int
    ) -> list[ValidationError]:
        if io.activation_point <= 0:
            return [
                ValidationError(
                    code="VD-101",
                    message=f"Proceso {p.id}, E/S #{idx}: {ERROR_CATALOG['VD-101']}",
                )
            ]
        if io.activation_point >= p.cpu_burst:
            return [
                ValidationError(
                    code="VD-102",
                    message=f"Proceso {p.id}, E/S #{idx}: {ERROR_CATALOG['VD-102']}",
                )
            ]
        return []

    def _validate_io_duration(
        self, io: IOOperation, idx: int
    ) -> list[ValidationError]:
        if io.duration <= 0:
            return [
                ValidationError(
                    code="VD-103",
                    message=ERROR_CATALOG["VD-103"],
                )
            ]
        return []

    def _validate_io_order(
        self, ios: list[IOOperation]
    ) -> list[ValidationError]:
        if len(ios) < 2:
            return []
        for i in range(1, len(ios)):
            if ios[i].activation_point <= ios[i - 1].activation_point:
                return [
                    ValidationError(
                        code="VD-104",
                        message=ERROR_CATALOG["VD-104"],
                    )
                ]
        return []

    def _validate_io_duplicates(
        self, ios: list[IOOperation]
    ) -> list[ValidationError]:
        points = [io.activation_point for io in ios]
        if len(points) != len(set(points)):
            return [
                ValidationError(
                    code="VD-105",
                    message=ERROR_CATALOG["VD-105"],
                )
            ]
        return []
