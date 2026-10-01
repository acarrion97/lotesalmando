import type { WorkSheet } from "@e965/xlsx";
import { cargarMotor } from "./xlsxEngine";
import type { MotorXlsx } from "./xlsxEngine";
import { definicionTabla, ejemploColumna } from "./exportTableCatalog";
import type { MapeoColumna, TablaExport } from "./exportTableCatalog";

export type FormatoPlantilla = "xlsx" | "csv";

export const HOJA_GUIA = "Guía de columnas";

/** Hoja de datos del archivo: las columnas elegidas de una tabla. */
export interface HojaPlantilla {
  tabla: TablaExport;
  /** Columnas del archivo en orden de celda (A, B, C...). */
  columnas: MapeoColumna[];
}

export interface OpcionesPlantilla {
  /** Una entrada por tabla: cada una genera una hoja con el nombre de la tabla. */
  hojas: HojaPlantilla[];
  formato: FormatoPlantilla;
  /** Nombre de la hoja de datos cuando el archivo tiene una sola tabla. */
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

/**
 * Nombre de la hoja de datos. Con varias tablas es el nombre de la tabla:
 * así el importador infiere solo a qué tabla pertenece cada hoja.
 */
function nombreHojaDatos(opciones: OpcionesPlantilla, hoja: HojaPlantilla): string {
  if (opciones.hojas.length > 1) return normalizarNombreHoja(hoja.tabla.tabla);
  return normalizarNombreHoja(opciones.nombreHoja);
}

function hojaDatos(XLSX: MotorXlsx, hoja: HojaPlantilla, incluirFilaEjemplo: boolean): WorkSheet {
  const filas: (string | number)[][] = [hoja.columnas.map((col) => col.cabecera)];

  if (incluirFilaEjemplo) {
    filas.push(hoja.columnas.map((col) => ejemploColumna(hoja.tabla, col.columna)));
  }

  return XLSX.utils.aoa_to_sheet(filas);
}

function hojaGuia(XLSX: MotorXlsx, opciones: OpcionesPlantilla): WorkSheet {
  const filas: (string | number)[][] = [
    [
      "Tabla",
      "Celda",
      "Cabecera",
      "Columna en la BD",
      "Tipo",
      "Obligatoria",
      "Ejemplo",
      "Referencia",
    ],
  ];

  opciones.hojas.forEach((hoja) => {
    hoja.columnas.forEach((col, indice) => {
      const meta = hoja.tabla.columnas.find((c) => c.key === col.columna);
      const def = meta?.fk ? definicionTabla(meta.fk) : null;
      const referencia = !meta?.fk
        ? ""
        : def && def.claves.length > 0
          ? `→ ${meta.fk} · clave: ${def.claves.join(" / ")}`
          : `→ ${meta.fk} · id numérico`;

      filas.push([
        hoja.tabla.tabla,
        nombreCelda(indice),
        col.cabecera,
        col.columna,
        meta?.tipo ?? "texto",
        meta?.requerida ? "Sí" : "No",
        ejemploColumna(hoja.tabla, col.columna),
        referencia,
      ]);
    });
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
  if (opciones.formato === "csv") {
    return [
      {
        nombre: `${normalizarNombreHoja(opciones.nombreHoja)}.csv`,
        nota: "El CSV siempre tiene una sola hoja y una sola tabla.",
      },
    ];
  }

  const datos = opciones.hojas.map((hoja) => ({
    nombre: nombreHojaDatos(opciones, hoja),
    nota:
      opciones.hojas.length > 1
        ? `Filas de ${hoja.tabla.etiqueta.toLowerCase()}.`
        : "Datos a completar.",
  }));
  const guia = { nombre: HOJA_GUIA, nota: "Describe cada cabecera." };

  if (!opciones.incluirHojaGuia) return datos;
  // La primera hoja de la lista es la que se abre por defecto en Excel.
  return opciones.hojaPrimera === "guia" ? [guia, ...datos] : [...datos, guia];
}

export function nombreArchivo(opciones: OpcionesPlantilla): string {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const nombres = opciones.hojas.map((hoja) => hoja.tabla.tabla);
  const destino =
    nombres.length === 1
      ? nombres[0]
      : nombres.length <= 3
        ? nombres.join("_")
        : `${nombres.slice(0, 3).join("_")}_y${nombres.length - 3}_mas`;
  return `plantilla_${destino}_${fecha}.${opciones.formato}`;
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
 * Genera la plantilla (XLSX con una hoja por tabla, o CSV con una sola) con
 * las cabeceras elegidas y la descarga al equipo del usuario. Todo ocurre en
 * el navegador.
 */
export async function generarPlantilla(opciones: OpcionesPlantilla): Promise<string> {
  if (opciones.hojas.length === 0) {
    throw new Error("La plantilla necesita al menos una tabla.");
  }
  if (opciones.hojas.some((hoja) => hoja.columnas.length === 0)) {
    throw new Error("Cada tabla necesita al menos una columna.");
  }
  if (opciones.formato === "csv" && opciones.hojas.length > 1) {
    throw new Error("El CSV admite una sola tabla: elegí XLSX para importar varias a la vez.");
  }

  const XLSX = await cargarMotor();
  const archivo = nombreArchivo(opciones);

  if (opciones.formato === "csv") {
    const csv = XLSX.utils.sheet_to_csv(
      hojaDatos(XLSX, opciones.hojas[0], opciones.incluirFilaEjemplo),
      { FS: opciones.separadorCsv, RS: "\r\n" },
    );
    // BOM para que Excel abra bien los acentos.
    descargar(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), archivo);
    return archivo;
  }

  const libro = XLSX.utils.book_new();
  const datos = opciones.hojas.map((hoja) => ({
    hoja,
    nombre: nombreHojaDatos(opciones, hoja),
    ws: hojaDatos(XLSX, hoja, opciones.incluirFilaEjemplo),
  }));
  const guia = opciones.incluirHojaGuia ? hojaGuia(XLSX, opciones) : null;
  const guiaPrimera = guia !== null && opciones.hojaPrimera === "guia";

  if (guia && guiaPrimera) XLSX.utils.book_append_sheet(libro, guia, HOJA_GUIA);
  datos.forEach((dato) => XLSX.utils.book_append_sheet(libro, dato.ws, dato.nombre));
  if (guia && !guiaPrimera) XLSX.utils.book_append_sheet(libro, guia, HOJA_GUIA);

  const buffer = XLSX.write(libro, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  descargar(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    archivo,
  );

  return archivo;
}
