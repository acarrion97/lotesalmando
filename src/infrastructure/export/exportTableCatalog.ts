/**
 * Catálogo de tablas habilitadas para generar plantillas de exportación.
 *
 * `database.types.ts` sólo existe en tiempo de compilación (son tipos de TypeScript
 * que desaparecen del bundle), así que estos metadatos son la fuente de verdad en
 * runtime para saber qué cabeceras debe tener el XLSX/CSV de cada tabla.
 *
 * Si agregás una tabla a la BD, sumala acá para que aparezca en el wizard.
 */

export type TipoColumnaExport = "texto" | "numero" | "entero" | "fecha" | "moneda";

export interface ColumnaExport {
  /** Nombre exacto de la columna en la base de datos. */
  key: string;
  /** Etiqueta legible que se muestra en el wizard. */
  etiqueta: string;
  tipo: TipoColumnaExport;
  /** Obligatoria al insertar (no admite null ni tiene default). */
  requerida: boolean;
  /** Tabla referenciada por la clave foránea. */
  fk?: string;
  /** Columna técnica (id_ propio, created_at, updated_at): fuera de la plantilla por defecto. */
  sistema?: boolean;
  /** Se resuelve con la empresa seleccionada: no debe venir en el archivo. */
  empresaActual?: boolean;
  /** Valor de ejemplo que se escribe en la fila 2 de la plantilla. */
  ejemplo?: string;
  /** Aclaración que se muestra junto a la columna. */
  nota?: string;
}

export interface TablaExport {
  tabla: string;
  etiqueta: string;
  descripcion: string;
  columnas: ColumnaExport[];
}

/** Una celda del archivo: a qué columna llega y con qué cabecera. */
export interface MapeoColumna {
  /** Columna real de la tabla destino. */
  columna: string;
  /** Texto de la cabecera en la primera fila del archivo. */
  cabecera: string;
}

const c = (
  key: string,
  etiqueta: string,
  tipo: TipoColumnaExport,
  extra: Partial<ColumnaExport> = {},
): ColumnaExport => ({ key, etiqueta, tipo, requerida: false, ...extra });

