"""Golden Test oficial del algoritmo de Prioridades Apropiativo.

Contrato de regresión para el ejercicio de 11 procesos que se usa como
referencia en el proyecto (el mismo guardado en la biblioteca como
"ejemplo"). Cualquier cambio futuro en el motor o en el
PedagogicalHistoryBuilder debe seguir reproduciendo exactamente estos
resultados. Una diferencia aquí es una regresión, no un "ajuste esperado".

Origen de los valores áureos
-----------------------------
Los valores de CPU e I/O se generaron ejecutando `EXERCISE_PROCESSES` contra
el motor real y se verificaron dos veces de forma independiente:

1. Contra los eventos crudos de `EventManager` (fuente de verdad, no la
   capa de historia derivada), confirmando que cada IO_START ocurre
   exactamente cuando `executed_cpu == activation_point` (EVT-004,
   docs/11_eventos.md) y que ninguna apropiación ocurre entre procesos de
   igual prioridad (PLAN-002, docs/02_reglas_algoritmo.md).
2. Contra una invariante estructural: la cantidad total de bloques de
   `io_timeline` debe ser exactamente igual a la suma de operaciones de E/S
   declaradas en `EXERCISE_PROCESSES` (12 = 12).

Modelo de Ready History: apariciones, no procesos únicos
-----------------------------------------------------------
`readyTimeline` tiene una entrada por CADA aparición histórica de un proceso
en la cola de listos, no una por proceso:

  Llegada del proceso        abre una aparición nueva.
  Apropiación (READY->CPU->READY)  NO abre una aparición nueva: la tarjeta
                              conserva su visualIndex y firstAppearance;
                              solo cambian sus datos dinámicos (remainingCPU,
                              estado).
  Regreso desde E/S (BLOCKED->READY)  SÍ abre una aparición nueva, con su
                              propio visualIndex y firstAppearance. Es la
                              única situación, junto con la llegada, que crea
                              una entrada nueva.

`GOLDEN_READY_HISTORY` es la secuencia de 23 apariciones que produce
`EXERCISE_PROCESSES` bajo esta regla, verificada con el motor real. Cada
elemento corresponde a exactamente una tarjeta visual en la Ready Queue
histórica del frontend: ni una menos, ni una más.
"""

import pytest
from src.domain.models import ProcessCreate, IOOperation, SimulationInput
from src.engine.simulation_engine import SimulationEngine


# ---------------------------------------------------------------------------
# Datos de entrada oficiales — nunca deben modificarse.
# Tupla: (id, arrival_time, cpu_burst, priority, [(activation_point, duration), ...])
# ---------------------------------------------------------------------------

EXERCISE_PROCESSES = [
    ("P1", 14, 10, 9, [(5, 5)]),
    ("P2", 3, 5, 2, [(1, 5), (3, 6)]),
    ("P3", 25, 3, 1, []),
    ("P4", 10, 4, 3, [(2, 3)]),
    ("P5", 0, 6, 3, [(5, 5)]),
    ("P6", 16, 6, 2, [(3, 5)]),
    ("P7", 8, 3, 1, [(2, 10)]),
    ("P8", 1, 8, 2, [(3, 7), (5, 5)]),
    ("P9", 32, 5, 5, []),
    ("P10", 6, 7, 1, [(2, 8), (5, 5)]),
    ("P11", 19, 5, 2, [(1, 6)]),
]


def _build_processes() -> list[ProcessCreate]:
    return [
        ProcessCreate(
            id=pid, name=pid, arrival_time=arrival, cpu_burst=burst, priority=priority,
            io_operations=[
                IOOperation(activation_point=point, duration=duration)
                for point, duration in ios
            ],
        )
        for pid, arrival, burst, priority, ios in EXERCISE_PROCESSES
    ]


# ---------------------------------------------------------------------------
# 1. CPU Timeline (Golden CPU) — proceso, inicio, fin. Independiente del
#    modelo de apariciones: no cambia entre apropiación y retorno de E/S.
# ---------------------------------------------------------------------------

