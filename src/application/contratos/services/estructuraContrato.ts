import {
  datoDeContenido,
  fechaDeContenido,
  moneyDeContenido,
  type BloqueDocumento,
  type ContenidoContrato,
  type DocumentoPlano,
} from "../ports/GeneradorDocumentoContrato";

/**
 * Arma el texto del contrato a partir de los datos de la venta. Función
 * pura: recibe los datos y devuelve el documento, sin tocar la red ni la
 * base. Es la única fuente de redacción de los dos formatos (Word/PDF).
 */
export function estructuraContrato(c: ContenidoContrato): DocumentoPlano {
  const totalCuotas = c.cuotas.reduce((s, cuota) => s + Math.round(cuota.monto * 100), 0) / 100;
  const tienePlan = c.cuotas.length > 0;

  const bloques: BloqueDocumento[] = [
    { tipo: "titulo", texto: "Contrato de compraventa de lote" },
    {
      tipo: "parrafo",
      texto: `Entre ${c.empresa.nombre}${c.empresa.ruc ? ` (RUC ${c.empresa.ruc})` : ""}, en adelante “la empresa”, y ${c.cliente.nombres}, cédula ${datoDeContenido(c.cliente.cedula)}, en adelante “el comprador”, se celebra el presente contrato de compraventa sobre el inmueble que se detalla.`,
    },
    { tipo: "espacio" },
    { tipo: "subtitulo", texto: "1. Datos del contrato" },
    { tipo: "etiqueta_valor", etiqueta: "Número de contrato", valor: c.numero_contrato },
    { tipo: "etiqueta_valor", etiqueta: "Fecha", valor: fechaDeContenido(c.fecha) },
    { tipo: "etiqueta_valor", etiqueta: "Proyecto", valor: datoDeContenido(c.proyecto) },
    { tipo: "etiqueta_valor", etiqueta: "Lote", valor: datoDeContenido(c.lote) },
    { tipo: "espacio" },
    { tipo: "subtitulo", texto: "2. Datos del comprador" },
    { tipo: "etiqueta_valor", etiqueta: "Nombre", valor: c.cliente.nombres },
    { tipo: "etiqueta_valor", etiqueta: "Cédula / RUC", valor: datoDeContenido(c.cliente.cedula) },
    { tipo: "etiqueta_valor", etiqueta: "Correo", valor: datoDeContenido(c.cliente.email) },
    { tipo: "etiqueta_valor", etiqueta: "Teléfono", valor: datoDeContenido(c.cliente.telefono) },
    { tipo: "espacio" },
    { tipo: "subtitulo", texto: "3. Precio y forma de pago" },
    { tipo: "etiqueta_valor", etiqueta: "Precio total", valor: moneyDeContenido(c.precio_total, c.moneda) },
    {
      tipo: "etiqueta_valor",
      etiqueta: "Entrada",
      valor: c.entrada !== null ? moneyDeContenido(c.entrada, c.moneda) : "—",
    },
    {
      tipo: "etiqueta_valor",
      etiqueta: "Monto financiado",
      valor: c.financiado !== null ? moneyDeContenido(c.financiado, c.moneda) : "—",
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
          fechaDeContenido(cuota.fecha_vencimiento),
          moneyDeContenido(cuota.monto, c.moneda),
        ]),
      },
      { tipo: "etiqueta_valor", etiqueta: "Total en cuotas", valor: moneyDeContenido(totalCuotas, c.moneda) },
      { tipo: "espacio" },
    );
  }

  bloques.push(
    { tipo: "subtitulo", texto: tienePlan ? "5. Declaraciones" : "4. Declaraciones" },
    {
      tipo: "parrafo",
      texto: "El comprador declara conocer las condiciones del lote adquirido y se obliga al pago de las cuotas en las fechas estipuladas. La empresa se compromete a mantener la reserva del lote mientras el plan se cumpla.",
    },
    { tipo: "espacio" },
    { tipo: "parrafo", texto: `Firmado electrónicamente el ${fechaDeContenido(c.fecha)}.` },
    { tipo: "espacio" },
    { tipo: "etiqueta_valor", etiqueta: "Empresa", valor: c.empresa.nombre },
    { tipo: "etiqueta_valor", etiqueta: "Comprador", valor: c.cliente.nombres },
  );

  return { titulo: "Contrato de compraventa", bloques };
}
