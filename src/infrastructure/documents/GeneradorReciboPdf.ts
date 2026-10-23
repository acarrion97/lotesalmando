import { jsPDF } from "jspdf";
import type { Recibo } from "@/domain/recibo/entities";
import type { GeneradorReciboDocumento } from "@/application/recibos/ports/GeneradorReciboDocumento";

/** A4 en puntos. */
const ANCHO_PAGINA = 595.28;
const ALTO_PAGINA = 841.89;
const MARGEN = 56;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;
const FIN_UTIL = ALTO_PAGINA - MARGEN;

const TINTA: [number, number, number] = [40, 40, 40];
const GRIS: [number, number, number] = [107, 114, 128];
const FILA_RAYA: [number, number, number] = [210, 210, 210];

const FUENTE = "helvetica";

/** Código SRI del tipo de identificación del receptor. */
const TIPOS_IDENTIFICACION: Record<Recibo["receptor_tipo_identificacion"], string> = {
  "04": "RUC",
  "05": "CÉDULA DE IDENTIDAD",
  "07": "CONSUMIDOR FINAL",
};

/** Etiqueta legible de la forma de pago guardada con el recibo. */
const FORMAS_PAGO: Record<Recibo["forma_pago"] | "no_especificada", string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  deposito: "Depósito",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  otro: "Otro",
  no_especificada: "No especificada",
};

/**
 * Formatea un monto en dólares con dos decimales y separador de miles, como
 * se imprime en un comprobante en Ecuador. Se redondea a centavos para que
 * lo impreso siempre coincida con `subtotal + iva = total`.
 */