GOLDEN_CPU_GANTT = [
    ("P5", 0, 1), ("P8", 1, 4), ("P2", 4, 5), ("P5", 5, 6),
    ("P10", 6, 8), ("P7", 8, 10), ("P2", 10, 12), ("P8", 12, 14),
    ("P5", 14, 16), ("P10", 16, 19), ("P6", 19, 20), ("P7", 20, 21),
    ("P6", 21, 23), ("P2", 23, 24), ("P10", 24, 26), ("P3", 26, 29),
    ("P2", 29, 30), ("P11", 30, 31), ("P8", 31, 34), ("P6", 34, 37),
    ("P11", 37, 41), ("P5", 41, 42), ("P4", 42, 44), ("P9", 44, 47),
    ("P5", 47, 48), ("P4", 48, 50), ("P9", 50, 52), ("P1", 52, 57),
    ("IDLE", 57, 62), ("P1", 62, 67),
]


# ---------------------------------------------------------------------------
# 2. Ready History (Golden Ready) — secuencia de apariciones, en el orden en
#    que se crean. Debe coincidir con el frontend tarjeta a tarjeta.
# ---------------------------------------------------------------------------

GOLDEN_READY_HISTORY = [
    "P5", "P8", "P2", "P10", "P7", "P4", "P2", "P8", "P1", "P6", "P10",
    "P2", "P11", "P8", "P7", "P10", "P3", "P6", "P9", "P11", "P5", "P4", "P1",
]

GOLDEN_READY_TIMELINE = [
    {"process": "P5", "visualIndex": 0, "firstAppearance": 0, "priority": 3,
     "stateTransitions": ["RUNNING", "READY", "RUNNING", "READY", "RUNNING",
                           "READY", "RUNNING", "BLOCKED"]},
    {"process": "P8", "visualIndex": 1, "firstAppearance": 1, "priority": 2,
     "stateTransitions": ["RUNNING", "BLOCKED"]},
    {"process": "P2", "visualIndex": 2, "firstAppearance": 3, "priority": 2,
     "stateTransitions": ["READY", "RUNNING", "BLOCKED"]},
    {"process": "P10", "visualIndex": 3, "firstAppearance": 6, "priority": 1,
     "stateTransitions": ["RUNNING", "BLOCKED"]},
    {"process": "P7", "visualIndex": 4, "firstAppearance": 8, "priority": 1,
     "stateTransitions": ["RUNNING", "BLOCKED"]},
    {"process": "P4", "visualIndex": 5, "firstAppearance": 10, "priority": 3,
     "stateTransitions": ["READY", "RUNNING", "BLOCKED"]},
    {"process": "P2", "visualIndex": 6, "firstAppearance": 10, "priority": 2,
     "stateTransitions": ["RUNNING", "BLOCKED"]},
    {"process": "P8", "visualIndex": 7, "firstAppearance": 11, "priority": 2,
     "stateTransitions": ["READY", "RUNNING", "BLOCKED"]},
    {"process": "P1", "visualIndex": 8, "firstAppearance": 14, "priority": 9,
     "stateTransitions": ["READY", "RUNNING", "BLOCKED"]},
    {"process": "P6", "visualIndex": 9, "firstAppearance": 16, "priority": 2,
     "stateTransitions": ["READY", "RUNNING", "READY", "RUNNING", "BLOCKED"]},
    {"process": "P10", "visualIndex": 10, "firstAppearance": 16, "priority": 1,
     "stateTransitions": ["RUNNING", "BLOCKED"]},
    {"process": "P2", "visualIndex": 11, "firstAppearance": 18, "priority": 2,
     "stateTransitions": ["READY", "RUNNING", "READY", "RUNNING", "TERMINATED"]},
    {"process": "P11", "visualIndex": 12, "firstAppearance": 19, "priority": 2,
     "stateTransitions": ["READY", "RUNNING", "BLOCKED"]},
    {"process": "P8", "visualIndex": 13, "firstAppearance": 19, "priority": 2,
     "stateTransitions": ["READY", "RUNNING", "TERMINATED"]},
    {"process": "P7", "visualIndex": 14, "firstAppearance": 20, "priority": 1,
     "stateTransitions": ["RUNNING", "TERMINATED"]},
    {"process": "P10", "visualIndex": 15, "firstAppearance": 24, "priority": 1,
     "stateTransitions": ["RUNNING", "TERMINATED"]},
    {"process": "P3", "visualIndex": 16, "firstAppearance": 25, "priority": 1,
     "stateTransitions": ["READY", "RUNNING", "TERMINATED"]},
    {"process": "P6", "visualIndex": 17, "firstAppearance": 28, "priority": 2,
     "stateTransitions": ["READY", "RUNNING", "TERMINATED"]},
    {"process": "P9", "visualIndex": 18, "firstAppearance": 32, "priority": 5,
     "stateTransitions": ["READY", "RUNNING", "READY", "RUNNING", "TERMINATED"]},
    {"process": "P11", "visualIndex": 19, "firstAppearance": 37, "priority": 2,
     "stateTransitions": ["RUNNING", "TERMINATED"]},
    {"process": "P5", "visualIndex": 20, "firstAppearance": 47, "priority": 3,
     "stateTransitions": ["RUNNING", "TERMINATED"]},
    {"process": "P4", "visualIndex": 21, "firstAppearance": 47, "priority": 3,
     "stateTransitions": ["READY", "RUNNING", "TERMINATED"]},
    {"process": "P1", "visualIndex": 22, "firstAppearance": 62, "priority": 9,
     "stateTransitions": ["RUNNING"]},
]


