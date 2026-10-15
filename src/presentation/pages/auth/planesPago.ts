export type PlanId = "basico" | "inicial" | "avanzado";

export interface PlanPago {
  /** Valor que se guarda en `empresa.plan`. */
  id: PlanId;
  nombre: string;
  descripcion: string;
  /** Checkout de Hotmart (link de afiliado con el descuento aplicado). */
  urlCheckout: string;
}

// Links oficiales de pago en Hotmart. Si cambian, se actualizan aca.
export const PLANES_PAGO: PlanPago[] = [
  {
    id: "basico",
    nombre: "Plan Basico",
    descripcion: "Para arrancar a gestionar tus proyectos, lotes y clientes desde un solo lugar.",
    urlCheckout: "https://pay.hotmart.com/F108034424Q?off=4f5ovlpp",
  },
  {
    id: "inicial",
    nombre: "Plan Inicial",
    descripcion: "Para equipos que ya venden: lleva ventas, cobranzas y seguimiento de clientes.",
    urlCheckout: "https://pay.hotmart.com/F108034424Q?off=f1bgfuc5",
  },
  {
    id: "avanzado",
    nombre: "Plan Avanzado",
    descripcion: "Todas las herramientas de la plataforma, incluida la proyeccion financiera.",
    urlCheckout: "https://pay.hotmart.com/F108034424Q?off=zfoh74d7",
  },
];
