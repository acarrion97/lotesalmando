import type { PlanoLote } from "./PlanoLote";

/** Un recurso de la galería pública del proyecto. */
export interface MapaPublicoMedio {
  url: string;
  tipo: "imagen" | "video";
}

/** Conteo de lotes del proyecto por estado, para los datos informativos. */
export interface MapaPublicoEstadisticas {
  total: number;
  disponibles: number;
  reservados: number;
  vendidos: number;
}

/** Lo que ve cualquier visitante en `/mapa/:slug` (sin datos sensibles). */
export interface MapaPublico {
  proyecto: string;
  url_publica: string | null;
  /**
   * Moneda de la empresa (`configuracion.moneda`); USD si la empresa no
   * tiene configuración. Los campos nuevos son opcionales para que la
   * página pública funcione aunque la migración 011 todavía no se haya
   * corrido.
   */
  moneda?: string;
  medios?: MapaPublicoMedio[];
  estadisticas?: MapaPublicoEstadisticas;
  /**
   * Todos los lotes del proyecto. La pestaña Mapa dibuja solo los que
   * tienen `poligono`; la calculadora deja elegir cualquiera.
   */
  lotes: PlanoLote[];
}
