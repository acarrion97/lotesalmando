import type { TipoColumnaExport } from "@/infrastructure/export/exportTableCatalog";

export const COLOR_TIPO: Record<TipoColumnaExport, string> = {
  texto: "blue",
  numero: "purple",
  entero: "purple",
  fecha: "orange",
  moneda: "green",
};

export const ETIQUETA_TIPO: Record<TipoColumnaExport, string> = {
  texto: "Texto",
  numero: "Número",
  entero: "Entero",
  fecha: "Fecha",
  moneda: "Moneda",
};
