import { cargarMotor } from "./xlsxEngine";
import { EXPORT_TABLES, normalizarClave } from "./exportTableCatalog";
import type { TablaExport } from "./exportTableCatalog";

export { normalizarClave };

/** Archivo ya leído en memoria (el workbook se mantiene para elegir la hoja). */
export interface ArchivoLeido {
  nombre: string;
  workbook: import("@e965/xlsx").WorkBook;
}

/** Una columna del archivo y a qué columna de la tabla apunta. */
export interface ColumnaArchivo {
  /** Posición en el archivo (0 = columna A). */
  indice: number;
  /** Cabecera detectada en la fila 1. */
  cabecera: string;
  /** Columna de la tabla destino; null = no importar esa columna. */
  columnaDestino: string | null;
}

export interface ContenidoHoja {
  cabeceras: string[];
  /** Filas de datos como arrays alineados con `cabeceras`. */
  filas: unknown[][];
}

const EXTENSIONES = [".xlsx", ".xls", ".csv"];
export const TAMANO_MAXIMO_ARCHIVO = 10 * 1024 * 1024; // 10 MB

export function esArchivoSoportado(file: File): boolean {
  return EXTENSIONES.some((ext) => file.name.toLowerCase().endsWith(ext));
}

/** Lee el archivo completo y deja el workbook en memoria para elegir la hoja. */
export async function leerArchivo(file: File): Promise<ArchivoLeido> {
  if (!esArchivoSoportado(file)) {
    throw new Error("Formato no admitido: usá un archivo .xlsx, .xls o .csv");
  }
  if (file.size > TAMANO_MAXIMO_ARCHIVO) {
    throw new Error("El archivo supera los 10 MB");
  }

  const XLSX = await cargarMotor();
  const esCsv = file.name.toLowerCase().endsWith(".csv");

  // El CSV se lee como texto para que el navegador decodifique bien los acentos.
  const workbook = esCsv
    ? XLSX.read((await file.text()).replace(/^\uFEFF/, ""), { type: "string", cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });

  if (workbook.SheetNames.length === 0) {
    throw new Error("El archivo no tiene hojas.");
  }

  return { nombre: file.name, workbook };
}

/** Devuelve cabeceras (fila 1) y datos de la hoja elegida. */
export async function leerHoja(archivo: ArchivoLeido, nombreHoja: string): Promise<ContenidoHoja> {
  const XLSX = await cargarMotor();
  const hoja = archivo.workbook.Sheets[nombreHoja];
  if (!hoja) {
    throw new Error(`El archivo no tiene la hoja "${nombreHoja}".`);
  }

  const filasBrutas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });

  const brutas = filasBrutas.filter((fila) =>
    fila.some((celda) => celda !== null && celda !== undefined && String(celda).trim() !== ""),
  );

  const ancho = brutas.reduce((max, fila) => Math.max(max, fila.length), 0);
  const cabeceras = Array.from({ length: ancho }, (_, i) => {
    const valor = brutas[0]?.[i];
    const texto = valor === null || valor === undefined ? "" : String(valor).trim();
    return texto || `Columna ${i + 1}`;
  });

  return { cabeceras, filas: brutas.slice(1) };
}

/**
 * Empareja cada cabecera del archivo con su columna de la tabla: primero por
 * nombre exacto (ej. la plantilla generada), luego por la cabecera de la clave
 * foránea (`cliente` -> `id_cliente`) y por último por la etiqueta ("Nombres").
 */
export function mapearAutomatico(cabeceras: string[], tabla: TablaExport): ColumnaArchivo[] {
  const porClave = new Map<string, string>();
  const porEtiqueta = new Map<string, string>();

  tabla.columnas.forEach((col) => {
    porClave.set(normalizarClave(col.key), col.key);
    const etiqueta = normalizarClave(col.etiqueta);
    if (!porEtiqueta.has(etiqueta)) porEtiqueta.set(etiqueta, col.key);
    if (col.cabeceraAjena) {
      const ajena = normalizarClave(col.cabeceraAjena);
      if (ajena && !porClave.has(ajena)) porClave.set(ajena, col.key);
    }
  });

  return cabeceras.map((cabecera, indice) => {
    const clave = normalizarClave(cabecera);
    const destino = (clave && (porClave.get(clave) ?? porEtiqueta.get(clave))) || null;
    return { indice, cabecera, columnaDestino: destino };
  });
}

