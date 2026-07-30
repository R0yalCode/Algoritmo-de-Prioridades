"""Registro de índices visuales permanentes.

Contrato MODULE-CPL-001 (orden visual): el índice visual de un proceso se
asigna en su primera aparición y nunca cambia durante la simulación, aunque el
proceso salga y vuelva a la CPL.
"""


class VisualIndexRegistry:
    def __init__(self) -> None:
        self._indexes: dict[str, int] = {}
        self._first_appearance: dict[str, int] = {}
        self._next_index: int = 0

    def register(self, process_id: str, time: int) -> int:
        """Asigna el índice visual si el proceso es nuevo. Idempotente."""
        if process_id not in self._indexes:
            self._indexes[process_id] = self._next_index
            self._first_appearance[process_id] = time
            self._next_index += 1
        return self._indexes[process_id]

    def index_of(self, process_id: str) -> int | None:
        return self._indexes.get(process_id)

    def first_appearance_of(self, process_id: str) -> int | None:
        return self._first_appearance.get(process_id)

    def known_processes(self) -> list[str]:
        """Identificadores conocidos, en orden de índice visual."""
        return sorted(self._indexes, key=lambda pid: self._indexes[pid])

    def size(self) -> int:
        return len(self._indexes)

    def reset(self) -> None:
        self._indexes.clear()
        self._first_appearance.clear()
        self._next_index = 0
