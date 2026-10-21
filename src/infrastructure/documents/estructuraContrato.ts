import { formatCurrency, formatDateOnly } from "@/utils";

/**
 * Textos y números del contrato, sin depender de ninguna librería de
 * Word ni PDF. Los dos generadores recorren esta misma estructura, así
 * que un cambio de redacción se hace una sola vez y sale igual en los
 * dos archivos.
 */
export interface ContenidoContrato {
  numero_contrato: string;
  /** Fecha de firma/venta en `YYYY-MM-DD`. */
  fecha: string;
  empresa: { nombre: string; ruc: string | null };
  cliente: { nombres: string; cedula: string | null; email: string | null; telefono: string | null };
  proyecto: string | null;
  lote: string | null;
  precio_total: number;
  /** `null` cuando la venta no vino de una cotización. */
  entrada: number | null;
  financiado: number | null;
  num_cuotas: number | null;
  cuotas: { numero: number; fecha_vencimiento: string | null; monto: number }[];
  moneda: string;
}

export type BloqueDocumento =
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "etiqueta_valor"; etiqueta: string; valor: string }
  | { tipo: "tabla"; encabezados: string[]; filas: string[][] }
  | { tipo: "espacio" };

export interface DocumentoPlano {
  titulo: string;
  bloques: BloqueDocumento[];
}

function money(valor: number, moneda: string): string {
  return formatCurrency(valor, moneda);
}

function fecha(o: string | null | undefined): string {
  return o ? formatDateOnly(o.slice(0, 10)) : "—";
}

function dato(valor: string | null | undefined): string {
  return valor && valor.trim() ? valor : "—";
}

/**
 * Arma el documento. Es una función pura: recibe los datos de la venta y
 * devuelve el texto que va al Word/PDF.
 */
export function estructuraContrato(c: ContenidoContrato): DocumentoPlano {
  const totalCuotas = c.cuotas.reduce((s, cuota) => s + Math.round(cuota.monto * 100), 0) / 100;
  const tienePlan = c.cuotas.length > 0;

  const bloques: BloqueDocumento[] = [
    { tipo: "titulo", texto: "Contrato de compraventa de lote" },
    {
      tipo: "parrafo",
      texto: `Entre ${c.empresa.nombre}${c.empresa.ruc ? ` (RUC ${c.empresa.ruc})` : ""}, en adelante “la empresa”, y ${c.cliente.nombres}, cédula ${dato(c.cliente.cedula)}, en adelante “el comprador”, se celebra el presente contrato de compraventa sobre el inmueble que se detalla.`,
    },
    { tipo: "espacio" },
    { tipo: "subtitulo", texto: "1. Datos del contrato" },
    { tipo: "etiqueta_valor", etiqueta: "Número de contrato", valor: c.numero_contrato },
    { tipo: "etiqueta_valor", etiqueta: "Fecha", valor: fecha(c.fecha) },
    { tipo: "etiqueta_valor", etiqueta: "Proyecto", valor: dato(c.proyecto) },
    { tipo: "etiqueta_valor", etiqueta: "Lote", valor: dato(c.lote) },
    { tipo: "espacio" },
    { tipo: "subtitulo", texto: "2. Datos del comprador" },
    { tipo: "etiqueta_valor", etiqueta: "Nombre", valor: c.cliente.nombres },
    { tipo: "etiqueta_valor", etiqueta: "Cédula / RUC", valor: dato(c.cliente.cedula) },
    { tipo: "etiqueta_valor", etiqueta: "Correo", valor: dato(c.cliente.email) },
    { tipo: "etiqueta_valor", etiqueta: "Teléfono", valor: dato(c.cliente.telefono) },
    { tipo: "espacio" },
    { tipo: "subtitulo", texto: "3. Precio y forma de pago" },
    { tipo: "etiqueta_valor", etiqueta: "Precio total", valor: money(c.precio_total, c.moneda) },
    {
      tipo: "etiqueta_valor",
      etiqueta: "Entrada",
      valor: c.entrada !== null ? money(c.entrada, c.moneda) : "—",
    },
    {
      tipo: "etiqueta_valor",
      etiqueta: "Monto financiado",
      valor: c.financiado !== null ? money(c.financiado, c.moneda) : "—",
    },
    {
      tipo: "etiqueta_valor",
      etiqueta: "Número de cuotas",
      valor: c.num_cuotas !== null ? String(c.num_cuotas) : "—",
    },
    { tipo: "espacio" },
  ];

  if (tienePlan) {
    bloques.push(
      { tipo: "subtitulo", texto: "4. Plan de cuotas" },
      {
        tipo: "tabla",
        encabezados: ["Cuota", "Vencimiento", "Monto"],
        filas: c.cuotas.map((cuota) => [
          String(cuota.numero),
          fecha(cuota.fecha_vencimiento),
          money(cuota.monto, c.moneda),
        ]),
      },
      { tipo: "etiqueta_valor", etiqueta: "Total en cuotas", valor: money(totalCuotas, c.moneda) },
      { tipo: "espacio" },
    );
  }

  bloques.push(
    { tipo: "subtitulo", texto: "5. Declaraciones" },
    {
      tipo: "parrafo",
      texto: "El comprador declara conocer las condiciones del lote adquirido y se obliga al pago de las cuotas en las fechas estipuladas. La empresa se compromete a mantener la reserva del lote mientras el plan se cumpla.",
    },
    { tipo: "espacio" },
    { tipo: "parrafo", texto: `Firmado electrónicamente el ${fecha(c.fecha)}.` },
    { tipo: "espacio" },
    { tipo: "etiqueta_valor", etiqueta: "Empresa", valor: c.empresa.nombre },
    { tipo: "etiqueta_valor", etiqueta: "Comprador", valor: c.cliente.nombres },
  );

  return { titulo: "Contrato de compraventa", bloques };
}
