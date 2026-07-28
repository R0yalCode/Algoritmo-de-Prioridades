import tempfile
import os
import pytest
from src.domain.models import ProcessCreate, IOOperation, SimulationInput
from src.persistence.persistence import Persistence


@pytest.fixture
def tmp_storage():
    with tempfile.TemporaryDirectory() as d:
        yield d


@pytest.fixture
def sample_input():
    p1 = ProcessCreate(id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=3)
    p2 = ProcessCreate(id="P2", name="P2", arrival_time=3, cpu_burst=5, priority=1,
                       io_operations=[IOOperation(activation_point=2, duration=4)])
    return SimulationInput(processes=[p1, p2])


class TestPersistence:
    def test_save_and_load(self, tmp_storage, sample_input):
        p = Persistence(storage_dir=tmp_storage)
        file_id = p.save("Mi ejercicio", sample_input)
        assert file_id is not None
        assert len(file_id) > 0

        loaded = p.load(file_id)
        assert loaded.name == "Mi ejercicio"
        assert len(loaded.processes) == 2
        assert loaded.processes[0].id == "P1"
        assert loaded.processes[1].arrival_time == 3

    def test_list_exercises(self, tmp_storage, sample_input):
        p = Persistence(storage_dir=tmp_storage)
        p.save("Ej A", sample_input)
        p.save("Ej B", sample_input)
        exercises = p.list_exercises()
        assert len(exercises) == 2

    def test_delete(self, tmp_storage, sample_input):
        p = Persistence(storage_dir=tmp_storage)
        file_id = p.save("Borrar", sample_input)
        p.delete(file_id)
        with pytest.raises(FileNotFoundError):
            p.load(file_id)

    def test_load_nonexistent(self, tmp_storage):
        p = Persistence(storage_dir=tmp_storage)
        with pytest.raises(FileNotFoundError):
            p.load("no-existe")
