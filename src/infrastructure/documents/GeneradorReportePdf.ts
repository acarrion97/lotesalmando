import { jsPDF } from "jspdf";
import type { HojaReporte, TipoColumnaReporte } from "@/infrastructure/export/exportarReporte";

/**
 * Descarga el logo desde su URL pública y lo devuelve como data URL (base64),
 * que es lo único que jsPDF acepta para imágenes de otro origen. Devuelve
 * `null` si no hay logo o si la descarga falla: el PDF se genera igual.
 */
async function logoBase64(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise<string | null>((resolver) => {
      const lector = new FileReader();
      lector.onload = () =>
        resolver(typeof lector.result === "string" ? lector.result : null);
      lector.onerror = () => resolver(null);
      lector.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** A4 apaisado en puntos: los reportes son tablas anchas. */
const ANCHO_PAGINA = 841.89;
const ALTO_PAGINA = 595.28;
const MARGEN = 40;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;
const FIN_UTIL = ALTO_PAGINA - MARGEN;

const TINTA: [number, number, number] = [40, 40, 40];
const GRIS: [number, number, number] = [107, 114, 128];
const FILA_RAYA: [number, number, number] = [210, 210, 210];
/** Color de marca de la plataforma (`--lam-primary` de index.css). */
const PRIMARIA: [number, number, number] = [8, 43, 51];
const TEXTO_SOBRE_PRIMARIA: [number, number, number] = [255, 255, 255];

const FUENTE = "helvetica";
const ALTO_FILA = 18;

export interface DatosReportePdf {
  /** Razón social o nombre de la empresa. */
  empresa: string;
  /** URL pública del logo de la empresa (bucket `logos-empresa`); opcional. */
  logoUrl?: string | null;
  titulo: string;
  /** Líneas de contexto bajo el título: período, filtros, fecha de emisión. */
  detalle: string[];
  hojas: HojaReporte[];
}

/** Monto con el formato de los comprobantes de Ecuador: $1.234,56. */
function monto(valor: number): string {
  const [enteros, decimales] = Math.abs(valor).toFixed(2).split(".");
  const agrupados = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${valor < 0 ? "-" : ""}$${agrupados},${decimales}`;
}

function celda(valor: string | number | null, tipo: TipoColumnaReporte | undefined): string {
  if (valor === null || valor === "") return "-";
  if (typeof valor === "number") {
    if (tipo === "moneda") return monto(valor);
    if (tipo === "porcentaje") return `${valor}%`;
  }
  return String(valor);
}

/**
 * Reporte en PDF con el aspecto de la plataforma: encabezado con el logo y la
 * empresa, cuadro de título y cabeceras de tabla en el color de marca, filas
 * rayadas y pie con la numeración de páginas. Se genera en el navegador.
 */
export class GeneradorReportePdf {
  async generar(datos: DatosReportePdf): Promise<Blob> {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    let y = MARGEN;

    const salto = (alto: number) => {
      if (y + alto > FIN_UTIL) {
        doc.addPage();
        y = MARGEN;
        return true;
      }
      return false;
    };

    // --- Encabezado -------------------------------------------------------
    const logo = await logoBase64(datos.logoUrl);
    doc.setTextColor(...TINTA);
    doc.setFont(FUENTE, "bold");
    doc.setFontSize(15);
    if (logo) {
      // El logo va a la izquierda y el nombre de la empresa lo equilibra al centro.
      try {
        const ALTO_LOGO = 30;
        const medidas = doc.getImageProperties(logo);
        const anchoLogo = (medidas.width / medidas.height) * ALTO_LOGO;
        doc.addImage(logo, MARGEN, y - 22, anchoLogo, ALTO_LOGO);
      } catch {
        // Imagen ilegible: se omite y el encabezado sigue con el nombre solo.
      }
    }
    doc.text(datos.empresa, ANCHO_PAGINA / 2, y, { align: "center" });
    y += 22;
    doc.setDrawColor(...PRIMARIA);
    doc.setLineWidth(0.8);
    doc.rect(MARGEN, y - 12, ANCHO_UTIL, 28);
    doc.setFontSize(13);
    doc.setTextColor(...PRIMARIA);
    doc.text(datos.titulo.toUpperCase(), ANCHO_PAGINA / 2, y + 6, { align: "center" });
    y += 38;
    doc.setFont(FUENTE, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TINTA);
    for (const linea of datos.detalle) {
      doc.text(linea, MARGEN, y);
      y += 13;
    }
    y += 10;

    // --- Tablas -----------------------------------------------------------
    for (const hoja of datos.hojas) {
      const tipos = hoja.tipos ?? [];
      // Columnas numéricas más angostas; el resto se reparte el espacio sobrante.
      const pesos = hoja.columnas.map((titulo, i) => {
        const mayor = Math.max(
          titulo.length,
          ...hoja.filas.map((f) => celda(f[i] ?? null, tipos[i]).length),
        );
        return Math.min(Math.max(mayor, 6), 34);
      });
      const total = pesos.reduce((a, b) => a + b, 0);
      const anchos = pesos.map((p) => (p / total) * ANCHO_UTIL);
      const alineaDerecha = hoja.columnas.map(
        (_, i) => tipos[i] !== undefined || hoja.filas.every((f) => typeof f[i] === "number"),
      );

      const dibujarCabecera = () => {
        doc.setFillColor(...PRIMARIA);
        doc.rect(MARGEN, y - 12, ANCHO_UTIL, ALTO_FILA + 2, "F");
        doc.setFont(FUENTE, "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXTO_SOBRE_PRIMARIA);
        let x = MARGEN;
        hoja.columnas.forEach((titulo, i) => {
          const texto = doc.splitTextToSize(titulo, anchos[i] - 8)[0] as string;
          if (alineaDerecha[i]) doc.text(texto, x + anchos[i] - 4, y, { align: "right" });
          else doc.text(texto, x + 4, y);
          x += anchos[i];
        });
        y += ALTO_FILA;
      };

      salto(60);
      doc.setFont(FUENTE, "bold");
      doc.setFontSize(11);
      doc.setTextColor(...PRIMARIA);
      doc.text(hoja.nombre, MARGEN, y);
      y += 18;
      dibujarCabecera();

      doc.setFont(FUENTE, "normal");
      doc.setFontSize(8.5);
      if (hoja.filas.length === 0) {
        doc.setTextColor(...GRIS);
        doc.text("Sin registros para los filtros seleccionados.", MARGEN + 4, y);
        y += ALTO_FILA;
      }
      for (const fila of hoja.filas) {
        if (salto(ALTO_FILA)) {
          dibujarCabecera();
          doc.setFont(FUENTE, "normal");
          doc.setFontSize(8.5);
        }
        doc.setTextColor(...TINTA);
        let x = MARGEN;
        fila.forEach((valor, i) => {
          const texto = doc.splitTextToSize(celda(valor, tipos[i]), anchos[i] - 8)[0] as string;
          if (alineaDerecha[i]) doc.text(texto, x + anchos[i] - 4, y, { align: "right" });
          else doc.text(texto, x + 4, y);
          x += anchos[i];
        });
        doc.setDrawColor(...FILA_RAYA);
        doc.line(MARGEN, y + 5, ANCHO_PAGINA - MARGEN, y + 5);
        y += ALTO_FILA;
      }
      y += 16;
    }

    // --- Pie: numeración de páginas ----------------------------------------
    const paginas = doc.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setFont(FUENTE, "italic");
      doc.setFontSize(8);
      doc.setTextColor(...GRIS);
      doc.text(`Página ${p} de ${paginas}`, ANCHO_PAGINA - MARGEN, ALTO_PAGINA - 20, {
        align: "right",
      });
      doc.text(
        "Documento interno de gestión. No es un comprobante autorizado por el SRI.",
        MARGEN,
        ALTO_PAGINA - 20,
      );
    }

    return doc.output("blob");
  }
}
