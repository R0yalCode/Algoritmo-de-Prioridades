"""Pruebas de contenido de SimulationHistory (Fase 2).

Todo se verifica contra los casos oficiales de 10_modelo_pruebas.md y contra los
productos que ya existían (gantt, events, metrics, snapshots).
"""

from src.domain.models import ProcessCreate, IOOperation, SimulationInput
from src.engine.simulation_engine import SimulationEngine


def make_process(id: str, arrival: int, cpu: int, priority: int, ios: list | None = None):
    return ProcessCreate(
        id=id, name=id, arrival_time=arrival, cpu_burst=cpu, priority=priority,
        io_operations=ios or [],
    )


def make_io(point: int, duration: int):
    return IOOperation(activation_point=point, duration=duration)


def run(processes: list[ProcessCreate]):
    engine = SimulationEngine()
    return engine.execute(SimulationInput(processes=processes))


CASO_04 = [make_process("P1", 0, 10, 5), make_process("P2", 3, 5, 1)]
CASO_07 = [
    make_process("P1", 0, 10, 2, [make_io(5, 3)]),
    make_process("P2", 4, 5, 3),
]
CASO_08 = [make_process("P1", 0, 20, 2, [make_io(5, 3), make_io(12, 4)])]
ESCENARIOS = {
    "caso_01": [make_process("P1", 0, 5, 3)],
    "caso_02": [
        make_process("P1", 0, 5, 2),
        make_process("P2", 0, 5, 2),
        make_process("P3", 0, 5, 2),
    ],
    "caso_03": [make_process("P1", 0, 10, 5), make_process("P2", 0, 5, 2)],
    "caso_04": CASO_04,
    "caso_06": [make_process("P1", 0, 10, 2, [make_io(5, 3)])],
    "caso_07": CASO_07,
    "caso_08": CASO_08,
    "caso_09": [make_process("P1", 0, 3, 1), make_process("P2", 0, 3, 20)],
}


def entries_of(history, process_id: str) -> list:
    """Todas las apariciones de un proceso, en orden de creación."""
    return [e for e in history.ready_timeline if e.process_id == process_id]


def entry_of(history, process_id: str):
    """La única aparición de un proceso. Falla si tuvo más de una (o ninguna):
    ese es justamente el caso en que hay que usar entries_of() en su lugar."""
    matches = entries_of(history, process_id)
    if len(matches) != 1:
        raise AssertionError(
            f"{process_id} tiene {len(matches)} apariciones, se esperaba exactamente 1"
        )
    return matches[0]


def states_of(history, process_id: str) -> dict[int, str]:
    return {o.time: o.state for o in entry_of(history, process_id).history}


def merged_states_of(history, process_id: str) -> dict[int, str]:
    """Estados de un proceso combinando TODAS sus apariciones. Es seguro:
    las apariciones de un mismo proceso nunca se superponen en el tiempo."""
    merged: dict[int, str] = {}
    for entry in entries_of(history, process_id):
        for o in entry.history:
            merged[o.time] = o.state
    return merged


