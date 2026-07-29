export default function LandingHero() {
  return (
    <section className="landing-hero">
      <h1 className="landing-hero-title">
        Simulador Académico de Planificación de CPU – Algoritmo de Prioridades Apropiativo
      </h1>
      <p className="landing-hero-text">
        El algoritmo de planificación por prioridades apropiativo es un mecanismo fundamental en sistemas operativos que asigna el procesador al proceso con mayor prioridad (donde 1 es la máxima prioridad). Cuando un proceso de prioridad superior ingresa al sistema, el kernel interrumpe inmediatamente el proceso en ejecución —fenómeno conocido como <em>apropiación</em>— para ceder la CPU al proceso más prioritario. Este simulador permite al estudiante observar, paso a paso, la secuencia de decisiones del planificador, el impacto de las operaciones de E/S en el rendimiento y la evolución de las colas de procesos, facilitando la comprensión de conceptos clave como prioridad, tiempo de retorno y tiempo de espera.
      </p>
    </section>
  );
}
