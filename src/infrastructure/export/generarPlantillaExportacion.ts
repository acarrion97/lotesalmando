import type { WorkSheet } from "@e965/xlsx";
import { cargarMotor } from "./xlsxEngine";
import type { MotorXlsx } from "./xlsxEngine";
import { ejemploColumna } from "./exportTableCatalog";
import type { MapeoColumna, TablaExport } from "./exportTableCatalog";

export type FormatoPlantilla = "xlsx" | "csv";

export const HOJA_GUIA = "Guía de columnas";

export interface OpcionesPlantilla {
  tabla: TablaExport;
  /** Columnas del archivo en orden de celda (A, B, C...). */
  columnas: MapeoColumna[];
  formato: FormatoPlantilla;
  /** Nombre de la hoja que contiene los datos (XLSX). */
  nombreHoja: string;
  /** Agrega una segunda hoja que documenta cada cabecera (XLSX). */
  incluirHojaGuia: boolean;
  /** Hoja que se muestra al abrir el archivo (XLSX). */
  hojaPrimera: "datos" | "guia";
  /** Fila 2 con un valor de ejemplo por columna. */
  incluirFilaEjemplo: boolean;
  /** Separador de campos del CSV. */
  separadorCsv: string;
}

const NOMBRE_INVALIDO = /[:\\/?*[\]]/g;

function normalizarNombreHoja(nombre: string): string {
  const limpio = nombre.replace(NOMBRE_INVALIDO, " ").trim().slice(0, 31);
  return limpio || "Hoja1";
}

function hojaDatos(XLSX: MotorXlsx, opciones: OpcionesPlantilla): WorkSheet {
  const cabeceras = opciones.columnas.map((col) => col.cabecera);
  const filas: (string | number)[][] = [cabeceras];

  if (opciones.incluirFilaEjemplo) {
    filas.push(opciones.columnas.map((col) => ejemploColumna(opciones.tabla, col.columna)));
  }

  return XLSX.utils.aoa_to_sheet(filas);
}

function hojaGuia(XLSX: MotorXlsx, opciones: OpcionesPlantilla): WorkSheet {
  const filas: string[][] = [
    ["Celda", "Cabecera", "Columna en la BD", "Tipo", "Obligatoria", "Ejemplo", "Referencia"],
  ];

  opciones.columnas.forEach((col, indice) => {
    const meta = opciones.tabla.columnas.find((c) => c.key === col.columna);
    filas.push([
      nombreCelda(indice),
      col.cabecera,
      col.columna,
      meta?.tipo ?? "texto",
      meta?.requerida ? "Sí" : "No",
      meta?.ejemplo ?? "",
      meta?.fk ? `→ ${meta.fk}` : "",
    ]);
  });

  return XLSX.utils.aoa_to_sheet(filas);
}

/** Letra de columna de Excel: 0 -> A, 26 -> AA. */
export function nombreCelda(indice: number): string {
  let n = indice + 1;
  let letra = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    n = Math.floor((n - 1) / 26);
  }
  return letra;
}

/** Hojas que va a tener el archivo generado, en el orden en que se crean. */
export function hojasGeneradas(opciones: OpcionesPlantilla): { nombre: string; nota?: string }[] {
  const datos = normalizarNombreHoja(opciones.nombreHoja);

  if (opciones.formato === "csv") {
    return [{ nombre: `${datos}.csv`, nota: "El CSV siempre tiene una sola hoja." }];
  }

  const hojaDatosDef = { nombre: datos, nota: "Datos a completar." };
  const hojaGuiaDef = { nombre: HOJA_GUIA, nota: "Describe cada cabecera." };

  if (!opciones.incluirHojaGuia) return [hojaDatosDef];
  // La primera hoja de la lista es la que se abre por defecto en Excel.
  return opciones.hojaPrimera === "guia"
    ? [hojaGuiaDef, hojaDatosDef]
    : [hojaDatosDef, hojaGuiaDef];
}

export function nombreArchivo(opciones: OpcionesPlantilla): string {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `plantilla_${opciones.tabla.tabla}_${fecha}.${opciones.formato}`;
}

function descargar(blob: Blob, archivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = archivo;
  enlace.rel = "noopener";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Genera la plantilla (XLSX o CSV, en una sola hoja de datos) con las cabeceras
 * elegidas y la descarga al equipo del usuario. Todo ocurre en el navegador.
 */
export async function generarPlantilla(opciones: OpcionesPlantilla): Promise<string> {
  if (opciones.columnas.length === 0) {
    throw new Error("La plantilla necesita al menos una columna.");
  }

  const XLSX = await cargarMotor();
  const archivo = nombreArchivo(opciones);
  const datos = hojaDatos(XLSX, opciones);

  if (opciones.formato === "csv") {
    const csv = XLSX.utils.sheet_to_csv(datos, {
      FS: opciones.separadorCsv,
      RS: "\r\n",
    });
    // BOM para que Excel abra bien los acentos.
    descargar(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), archivo);
    return archivo;
  }

  const libro = XLSX.utils.book_new();
  const nombreDatos = normalizarNombreHoja(opciones.nombreHoja);

  if (opciones.incluirHojaGuia && opciones.hojaPrimera === "guia") {
    XLSX.utils.book_append_sheet(libro, hojaGuia(XLSX, opciones), HOJA_GUIA);
    XLSX.utils.book_append_sheet(libro, datos, nombreDatos);
  } else {
    XLSX.utils.book_append_sheet(libro, datos, nombreDatos);
    if (opciones.incluirHojaGuia) {
      XLSX.utils.book_append_sheet(libro, hojaGuia(XLSX, opciones), HOJA_GUIA);
    }
  }

  const buffer = XLSX.write(libro, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  descargar(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    archivo,
  );

  return archivo;
}