class TestReadyTimeline:
    def test_apariciones_igual_a_llegada_mas_retornos_de_io(self):
        """Cada proceso tiene una aparición por llegada y una por cada E/S que
        completa (regla de apariciones: apropiación no crea, retorno de E/S sí)."""
        for nombre, procesos in ESCENARIOS.items():
            history = run(procesos).history
            conteo: dict[str, int] = {}
            for e in history.ready_timeline:
                conteo[e.process_id] = conteo.get(e.process_id, 0) + 1
            esperado = {p.id: 1 + len(p.io_operations) for p in procesos}
            assert conteo == esperado, nombre

    def test_visual_index_es_consecutivo_desde_cero(self):
        for nombre, procesos in ESCENARIOS.items():
            history = run(procesos).history
            indices = [e.visual_index for e in history.ready_timeline]
            assert indices == list(range(len(history.ready_timeline))), nombre

    def test_visual_index_sigue_el_orden_de_llegada(self):
        """Caso 02: tres llegadas simultáneas conservan el orden de ingreso."""
        history = run(ESCENARIOS["caso_02"]).history
        assert [e.process_id for e in history.ready_timeline] == ["P1", "P2", "P3"]
        assert [e.visual_index for e in history.ready_timeline] == [0, 1, 2]

    def test_apropiacion_no_crea_aparicion_nueva(self):
        """Caso 04: P1 es apropiado por P2 pero nunca hace E/S -> una sola tarjeta."""
        history = run(CASO_04).history
        apariciones = entries_of(history, "P1")
        assert len(apariciones) == 1
        assert apariciones[0].visual_index == 0
        assert apariciones[0].first_appearance == 0

    def test_retorno_de_io_crea_aparicion_nueva(self):
        """Caso 07: P1 hace una E/S y regresa -> dos tarjetas, cada una con su
        propio visualIndex y firstAppearance permanentes mientras está vigente."""
        history = run(CASO_07).history
        apariciones = entries_of(history, "P1")
        assert len(apariciones) == 2
        assert (apariciones[0].visual_index, apariciones[0].first_appearance) == (0, 0)
        assert (apariciones[1].visual_index, apariciones[1].first_appearance) == (2, 8)
        # P2 nunca hace E/S: una sola aparición, con el visualIndex intermedio
        # (se creó al llegar, antes de que P1 regresara de su E/S)
        assert entry_of(history, "P2").visual_index == 1

    def test_first_appearance_del_proceso_es_el_tick_de_llegada(self):
        history = run(CASO_07).history
        assert entries_of(history, "P1")[0].first_appearance == 0
        assert entry_of(history, "P2").first_appearance == 4

    def test_cada_aparicion_es_contigua_y_termina_donde_debe(self):
        """La historia de una aparición arranca en su firstAppearance y es
        contigua sin huecos. Si fue superada por una aparición posterior del
        mismo proceso, termina justo un tick antes de que esa comience
        (queda fija ahí, sin volver a actualizarse). La última aparición de
        cada proceso llega hasta el final de la simulación."""
        for nombre, procesos in ESCENARIOS.items():
            result = run(procesos)
            ultimo_tick = result.snapshots[-1].time - 1
            por_proceso: dict[str, list] = {}
            for e in result.history.ready_timeline:
                por_proceso.setdefault(e.process_id, []).append(e)
            for pid, apariciones in por_proceso.items():
                for i, entry in enumerate(apariciones):
                    tiempos = [o.time for o in entry.history]
                    assert tiempos[0] == entry.first_appearance, (nombre, pid, i)
                    assert tiempos == list(range(tiempos[0], tiempos[-1] + 1)), (nombre, pid, i)
                    if i == len(apariciones) - 1:
                        assert tiempos[-1] == ultimo_tick, (nombre, pid, i)
                    else:
                        assert tiempos[-1] == apariciones[i + 1].first_appearance - 1, \
                            (nombre, pid, i)

    def test_estados_siguen_la_simulacion_caso_04(self):
        """P1 ejecuta 0-2, es apropiado, espera 3-7 y vuelve 8-14."""
        history = run(CASO_04).history
        p1 = states_of(history, "P1")
        assert [p1[t] for t in range(0, 3)] == ["RUNNING"] * 3
        assert [p1[t] for t in range(3, 8)] == ["READY"] * 5
        assert [p1[t] for t in range(8, 15)] == ["RUNNING"] * 7
        p2 = states_of(history, "P2")
        assert [p2[t] for t in range(3, 8)] == ["RUNNING"] * 5
        assert [p2[t] for t in range(8, 15)] == ["TERMINATED"] * 7

    def test_estados_siguen_la_simulacion_con_io(self):
        """Caso 07: primera aparición de P1 RUNNING 0-4, BLOCKED 5-7 (queda fija
        ahí); segunda aparición RUNNING 8-12, TERMINATED 13-14."""
        history = run(CASO_07).history
        primera, segunda = entries_of(history, "P1")
        p1_primera = {o.time: o.state for o in primera.history}
        p1_segunda = {o.time: o.state for o in segunda.history}
        assert [p1_primera[t] for t in range(0, 5)] == ["RUNNING"] * 5
        assert [p1_primera[t] for t in range(5, 8)] == ["BLOCKED"] * 3
        assert [p1_segunda[t] for t in range(8, 13)] == ["RUNNING"] * 5
        assert [p1_segunda[t] for t in range(13, 15)] == ["TERMINATED"] * 2

    def test_active_solo_es_true_en_ready(self):
        for nombre, procesos in ESCENARIOS.items():
            history = run(procesos).history
            for entry in history.ready_timeline:
                for o in entry.history:
                    assert o.active == (o.state == "READY"), (nombre, entry.process_id, o.time)

    def test_active_cambia_al_entrar_y_salir_de_la_cpl(self):
        """Caso 04: P1 pasa a READY al ser apropiado y vuelve a RUNNING."""
        p1 = entry_of(run(CASO_04).history, "P1")
        activos = {o.time: o.active for o in p1.history}
        assert activos[2] is False   # RUNNING
        assert activos[5] is True    # READY, esperando
        assert activos[8] is False   # RUNNING otra vez

    def test_ready_position_refleja_la_cpl(self):
        """Caso 02: P3 avanza de la segunda a la primera posición de la CPL."""
        p3 = entry_of(run(ESCENARIOS["caso_02"]).history, "P3")
        posiciones = {o.time: o.ready_position for o in p3.history}
        assert posiciones[0] == 1
        assert posiciones[5] == 0
        assert posiciones[10] is None  # ya está en CPU

    def test_cpu_restante_y_ejecutada_son_coherentes(self):
        for nombre, procesos in ESCENARIOS.items():
            history = run(procesos).history
            burst = {p.id: p.cpu_burst for p in procesos}
            for entry in history.ready_timeline:
                for o in entry.history:
                    assert o.remaining_cpu + o.executed_cpu == burst[entry.process_id], \
                        (nombre, entry.process_id, o.time)

    def test_cpu_ejecutada_avanza_una_unidad_por_tick_ejecutado(self):
        """executed_cpu es acumulado del PROCESO, no se reinicia en cada
        aparición nueva: por eso se compara contra los ticks ejecutados del
        proceso completo, acotados al último tick de cada aparición."""
        for nombre, procesos in ESCENARIOS.items():
            history = run(procesos).history
            ejecutados_por_proceso = {
                pid: {
                    t for b in history.cpu_timeline if b.process_id == pid
                    for t in range(b.start, b.end)
                }
                for pid in {e.process_id for e in history.ready_timeline}
            }
            for entry in history.ready_timeline:
                ejecutados = ejecutados_por_proceso[entry.process_id]
                previo = None
                for o in entry.history:
                    if previo is not None:
                        esperado = previo + (1 if o.time in ejecutados else 0)
                        assert o.executed_cpu == esperado, (nombre, entry.process_id, o.time)
                    previo = o.executed_cpu
                esperado_final = sum(1 for t in ejecutados if t <= entry.history[-1].time)
                assert entry.history[-1].executed_cpu == esperado_final, \
                    (nombre, entry.process_id, entry.visual_index)

    def test_prioridad_estable_y_correcta(self):
        for nombre, procesos in ESCENARIOS.items():
            history = run(procesos).history
            prioridades = {p.id: p.priority for p in procesos}
            for entry in history.ready_timeline:
                assert entry.priority == prioridades[entry.process_id], nombre
                for o in entry.history:
                    assert o.priority == prioridades[entry.process_id], (nombre, o.time)

    def test_fifo_order_viene_resuelto(self):
        """Caso 02: el orden FIFO llega listo, el frontend no lo reconstruye."""
        history = run(ESCENARIOS["caso_02"]).history
        assert [entry_of(history, pid).history[0].fifo_order for pid in ("P1", "P2", "P3")] == [0, 1, 2]

    def test_fifo_order_se_conserva_en_la_apropiacion(self):
        """PLAN: la apropiación preserva el orden lógico del proceso expropiado."""
        p1 = entry_of(run(CASO_04).history, "P1")
        assert {o.fifo_order for o in p1.history} == {0}


