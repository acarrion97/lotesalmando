/**
 * Configuración central de autorización.
 *
 * El frontend NO inventa reglas por rol: lee los permisos que vienen de la BD
 * (`usuario_rol` -> `rol_permiso` -> `permiso.nombre_permiso`, sembrados en la
 * migración 024) y los contrasta contra los nombres declarados acá.
 *
 * Así, cambiar qué ve un rol es un asunto de datos (tabla `rol_permiso`), no de
 * volver a desplegar el front. Estos nombres deben coincidir con los de la
 * migración 024_permisos_por_modulo.sql.
 */

/** Permiso que otorga acceso a una ruta/menú dado. `null` = siempre visible. */
export interface RutaAuth {
  /** Ruta exacta o prefijo de ruta (ej: "/cotizaciones/nueva"). */
  ruta: string;
  /** Permiso requerido para verla; null si no requiere permiso. */
  permiso: string | null;
}

/**
 * Menú lateral y rutas protegidas, en un solo lugar, para que el Sidebar y el
 * router nunca se desincronicen. El orden define el orden del menú.
 */
export interface ItemMenuAuth {
  key: string;
  label: string;
  /** Permiso de "ver" del módulo. El ítem se oculta si el usuario no lo tiene. */
  permiso: string | null;
  /** Sub-rutas asociadas que comparten el mismo permiso (para breadcrumbs/rutas). */
  rutas?: string[];
}

export const MODULOS: ItemMenuAuth[] = [
  { key: "/dashboard", label: "Dashboard", permiso: "ver_dashboard" },
  // Inventario
  { key: "/proyectos", label: "Proyectos", permiso: "ver_proyectos" },
  { key: "/etapas", label: "Etapas", permiso: "ver_etapas" },
  { key: "/manzanas", label: "Manzanas", permiso: "ver_manzanas" },
  { key: "/lotes", label: "Lotes", permiso: "ver_lotes" },
  { key: "/reservas", label: "Reservas", permiso: "ver_lotes" },
  { key: "/mapas", label: "Mapas", permiso: "ver_mapas" },
  // Comercial
  { key: "/clientes", label: "Clientes", permiso: "ver_clientes" },

  { key: "/ventas", label: "Ventas", permiso: "ver_ventas" },
  { key: "/prospectos", label: "Prospectos", permiso: "ver_prospectos" },
  { key: "/asesores", label: "Asesores", permiso: "ver_asesores" },
  // Financiero
  { key: "/contratos", label: "Contratos", permiso: "ver_contratos" },
  { key: "/cobranzas", label: "Cobranzas", permiso: "ver_cobranzas" },
  { key: "/pagos", label: "Pagos", permiso: "ver_pagos" },
  { key: "/proyeccion", label: "Proyección", permiso: "ver_proyeccion" },
  // Inteligencia
  { key: "/alertas", label: "Mando IA", permiso: "ver_alertas" },
  { key: "/reportes", label: "Reportes", permiso: "ver_reportes" },
  // Administración
  { key: "/usuarios", label: "Usuarios", permiso: "ver_usuarios" },
  { key: "/configuracion", label: "Configuracion", permiso: "ver_configuracion" },
  { key: "/suscripcion", label: "Suscripción", permiso: "ver_configuracion" },
  // Sistema (Superusuario / gestión de acceso)
  { key: "/roles-permisos", label: "Roles y Permisos", permiso: "ver_roles" },
  // Plataforma (Superusuario / tenant-level)
  { key: "/plataforma", label: "Plataforma", permiso: "ver_plataforma" },
  { key: "/empresas", label: "Empresas", permiso: "ver_empresas" },
  { key: "/planes", label: "Planes", permiso: "ver_planes" },
  { key: "/partnerships", label: "Partners", permiso: "ver_partnerships" },
];

/** Estructura de grupos del menú lateral (para renderizar secciones). */
export interface GrupoMenu {
  /** Clave del grupo; coincide con el `key` de un ítem o un identificador propio. */
  key: string;
  /** Etiqueta de sección en mayúsculas; null para ítems sueltos. */
  groupLabel: string | null;
  /** Claves de los módulos que pertenecen a este grupo. */
  items: string[];
}

export const GRUPOS_MENU: GrupoMenu[] = [
  { key: "inventario", groupLabel: "INVENTARIO", items: ["/proyectos", "/etapas", "/manzanas", "/lotes","/mapas"] },
  { key: "comercial", groupLabel: "COMERCIAL", items: ["/clientes", "/reservas", "/ventas", "/prospectos", "/asesores"] },
  { key: "financiero", groupLabel: "FINANCIERO", items: ["/contratos", "/cobranzas", "/pagos", "/proyeccion"] },
  { key: "ia", groupLabel: "INTELIGENCIA", items: ["/alertas", "/reportes"] },
  { key: "administracion", groupLabel: "ADMINISTRACION", items: ["/usuarios", "/configuracion", "/suscripcion", "/roles-permisos"] },
  { key: "plataforma", groupLabel: "PLATAFORMA", items: ["/plataforma", "/empresas", "/planes", "/partnerships"] },
];

/**
 * Ítems sueltos (sin grupo) que van antes de los grupos, en el orden del menú.
 */
export const ITEMS_SUELTOS: string[] = ["/dashboard"];

const permisoDeRuta = new Map<string, string | null>();
for (const item of MODULOS) {
  permisoDeRuta.set(item.key, item.permiso);
  for (const ruta of item.rutas ?? []) {
    permisoDeRuta.set(ruta, item.permiso);
  }
}

/**
 * Permiso requerido para acceder a una ruta dada. Busca el prefijo más largo
 * que coincida para cubrir sub-rutas (ej: "/cotizaciones/nueva" -> permiso de
 * cotizaciones). Devuelve `null` si la ruta no está declarada (se considera
 * pública dentro del layout autenticado) o si no exige permiso.
 */
export function permisoParaRuta(pathname: string): string | null {
  // Coincidencia exacta primero.
  if (permisoDeRuta.has(pathname)) {
    return permisoDeRuta.get(pathname) ?? null;
  }
  // Luego por prefijo, para sub-rutas.
  let mejor: string | null = null;
  let mejorLargo = -1;
  for (const [ruta, permiso] of permisoDeRuta) {
    if (ruta !== "/" && (pathname === ruta || pathname.startsWith(ruta + "/"))) {
      if (ruta.length > mejorLargo) {
        mejorLargo = ruta.length;
        mejor = permiso;
      }
    }
  }
  return mejor;
}
