/**
 * Verificación de la emisión de recibos de pago (tarea 2.4 del cambio
 * recibos-pago-formato-sri): numeración secuencial, duplicados, configura-
 * fiscal faltante, identificación de consumidor final y redondeo a centavos.
 * Se ejecuta con:
 *
 *   node scripts/verificar-recibo-emision.ts
 *
 * Usa el mismo camino que la aplicación en modo demo (MockConfirmarPagoCon-
 * Recibo + MockReciboRepository) con repositorios en memoria.
 */
import { register } from "node:module";
import type { ConfirmarPagoConReciboInput } from "../src/application/recibos/ports/ConfirmarPagoConRecibo.ts";

// El alias `@/` no existe para Node: se registra el resolver antes de cargar
// el código de `src/` que lo usa (los import estáticos se resolverían antes).
register("./resolver-alias.mjs", import.meta.url);
const { MockConfirmarPagoConRecibo } = await import("../src/infrastructure/transactions/MockConfirmarPagoConRecibo.ts");
const { MockReciboRepository } = await import("../src/infrastructure/repositories/mock/MockReciboRepository.ts");

let fallos = 0;

function verificar(nombre: string, condicion: boolean, detalle?: unknown): void {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO ${nombre}`, detalle ?? "");
  }
}

/** Ejecuta y devuelve el mensaje del error; `null` si no falló. */
async function errorDe(accion: () => Promise<unknown>): Promise<string | null> {
  try {
    await accion();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

const CONFIG_FISCAL = {
  razon_social: "TERRENOS DEL VALLE S.A.",
  ruc: "0912345678001",
  direccion_matriz: "Av. Amazonas N1-23 y Naciones Unidas, Quito",
  direccion_establecimiento: "Km 3 vía Machala, Babahoyo",
  codigo_establecimiento: "001",
  punto_emision: "001",
};

type OpcionesEscenario = {
  config?: (typeof CONFIG_FISCAL) | null;
  empresa?: { razon_social?: string; ruc?: string };
  cedulaRuc?: string | null;
};

/**
 * Escenario en memoria: 3 cuotas pagaderas (10, 11 y 12) y los repositorios
 * mínimos que consulta la confirmación. `setConfig` permite cambiar la
 * configuración fiscal entre intentos (para probar que un error no consume
 * número de secuencia).
 */
function crearEscenario(opciones: OpcionesEscenario = {}) {
  const caja = { config: opciones.config === undefined ? CONFIG_FISCAL : opciones.config };
  const pagosCreados: Array<{ id_pago: number; id_cobranza: number; monto_pagado: number }> = [];
  const recibos = new MockReciboRepository();

  const estadoCobranza = new Map<number, string>(
    Array.from({ length: 30 }, (_, i) => [10 + i, "pendiente"] as [number, string]).concat([[90, "pagada"]]),
  );

  const pagosPrevios = new Map<number, number[]>();

  const cobranzas = {
    async getById(id: number) {
      const estado = estadoCobranza.get(id);
      if (estado === undefined) return null;
      return { id_cobranza: id, id_contrato: 5, numero_cuota: id - 9, estado };
    },
    async updateEstado(id: number, estado: string) {
      estadoCobranza.set(id, estado);
    },
  };

  const pagos = {
    async getByCobranzaId(id: number) {
      return pagosPrevios.get(id) ?? [];
    },
    async create(datos: { id_cobranza: number; monto_pagado: number; fecha_pago: string }) {
      const id_pago = pagosCreados.length + 1;
      pagosCreados.push({ id_pago, id_cobranza: datos.id_cobranza, monto_pagado: datos.monto_pagado });
      pagosPrevios.set(datos.id_cobranza, [id_pago]);
      return { id_pago, ...datos };
    },
  };

  const empresa = { razon_social: "TERRENOS DEL VALLE S.A.", ruc: "0912345678001", ...opciones.empresa };

  const confirmar = new MockConfirmarPagoConRecibo(
    cobranzas as never,
    pagos as never,
    { async revisar() { return null; } } as never,
    recibos,
    { async getByProyectoId() { return caja.config; } } as never,
    { async getById() { return { id_venta: 1, numero_contrato: "C-001" }; } } as never,
    { async getById() { return { id_cliente: 1, id_lote: 7 }; } } as never,
    {
      async getById() {
        return { id_cliente: 1, nombres: "MARÍA PAREDES", cedula_ruc: opciones.cedulaRuc === undefined ? "1712345678" : opciones.cedulaRuc };
      },
    } as never,
    { async getById() { return { numero_lote: "7", id_manzana: 3 }; } } as never,
    { async getById() { return { id_etapa: 2 }; } } as never, // manzanas
    { async getById() { return { id_proyecto: 4 }; } } as never, // etapas
    { async getById() { return { id_proyecto: 4, id_empresa: 1, nombre: "Villa Verde" }; } } as never, // proyectos
    { async getById() { return { ...empresa, id_empresa: 1 }; } } as never, // empresas
  );

  return {
    confirmar,
    recibos,
    pagosCreados,
    estadoCobranza,
    setConfig(config: typeof CONFIG_FISCAL | null) {
      caja.config = config;
    },
  };
}

function entrada(id_cobranza: number, monto_pagado: number): ConfirmarPagoConReciboInput {
  return {
    id_cobranza,
    id_usuario: 1,
    monto_pagado,
    fecha_pago: "2026-10-23T15:00:00+00:00",
    forma_pago: "transferencia",
  };
}

async function main(): Promise<void> {
  console.log("Numeración secuencial del recibo");
  {
    const e = crearEscenario();
    const numeros: string[] = [];
    for (const [i, cuota] of [10, 11, 12].entries()) {
      const { recibo } = await e.confirmar.execute(entrada(cuota, 100 + i));
      numeros.push(recibo.numero_recibo);
    }
    verificar(
      "los números son 001-001-000000001..003",
      JSON.stringify(numeros) === JSON.stringify(["001-001-000000001", "001-001-000000002", "001-001-000000003"]),
      numeros,
    );
    verificar("la secuencia va 1, 2, 3", JSON.stringify(numeros.map((n) => Number(n.slice(-9)))) === "[1,2,3]", numeros);
    verificar(
      "los números emitidos son únicos",
      new Set(numeros).size === numeros.length,
      numeros,
    );
    const persistidos = await e.recibos.getByPagoIds([1, 2, 3]);
    verificar("cada pago quedó con su recibo", persistidos.length === 3, persistidos.length);
    verificar(
      "el recibo guarda la forma de pago",
      persistidos.every((r) => r.forma_pago === "transferencia"),
      persistidos.map((r) => r.forma_pago),
    );
  }

  console.log("Duplicados: una cuota solo admite un pago y un recibo");
  {
    const e = crearEscenario();
    await e.confirmar.execute(entrada(10, 100));
    const error = await errorDe(() => e.confirmar.execute(entrada(10, 50)));
    verificar(
      "la segunda confirmación de la cuota se rechaza",
      error === "La cuota ya tiene un pago registrado",
      error,
    );
    const despues = await e.recibos.getByPagoIds([1, 2]);
    verificar("no se emitió un segundo recibo", despues.length === 1, despues.length);
    const siguiente = await e.confirmar.execute(entrada(11, 100));
    verificar(
      "el intento fallido no consumió número de secuencia",
      siguiente.recibo.numero_recibo === "001-001-000000002",
      siguiente.recibo.numero_recibo,
    );

    const errorPagada = await errorDe(() => e.confirmar.execute(entrada(90, 100)));
    verificar(
      "una cuota ya pagada se rechaza aunque no tenga pagos cargados",
      errorPagada === "La cuota ya tiene un pago registrado",
      errorPagada,
    );
    verificar("la cuota pagada no creó pagos", e.pagosCreados.length === 2, e.pagosCreados.length);
  }

  console.log("Configuración fiscal faltante");
  {
    const e = crearEscenario({ config: null, empresa: { razon_social: "TERRENOS DEL VALLE S.A.", ruc: undefined } });
    const error = await errorDe(() => e.confirmar.execute(entrada(10, 100)));
    verificar(
      "avisa qué dato fiscal falta completar",
      error === "Complete razón social, RUC y direcciones fiscales del proyecto antes de confirmar el pago",
      error,
    );
    verificar("no se creó el pago", e.pagosCreados.length === 0, e.pagosCreados.length);
    verificar(
      "la cuota sigue pendiente",
      e.estadoCobranza.get(10) === "pendiente",
      e.estadoCobranza.get(10),
    );
    verificar("no se emitió ningún recibo", (await e.recibos.getByPagoIds([1])).length === 0);

    // Corregido el dato fiscal, la emisión sale y usa el primer número:
    // el error no había reservado ninguno.
    e.setConfig(CONFIG_FISCAL);
    const { recibo } = await e.confirmar.execute(entrada(10, 100));
    verificar(
      "reintentado con la config completa usa el 001-001-000000001",
      recibo.numero_recibo === "001-001-000000001",
      recibo.numero_recibo,
    );
  }

  {
    const e = crearEscenario({ config: { ...CONFIG_FISCAL, codigo_establecimiento: "01" } });
    const error = await errorDe(() => e.confirmar.execute(entrada(10, 100)));
    verificar(
      "códigos de establecimiento/punto con menos de tres dígitos se rechazan",
      error === "Los códigos de establecimiento y punto de emisión deben contener tres dígitos",
      error,
    );
    verificar("no se creó el pago", e.pagosCreados.length === 0, e.pagosCreados.length);
  }

  console.log("Identificación del receptor");
  {
    const sinCedula = crearEscenario({ cedulaRuc: null });
    const { recibo: final } = await sinCedula.confirmar.execute(entrada(10, 100));
    verificar("sin cédula sale como consumidor final", final.receptor_tipo_identificacion === "07", final.receptor_tipo_identificacion);
    verificar(
      "la identificación de consumidor final es 9999999999999",
      final.receptor_identificacion === "9999999999999",
      final.receptor_identificacion,
    );
    verificar("el receptor se llama CONSUMIDOR FINAL", final.receptor_nombre === "CONSUMIDOR FINAL", final.receptor_nombre);

    const cedulaVacia = crearEscenario({ cedulaRuc: "   " });
    const { recibo: vacio } = await cedulaVacia.confirmar.execute(entrada(10, 100));
    verificar(
      "una cédula en blanco también cae en consumidor final",
      vacio.receptor_tipo_identificacion === "07" && vacio.receptor_identificacion === "9999999999999",
      vacio.receptor_identificacion,
    );

    const cedula = crearEscenario({ cedulaRuc: "1712345678" });
    const { recibo: rCedula } = await cedula.confirmar.execute(entrada(10, 100));
    verificar(
      "10 dígitos = cédula (05)",
      rCedula.receptor_tipo_identificacion === "05" && rCedula.receptor_identificacion === "1712345678",
      `${rCedula.receptor_tipo_identificacion} ${rCedula.receptor_identificacion}`,
    );

    const ruc = crearEscenario({ cedulaRuc: "0912345678001" });
    const { recibo: rRuc } = await ruc.confirmar.execute(entrada(10, 100));
    verificar(
      "13 dígitos = RUC (04)",
      rRuc.receptor_tipo_identificacion === "04" && rRuc.receptor_identificacion === "0912345678001",
      `${rRuc.receptor_tipo_identificacion} ${rRuc.receptor_identificacion}`,
    );

    const malformada = crearEscenario({ cedulaRuc: "171234567890" });
    const error = await errorDe(() => malformada.confirmar.execute(entrada(10, 100)));
    verificar(
      "una identificación de longitud rara se rechaza",
      error === "La identificación del cliente debe tener 10 dígitos, 13 dígitos o estar vacía",
      error,
    );
    verificar("no se creó el pago", malformada.pagosCreados.length === 0, malformada.pagosCreados.length);
  }

  console.log("Redondeo a centavos del IVA 15% incluido");
  {
    const casos: Array<[number, number, number]> = [
      [100, 86.96, 13.04],
      [99.99, 86.95, 13.04],
      [1234.56, 1073.53, 161.03],
      [0.01, 0.01, 0],
      [50, 43.48, 6.52],
    ];
    const e = crearEscenario();
    for (const [i, [monto, subtotalEsperado, ivaEsperado]] of casos.entries()) {
      const { recibo } = await e.confirmar.execute(entrada(10 + i, monto));
      verificar(
        `monto ${monto} → subtotal ${subtotalEsperado} + iva ${ivaEsperado}`,
        recibo.subtotal === subtotalEsperado && recibo.iva === ivaEsperado && recibo.total === monto,
        { subtotal: recibo.subtotal, iva: recibo.iva, total: recibo.total },
      );
      verificar(
        `monto ${monto} → subtotal + iva = total`,
        Math.round((recibo.subtotal + recibo.iva) * 100) === Math.round(recibo.total * 100),
        { subtotal: recibo.subtotal, iva: recibo.iva, total: recibo.total },
      );
      verificar(
        `monto ${monto} → todo en centavos exactos`,
        [recibo.subtotal, recibo.iva, recibo.total].every((v) => Number.isInteger(v * 100)),
        { subtotal: recibo.subtotal, iva: recibo.iva, total: recibo.total },
      );
    }

    const conExcedente = crearEscenario();
    const { recibo: redondeado, pago } = await conExcedente.confirmar.execute(entrada(10, 100.999));
    verificar("el monto se guarda redondeado a centavos", pago.monto_pagado === 101 && redondeado.total === 101, pago.monto_pagado);

    for (const invalido of [0, -5]) {
      const otro = crearEscenario();
      const error = await errorDe(() => otro.confirmar.execute(entrada(10, invalido)));
      verificar(
        `monto ${invalido} se rechaza sin dejar pago`,
        error === "El monto pagado debe ser mayor a cero" && otro.pagosCreados.length === 0,
        { error, pagos: otro.pagosCreados.length },
      );
    }
  }

  if (fallos > 0) {
    console.error(`\n${fallos} verificación(es) fallida(s)`);
    process.exit(1);
  }
  console.log("\nTodas las verificaciones pasaron");
}

await main();
