import type { DatosReportePdf } from "./GeneradorReportePdf";

/**
 * Fachada del PDF de reportes. `jspdf` se importa bajo demanda por la misma
 * razón que en el recibo: no debe entrar al bundle principal.
 */
export async function generarReportePdf(datos: DatosReportePdf): Promise<Blob> {
  const { GeneradorReportePdf } = await import("./GeneradorReportePdf");
  return new GeneradorReportePdf().generar(datos);
}