/** Fila de la hoja con su número original (para señalar el error en el archivo). */
export interface FilaCruda {
  numero: number;
  celdas: unknown[];
}

/** Cabeceras admitidas para la columna que indica la tabla de cada fila. */
const CABECERAS_COLUMNA_TABLA = ["tabla", "tabla_destino", "tabla destino", "table"];

/** Índice de la columna `tabla` de una hoja única, o null si no existe. */
export function indiceColumnaTabla(cabeceras: string[]): number | null {
  const buscadas = CABECERAS_COLUMNA_TABLA.map(normalizarClave);
  const indice = cabeceras.findIndex((cabecera) => buscadas.includes(normalizarClave(cabecera)));
  return indice === -1 ? null : indice;
}

/** Nombres frecuentes de tabla -> clave real: "Lotes" / "lote" -> "lotes". */
const ALIAS_TABLA: Record<string, string> = {
  manzana: "manzana_bloque",
  manzanas: "manzana_bloque",
  bloque: "manzana_bloque",
  bloques: "manzana_bloque",
  clientes: "cliente",
  cotizacion: "cotizador",
  cotizaciones: "cotizador",
  proyecto: "proyectos",
  etapa: "etapas",
  lote: "lotes",
  prospecto: "prospectos",
  asesor: "asesores",
  venta: "ventas",
  contrato: "contratos",
  cobranza: "cobranzas",
  pago: "pagos",
  oportunidad: "oportunidades",
  actividad: "actividades",
};

/** Nombre de tabla, etiqueta o plural -> clave real de la tabla del catálogo. */
export function nombreATabla(valor: string): string | null {
  const buscado = normalizarClave(valor);
  if (!buscado) return null;

  const alias = ALIAS_TABLA[buscado];
  if (alias) return alias;

  const coincide = (t: TablaExport, clave: string) =>
    normalizarClave(t.tabla) === clave || normalizarClave(t.etiqueta) === clave;

  const directa = EXPORT_TABLES.find((t) => coincide(t, buscado));
  if (directa) return directa.tabla;

  const variante = buscado.endsWith("s") ? buscado.slice(0, -1) : `${buscado}s`;
  return EXPORT_TABLES.find((t) => coincide(t, variante))?.tabla ?? null;
}

export interface AgrupacionTabla {
  /** Índice de la columna `tabla` que se usó para agrupar. */
  indiceTabla: number;
  /** Filas de cada tabla, en el orden en que aparecen en la hoja. */
  grupos: { tabla: string; filas: FilaCruda[] }[];
  /** Valores de la columna `tabla` que no son una tabla seleccionada. */
  desconocidos: { valor: string; cantidad: number }[];
}

/**
 * Reparte las filas de una hoja única entre las tablas seleccionadas usando la
 * columna `tabla` (una fila = un registro de una tabla).
 */
export function agruparPorTabla(
  cabeceras: string[],
  filas: unknown[][],
  tablasSeleccionadas: string[],
): AgrupacionTabla | null {
  const indiceTabla = indiceColumnaTabla(cabeceras);
  if (indiceTabla === null) return null;

  const seleccionadas = new Set(tablasSeleccionadas);
  const porTabla = new Map<string, FilaCruda[]>();
  const desconocidos = new Map<string, number>();

  filas.forEach((celdas, indice) => {
    const bruto = celdas[indiceTabla];
    const valor = bruto === null || bruto === undefined ? "" : String(bruto).trim();
    const tabla = valor ? nombreATabla(valor) : null;

    if (!tabla || !seleccionadas.has(tabla)) {
      desconocidos.set(valor, (desconocidos.get(valor) ?? 0) + 1);
      return;
    }
    const grupo = porTabla.get(tabla) ?? [];
    grupo.push({ numero: indice + 1, celdas });
    porTabla.set(tabla, grupo);
  });

  const tablasOrdenadas = tablasSeleccionadas.filter((t) => porTabla.has(t));
  return {
    indiceTabla,
    grupos: tablasOrdenadas.map((tabla) => ({ tabla, filas: porTabla.get(tabla) ?? [] })),
    desconocidos: [...desconocidos.entries()]
      .map(([valor, cantidad]) => ({ valor: valor || "(vacía)", cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
  };
}