class TestCPUTimeline:
    def test_coincide_exactamente_con_el_gantt(self):
        for nombre, procesos in ESCENARIOS.items():
            result = run(procesos)
            cpu = [
                (b.process_id or "IDLE", b.start, b.end)
                for b in result.history.cpu_timeline
            ]
            gantt = [(g.process_id, g.start, g.end) for g in result.gantt]
            assert cpu == gantt, nombre

    def test_duration_es_end_menos_start(self):
        for nombre, procesos in ESCENARIOS.items():
            for b in run(procesos).history.cpu_timeline:
                assert b.duration == b.end - b.start, nombre

    def test_sin_huecos_ni_superposiciones(self):
        for nombre, procesos in ESCENARIOS.items():
            result = run(procesos)
            bloques = result.history.cpu_timeline
            assert bloques[0].start == 0, nombre
            assert bloques[-1].end == result.snapshots[-1].time, nombre
            for anterior, siguiente in zip(bloques, bloques[1:]):
                assert siguiente.start == anterior.end, nombre

    def test_marca_los_bloques_ociosos(self):
        """Caso 08: la CPU queda ociosa mientras el único proceso está en E/S."""
        history = run(CASO_08).history
        ociosos = [(b.start, b.end) for b in history.cpu_timeline if b.idle]
        assert ociosos == [(5, 8), (15, 19)]
        assert all(b.process_id is None for b in history.cpu_timeline if b.idle)

    def test_bloques_alineados_con_el_estado_running(self):
        for nombre, procesos in ESCENARIOS.items():
            history = run(procesos).history
            for b in history.cpu_timeline:
                if b.process_id is None:
                    continue
                estados = merged_states_of(history, b.process_id)
                for t in range(b.start, b.end):
                    assert estados[t] == "RUNNING", (nombre, b.process_id, t)


