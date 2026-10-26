import { cargarMotor } from "./xlsxEngine";

/** Cómo se presenta una columna numérica en el PDF (Excel recibe el número crudo). */
export type TipoColumnaReporte = "moneda" | "porcentaje";

export interface HojaReporte {
  /** Nombre de la pestaña (Excel lo limita a 31 caracteres). */
  nombre: string;
  columnas: string[];
  filas: (string | number | null)[][];
  /** Tipo por columna (mismo orden que `columnas`); omitido = texto o número simple. */
  tipos?: (TipoColumnaReporte | undefined)[];
}

/**
 * Descarga un libro de Excel con una o más hojas de reporte. El motor de
 * SheetJS se carga bajo demanda (pesa ~500 kB), igual que en la exportación
 * de datos de Configuración.
 */
export async function exportarReporteXlsx(archivo: string, hojas: HojaReporte[]): Promise<void> {
  const XLSX = await cargarMotor();
  const libro = XLSX.utils.book_new();
  for (const hoja of hojas) {
    const ws = XLSX.utils.aoa_to_sheet([hoja.columnas, ...hoja.filas]);
    // Ancho por columna según el contenido más largo, con un tope razonable.
    ws["!cols"] = hoja.columnas.map((titulo, i) => ({
      wch: Math.min(
        Math.max(titulo.length, ...hoja.filas.map((f) => String(f[i] ?? "").length)) + 2,
        48,
      ),
    }));
    XLSX.utils.book_append_sheet(libro, ws, hoja.nombre.slice(0, 31));
  }
  XLSX.writeFile(libro, `${archivo}.xlsx`);
}
