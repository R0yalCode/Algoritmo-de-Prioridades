import pytest
from src.domain.models import ProcessCreate, IOOperation
from src.validation.validator import Validator


@pytest.fixture
def validator():
    return Validator()


@pytest.fixture
def valid_process():
    return ProcessCreate(
        id="P1",
        name="P1",
        arrival_time=0,
        cpu_burst=10,
        priority=3,
    )


class TestValidatorStructural:
    def test_valid_single_process(self, validator, valid_process):
        result = validator.validate([valid_process])
        assert result.valid is True
        assert result.errors == []

    def test_empty_process_list(self, validator):
        result = validator.validate([])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-201" in codes

    def test_duplicate_ids(self, validator, valid_process):
        p2 = valid_process.model_copy(update={"id": "P1", "name": "P1"})
        result = validator.validate([valid_process, p2])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-001" in codes


class TestValidatorDomain:
    def test_negative_arrival(self, validator):
        p = ProcessCreate.model_construct(
            id="P1", name="P1", arrival_time=-1, cpu_burst=10, priority=3
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-002" in codes

    def test_zero_cpu_burst(self, validator):
        p = ProcessCreate.model_construct(
            id="P1", name="P1", arrival_time=0, cpu_burst=0, priority=3
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-003" in codes

    def test_priority_too_low(self, validator):
        p = ProcessCreate.model_construct(
            id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=0
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-004" in codes

    def test_priority_too_high(self, validator):
        p = ProcessCreate.model_construct(
            id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=21
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-004" in codes

    def test_priority_min_edge(self, validator):
        p = ProcessCreate(
            id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=1
        )
        result = validator.validate([p])
        assert result.valid is True

    def test_priority_max_edge(self, validator):
        p = ProcessCreate(
            id="P1", name="P1", arrival_time=0, cpu_burst=10, priority=20
        )
        result = validator.validate([p])
        assert result.valid is True


class TestValidatorIO:
    def test_valid_io(self, validator):
        p = ProcessCreate(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=10,
            priority=3,
            io_operations=[IOOperation(activation_point=5, duration=3)],
        )
        result = validator.validate([p])
        assert result.valid is True

    def test_activation_point_zero(self, validator):
        p = ProcessCreate.model_construct(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=10,
            priority=3,
            io_operations=[IOOperation.model_construct(activation_point=0, duration=3)],
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-101" in codes

    def test_activation_point_equals_cpu_burst(self, validator):
        p = ProcessCreate(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=5,
            priority=3,
            io_operations=[IOOperation(activation_point=5, duration=3)],
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-102" in codes

    def test_duration_zero(self, validator):
        p = ProcessCreate.model_construct(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=10,
            priority=3,
            io_operations=[IOOperation.model_construct(activation_point=5, duration=0)],
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-103" in codes

    def test_io_wrong_order(self, validator):
        p = ProcessCreate(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=20,
            priority=3,
            io_operations=[
                IOOperation(activation_point=8, duration=2),
                IOOperation(activation_point=5, duration=3),
            ],
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-104" in codes

    def test_io_duplicate_activation_point(self, validator):
        p = ProcessCreate(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=20,
            priority=3,
            io_operations=[
                IOOperation(activation_point=5, duration=3),
                IOOperation(activation_point=5, duration=2),
            ],
        )
        result = validator.validate([p])
        assert result.valid is False
        codes = [e.code for e in result.errors]
        assert "VD-105" in codes

    def test_multiple_valid_io(self, validator):
        p = ProcessCreate(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=20,
            priority=3,
            io_operations=[
                IOOperation(activation_point=5, duration=3),
                IOOperation(activation_point=12, duration=4),
            ],
        )
        result = validator.validate([p])
        assert result.valid is True

    def test_multiple_processes_with_io(self, validator):
        p1 = ProcessCreate(
            id="P1",
            name="P1",
            arrival_time=0,
            cpu_burst=10,
            priority=2,
            io_operations=[IOOperation(activation_point=5, duration=3)],
        )
        p2 = ProcessCreate(
            id="P2",
            name="P2",
            arrival_time=0,
            cpu_burst=8,
            priority=1,
            io_operations=[IOOperation(activation_point=3, duration=2)],
        )
        result = validator.validate([p1, p2])
        assert result.valid is True
