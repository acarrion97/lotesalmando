import type { Plan } from "@/domain/plan/entities";
import type { PlanRepository } from "@/domain/plan/repositories";

/** Mismos datos que siembra la migración 028, para el modo mock. */
const PLANES_INICIALES: Plan[] = [
  {
    id_plan: 1,
    clave: "basico",
    nombre: "Plan Basico",
    descripcion: "Para arrancar a gestionar tus proyectos, lotes y clientes desde un solo lugar.",
    imagen_url: null,
    url_checkout: "https://pay.hotmart.com/F108034424Q?off=4f5ovlpp",
    precio: 53,
    orden: 1,
    activo: true,
    es_unico: false,
    max_proyectos: 1,
    max_lotes_por_proyecto: 130,
    max_usuarios: 5,
  },
  {
    id_plan: 2,
    clave: "inicial",
    nombre: "Plan Inicial",
    descripcion: "Para equipos que ya venden: lleva ventas, cobranzas y seguimiento de clientes.",
    imagen_url: null,
    url_checkout: "https://pay.hotmart.com/F108034424Q?off=f1bgfuc5",
    precio: 89,
    orden: 2,
    activo: true,
    es_unico: false,
    max_proyectos: 3,
    max_lotes_por_proyecto: 250,
    max_usuarios: 10,
  },
  {
    id_plan: 3,
    clave: "avanzado",
    nombre: "Plan Avanzado",
    descripcion: "Todas las herramientas de la plataforma, incluida la proyeccion financiera.",
    imagen_url: null,
    url_checkout: "https://pay.hotmart.com/F108034424Q?off=zfoh74d7",
    precio: 129,
    orden: 3,
    activo: true,
    es_unico: false,
    max_proyectos: null,
    max_lotes_por_proyecto: null,
    max_usuarios: null,
  },
  {
    // Se vende por su pagina propia /registro/agente (no se lista en
    // /registro/planes).
    // Link de checkout de prueba: en produccion lo configura el superadmin
    // desde /planes.
    id_plan: 4,
    clave: "agente",
    nombre: "Plan Agentes",
    descripcion: "Para agentes e inmobiliarias que venden lotes: publica tu mapa, captura clientes y cobra tus comisiones.",
    imagen_url: null,
    url_checkout: "https://pay.hotmart.com/F108034424Q?off=4f5ovlpp",
    precio: 99,
    orden: 4,
    activo: true,
    es_unico: true,
    max_proyectos: null,
    max_lotes_por_proyecto: null,
    max_usuarios: null,
  },
];

export class MockPlanRepository implements PlanRepository {
  private data: Plan[] = [...PLANES_INICIALES];

  async getAll(): Promise<Plan[]> {
    return [...this.data].sort((a, b) => a.orden - b.orden);
  }

  async create(data: Omit<Plan, "id_plan">): Promise<Plan> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((p) => p.id_plan)) + 1 : 1;
    const plan: Plan = { ...data, id_plan: newId };
    this.data.push(plan);
    return plan;
  }

  async update(id: number, data: Partial<Plan>): Promise<Plan> {
    const index = this.data.findIndex((p) => p.id_plan === id);
    if (index === -1) throw new Error(`Plan ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_plan: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((p) => p.id_plan !== id);
  }
}
