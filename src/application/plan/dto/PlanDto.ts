export interface PlanDto {
  id_plan: number;
  clave: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  url_checkout: string | null;
  /** Precio mensual en USD. NULL = no se muestra. */
  precio: number | null;
  orden: number;
  activo: boolean;
  /** Limites por plan. NULL = sin limite. */
  max_proyectos: number | null;
  max_lotes_por_proyecto: number | null;
  max_usuarios: number | null;
}
