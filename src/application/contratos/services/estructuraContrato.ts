import {
  type BloqueDocumento,
  type ContenidoContrato,
  type DocumentoPlano,
  type SegmentoTexto,
} from "../ports/GeneradorDocumentoContrato";

/** Nombres de moneda como los escribe el contrato (en letras). */
const MONEDAS_EN_LETRAS: Record<string, string> = {
  USD: "DÓLARES DE LOS ESTADOS UNIDOS DE NORTEAMÉRICA",
  EUR: "EUROS",
  MXN: "PESOS MEXICANOS",
  COP: "PESOS COLOMBIANOS",
  PEN: "SOLES PERUANOS",
  CLP: "PESOS CHILENOS",
  BRL: "REALES BRASILEÑOS",
  UYU: "PESOS URUGUAYOS",
  PYG: "GUARANÍES PARAGUAYOS",
  BOB: "BOLIVIANOS",
  GTQ: "QUETZALES GUATEMALTECOS",
  NIO: "CÓRDOBAS NICARAGÜENSES",
  HNL: "LEMPIRAS HONDUREÑOS",
  PAB: "BALBOAS PANAMEÑOS",
  DOP: "PESOS DOMINICANOS",
  CRC: "COLONES COSTARRICENSES",
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "14.400,00": el formato de miles con punto que usa el contrato. */
export function montoDelContrato(valor: number): string {
  return new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/** "10 de abril del 2026" */
export function fechaEnPalabras(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return `${dia} de ${MESES[mes - 1] ?? ""} del ${anio}`;
}

/**
 * Convierte las medidas del lote ("8,00 x 18,00") en la frase del
 * contrato. Si no hay medidas, se devuelve null y la clausula lo omite.
 */
export function medidasEnPalabras(medidas: string | null | undefined): string | null {
  if (!medidas || !medidas.trim()) return null;

  const numeros = medidas.match(/\d+([.,]\d+)?/g);
  if (!numeros || numeros.length < 2) return medidas.trim();

  // Se dejan como están escritas: el contrato usa coma decimal ("8,00",
  // "14.400,00") y darles otra forma cambiaría el dato.
  const frente = numeros[0];
  const fondo = numeros[1];
  return `${frente} metros de frente por ${fondo} metros de fondo`;
}

/**
 * Arma el texto del contrato a partir de los datos de la venta. Función
 * pura: recibe los datos y devuelve el documento, sin tocar la red ni la
 * base. Es la única fuente de redacción de los dos formatos (Word/PDF).
 *
 * El formato es el "Compromiso de Adhesión y Adquisición de Terreno":
 * título centrado y nueve cláusulas (PRIMERA a NOVENA) con el encabezado
 * en negrita, el cuerpo justificado y el bloque de firmas al final.
 */
export function estructuraContrato(c: ContenidoContrato): DocumentoPlano {
  const ciudad = c.empresa.ciudad?.trim() || "Machala";
  const monedaEnLetras = MONEDAS_EN_LETRAS[c.moneda] ?? c.moneda;
  const medidas = medidasEnPalabras(c.medidas);
  const superficie = c.superficie_m2 ?? null;

  // "Comparece la "CIUDADELA SAN LUCAS S.A.S" representada por el señor
  // GUIDO RAFAEL ESPINOZA AGUILAR, con cedula de ciudadania No. ...": en el
  // documento original la empresa y el representante van en negrita.
  const intervinientes: SegmentoTexto[] = [{ texto: "Comparece la " }];
  intervinientes.push({ texto: `“${c.empresa.nombre}”`, negrita: true });
  // El RUC de la razón social va junto al nombre (si está cargado):
  // “CDLA SAN LUCAS S.A.S”, con RUC 0791843338001, representada por el…
  if (c.empresa.ruc?.trim()) {
    intervinientes.push({ texto: `, con RUC ${c.empresa.ruc.trim()},` });
  }
  intervinientes.push({ texto: " representada por el señor " });
  if (c.empresa.representante) {
    intervinientes.push({ texto: c.empresa.representante, negrita: true });
  } else {
    // Sin representante cargado se repite la empresa: el contrato igual
    // sale completo, el dato se completa en Configuración.
    intervinientes.push({ texto: c.empresa.nombre, negrita: true });
  }
  if (c.empresa.representante_cedula) {
    intervinientes.push({
      texto: `, con cédula de ciudadanía No. ${c.empresa.representante_cedula}`,
    });
  }
  if (c.empresa.representante_email) {
    intervinientes.push({ texto: `, con correo electrónico: ${c.empresa.representante_email}` });
  }
  intervinientes.push({ texto: `, domiciliado en la ciudad de ${ciudad}` });
  intervinientes.push({ texto: ", a quien se lo denominará como PROPIETARIO" });
  intervinientes.push({ texto: ", y por otra parte " });
  intervinientes.push({ texto: c.cliente.nombres, negrita: true });
  if (c.cliente.cedula) intervinientes.push({ texto: `, con cédula de ciudadanía No ${c.cliente.cedula}` });
  if (c.cliente.email) intervinientes.push({ texto: `, correo electrónico: ${c.cliente.email}` });
  if (c.cliente.telefono)
    intervinientes.push({ texto: `, número de celular ${c.cliente.telefono}` });
  intervinientes.push({
    texto: ", a quien se lo denominará ADHERENTE o ADQUIRIENTE. Los comparecientes son mayores de edad, capaces ante la Ley, para contratar y obligarse, conforme dispone el Código Civil, al tenor de las siguientes cláusulas:",
  });

  const singularidad = [
    c.manzana ? `Mz ${c.manzana}` : null,
    c.lote ? `Lote #${c.lote}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const formaDePago: SegmentoTexto[] = [];
  if (c.entrada !== null) {
    formaDePago.push({
      texto: `A la firma del presente documento, la adquirente entrega la cantidad de ${montoDelContrato(
        c.entrada,
      )} ${c.moneda} como parte de la entrada total`,
    });
  }
  if (c.num_cuotas !== null) {
    const montoCuota =
      c.cuotas.length > 0
        ? c.cuotas.reduce((s, cuota) => s + cuota.monto, 0) / c.cuotas.length
        : c.financiado !== null && c.num_cuotas > 0
          ? c.financiado / c.num_cuotas
          : 0;
    if (formaDePago.length > 0) formaDePago.push({ texto: ", " });
    formaDePago.push({
      texto: `pagará ${c.num_cuotas} cuotas de ${montoDelContrato(montoCuota)} ${c.moneda} cada una, que serán pagadas mes a mes`,
    });
  }

  // Lo que sigue ("El pago se lo realizará…" / "Las papeletas…") es otra
  // oración: la forma de pago termina con punto, como en el original.
  if (formaDePago.length > 0) {
    const ultima = formaDePago[formaDePago.length - 1];
    ultima.texto = `${ultima.texto.replace(/\s+$/, "")}.`;
  }
  const hayCuentas = !!c.empresa.cuentas_bancarias?.trim();

  const bloques: BloqueDocumento[] = [
    { tipo: "titulo", texto: "COMPROMISO DE ADHESIÓN Y ADQUISICIÓN DE TERRENO" },
    { tipo: "subtitulo", texto: `Contrato N° ${c.numero_contrato}` },
    { tipo: "espacio" },
    {
      tipo: "clausula",
      encabezado: "PRIMERA: INTERVINIENTES. -",
      cuerpo: intervinientes,
    },
    {
      tipo: "clausula",
      encabezado: "SEGUNDO: SOLICITUD DE ADHESIÓN Y ADQUISICIÓN DE TERRENO. -",
      cuerpo: [
        { texto: "El adquirente de forma libre y voluntaria solicita suscribir el presente contrato de adhesión para el proyecto de la Asociación de Moradores" },
        ...(c.proyecto?.trim()
          ? [{ texto: ` ${c.proyecto.trim()}`, negrita: true }]
          : []),
        {
          texto: ", para adquisición del terreno, próximo a la desmembración y adjudicación de un lote de terreno con las siguientes singularidades: ",
        },
        { texto: singularidad || "el lote indicado en este contrato", negrita: true },
        ...(medidas ? [{ texto: `, con las siguientes medidas: ${medidas}` }] : []),
        ...(superficie
          ? [{ texto: `, que da un área total de ${superficie} metros cuadrados` }]
          : []),
        {
          texto: `${medidas || superficie ? "" : ","} adicional a las alícuotas de áreas verdes, áreas sociales, calles y espacios comunitarios. El Promitente vendedor, se compromete a dar en futura venta y enajenación perpetua, a ${c.empresa.nombre}, el área de terreno y especificaciones antes descritas, quien procederá a suscribir escrituras públicas de compraventa al promitente comprador. Cancelada la totalidad se procede a realizar la escritura pública de venta de los solares y alícuota detallada en este contrato.`,
        },
      ],
    },
    {
      tipo: "clausula",
      encabezado: "TERCERO: PRECIO Y FORMA DE PAGO. -",
      cuerpo: [
        {
          texto: `El valor pactado entre las partes descrito en la cláusula segunda y tercera es de ${montoDelContrato(
            c.precio_total,
          )} ${monedaEnLetras}, los cuales serán cancelados de la siguiente forma: `,
        },
        ...formaDePago,
        ...(c.empresa.cuentas_bancarias?.trim()
          ? [
              {
                texto: ` El pago se lo realizará mediante transferencia o depósito directo en ${c.empresa.cuentas_bancarias.trim()},`,
              },
            ]
          : []),
        {
          texto: `${hayCuentas ? " las" : " Las"} papeletas de depósito serán canjeadas por recibos emitidos por el propietario`,
        },
        ...(c.empresa.direccion_canje?.trim()
          ? [{ texto: `, los canjes se realizarán en ${c.empresa.direccion_canje.trim()}` }]
          : []),
        {
          texto: ", el adquirente deja constancia que únicamente entregará su papeleta de depósito al momento de recibir su comprobante de pago. Queda estipulado para el adquirente, en caso de pérdida de las papeletas de depósito, el propietario no tiene la responsabilidad de verificar o considerar esos depósitos como pago.",
        },
      ],
    },
    {
      tipo: "clausula",
      encabezado: "CUARTA: CLÁUSULA PENAL. -",
      cuerpo: [
        {
          texto: "Han acordado las partes, que el dinero recibido por el propietario está en calidad de anticresis, por lo que no genera intereses en favor del adquirente; referente al dinero entregado con la firma de este contrato. Acuerdan los intervinientes una penalidad del 40% de ese valor, en caso de incumplimiento, serán devueltas en igual forma como fueron pagadas por el adquirente.",
        },
      ],
    },
    {
      tipo: "parrafo",
      texto: "En caso de que el promitente vendedor, no cumpliera con lo pactado, deberá devolver todo el dinero cancelado por el adquirente, en un plazo no mayor de tres meses, sin penalidad económica, ya que la promoción, elaboración de proyecto, trámites legalización serán asumidos por su persona, y no por el adquirente.",
    },
    { tipo: "espacio" },
    {
      tipo: "clausula",
      encabezado: "QUINTA: GARANTÍA DEL PROYECTO Y OBRAS. -",
      cuerpo: [
        {
          texto: "El PROPIETARIO se compromete a ejecutar, durante el desarrollo del proyecto o al momento de su culminación, las obras básicas necesarias para el adecuado acceso y habitabilidad del inmueble, las cuales comprenden: la lastrada de vías internas y de acceso, así como la gestión e implementación progresiva de servicios básicos, tales como agua potable, energía eléctrica y sistema sanitario mediante pozo séptico.",
        },
      ],
    },
    {
      tipo: "parrafo",
      texto: "Estas obras serán desarrolladas de manera progresiva conforme al avance del proyecto y condiciones técnicas, comprometiéndose el PROPIETARIO a realizar las gestiones necesarias para su cumplimiento.",
    },
    { tipo: "espacio" },
    {
      tipo: "clausula",
      encabezado: "SEXTA: GASTOS Y RESPONSABILIDADES. -",
      cuerpo: [
        {
          texto: "Los gastos notariales, de escrituración, impuestos (alcabalas, plusvalía) y demás costos legales derivados de la transferencia de dominio serán asumidos por el ADQUIRENTE.",
        },
      ],
    },
    {
      tipo: "parrafo",
      texto: "En cuanto a los servicios básicos, el PROPIETARIO será responsable de su gestión e implementación general dentro del proyecto; sin perjuicio de que, en caso de requerir contribuciones adicionales para mejoras específicas o conexiones individuales, éstas podrán ser asumidas por los adquirentes de común acuerdo.",
    },
    {
      tipo: "clausula",
      encabezado: "SÉPTIMA: DECLARACIONES. -",
      cuerpo: [
        {
          texto: "El promitente comprador queda facultado para ingresar al predio a realizar obra civil, que es el objeto de esta negociación inmediatamente después de cancelado el 70% del precio total pactado.",
        },
      ],
    },
    { tipo: "espacio" },
    {
      tipo: "clausula",
      encabezado: "OCTAVA: ENTREGA DE ESCRITURA. -",
      cuerpo: [
        {
          texto: `Cumplido el pago total de los valores acordados por el adquirente, el propietario ${c.empresa.nombre} está obligado a la entrega de las escrituras pública de compra del área y porcentajes de alícuotas determinados en este contrato, dentro del plazo de tres meses siguientes, siendo que las partes acuerdan que todos los gastos de elaboración de escrituras, así como el pago de alcabalas y plusvalía, serán asumidos por el adquirente.`,
        },
      ],
    },
    {
      tipo: "clausula",
      encabezado: "NOVENA: ACEPTACIÓN. -",
      cuerpo: [
        {
          texto: `Las partes suscriben el presente contrato de forma voluntaria, declarando conocer su contenido, ratificándose en el mismo, por ser convenientes a sus intereses, el cual deberá ser cumplido por sus herederos, en caso del fallecimiento de una de las partes. Dejan declarado que las firmas, así como sus huellas dactilares son suyas, en caso de controversia se someten a los Jueces de la ciudad de ${ciudad}, otorgándole al presente documento el valor de un documento privado en conformidad al Art. 216 y 217 del Código Orgánico General de Procesos, sometiéndose al contenido del mismo en caso de controversia judicial.`,
        },
      ],
    },
    // Como en el documento original: el lugar y la fecha van seguidos de la
    // NOVENA (sin línea en blanco) y en negrita.
    { tipo: "parrafo", texto: `${ciudad}, ${fechaEnPalabras(c.fecha)}`, negrita: true },
    { tipo: "espacio" },
    {
      tipo: "firmas",
      columnas: [
        {
          lineas: [
            c.empresa.representante?.trim() || c.empresa.nombre,
            // Como el original: va el nombre corto del proyecto (si no,
            // el de la empresa).
            `GERENTE GENERAL “${c.proyecto?.trim() || c.empresa.nombre}”`,
            "VENDEDOR",
          ],
        },
        {
          lineas: [c.cliente.nombres, "APODERADO (A)", "ADQUIRIENTE"],
        },
      ],
    },
  ];

  return { titulo: "Compromiso de Adhesión y Adquisición de Terreno", bloques };
}
