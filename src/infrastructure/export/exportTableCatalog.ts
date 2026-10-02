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
  /**
   * Cabecera que se usa en la plantilla para una clave foránea: en vez del id
   * numérico se escribe la clave del registro referenciado (ej. `etapa` en
   * lugar de `id_etapa`).
   */
  cabeceraAjena?: string;
}

export interface TablaExport {
  tabla: string;
  etiqueta: string;
  descripcion: string;
  columnas: ColumnaExport[];
  /**
   * Columnas que identifican un registro sin repetirse (en orden). Se usan para
   * referenciar filas desde otras tablas y para detectar duplicados: si una
   * columna es clave foránea, se escribe la clave del registro padre.
   *
   * Ej.: etapas -> [id_proyecto, nombre] => "Residencial Las Palmas / Etapa 1".
   * Sin clave natural, la tabla se referencia sólo por su id numérico.
   */
  claveNatural?: string[];
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
    claveNatural: ["nombre"],
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
    claveNatural: ["id_proyecto", "nombre"],
    columnas: [
      c("id_etapa", "Etapa", "entero", { sistema: true }),
      c("id_proyecto", "Proyecto", "entero", {
        requerida: true,
        fk: "proyectos",
        cabeceraAjena: "proyecto",
      }),
      c("nombre", "Nombre", "texto", { requerida: true, ejemplo: "Etapa 1" }),
      c("orden", "Orden", "entero", { ejemplo: "1" }),
    ],
  },
  {
    tabla: "manzana_bloque",
    etiqueta: "Manzanas / Bloques",
    descripcion: "Manzanas o bloques dentro de cada etapa.",
    claveNatural: ["id_etapa", "nombre_codigo"],
    columnas: [
      c("id_manzana", "Manzana", "entero", { sistema: true }),
      c("id_etapa", "Etapa", "entero", {
        requerida: true,
        fk: "etapas",
        cabeceraAjena: "etapa",
      }),
      c("nombre_codigo", "Código", "texto", { ejemplo: "MZ-A" }),
    ],
  },
  {
    tabla: "lotes",
    etiqueta: "Lotes",
    descripcion: "Lotes de cada manzana.",
    claveNatural: ["id_manzana", "numero_lote"],
    columnas: [
      c("id_lote", "Lote", "entero", { sistema: true }),
      c("id_manzana", "Manzana", "entero", {
        requerida: true,
        fk: "manzana_bloque",
        cabeceraAjena: "manzana",
      }),
      c("numero_lote", "Número de lote", "texto", { requerida: true, ejemplo: "01" }),
      c("precio_lista", "Precio de lista", "moneda", { ejemplo: "15000" }),
      c("estado", "Estado", "texto", {
        ejemplo: "Disponible",
        nota: "Ej.: Disponible, Reservado, Vendido.",
      }),
      c("superficie_m2", "Superficie (m²)", "numero", { ejemplo: "144" }),
      c("codigo_catastral", "Código catastral", "texto", {
        ejemplo: "17659",
        nota: "Único en todo el proyecto.",
      }),
      c("medidas", "Medidas", "texto", { ejemplo: "8,00 x 18,00" }),
    ],
  },
  {
    tabla: "cliente",
    etiqueta: "Clientes",
    descripcion: "Clientes que compran o cotizan.",
    claveNatural: ["nombres", "cedula_ruc"],
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
    claveNatural: ["nombres"],
    columnas: [
      c("id_prospecto", "Prospecto", "entero", { sistema: true }),
      c("id_empresa", "Empresa", "entero", {
        requerida: true,
        empresaActual: true,
        nota: "Se completa con la empresa seleccionada.",
      }),
      c("id_asesor", "Asesor", "entero", { fk: "asesores", cabeceraAjena: "asesor" }),
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
    claveNatural: ["codigo"],
    columnas: [
      c("id_asesor", "Asesor", "entero", { sistema: true }),
      c("id_empresa", "Empresa", "entero", {
        requerida: true,
        empresaActual: true,
        nota: "Se completa con la empresa seleccionada.",
      }),
      c("id_usuario", "Usuario", "entero", {
        requerida: false,
        fk: "usuario",
        cabeceraAjena: "usuario",
        nota: "Cuenta del sistema que usa el asesor (id o correo).",
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
    claveNatural: ["id_cliente", "id_lote"],
    columnas: [
      c("id_cotizacion", "Cotización", "entero", { sistema: true }),
      c("id_cliente", "Cliente", "entero", {
        requerida: true,
        fk: "cliente",
        cabeceraAjena: "cliente",
      }),
      c("id_lote", "Lote", "entero", { requerida: true, fk: "lotes", cabeceraAjena: "lote" }),
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
    claveNatural: ["id_cliente", "id_lote"],
    columnas: [
      c("id_venta", "Venta", "entero", { sistema: true }),
      c("id_cliente", "Cliente", "entero", {
        requerida: true,
        fk: "cliente",
        cabeceraAjena: "cliente",
      }),
      c("id_lote", "Lote", "entero", { requerida: true, fk: "lotes", cabeceraAjena: "lote" }),
      c("id_cotizacion", "Cotización", "entero", {
        fk: "cotizador",
        cabeceraAjena: "cotizacion",
      }),
      c("id_usuario", "Usuario", "entero", {
        requerida: true,
        fk: "usuario",
        cabeceraAjena: "usuario",
        nota: "Usuario que registra la venta (id o correo).",
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
    claveNatural: ["numero_contrato"],
    columnas: [
      c("id_contrato", "Contrato", "entero", { sistema: true }),
      c("id_venta", "Venta", "entero", {
        requerida: true,
        fk: "ventas",
        cabeceraAjena: "venta",
      }),
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
    claveNatural: ["id_contrato", "numero_cuota"],
    columnas: [
      c("id_cobranza", "Cobranza", "entero", { sistema: true }),
      c("id_contrato", "Contrato", "entero", {
        requerida: true,
        fk: "contratos",
        cabeceraAjena: "contrato",
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
        cabeceraAjena: "cobranza",
      }),
      c("id_usuario", "Usuario", "entero", {
        requerida: true,
        fk: "usuario",
        cabeceraAjena: "usuario",
        nota: "Usuario que registra el pago (id o correo).",
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
      c("id_lote", "Lote", "entero", { requerida: true, fk: "lotes", cabeceraAjena: "lote" }),
      c("id_usuario", "Usuario", "entero", {
        requerida: true,
        fk: "usuario",
        cabeceraAjena: "usuario",
        nota: "Usuario que ejecuta el cambio (id o correo).",
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
        cabeceraAjena: "prospecto",
      }),
      c("id_lote", "Lote", "entero", { fk: "lotes", cabeceraAjena: "lote" }),
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
        cabeceraAjena: "prospecto",
      }),
      c("id_usuario", "Usuario", "entero", {
        fk: "usuario",
        cabeceraAjena: "usuario",
        nota: "Usuario que registra la actividad (id o correo).",
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

/** Separador de los componentes de una clave natural compuesta (ej. " / "). */
export const SEPARADOR_CLAVE = " / ";

/**
 * Tablas que se pueden referenciar desde otras pero que no se importan ni se
 * exportan (no forman parte de `EXPORT_TABLES`): sólo se resuelven por id o por
 * las columnas declaradas acá.
 */
export const TABLAS_FUERA_CATALOGO: Record<string, { pk: string; claves: string[] }> = {
  usuario: { pk: "id_usuario", claves: ["email"] },
};

export function getTablaExport(tabla: string | null): TablaExport | null {
  if (!tabla) return null;
  return EXPORT_TABLES.find((t) => t.tabla === tabla) ?? null;
}

/** Minúsculas, sin acentos ni símbolos: `Cédula / RUC` -> `cedula_ruc`. */
export function normalizarClave(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Columna de clave primaria de la tabla (el `id_` propio, que no es foráneo). */
export function clavePrimaria(tabla: TablaExport): string | null {
  const col = tabla.columnas.find((c) => c.sistema && !c.fk && c.key.startsWith("id_"));
  return col?.key ?? null;
}

/** Cabecera por defecto en la plantilla: para una FK, la clave del padre. */
export function cabeceraPorDefecto(col: ColumnaExport): string {
  return col.cabeceraAjena ?? col.key;
}

export interface DefinicionTabla {
  /** Catálogo de la tabla, o null si está fuera de él (ej. `usuario`). */
  tabla: TablaExport | null;
  /** Clave primaria, si se conoce. */
  pk: string | null;
  /** Columnas de la clave natural (vacío = sólo se referencia por id). */
  claves: string[];
}

/** Clave primaria y natural de cualquier tabla referenciable. */
export function definicionTabla(nombre: string | null | undefined): DefinicionTabla | null {
  if (!nombre) return null;
  const tabla = getTablaExport(nombre);
  if (tabla) return { tabla, pk: clavePrimaria(tabla), claves: tabla.claveNatural ?? [] };
  const externa = TABLAS_FUERA_CATALOGO[nombre];
  if (externa) return { tabla: null, pk: externa.pk, claves: externa.claves };
  return null;
}

/**
 * Valor de ejemplo de la clave de una tabla: lo que hay que escribir en una
 * celda de plantilla que referencia a esa tabla (compone las claves padre).
 */
export function ejemploClaveTabla(nombre: string): string {
  const def = definicionTabla(nombre);
  if (!def) return "1";
  if (!def.tabla) {
    // Fuera del catálogo (usuario): id o correo.
    return nombre === "usuario" ? "correo@empresa.com" : "1";
  }
  if (def.claves.length === 0) {
    // Sin clave natural declarada: sólo el id numérico.
    return def.tabla.columnas.find((c) => c.key === def.pk)?.ejemplo ?? "1";
  }
  const partes = def.claves.map((key) => {
    const col = def.tabla?.columnas.find((c) => c.key === key);
    if (!col) return "";
    if (col.fk) return ejemploClaveTabla(col.fk);
    return col.ejemplo ?? "";
  });
  return partes.filter((p) => p.trim() !== "").join(SEPARADOR_CLAVE);
}

/** Columnas que vienen por defecto en la plantilla (sin técnicas ni de empresa). */
export function columnasPorDefecto(tabla: TablaExport): MapeoColumna[] {
  return tabla.columnas
    .filter((col) => !col.sistema && !col.empresaActual)
    .map((col) => ({ columna: col.key, cabecera: cabeceraPorDefecto(col) }));
}

/** Valor de ejemplo de una columna (fila 2 de la plantilla). */
export function ejemploColumna(tabla: TablaExport, columna: string): string {
  const col = tabla.columnas.find((c) => c.key === columna);
  if (!col) return "";
  if (col.fk) return ejemploClaveTabla(col.fk);
  return col.ejemplo ?? "";
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

/** Tablas referenciadas por claves foráneas de las tablas dadas. */
export function tablasReferenciadas(tablas: string[]): string[] {
  const referenciadas = new Set<string>();
  for (const nombre of tablas) {
    for (const col of getTablaExport(nombre)?.columnas ?? []) {
      if (col.fk) referenciadas.add(col.fk);
    }
  }
  return [...referenciadas];
}

/**
 * Orden de inserción de varias tablas: primero las que referencian a las demás
 * (proyectos antes que etapas, etapas antes que manzanas, y así sucesivamente).
 * Sólo considera las tablas de la lista: un padre que no se importa no altera
 * el orden.
 */
export function ordenarPorDependencia(tablas: string[]): string[] {
  const seleccion = new Set(tablas);
  const orden: string[] = [];
  const listas = new Set<string>();
  const enCurso = new Set<string>();

  const visitar = (nombre: string) => {
    if (listas.has(nombre) || enCurso.has(nombre)) return;
    enCurso.add(nombre);
    for (const col of getTablaExport(nombre)?.columnas ?? []) {
      if (col.fk && seleccion.has(col.fk)) visitar(col.fk);
    }
    enCurso.delete(nombre);
    listas.add(nombre);
    orden.push(nombre);
  };

  tablas.forEach(visitar);
  return orden;
}