# ---------------------------------------------------------------------------
# 3. I/O Timeline (Golden I/O) — proceso, inicio, fin, prioridad,
#    remainingCPU (al iniciar el bloqueo), visualIndex de la aparición que
#    estaba vigente en ese momento (no necesariamente la primera del proceso).
# ---------------------------------------------------------------------------

GOLDEN_IO_TIMELINE = [
    ("P8", 4, 11, 2, 5, 1),
    ("P2", 5, 10, 2, 4, 2),
    ("P10", 8, 16, 1, 5, 3),
    ("P7", 10, 20, 1, 1, 4),
    ("P2", 12, 18, 2, 2, 6),
    ("P8", 14, 19, 2, 3, 7),
    ("P10", 19, 24, 1, 2, 10),
    ("P6", 23, 28, 2, 3, 9),
    ("P11", 31, 37, 2, 4, 12),
    ("P5", 42, 47, 3, 1, 0),
    ("P4", 44, 47, 3, 2, 5),
    ("P1", 57, 62, 9, 5, 8),
]


@pytest.fixture(scope="module")
def golden_result():
    engine = SimulationEngine()
    return engine.execute(SimulationInput(processes=_build_processes()))


def _compress(states: list[str]) -> list[str]:
    compressed: list[str] = []
    for s in states:
        if not compressed or compressed[-1] != s:
            compressed.append(s)
    return compressed


class TestDatosDeEntrada:
    def test_ejercicio_tiene_11_procesos_sin_alterar(self):
        assert len(EXERCISE_PROCESSES) == 11
        ids = [p[0] for p in EXERCISE_PROCESSES]
        assert ids == [f"P{i}" for i in range(1, 12)]

    def test_total_operaciones_io_declaradas(self):
        total = sum(len(ios) for _, _, _, _, ios in EXERCISE_PROCESSES)
        assert total == 12


class TestGoldenCPUGantt:
    def test_gantt_coincide_exactamente(self, golden_result):
        actual = [(g.process_id, g.start, g.end) for g in golden_result.gantt]
        assert actual == GOLDEN_CPU_GANTT

    def test_duracion_es_end_menos_start(self, golden_result):
        for g in golden_result.gantt:
            assert (g.end - g.start) > 0

    def test_cpu_timeline_historia_coincide_con_el_gantt(self, golden_result):
        cpu = [
            (b.process_id or "IDLE", b.start, b.end)
            for b in golden_result.history.cpu_timeline
        ]
        assert cpu == GOLDEN_CPU_GANTT


class TestGoldenIOTimeline:
    def test_io_timeline_coincide_exactamente(self, golden_result):
        actual = [
            (b.process_id, b.start, b.end, b.priority, b.remaining_cpu, b.visual_index)
            for b in golden_result.history.io_timeline
        ]
        assert actual == GOLDEN_IO_TIMELINE

    def test_cantidad_de_bloques_igual_a_operaciones_declaradas(self, golden_result):
        declared = sum(len(ios) for _, _, _, _, ios in EXERCISE_PROCESSES)
        assert len(golden_result.history.io_timeline) == declared

    def test_todos_los_bloques_completados(self, golden_result):
        assert all(b.completed for b in golden_result.history.io_timeline)