class TestIOTimeline:
    def test_una_entrada_por_operacion(self):
        history = run(CASO_08).history
        assert len(history.io_timeline) == 2
        assert [b.process_id for b in history.io_timeline] == ["P1", "P1"]

    def test_sin_entradas_cuando_no_hay_io(self):
        assert run(CASO_04).history.io_timeline == []

    def test_duracion_igual_a_la_declarada(self):
        history = run(CASO_08).history
        assert [(b.start, b.end, b.duration) for b in history.io_timeline] == [
            (5, 8, 3),
            (15, 19, 4),
        ]
        assert all(b.completed for b in history.io_timeline)

    def test_bloques_alineados_con_el_estado_blocked(self):
        history = run(CASO_08).history
        estados = merged_states_of(history, "P1")
        for b in history.io_timeline:
            for t in range(b.start, b.end):
                assert estados[t] == "BLOCKED", (b.start, t)
        bloqueados = sum(1 for s in estados.values() if s == "BLOCKED")
        assert bloqueados == sum(b.duration for b in history.io_timeline)

    def test_visual_index_es_el_de_la_aparicion_vigente_al_bloquearse(self):
        """Caso 08: P1 tiene 2 operaciones de E/S, cada una ocurre durante una
        aparición distinta (la 2da E/S ocurre ya en la 2da aparición, abierta
        al regresar de la 1ra)."""
        history = run(CASO_08).history
        apariciones = entries_of(history, "P1")
        assert len(apariciones) == 3
        assert [b.visual_index for b in history.io_timeline] == [
            apariciones[0].visual_index, apariciones[1].visual_index,
        ]

    def test_prioridad_y_cpu_restante_al_iniciar_la_io(self):
        """Caso 08: burst 20, E/S en 5 y en 12 -> restante 15 y 8."""
        history = run(CASO_08).history
        assert [(b.priority, b.remaining_cpu) for b in history.io_timeline] == [
            (2, 15),
            (2, 8),
        ]

    def test_varios_procesos_con_io_referencian_su_primera_aparicion(self):
        procesos = [
            make_process("P1", 0, 8, 2, [make_io(3, 2)]),
            make_process("P2", 0, 6, 4, [make_io(2, 3)]),
        ]
        history = run(procesos).history
        p1_primera = entries_of(history, "P1")[0]
        p2_primera = entries_of(history, "P2")[0]
        assert [b.visual_index for b in history.io_timeline] == [
            p1_primera.visual_index, p2_primera.visual_index,
        ]
        assert len(history.io_timeline) == 2

    def test_orden_cronologico(self):
        procesos = [
            make_process("P1", 0, 8, 2, [make_io(3, 2)]),
            make_process("P2", 0, 6, 4, [make_io(2, 3)]),
        ]
        history = run(procesos).history
        inicios = [b.start for b in history.io_timeline]
        assert inicios == sorted(inicios)


