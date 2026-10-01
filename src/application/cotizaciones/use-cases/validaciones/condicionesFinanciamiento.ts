interface CondicionesFinanciamiento {
  precio_ofertado: number;
  monto_entrada: number;
  num_cuotas: number;
}

/**
 * Reglas compartidas de entrada y número de cuotas (spec
 * `cotizaciones/plan-de-pago`). Se usan al crear y al editar una
 * cotización; la base de datos las refuerza con CHECK y la RPC las
 * vuelve a validar antes de generar la venta.
 */
export function validarCondicionesFinanciamiento(condiciones: CondicionesFinanciamiento): void {
  const { precio_ofertado, monto_entrada, num_cuotas } = condiciones;

  if (monto_entrada < 0) {
    throw new Error("La entrada no puede ser negativa");
  }
  if (monto_entrada >= precio_ofertado) {
    throw new Error("La entrada debe ser menor al precio ofertado");
  }
  if (!Number.isInteger(num_cuotas) || num_cuotas < 1) {
    throw new Error("El número de cuotas debe ser al menos 1");
  }
}