function monto(valor: number): string {
  const [enteros, decimales] = Math.abs(valor).toFixed(2).split(".");
  const agrupados = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${valor < 0 ? "-" : ""}$${agrupados},${decimales}`;
}

/** `2026-10-23` → `23/10/2026`; tolera marcas de tiempo completas. */
function fechaCorta(iso: string): string {
  const parte = iso.slice(0, 10);
  const [anio, mes, dia] = parte.split("-");
  if (!anio || !mes || !dia) return iso;
  return `${dia}/${mes}/${anio}`;
}

/**
 * Recibo de pago interno con el aspecto del RIDE de factura del SRI: datos
 * del emisor, identificación del receptor, detalle, subtotal, IVA 15% y
 * total, más la forma de pago. No es un comprobante electrónico autorizado
 * por el SRI y el pie lo aclara en cada copia.
 */
export class GeneradorReciboPdf implements GeneradorReciboDocumento {
  async generar(recibo: Recibo): Promise<Blob> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setTextColor(...TINTA);

    let y = MARGEN;

    const saltarSiNoCabe = (alto: number) => {
      if (y + alto > FIN_UTIL) {
        doc.addPage();
        y = MARGEN;
      }
    };

    const linea = (texto: string, tamano: number, negrita: boolean, alinear: "izq" | "centro" | "der") => {
      doc.setFont(FUENTE, negrita ? "bold" : "normal");
      doc.setFontSize(tamano);
      doc.setTextColor(...TINTA);
      const x = alinear === "izq" ? MARGEN : alinear === "der" ? ANCHO_PAGINA - MARGEN : ANCHO_PAGINA / 2;
      doc.text(texto, x, y, { align: alinear === "izq" ? "left" : alinear === "der" ? "right" : "center" });
    };

    // --- Emisor -----------------------------------------------------------
    linea(recibo.emisor_razon_social, 15, true, "centro");
    y += 18;
    linea(`RUC: ${recibo.emisor_ruc}`, 10, false, "centro");
    y += 14;
    linea(`Dirección Matriz: ${recibo.emisor_direccion_matriz}`, 9, false, "centro");
    y += 13;
    linea(`Establecimiento: ${recibo.emisor_direccion_establecimiento}`, 9, false, "centro");
    y += 22;

    // --- Comprobante ------------------------------------------------------
    doc.setDrawColor(...FILA_RAYA);
    doc.setLineWidth(0.8);
    doc.rect(MARGEN, y - 12, ANCHO_UTIL, 34);
    linea("RECIBO DE PAGO", 13, true, "centro");
    y += 14;
    doc.setFont(FUENTE, "normal");
    doc.setFontSize(10);
    doc.text(`No. ${recibo.numero_recibo}`, ANCHO_PAGINA / 2, y + 6, { align: "center" });
    y += 40;

    // --- Fecha y establecimiento/punto de emisión -------------------------
    doc.setFont(FUENTE, "normal");
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${fechaCorta(recibo.fecha_emision)}`, MARGEN, y);
    doc.text(
      `Establecimiento: ${recibo.codigo_establecimiento}  ·  Punto de emisión: ${recibo.punto_emision}`,
      ANCHO_PAGINA - MARGEN,
      y,
      { align: "right" },
    );
    y += 26;

    // --- Receptor ---------------------------------------------------------
    doc.setFont(FUENTE, "bold");
    doc.setFontSize(10);
    doc.text("Receptor", MARGEN, y);
    y += 15;
    doc.setFont(FUENTE, "normal");
    doc.text(`Nombre: ${recibo.receptor_nombre}`, MARGEN, y);
    y += 14;
    doc.text(
      `${TIPOS_IDENTIFICACION[recibo.receptor_tipo_identificacion]}: ${recibo.receptor_identificacion}`,
      MARGEN,
      y,
    );
    y += 26;

    // --- Detalle ----------------------------------------------------------
    doc.setFillColor(245, 245, 245);
    doc.rect(MARGEN, y - 11, ANCHO_UTIL, 20, "F");
    doc.setFont(FUENTE, "bold");
    doc.setFontSize(9);
    doc.text("Descripción", MARGEN + 6, y + 2);
    doc.text("Valor", ANCHO_PAGINA - MARGEN - 6, y + 2, { align: "right" });
    y += 20;

    doc.setFont(FUENTE, "normal");
    doc.setFontSize(10);
    const detalle = doc.splitTextToSize(recibo.detalle, ANCHO_UTIL - 90) as string[];
    for (const renglon of detalle) {
      saltarSiNoCabe(16);
      doc.text(renglon, MARGEN + 6, y + 2);
      y += 15;
    }
    saltarSiNoCabe(16);
    doc.text(monto(recibo.subtotal), ANCHO_PAGINA - MARGEN - 6, y + 2, { align: "right" });
    y += 8;
    doc.setDrawColor(...FILA_RAYA);
    doc.line(MARGEN, y, ANCHO_PAGINA - MARGEN, y);
    y += 18;

    // --- Totales ----------------------------------------------------------
    const filaTotal = (etiqueta: string, valor: string, negrita: boolean) => {
      saltarSiNoCabe(16);
      doc.setFont(FUENTE, negrita ? "bold" : "normal");
      doc.setFontSize(negrita ? 11 : 10);
      doc.text(etiqueta, MARGEN + 6, y);
      doc.text(valor, ANCHO_PAGINA - MARGEN - 6, y, { align: "right" });
      y += 16;
    };
    filaTotal("Subtotal 15%", monto(recibo.subtotal), false);
    filaTotal(`IVA ${recibo.porcentaje_iva}%`, monto(recibo.iva), false);
    filaTotal("TOTAL", monto(recibo.total), true);
    y += 6;

    // --- Forma de pago ----------------------------------------------------
    saltarSiNoCabe(18);
    doc.setFont(FUENTE, "bold");
    doc.setFontSize(10);
    doc.text("Forma de pago:", MARGEN + 6, y);
    doc.setFont(FUENTE, "normal");
    doc.text(FORMAS_PAGO[recibo.forma_pago] ?? recibo.forma_pago, MARGEN + 110, y);
    y += 30;

    // --- Aclaración: documento interno, no autorizado por el SRI ----------
    saltarSiNoCabe(48);
    doc.setDrawColor(...FILA_RAYA);
    doc.line(MARGEN, y - 12, ANCHO_PAGINA - MARGEN, y - 12);
    doc.setFont(FUENTE, "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    const disclaimer = doc.splitTextToSize(
      "Documento interno de respaldo de pago. No es una factura ni un comprobante electrónico autorizado por el SRI. " +
        "Este recibo respalda el pago recibido y conserva el número secuencial asignado al emitirse.",
      ANCHO_UTIL,
    ) as string[];
    for (const renglon of disclaimer) {
      doc.text(renglon, ANCHO_PAGINA / 2, y, { align: "center" });
      y += 11;
    }

    // output("blob") deja el PDF como Blob, igual que el generador de contratos.
    return doc.output("blob");
  }
}