class TestGoldenReadyHistory:
    """La secuencia de apariciones: fuente oficial de verdad para el frontend."""

    def test_cantidad_de_tarjetas_coincide_exactamente(self, golden_result):
        assert len(golden_result.history.ready_timeline) == len(GOLDEN_READY_HISTORY)

    def test_orden_de_apariciones_coincide_exactamente(self, golden_result):
        actual = [e.process_id for e in golden_result.history.ready_timeline]
        assert actual == GOLDEN_READY_HISTORY

    def test_cada_posicion_individual(self, golden_result):
        """len(renderedReadyCards) == len(GOLDEN_READY_HISTORY) y
        renderedReadyCards[i].processId == GOLDEN_READY_HISTORY[i] para cada i."""
        entries = golden_result.history.ready_timeline
        assert len(entries) == len(GOLDEN_READY_HISTORY)
        for i, expected_pid in enumerate(GOLDEN_READY_HISTORY):
            assert entries[i].process_id == expected_pid, f"posición {i}"


class TestGoldenReadyTimeline:
    def test_detalle_de_cada_aparicion_coincide_exactamente(self, golden_result):
        entries = golden_result.history.ready_timeline
        assert len(entries) == len(GOLDEN_READY_TIMELINE)
        for entry, expected in zip(entries, GOLDEN_READY_TIMELINE):
            assert entry.process_id == expected["process"]
            assert entry.visual_index == expected["visualIndex"], expected["process"]
            assert entry.first_appearance == expected["firstAppearance"], expected["process"]
            assert entry.priority == expected["priority"], expected["process"]
            assert _compress([o.state for o in entry.history]) == expected["stateTransitions"], \
                expected["process"]

    def test_visual_index_consecutivo_desde_cero(self, golden_result):
        indices = [e.visual_index for e in golden_result.history.ready_timeline]
        assert indices == list(range(len(GOLDEN_READY_HISTORY)))


class TestReglaApropiacion:
    """P8 (prioridad 2) apropia a P5 (prioridad 3) en t=1: P5 vuelve a READY
    dentro de la MISMA aparición, no se crea una tarjeta nueva."""

    def test_p5_conserva_visual_index_y_first_appearance_tras_ser_expropiado(self, golden_result):
        primera_p5 = golden_result.history.ready_timeline[0]
        assert primera_p5.process_id == "P5"
        assert primera_p5.visual_index == 0
        assert primera_p5.first_appearance == 0
        # READY tras ser expropiado en t=1, dentro de la misma aparición
        assert primera_p5.history[1].state == "READY"

    def test_apropiacion_no_crea_una_aparicion_nueva(self, golden_result):
        # P5 solo reaparece más adelante por retorno de E/S (visualIndex=20),
        # nunca por la apropiación de t=1.
        entries = [e for e in golden_result.history.ready_timeline if e.process_id == "P5"]
        assert [e.visual_index for e in entries] == [0, 20]

    def test_evento_de_preempcion_registrado_en_t1(self, golden_result):
        preemptions = [e for e in golden_result.events if e.type.value == "PREEMPTION"]
        assert any(e.time == 1 and e.process_id == "P5" for e in preemptions)


class TestReglaRetornoDesdeIO:
    """P8 vuelve de su primera E/S en t=11: se abre una aparición nueva."""

    def test_p8_recibe_nuevo_visual_index_y_first_appearance_al_volver(self, golden_result):
        apariciones = [e for e in golden_result.history.ready_timeline if e.process_id == "P8"]
        assert [(e.visual_index, e.first_appearance) for e in apariciones] == [
            (1, 1), (7, 11), (13, 19),
        ]

    def test_retorno_de_io_crea_una_aparicion_nueva_al_final(self, golden_result):
        indices = [e.visual_index for e in golden_result.history.ready_timeline
                   if e.process_id == "P8"]
        assert indices == sorted(indices)
        assert len(indices) == 3  # 2 operaciones de E/S -> 3 apariciones

    def test_primera_aparicion_de_p8_queda_fija_en_blocked(self, golden_result):
        primera = next(e for e in golden_result.history.ready_timeline if e.process_id == "P8")
        assert primera.history[-1].state == "BLOCKED"
        assert primera.history[-1].time == 10  # un tick antes de que regrese en t=11

    def test_evento_io_complete_registrado_en_t11(self, golden_result):
        completions = [e for e in golden_result.events if e.type.value == "IO_COMPLETE"]
        assert any(e.time == 11 and e.process_id == "P8" for e in completions)
