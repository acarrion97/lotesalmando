/**
 * Verificación del PDF del recibo de pago (tarea 3.2 del cambio
 * recibos-pago-formato-sri): número, emisor, receptor, totales con IVA y la
 * aclaración de que no es un comprobante autorizado por el SRI. Se ejecuta
 * con:
 *
 *   node scripts/verificar-recibo-pdf.ts
 *
 * El PDF se genera con el mismo generador que usa la aplicación y luego se
 * leen los textos que quedaron escritos en el archivo.
 */
import { register } from "node:module";
import type { Recibo } from "../src/domain/recibo/entities/Recibo.ts";

// El alias `@/` no existe para Node: se registra el resolver antes de cargar
// el código de `src/` que lo usa (los import estáticos se resolverían antes).
register("./resolver-alias.mjs", import.meta.url);
const { GeneradorReciboPdf } = await import("../src/infrastructure/documents/GeneradorReciboPdf.ts");
const { nombreArchivoRecibo } = await import("../src/application/recibos/ports/GeneradorReciboDocumento.ts");

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

/** Quita los saltos de línea que el reparto de texto mete en el PDF. */
function sinEspacios(texto: string): string {
  return texto.replace(/\s+/g, "");
}

/** Desarma un string del PDF: escapes de paréntesis, barra y octales. */
function desescapar(texto: string): string {
  return texto
    .replace(/\\([0-7]{1,3})/g, (_m, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\([()\\])/g, "$1");
}

/**
 * Todos los textos que quedaron escritos en el PDF, en orden de aparición.
 * jsPDF no comprime por defecto, así que alcanza con leer los strings entre
 * paréntesis (si una versión futura comprimiera, se inflan los flujos).
 */
async function textosDelPdf(blob: Blob): Promise<string> {
  let contenido = Buffer.from(await blob.arrayBuffer()).toString("latin1");
  if (contenido.includes("/FlateDecode")) {
    const { inflateSync } = await import("node:zlib");
    contenido = [...contenido.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
      .map((m) => {
        try {
          return inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
        } catch {
          return m[1];
        }
      })
      .join("\n");
  }
  return [...contenido.matchAll(/\((?:\\.|[^\\)])*\)/g)]
    .map((m) => desescapar(m[0].slice(1, -1)))
    .join("\n");
}

const RECIBO: Recibo = {
  id_recibo: 7,
  id_empresa: 1,
  id_proyecto: 4,
  id_pago: 31,
  id_cobranza: 12,
  numero_recibo: "001-001-000000007",
  secuencia: 7,
  fecha_emision: "2026-10-23",
  emisor_razon_social: "TERRENOS DEL VALLE S.A.",
  emisor_ruc: "0912345678001",
  emisor_direccion_matriz: "Av. Amazonas N1-23 y Naciones Unidas, Quito",
  emisor_direccion_establecimiento: "Km 3 vía Machala, Babahoyo",
  codigo_establecimiento: "001",
  punto_emision: "001",
  receptor_nombre: "MARÍA PAREDES",
  receptor_tipo_identificacion: "05",
  receptor_identificacion: "1712345678",
  detalle: "Pago de cuota 3 del contrato C-001, lote 7, proyecto Villa Verde",
  subtotal: 86.96,
  porcentaje_iva: 15,
  iva: 13.04,
  total: 100,
  forma_pago: "transferencia",
  created_at: "2026-10-23T20:00:00.000Z",
};

async function main(): Promise<void> {
  const generador = new GeneradorReciboPdf();
  const blob = await generador.generar(RECIBO);
  const bytes = Buffer.from(await blob.arrayBuffer());
  const texto = await textosDelPdf(blob);
  const textoPlano = sinEspacios(texto);

  /** Busca una frase sin importar los saltos de línea del reparto. */
  const contiene = (frase: string) => textoPlano.includes(sinEspacios(frase));

  console.log("Archivo");
  verificar("es un PDF", bytes.subarray(0, 5).toString("latin1") === "%PDF-", bytes.subarray(0, 8).toString("latin1"));
  verificar(
    "el nombre sale del número persistido",
    nombreArchivoRecibo(RECIBO) === "recibo-001-001-000000007.pdf",
    nombreArchivoRecibo(RECIBO),
  );

  console.log("Número y encabezado");
  verificar("dice RECIBO DE PAGO", contiene("RECIBO DE PAGO"));
  verificar("muestra el número del recibo", contiene("No. 001-001-000000007"), texto.slice(0, 400));
  verificar("muestra la fecha de emisión", contiene("Fecha de emisión: 23/10/2026"));
  verificar(
    "muestra establecimiento y punto de emisión",
    contiene("Establecimiento: 001") && contiene("Punto de emisión: 001"),
  );

  console.log("Emisor");
  verificar("razón social", contiene("TERRENOS DEL VALLE S.A."));
  verificar("RUC del emisor", contiene("RUC: 0912345678001"));
  verificar("dirección matriz", contiene("Dirección Matriz: Av. Amazonas N1-23 y Naciones Unidas, Quito"));
  verificar("dirección del establecimiento", contiene("Establecimiento: Km 3 vía Machala, Babahoyo"));

  console.log("Receptor");
  verificar("nombre del receptor", contiene("Nombre: MARÍA PAREDES"));
  verificar("cédula del receptor", contiene("CÉDULA DE IDENTIDAD: 1712345678"), texto);
  verificar("detalle del pago", contiene("Pago de cuota 3 del contrato C-001, lote 7, proyecto Villa Verde"));

  console.log("Totales con IVA 15%");
  verificar("subtotal rotulado", contiene("Subtotal 15%") && contiene("$86,96"));
  verificar("IVA rotulado", contiene("IVA 15%") && contiene("$13,04"));
  verificar("total en negrita", contiene("TOTAL") && contiene("$100,00"));
  verificar("forma de pago", contiene("Forma de pago:") && contiene("Transferencia"));

  console.log("Aclaración (documento interno, no autorizado por el SRI)");
  verificar("dice que es documento interno", contiene("Documento interno de respaldo de pago"));
  verificar("niega ser factura ni comprobante electrónico", contiene("No es una factura ni un comprobante electrónico"));
  verificar("menciona al SRI", contiene("autorizado por el SRI"));
  verificar("explica que conserva el número secuencial", contiene("conserva el número secuencial asignado al emitirse"));

  console.log("Consumidor final");
  const consumidorFinal = await generador.generar({
    ...RECIBO,
    id_recibo: 8,
    receptor_nombre: "CONSUMIDOR FINAL",
    receptor_tipo_identificacion: "07",
    receptor_identificacion: "9999999999999",
  });
  const textoFinal = sinEspacios(await textosDelPdf(consumidorFinal));
  verificar(
    "identificación de consumidor final impresa",
    textoFinal.includes(sinEspacios("CONSUMIDOR FINAL: 9999999999999")),
    await textosDelPdf(consumidorFinal),
  );

  if (fallos > 0) {
    console.error(`\n${fallos} verificación(es) fallida(s)`);
    process.exit(1);
  }
  console.log("\nTodas las verificaciones pasaron");
}

await main();
