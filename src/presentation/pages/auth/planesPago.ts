import type { PlanDto } from "@/application/plan/dto/PlanDto";

/**
 * Planes "de respaldo": la fuente de verdad es la tabla `plan`
 * (administrada desde /planes por el superadmin, migración 028).
 * Estas constantes se usan solo como fallback si la tabla está vacía
 * (por ejemplo, modo mock o si la migración no se corrió).
 */
export interface PlanPago {
  id: string;
  nombre: string;
  descripcion: string;
  /** Precio mensual en USD (se muestra en la pagina de eleccion). */
  precio: number;
  urlCheckout: string;
}

export const PLANES_PAGO: PlanPago[] = [
  {
    id: "basico",
    nombre: "Plan Basico",
    descripcion: "Para arrancar a gestionar tus proyectos, lotes y clientes desde un solo lugar.",
    precio: 53,
    urlCheckout: "https://pay.hotmart.com/F108034424Q?off=4f5ovlpp",
  },
  {
    id: "inicial",
    nombre: "Plan Inicial",
    descripcion: "Para equipos que ya venden: lleva ventas, cobranzas y seguimiento de clientes.",
    precio: 89,
    urlCheckout: "https://pay.hotmart.com/F108034424Q?off=f1bgfuc5",
  },
  {
    id: "avanzado",
    nombre: "Plan Avanzado",
    descripcion: "Todas las herramientas de la plataforma, incluida la proyeccion financiera.",
    precio: 129,
    urlCheckout: "https://pay.hotmart.com/F108034424Q?off=zfoh74d7",
  },
];

/** Fallback en el mismo formato que devuelve la BD, para la pagina publica. */
export const PLANES_FALLBACK: PlanDto[] = PLANES_PAGO.map((p, i) => ({
  id_plan: 0,
  clave: p.id,
  nombre: p.nombre,
  descripcion: p.descripcion,
  imagen_url: null,
  url_checkout: p.urlCheckout,
  precio: p.precio,
  orden: i + 1,
  activo: true,
  es_unico: false,
  max_proyectos: null,
  max_lotes_por_proyecto: null,
  max_usuarios: null,
}));
