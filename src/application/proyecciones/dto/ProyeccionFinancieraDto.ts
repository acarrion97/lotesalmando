export type ModeloAbsorcion = "logistic" | "bass" | "gompertz";

export interface ProyeccionOpciones {
  /** Etapa a proyectar. Si no se indica, se usa la de más lotes. */
  etapaId?: number;
  /** Horizonte en meses. */
  meses: number;
  modelo: ModeloAbsorcion;
  /** % de enganche (cuota inicial). Si no se indica, se usa la mediana real. */
  enganchePct?: number;
  /** Nº de cuotas del financiamiento. Si no se indica, la mediana real. */
  cuotas?: number;
  /** Interés anual en % (0 = sin interés, como el esquema real actual). */
  tasaAnualPct: number;
  /** Inversión de urbanización total (se considera desembolsada en el mes 0). */
  costoUrbTotal: number;
  /** % de costo variable sobre el ingreso (impuestos, comisiones). */
  costoVarPct: number;
}

/** Estadísticos reales base, calculados desde Supabase para la etapa elegida. */
export interface DatosBase {
  idEtapa: number;
  nombreEtapa: string;
  totalLotes: number;
  vendidos: number;
  reservados: number;
  disponibles: number;
  precioPromedio: number;
  /** Lotes por absorber en el horizonte (total - vendidos). */
  porProyectar: number;
  /** Mediana real de % de enganche. */
  enganchePct: number;
  /** Mediana real de nº de cuotas. */
  cuotas: number;
}

export interface EtapaDisponible {
  id_etapa: number;
  nombre: string;
  lotes: number;
}

export interface ResumenProyeccion {
  idEtapa: number;
  nombreEtapa: string;
  totalLotes: number;
  vendidos: number;
  reservados: number;
  disponibles: number;
  precioPromedio: number;
  porProyectar: number;
  enganchePct: number;
  cuotas: number;
  tasaAnualPct: number;
  cuotaMensual: number;
  meses: number;
  modelo: ModeloAbsorcion;
}

export interface FilaProyeccion {
  mes: number;
  vendidos: number;
  acumVendidos: number;
  invInicial: number;
  invFinal: number;
  valorMes: number;
  valorAcum: number;
  enganches: number;
  mensualidades: number;
  ingresoMes: number;
  ingresoAcum: number;
  costoMes: number;
  netoMes: number;
  netoAcum: number;
}

export interface MetricasProyeccion {
  valorContratadoTotal: number;
  ingresoTotal: number;
  costoTotal: number;
  netoTotal: number;
  /** Mes en que el acumulado neto recupera la inversión. Null si no aplica. */
  paybackMes: number | null;
  tirMensual: number | null;
  tirAnual: number | null;
}

export interface ResultadoProyeccion {
  resumen: ResumenProyeccion;
  filas: FilaProyeccion[];
  metricas: MetricasProyeccion;
}

export interface ProyeccionFinancieraDto extends ResultadoProyeccion {
  etapasDisponibles: EtapaDisponible[];
  /** Medianas observadas en los contratos reales (sin overrides del usuario). */
  esquemaReal: { enganchePct: number; cuotas: number };
}
