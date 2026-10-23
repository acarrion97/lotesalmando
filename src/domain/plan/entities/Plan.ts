/**
 * Plan de pago de la plataforma (tabla `plan`).
 * `clave` es el identificador estable que se guarda en `empresa.plan`
 * ('basico' | 'inicial' | 'avanzado' | los que se agreguen).
 */
export interface Plan {
  id_plan: number;
  clave: string;
  nombre: string;
  descripcion: string | null;
  /** URL publica de la imagen del plan (storage `planes`), si tiene. */
  imagen_url: string | null;
  /** Link de checkout de Hotmart. */
  url_checkout: string | null;
  /** Precio mensual en USD. NULL = no se muestra en la pagina de planes. */
  precio: number | null;
  /** Position de presentacion (menor = primero). */
  orden: number;
  /** Los inactivos no se muestran en la pagina publica de eleccion. */
  activo: boolean;
  /**
   * Plan "unico": se vende por su propia pagina de registro
   * (/registro/<clave>, p. ej. /registro/agente) con pago directo, y NO se
   * lista en /registro/planes. Cualquier plan con true sigue esta logica.
   */
  es_unico: boolean;
  /** Limites por plan. NULL = sin limite. */
  max_proyectos: number | null;
  max_lotes_por_proyecto: number | null;
  max_usuarios: number | null;
}