class TestEventTimeline:
    def test_cantidad_igual_al_event_manager(self):
        for nombre, procesos in ESCENARIOS.items():
            result = run(procesos)
            assert len(result.history.event_timeline) == len(result.events), nombre

    def test_orden_cronologico_estricto(self):
        for nombre, procesos in ESCENARIOS.items():
            tiempos = [e.time for e in run(procesos).history.event_timeline]
            assert tiempos == sorted(tiempos), nombre

    def test_conserva_tipo_proceso_y_descripcion(self):
        result = run(CASO_04)
        origen = [
            (e.time, e.type.value, e.process_id, e.description, e.reason)
            for e in result.events
        ]
        historia = [
            (e.time, e.type, e.process_id, e.description, e.reason)
            for e in result.history.event_timeline
        ]
        assert historia == origen

    def test_no_pierde_eventos_de_apropiacion(self):
        eventos = run(CASO_04).history.event_timeline
        preempciones = [e for e in eventos if e.type == "PREEMPTION"]
        assert len(preempciones) == 1
        assert preempciones[0].time == 3
        assert preempciones[0].process_id == "P1"


class TestCompatibilidad:
    """El historial es aditivo: nada de lo anterior cambia."""

    def test_gantt_metricas_y_snapshots_intactos(self):
        result = run(CASO_07)
        assert [(g.process_id, g.start, g.end) for g in result.gantt] == [
            ("P1", 0, 5), ("P2", 5, 8), ("P1", 8, 13), ("P2", 13, 15),
        ]
        assert [(m.process_id, m.turnaround_time, m.waiting_time) for m in result.metrics] == [
            ("P1", 13, 0), ("P2", 11, 6),
        ]
        assert len(result.snapshots) == 16
        assert result.snapshots[0].time == 0
        assert result.snapshots[-1].time == 15

    def test_history_no_altera_el_resto_del_resultado(self):
        result = run(CASO_08)
        assert result.history is not None
        assert [(g.process_id, g.start, g.end) for g in result.gantt] == [
            ("P1", 0, 5), ("IDLE", 5, 8), ("P1", 8, 15),
            ("IDLE", 15, 19), ("P1", 19, 27),
        ]
        assert result.global_metrics.cpu_utilization == 74.07

    def test_todos_los_procesos_terminan_en_la_historia(self):
        for nombre, procesos in ESCENARIOS.items():
            result = run(procesos)
            terminados = {m.process_id for m in result.metrics}
            assert {e.process_id for e in result.history.ready_timeline} == terminados, nombre
