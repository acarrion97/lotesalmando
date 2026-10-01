/** Tipo de archivo subido a la galería del proyecto. */
export type ProyectoMedioTipo = "imagen" | "video";

/** Una foto o video del proyecto que se muestra en el enlace público. */
export interface ProyectoMedio {
  id_proyecto_medio: number;
  id_proyecto: number;
  tipo: ProyectoMedioTipo;
  url: string;
  /**
   * Número de carga dentro del proyecto (contador `MAX(orden)+1`), cuanto
   * más alto, más reciente. La galería lista los medios de mayor a menor
   * orden. **No guardar un timestamp acá**: `integer` tiene techo en
   * 2.147.483.647.
   */
  orden: number;
}
