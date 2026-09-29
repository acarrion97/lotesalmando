import { cargarMotor } from "./xlsxEngine";
import type { TablaExport } from "./exportTableCatalog";

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

/** Minúsculas, sin acentos ni símbolos: `Cédula / RUC` -> `cedula_ruc`. */
export function normalizarClave(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Empareja cada cabecera del archivo con su columna de la tabla: primero por
 * nombre exacto (ej. la plantilla generada) y luego por etiqueta (ej. "Nombres").
 */
export function mapearAutomatico(cabeceras: string[], tabla: TablaExport): ColumnaArchivo[] {
  const porClave = new Map<string, string>();
  const porEtiqueta = new Map<string, string>();

  tabla.columnas.forEach((col) => {
    porClave.set(normalizarClave(col.key), col.key);
    const etiqueta = normalizarClave(col.etiqueta);
    if (!porEtiqueta.has(etiqueta)) porEtiqueta.set(etiqueta, col.key);
  });

  return cabeceras.map((cabecera, indice) => {
    const clave = normalizarClave(cabecera);
    const destino = (clave && (porClave.get(clave) ?? porEtiqueta.get(clave))) || null;
    return { indice, cabecera, columnaDestino: destino };
  });
}