export const EXPORT_TABLES: TablaExport[] = [
  {
    tabla: "proyectos",
    etiqueta: "Proyectos",
    descripcion: "Proyectos de lotización de la empresa.",
    columnas: [
      c("id_proyecto", "Proyecto", "entero", { sistema: true }),
      c("id_empresa", "Empresa", "entero", {
        requerida: true,
        empresaActual: true,
        nota: "Se completa con la empresa seleccionada.",
      }),
      c("nombre", "Nombre", "texto", { requerida: true, ejemplo: "Residencial Las Palmas" }),
    ],
  },
  {
    tabla: "etapas",
    etiqueta: "Etapas",
    descripcion: "Etapas de cada proyecto.",
    columnas: [
      c("id_etapa", "Etapa", "entero", { sistema: true }),
      c("id_proyecto", "Proyecto", "entero", {
        requerida: true,
        fk: "proyectos",
        ejemplo: "1",
      }),
      c("nombre", "Nombre", "texto", { requerida: true, ejemplo: "Etapa 1" }),
      c("orden", "Orden", "entero", { ejemplo: "1" }),
    ],
  },
  {
    tabla: "manzana_bloque",
    etiqueta: "Manzanas / Bloques",
    descripcion: "Manzanas o bloques dentro de cada etapa.",
    columnas: [
      c("id_manzana", "Manzana", "entero", { sistema: true }),
      c("id_etapa", "Etapa", "entero", { requerida: true, fk: "etapas", ejemplo: "1" }),
      c("nombre_codigo", "Código", "texto", { ejemplo: "MZ-A" }),
    ],
  },
  {
    tabla: "lotes",
    etiqueta: "Lotes",
    descripcion: "Lotes de cada manzana.",
    columnas: [
      c("id_lote", "Lote", "entero", { sistema: true }),
      c("id_manzana", "Manzana", "entero", {
        requerida: true,
        fk: "manzana_bloque",
        ejemplo: "1",
      }),
      c("numero_lote", "Número de lote", "texto", { requerida: true, ejemplo: "01" }),
      c("precio_lista", "Precio de lista", "moneda", { ejemplo: "15000" }),
      c("estado", "Estado", "texto", {
        ejemplo: "Disponible",
        nota: "Ej.: Disponible, Reservado, Vendido.",
      }),
    ],
  },
  {
    tabla: "cliente",
    etiqueta: "Clientes",
    descripcion: "Clientes que compran o cotizan.",
    columnas: [
      c("id_cliente", "Cliente", "entero", { sistema: true }),
      c("nombres", "Nombres", "texto", { requerida: true, ejemplo: "María Pérez" }),
      c("cedula_ruc", "Cédula / RUC", "texto", { ejemplo: "1712345678" }),
      c("email", "Correo", "texto", { ejemplo: "maria@correo.com" }),
    ],
  },
  {
    tabla: "prospectos",
    etiqueta: "Prospectos",
    descripcion: "Leads captados por los asesores.",
    columnas: [
      c("id_prospecto", "Prospecto", "entero", { sistema: true }),
      c("id_empresa", "Empresa", "entero", {
        requerida: true,
        empresaActual: true,
        nota: "Se completa con la empresa seleccionada.",
      }),
      c("id_asesor", "Asesor", "entero", { fk: "asesores", ejemplo: "1" }),
      c("nombres", "Nombres", "texto", { requerida: true, ejemplo: "Juan Salazar" }),
      c("email", "Correo", "texto", { ejemplo: "juan@correo.com" }),
      c("telefono", "Teléfono", "texto", { ejemplo: "0991234567" }),
      c("origen", "Origen", "texto", {
        ejemplo: "Referido",
        nota: "Ej.: Referido, Publicidad, Web.",
      }),
      c("estado", "Estado", "texto", {
        ejemplo: "Nuevo",
        nota: "Ej.: Nuevo, Contactado, Calificado.",
      }),
      c("notas", "Notas", "texto", { ejemplo: "Prefiere lote esquinero" }),
      c("fecha_ultimo_seguimiento", "Último seguimiento", "fecha", {
        ejemplo: "2026-09-30",
        nota: "Formato AAAA-MM-DD.",
      }),
      c("created_at", "Creado el", "fecha", { sistema: true }),
      c("updated_at", "Actualizado el", "fecha", { sistema: true }),
    ],
  },
  {
    tabla: "asesores",
    etiqueta: "Asesores",
    descripcion: "Equipo comercial de la empresa.",
    columnas: [
      c("id_asesor", "Asesor", "entero", { sistema: true }),
      c("id_empresa", "Empresa", "entero", {
        requerida: true,
        empresaActual: true,
        nota: "Se completa con la empresa seleccionada.",
      }),
      c("id_usuario", "Usuario", "entero", {
        fk: "usuario",
        ejemplo: "1",
        nota: "Cuenta del sistema que usa el asesor.",
      }),
      c("codigo", "Código", "texto", { requerida: true, ejemplo: "AS-01" }),
      c("nombre_comercial", "Nombre comercial", "texto", {
        requerida: true,
        ejemplo: "Juan Vendedez",
      }),
      c("meta_ventas_mensual", "Meta mensual", "moneda", { ejemplo: "50000" }),
      c("estado", "Estado", "texto", { ejemplo: "Activo" }),
      c("created_at", "Creado el", "fecha", { sistema: true }),
    ],
  },
  {
    tabla: "cotizador",
    etiqueta: "Cotizaciones",
    descripcion: "Cotizaciones de lotes a clientes.",
    columnas: [
      c("id_cotizacion", "Cotización", "entero", { sistema: true }),
      c("id_cliente", "Cliente", "entero", { requerida: true, fk: "cliente", ejemplo: "1" }),
      c("id_lote", "Lote", "entero", { requerida: true, fk: "lotes", ejemplo: "1" }),
      c("precio_ofertado", "Precio ofertado", "moneda", {
        requerida: true,
        ejemplo: "14500",
      }),
      c("id_asesor", "Asesor", "entero", {
        fk: "asesores",
        ejemplo: "1",
        nota: "Vacío si la cotización no la registró un asesor.",
      }),
      c("monto_entrada", "Entrada", "moneda", {
        ejemplo: "10000",
        nota: "Debe ser menor al precio ofertado.",
      }),
      c("num_cuotas", "Número de cuotas", "entero", {
        ejemplo: "12",
        nota: "Mínimo 1; el plan de cuotas se genera al aceptar.",
      }),
      c("estado", "Estado", "texto", {
        ejemplo: "Pendiente",
        nota: 'No se puede importar como "aceptada": la aceptación crea la venta.',
      }),
    ],
  },
  {
    tabla: "ventas",
    etiqueta: "Ventas",
    descripcion: "Ventas confirmadas de lotes.",
    columnas: [
      c("id_venta", "Venta", "entero", { sistema: true }),
      c("id_cliente", "Cliente", "entero", { requerida: true, fk: "cliente", ejemplo: "1" }),
      c("id_lote", "Lote", "entero", { requerida: true, fk: "lotes", ejemplo: "1" }),
      c("id_cotizacion", "Cotización", "entero", { fk: "cotizador", ejemplo: "1" }),
      c("id_usuario", "Usuario", "entero", {
        requerida: true,
        fk: "usuario",
        ejemplo: "1",
        nota: "Usuario que registra la venta.",
      }),
      c("precio_final", "Precio final", "moneda", { requerida: true, ejemplo: "15000" }),
      c("estado", "Estado", "texto", { ejemplo: "Confirmada" }),
      c("id_asesor", "Asesor", "entero", {
        fk: "asesores",
        ejemplo: "1",
        nota: "Se hereda de la cotización que originó la venta.",
      }),
      c("created_at", "Creado el", "fecha", { sistema: true }),
    ],
  },
  {
    tabla: "contratos",
    etiqueta: "Contratos",
    descripcion: "Contratos asociados a una venta.",
    columnas: [
      c("id_contrato", "Contrato", "entero", { sistema: true }),
      c("id_venta", "Venta", "entero", { requerida: true, fk: "ventas", ejemplo: "1" }),
      c("numero_contrato", "Número de contrato", "texto", {
        requerida: true,
        ejemplo: "CT-2026-001",
      }),
      c("monto_total", "Monto total", "moneda", { requerida: true, ejemplo: "45000" }),
      c("created_at", "Creado el", "fecha", { sistema: true }),
    ],
  },
  {
    tabla: "cobranzas",
    etiqueta: "Cobranzas",
    descripcion: "Cuotas de cobro de cada contrato.",
    columnas: [
      c("id_cobranza", "Cobranza", "entero", { sistema: true }),
      c("id_contrato", "Contrato", "entero", {
        requerida: true,
        fk: "contratos",
        ejemplo: "1",
      }),
      c("numero_cuota", "N° de cuota", "entero", { requerida: true, ejemplo: "1" }),
      c("monto_cuota", "Monto de la cuota", "moneda", { requerida: true, ejemplo: "500" }),
      c("fecha_vencimiento", "Vencimiento", "fecha", {
        requerida: true,
        ejemplo: "2026-10-15",
        nota: "Formato AAAA-MM-DD.",
      }),
      c("estado", "Estado", "texto", {
        ejemplo: "Pendiente",
        nota: "Ej.: Pendiente, Pagada, Vencida.",
      }),
      c("created_at", "Creado el", "fecha", { sistema: true }),
    ],
  },
  {
    tabla: "pagos",
    etiqueta: "Pagos",
    descripcion: "Pagos recibidos sobre una cuota.",
    columnas: [
      c("id_pago", "Pago", "entero", { sistema: true }),
      c("id_cobranza", "Cobranza", "entero", {
        requerida: true,
        fk: "cobranzas",
        ejemplo: "1",
      }),
      c("id_usuario", "Usuario", "entero", {
        requerida: true,
        fk: "usuario",
        ejemplo: "1",
        nota: "Usuario que registra el pago.",
      }),
      c("monto_pagado", "Monto pagado", "moneda", { requerida: true, ejemplo: "500" }),
      c("fecha_pago", "Fecha de pago", "fecha", {
        requerida: true,
        ejemplo: "2026-09-30",
        nota: "Formato AAAA-MM-DD.",
      }),
    ],
  },
  {
    tabla: "inventario",
    etiqueta: "Inventario de lotes",
    descripcion: "Movimientos de estado de los lotes.",
    columnas: [
      c("id_inventario", "Movimiento", "entero", { sistema: true }),
      c("id_lote", "Lote", "entero", { requerida: true, fk: "lotes", ejemplo: "1" }),
      c("id_usuario", "Usuario", "entero", {
        requerida: true,
        fk: "usuario",
        ejemplo: "1",
        nota: "Usuario que ejecuta el cambio.",
      }),
      c("estado_anterior", "Estado anterior", "texto", { ejemplo: "Disponible" }),
      c("estado_nuevo", "Estado nuevo", "texto", { ejemplo: "Reservado" }),
    ],
  },
  {
    tabla: "oportunidades",
    etiqueta: "Oportunidades",
    descripcion: "Oportunidades de venta sobre un prospecto.",
    columnas: [
      c("id_oportunidad", "Oportunidad", "entero", { sistema: true }),
      c("id_empresa", "Empresa", "entero", {
        requerida: true,
        empresaActual: true,
        nota: "Se completa con la empresa seleccionada.",
      }),
      c("id_prospecto", "Prospecto", "entero", {
        requerida: true,
        fk: "prospectos",
        ejemplo: "1",
      }),
      c("id_lote", "Lote", "entero", { fk: "lotes", ejemplo: "1" }),
      c("etapa", "Etapa", "texto", {
        ejemplo: "Calificado",
        nota: "Ej.: Nuevo, Calificado, Negociación.",
      }),
      c("valor_estimado", "Valor estimado", "moneda", { ejemplo: "15000" }),
      c("notas", "Notas", "texto", { ejemplo: "Quiere financiamiento" }),
      c("created_at", "Creado el", "fecha", { sistema: true }),
      c("updated_at", "Actualizado el", "fecha", { sistema: true }),
    ],
  },
  {
    tabla: "actividades",
    etiqueta: "Actividades",
    descripcion: "Seguimientos y llamadas de los prospectos.",
    columnas: [
      c("id_actividad", "Actividad", "entero", { sistema: true }),
      c("id_prospecto", "Prospecto", "entero", {
        requerida: true,
        fk: "prospectos",
        ejemplo: "1",
      }),
      c("id_usuario", "Usuario", "entero", {
        fk: "usuario",
        ejemplo: "1",
        nota: "Usuario que registra la actividad.",
      }),
      c("tipo", "Tipo", "texto", {
        requerida: true,
        ejemplo: "Llamada",
        nota: "Ej.: Llamada, Correo, Visita.",
      }),
      c("descripcion", "Descripción", "texto", { ejemplo: "Primera llamada de contacto" }),
      c("fecha_actividad", "Fecha", "fecha", {
        ejemplo: "2026-09-30",
        nota: "Formato AAAA-MM-DD.",
      }),
      c("created_at", "Creado el", "fecha", { sistema: true }),
    ],
  },
];

export function getTablaExport(tabla: string | null): TablaExport | null {
  if (!tabla) return null;
  return EXPORT_TABLES.find((t) => t.tabla === tabla) ?? null;
}

/** Columnas que vienen por defecto en la plantilla (sin técnicas ni de empresa). */
export function columnasPorDefecto(tabla: TablaExport): MapeoColumna[] {
  return tabla.columnas
    .filter((col) => !col.sistema && !col.empresaActual)
    .map((col) => ({ columna: col.key, cabecera: col.key }));
}

/** Valor de ejemplo de una columna (fila 2 de la plantilla). */
export function ejemploColumna(tabla: TablaExport, columna: string): string {
  return tabla.columnas.find((c) => c.key === columna)?.ejemplo ?? "";
}

/** Obligatorias que el usuario no debe omitir en la plantilla. */
export function columnasObligatoriasFaltantes(
  tabla: TablaExport,
  mapeo: MapeoColumna[],
): ColumnaExport[] {
  const elegidas = new Set(mapeo.map((m) => m.columna));
  return tabla.columnas.filter(
    (col) => col.requerida && !col.sistema && !col.empresaActual && !elegidas.has(col.key),
  );
}
